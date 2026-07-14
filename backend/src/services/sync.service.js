const crypto = require('crypto')
const { query } = require('../database/connection')

const INTERVALO_MS = (Number(process.env.SYNC_INTERVALO_MIN) || 10) * 60 * 1000

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

// Mesmas métricas agregadas já usadas no Dashboard (dashboard.routes.js)
// e no status do caixa (caixa.routes.js `/atual`) — nenhuma SQL nova.
async function coletarSnapshot() {
  const [faturamento] = await query(`
    SELECT COALESCE(SUM(valor), 0) AS total
    FROM pagamentos
    WHERE DATE(created_at) = CURDATE() AND status = 'confirmado'
  `)
  const [mesas] = await query(`
    SELECT COUNT(*) AS abertas FROM mesas WHERE status = 'aberta' AND data_fechamento IS NULL
  `)
  const [pedidosHoje] = await query(`
    SELECT COUNT(*) AS qtd FROM pedidos WHERE DATE(criado_em) = CURDATE()
  `)
  const [ticketMedio] = await query(`
    SELECT COALESCE(AVG(valor), 0) AS media
    FROM pagamentos
    WHERE DATE(created_at) = CURDATE() AND status = 'confirmado'
  `)
  const caixas = await query(`SELECT * FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`)
  const caixaAberto = caixas[0] || null

  return {
    caixaAberto: !!caixaAberto,
    caixaAbertoDesde: caixaAberto?.data_abertura ?? null,
    faturamentoHoje: Number(faturamento.total),
    mesasAbertas: Number(mesas.abertas),
    pedidosHoje: Number(pedidosHoje.qtd),
    ticketMedio: Number(ticketMedio.media)
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
      signal: AbortSignal.timeout(5000)
    })

    if (!resposta.ok) {
      throw new Error(`Central respondeu ${resposta.status}`)
    }

    const dados = await resposta.json()
    await query(
      `UPDATE sync_config
       SET venda_mobile_permitida = ?, licenca_bloqueada_remoto = ?,
           ultimo_sync_em = NOW(), ultimo_sync_sucesso = 1, ultimo_sync_erro = NULL
       WHERE id = 1`,
      [dados.vendaMobilePermitida ? 1 : 0, dados.licencaAtiva === false ? 1 : 0]
    )
  } catch (err) {
    console.error('[SYNC] Falha na sincronização com a central:', err.message)
    try {
      await query(
        `UPDATE sync_config SET ultimo_sync_sucesso = 0, ultimo_sync_erro = ? WHERE id = 1`,
        [err.message.slice(0, 250)]
      )
    } catch {}
  }
}

// Roda uma vez logo após o boot (com um pequeno atraso pra deixar o server
// terminar de subir) e depois a cada SYNC_INTERVALO_MIN minutos.
function agendarSync() {
  setTimeout(() => {
    sincronizar()
    setInterval(sincronizar, INTERVALO_MS)
  }, 10000)
}

module.exports = { agendarSync, sincronizar, coletarSnapshot, garantirInstalacaoUuid }
