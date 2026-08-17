const crypto = require('crypto')
const { query } = require('../database/connection')

const INTERVALO_MS  = (Number(process.env.SYNC_INTERVALO_SEG) || 30) * 1000
const TIMEOUT_MS    = Number(process.env.SYNC_TIMEOUT_MS) || 8000
const BACKOFF_MAX   = 10 * 60 * 1000 // 10 min teto de backoff

let falhasConsecutivas = 0

// Garante a linha singleton (id=1) com um instalacao_uuid definido —
// gerado uma única vez, sobrevive a reativação de licença (tabela própria,
// diferente de pdv_config).
async function garantirInstalacaoUuid() {
  const rows = await query(`SELECT * FROM sync_config WHERE id = 1`)
  if (rows.length) return rows[0]

  const uuid = crypto.randomUUID()
  await query(
    `INSERT INTO sync_config (id, instalacao_uuid) VALUES (1, ?)`,
    [uuid]
  )
  const [novo] = await query(`SELECT * FROM sync_config WHERE id = 1`)
  return novo
}

// Mesmas métricas exibidas na página de Caixa do PDV:
// quando o caixa está aberto, usa resumoCaixa(id) filtrado por sessão;
// quando fechado, faz fallback para os totais do dia (igual ao Dashboard).
async function coletarSnapshot() {
  const { resumoCaixa } = require('./caixa.service')

  const [mesas] = await query(`
    SELECT COUNT(*) AS abertas FROM mesas WHERE status = 'aberta' AND data_fechamento IS NULL
  `)

  const caixas = await query(`SELECT * FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`)
  const caixaAberto = caixas[0] || null

  let faturamentoHoje = 0
  let pedidosHoje     = 0
  let ticketMedio     = 0

  if (caixaAberto) {
    // Sessão atual: mesmos valores que caixa.vue exibe via GET /caixa/movimentos
    const resumo = await resumoCaixa(caixaAberto.id).catch(() => null)
    faturamentoHoje = resumo?.vendas?.total       ?? 0
    pedidosHoje     = resumo?.vendas?.quantidade  ?? 0
    ticketMedio     = resumo?.vendas?.ticket_medio ?? 0
  } else {
    // Caixa fechado: totais acumulados do dia (igual ao Dashboard)
    const [fat] = await query(`
      SELECT COALESCE(SUM(valor), 0) AS total,
             COUNT(DISTINCT pedido_id) AS qtd,
             COALESCE(AVG(valor), 0)   AS media
      FROM pagamentos
      WHERE DATE(created_at) = CURDATE() AND status = 'confirmado'
    `)
    faturamentoHoje = Number(fat.total)
    pedidosHoje     = Number(fat.qtd)
    ticketMedio     = Number(fat.media)
  }

  // Estado real de pdv_config e sync_config — reportado à central a cada sync
  const pdvCfgRows = await query(`SELECT status_licenca, data_vencimento, host_fingerprint FROM pdv_config WHERE id = 1`).catch(() => [])
  const pdvCfg = pdvCfgRows[0] || null

  const syncCfgRows = await query(`
    SELECT licenca_bloqueada_remoto, suspenso, venda_mobile_permitida, ultimo_sync_erro
    FROM sync_config WHERE id = 1
  `).catch(() => [])
  const syncCfg = syncCfgRows[0] || null

  return {
    caixaAberto:        !!caixaAberto,
    caixaAbertoDesde:   caixaAberto?.data_abertura ?? null,
    faturamentoHoje,
    mesasAbertas:       Number(mesas.abertas),
    pedidosHoje,
    ticketMedio,
    // pdv_config
    pdvLicencaStatus:   pdvCfg?.status_licenca    ?? null,
    pdvLicencaExpira:   pdvCfg?.data_vencimento   ?? null,
    pdvHostFingerprint: pdvCfg?.host_fingerprint  ?? null,
    // sync_config
    pdvSyncBloqueado:   syncCfg ? Boolean(syncCfg.licenca_bloqueada_remoto) : null,
    pdvSyncSuspenso:    syncCfg ? Boolean(syncCfg.suspenso)                 : null,
    pdvSyncVendaMobile: syncCfg ? Boolean(syncCfg.venda_mobile_permitida)   : null,
    pdvSyncErro:        syncCfg?.ultimo_sync_erro ?? null
  }
}

// Best-effort: se não houver central configurada, ou se a chamada falhar
// por qualquer motivo, nunca lança erro pra cima — só registra e tenta de
// novo no próximo ciclo. Em falha, venda_mobile_permitida NUNCA é alterado
// (fail-open: mantém o último valor conhecido).
async function sincronizar() {
  try {
    const config = await garantirInstalacaoUuid()
    if (!config.central_url || !config.sync_token) return // sync não configurado — no-op silencioso

    const snapshot = await coletarSnapshot()

    const resposta = await fetch(`${config.central_url}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.sync_token}`
      },
      body: JSON.stringify({ instalacaoUuid: config.instalacao_uuid, ...snapshot }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })

    if (resposta.status === 401) {
      let body = {}
      try { body = await resposta.json() } catch {}
      if (body.revogado) {
        // Cliente removido da central:
        // 1. Apaga pdv_config → sistema entra em "sem licença" e exige reativação
        // 2. Bloqueia via licenca_bloqueada_remoto e limpa credenciais de sync
        await query('TRUNCATE TABLE pdv_config').catch(() => {})
        await query(
          'UPDATE sync_config SET licenca_bloqueada_remoto = 1, central_url = NULL, sync_token = NULL WHERE id = 1'
        ).catch(() => {})
        console.log('[SYNC] Licença revogada pela central — pdv_config apagado, acesso bloqueado')
      }
      throw new Error(`Central respondeu 401`)
    }

    if (!resposta.ok) {
      throw new Error(`Central respondeu ${resposta.status}`)
    }

    const dados = await resposta.json()

    // Heartbeat: renova a data de vencimento da licença conforme instruído pela central.
    // Sem sync ativo, a licença expira naturalmente — controle remoto garantido.
    if (dados.novaExpiracao) {
      const novaData = new Date(dados.novaExpiracao)
      if (!isNaN(novaData.getTime())) {
        await query('UPDATE pdv_config SET data_vencimento = ? WHERE id = 1', [novaData]).catch(() => {})
        try { require('./licenca.service').limparCacheLicenca() } catch {}
      }
    }

    // Licença pendente: a central empurrou uma nova chave → aplicar automaticamente.
    // Mesma lógica do POST /api/sistema/ativar, sem interação do usuário.
    if (dados.licencaPendente) {
      try {
        const { SEGREDO } = require('./licenca.service')
        const chave = dados.licencaPendente
        let payload
        try {
          payload = JSON.parse(decodeURIComponent(escape(Buffer.from(chave, 'base64').toString('utf8'))))
        } catch { payload = null }

        if (payload && payload.c && (payload.expira_em || payload.d) && payload.s === SEGREDO) {
          const agora = new Date()
          let dataVencimento
          if (payload.expira_em) {
            dataVencimento = new Date(payload.expira_em)
          } else {
            dataVencimento = new Date(agora)
            dataVencimento.setDate(dataVencimento.getDate() + Number(payload.d))
          }

          if (!isNaN(dataVencimento.getTime()) && dataVencimento > agora) {
            const existentes = await query('SELECT host_fingerprint FROM pdv_config ORDER BY id DESC LIMIT 1').catch(() => [])
            const hostFingerprint = existentes[0]?.host_fingerprint ?? null

            await query(`TRUNCATE TABLE pdv_config`)
            await query(
              `INSERT INTO pdv_config (id, chave_ativacao, status_licenca, data_ativacao, data_vencimento, ultima_verificacao, host_fingerprint)
               VALUES (1, ?, 'ativado', ?, ?, ?, ?)`,
              [chave, agora, dataVencimento, agora, hostFingerprint]
            )
            await query('UPDATE sync_config SET licenca_bloqueada_remoto = 0 WHERE id = 1').catch(() => {})
            if (payload.sync_token && payload.sync_url) {
              await query(
                'UPDATE sync_config SET central_url = ?, sync_token = ? WHERE id = 1',
                [payload.sync_url, payload.sync_token]
              ).catch(() => {})
            }
            try { require('./licenca.service').limparCacheLicenca() } catch {}
            console.log(`[SYNC] Licença aplicada automaticamente para "${payload.c}" até ${dataVencimento.toISOString().slice(0, 10)}`)
          }
        }
      } catch (err) {
        console.error('[SYNC] Erro ao aplicar licença pendente:', err.message)
      }
    }

    await query(
      `UPDATE sync_config
       SET venda_mobile_permitida = ?, suspenso = ?, ultimo_sync_em = NOW(), ultimo_sync_sucesso = 1, ultimo_sync_erro = NULL
       WHERE id = 1`,
      [dados.vendaMobilePermitida ? 1 : 0, dados.suspenso ? 1 : 0]
    )
    falhasConsecutivas = 0 // reset backoff no sucesso
  } catch (err) {
    falhasConsecutivas++
    // Loga apenas na primeira falha e a cada 5ª seguinte (evita spam no console)
    if (falhasConsecutivas === 1 || falhasConsecutivas % 5 === 0) {
      console.error(`[SYNC] Falha na sincronização com a central (tentativa ${falhasConsecutivas}): ${err.message}`)
    }
    try {
      await query(
        `UPDATE sync_config SET ultimo_sync_sucesso = 0, ultimo_sync_erro = ? WHERE id = 1`,
        [err.message.slice(0, 250)]
      )
    } catch {}
  }
}

// Roda logo após o boot e reagenda com backoff exponencial em caso de falha.
// 0 falhas → INTERVALO_MS (padrão 30s)
// 1 falha   → 60s, 2 → 120s, 3 → 240s, 4 → 480s, 5+ → 600s (BACKOFF_MAX)
function agendarSync() {
  async function ciclo() {
    await sincronizar()
    const delay = falhasConsecutivas > 0
      ? Math.min(INTERVALO_MS * Math.pow(2, Math.min(falhasConsecutivas, 5)), BACKOFF_MAX)
      : INTERVALO_MS
    setTimeout(ciclo, delay)
  }
  setTimeout(ciclo, 10000) // aguarda 10s após o boot
}

module.exports = { agendarSync, sincronizar, coletarSnapshot, garantirInstalacaoUuid }
