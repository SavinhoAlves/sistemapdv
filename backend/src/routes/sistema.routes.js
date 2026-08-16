const express = require('express')
const router  = express.Router()
const { query } = require('../database/connection')
const { verificarLicenca, limparCacheLicenca, SEGREDO } = require('../services/licenca.service')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { executarBackup, listarBackups } = require('../services/backup.service')

// ──────────────────────────────────────────────────
// BACKUP (somente administrador)
// ──────────────────────────────────────────────────
router.post('/backup', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const resultado = await executarBackup()
    return res.json({ success: true, ...resultado })
  } catch (err) {
    console.error('[BACKUP] Erro manual:', err.message)
    return res.status(500).json({ error: err.message })
  }
})

router.get('/backups', authenticate, authorize('administrador'), (req, res) => {
  return res.json(listarBackups())
})

// ──────────────────────────────────────────────────
// POST /api/sistema/ativar
// Body: { chave: string }  (base64 do JSON {c, d, s})
// ──────────────────────────────────────────────────
router.post('/ativar', async (req, res) => {
  const { chave } = req.body

  if (!chave) {
    return res.status(400).json({ success: false, message: 'Chave não informada' })
  }

  let dados
  try {
    dados = JSON.parse(decodeURIComponent(escape(Buffer.from(chave, 'base64').toString('utf8'))))
  } catch {
    return res.status(400).json({ success: false, message: 'Chave inválida ou corrompida' })
  }

  if (!dados.c || (!dados.expira_em && !dados.d) || !dados.s) {
    return res.status(400).json({ success: false, message: 'Estrutura da chave inválida' })
  }

  if (dados.s !== SEGREDO) {
    return res.status(403).json({ success: false, message: 'Chave não autorizada' })
  }

  const agora = new Date()

  let dataVencimento
  if (dados.expira_em) {
    dataVencimento = new Date(dados.expira_em)
    if (isNaN(dataVencimento.getTime())) {
      return res.status(400).json({ success: false, message: 'Data de vencimento inválida na chave' })
    }
    if (dataVencimento < agora) {
      return res.status(400).json({ success: false, message: 'Esta chave já está expirada' })
    }
  } else {
    dataVencimento = new Date(agora)
    dataVencimento.setDate(dataVencimento.getDate() + Number(dados.d))
  }

  try {
    // Preserva host_fingerprint antes de limpar — é o identificador do hardware
    // e não deve ser perdido numa renovação de licença.
    const existentes = await query('SELECT host_fingerprint FROM pdv_config ORDER BY id DESC LIMIT 1').catch(() => [])
    const hostFingerprint = existentes[0]?.host_fingerprint ?? null

    // TRUNCATE reseta o auto_increment → próximo INSERT sempre recebe id = 1.
    // Isso garante que os demais UPDATE ... WHERE id = 1 (heartbeat, etc.) funcionem.
    await query(`TRUNCATE TABLE pdv_config`)

    await query(
      `INSERT INTO pdv_config (id, chave_ativacao, status_licenca, data_ativacao, data_vencimento, ultima_verificacao, host_fingerprint)
       VALUES (1, ?, 'ativado', ?, ?, ?, ?)`,
      [chave, agora, dataVencimento, agora, hostFingerprint]
    )

    limparCacheLicenca()
    console.log(`[ATIVAÇÃO] Sucesso: ${dados.c} | Válido até: ${dataVencimento.toISOString().slice(0, 10)}`)

    // Limpa flag de revogação (caso o sistema tivesse sido bloqueado pela central)
    await query('UPDATE sync_config SET licenca_bloqueada_remoto = 0 WHERE id = 1').catch(() => {})

    // Auto-configura sync se a chave contiver as credenciais da central
    if (dados.sync_token && dados.sync_url) {
      try {
        const { garantirInstalacaoUuid } = require('../services/sync.service')
        await garantirInstalacaoUuid()
        await query(
          'UPDATE sync_config SET central_url = ?, sync_token = ? WHERE id = 1',
          [dados.sync_url, dados.sync_token]
        )
        console.log(`[ATIVAÇÃO] Sync configurado → ${dados.sync_url}`)
      } catch (syncErr) {
        console.error('[ATIVAÇÃO] Aviso: não foi possível configurar sync automaticamente:', syncErr.message)
      }
    }

    return res.json({
      success: true,
      message: `Sistema ativado para "${dados.c}" até ${dataVencimento.toLocaleDateString('pt-BR')}`,
      cliente: dados.c,
      dataVencimento: dataVencimento.toISOString().slice(0, 10),
      diasValidade: Math.ceil((dataVencimento - agora) / (1000 * 60 * 60 * 24))
    })
  } catch (err) {
    console.error('[ATIVAÇÃO] Erro ao gravar no banco:', err)
    return res.status(500).json({ success: false, message: 'Erro ao gravar no banco de dados' })
  }
})

// ──────────────────────────────────────────────────
// GET /api/sistema/status-licenca
// ──────────────────────────────────────────────────
router.get('/status-licenca', async (req, res) => {
  try {
    // Verifica suspensão/revogação antes da licença
    const syncRows = await query('SELECT suspenso, licenca_bloqueada_remoto FROM sync_config WHERE id = 1').catch(() => [])
    if (syncRows[0]?.suspenso) {
      return res.json({ ativo: false, expirado: false, semLicenca: false, suspenso: true })
    }
    if (syncRows[0]?.licenca_bloqueada_remoto) {
      return res.json({ ativo: false, expirado: false, semLicenca: false, revogado: true })
    }

    const info = await verificarLicenca(true) // sempre consulta o banco nesta rota

    if (info.semLicenca) {
      return res.json({ ativo: false, expirado: false, semLicenca: true })
    }

    const lic   = info.licenca
    const agora = new Date()
    const expira = new Date(lic.data_vencimento)
    const diasRestantes = Math.ceil((expira - agora) / (1000 * 60 * 60 * 24))
    const cliente = (info.dados && info.dados.c) || '—'

    // Assinatura da chave não confere com o segredo do servidor → licença inválida
    if (info.assinaturaInvalida) {
      await query(
        `UPDATE pdv_config SET ultima_verificacao = ?, status_licenca = 'bloqueado' WHERE id = ?`,
        [agora, lic.id]
      )
      return res.json({
        ativo: false,
        expirado: false,
        semLicenca: false,
        invalida: true,
        cliente,
        status: 'bloqueado'
      })
    }

    // status_licenca reflete só a validade da própria chave (expiração/
    // assinatura) — suspensão remota é um motivo à parte, sobreposto na
    // resposta abaixo, sem alterar esse campo local
    const novoStatus = info.expirado ? 'bloqueado' : 'ativado'
    await query(
      `UPDATE pdv_config SET ultima_verificacao = ?, status_licenca = ? WHERE id = ?`,
      [agora, novoStatus, lic.id]
    )

    return res.json({
      ativo:          !info.expirado && !info.bloqueadoRemoto,
      expirado:       info.expirado,
      semLicenca:     false,
      bloqueadoRemoto: info.bloqueadoRemoto,
      cliente,
      status:         info.bloqueadoRemoto ? 'bloqueado' : novoStatus,
      dataAtivacao:   lic.data_ativacao,
      dataVencimento: lic.data_vencimento,
      diasRestantes:  info.expirado ? 0 : diasRestantes
    })
  } catch (err) {
    console.error('[STATUS-LICENÇA]', err)
    return res.status(500).json({ error: 'Erro ao verificar licença' })
  }
})

// ──────────────────────────────────────────────────
// POST /api/sistema/sync/configurar
// Body: { centralUrl: string, syncToken: string }
// Guarda a URL/token do painel central de suporte. Executado uma única vez
// no onboarding de cada instalação (só administrador). Diferente de
// /ativar, esta rota exige login pois o sistema já está licenciado.
// ──────────────────────────────────────────────────
router.post('/sync/configurar', authenticate, authorize('administrador'), async (req, res) => {
  const { centralUrl, syncToken } = req.body

  if (!centralUrl || !syncToken) {
    return res.status(400).json({ error: 'Informe centralUrl e syncToken' })
  }

  try {
    const { garantirInstalacaoUuid } = require('../services/sync.service')
    await garantirInstalacaoUuid()

    await query(
      `UPDATE sync_config SET central_url = ?, sync_token = ? WHERE id = 1`,
      [centralUrl.trim(), syncToken.trim()]
    )

    return res.json({ success: true })
  } catch (err) {
    console.error('[SYNC] Erro ao configurar:', err.message)
    return res.status(500).json({ error: 'Erro ao salvar configuração de sincronização' })
  }
})

// ──────────────────────────────────────────────────
// GET /api/sistema/sync/status
// ──────────────────────────────────────────────────
router.get('/sync/status', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const rows = await query('SELECT central_url, venda_mobile_permitida, ultimo_sync_em, ultimo_sync_sucesso, ultimo_sync_erro FROM sync_config WHERE id = 1')
    if (!rows.length) return res.json({ configurado: false })
    const r = rows[0]
    return res.json({
      configurado:          !!r.central_url,
      centralUrl:           r.central_url || '',
      vendaMobilePermitida: Boolean(r.venda_mobile_permitida),
      ultimoSyncEm:         r.ultimo_sync_em,
      ultimoSyncSucesso:    r.ultimo_sync_sucesso === null ? null : Boolean(r.ultimo_sync_sucesso),
      ultimoSyncErro:       r.ultimo_sync_erro || null
    })
  } catch (err) {
    console.error('[SYNC] Erro ao buscar status:', err.message)
    return res.status(500).json({ error: 'Erro ao buscar status de sincronização' })
  }
})

// ──────────────────────────────────────────────────
// POST /api/sistema/sync/agora — dispara sync imediato
// ──────────────────────────────────────────────────
router.post('/sync/agora', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { sincronizar } = require('../services/sync.service')
    await sincronizar()
    const rows = await query('SELECT ultimo_sync_em, ultimo_sync_sucesso, ultimo_sync_erro FROM sync_config WHERE id = 1')
    const r = rows[0] || {}
    return res.json({
      success:         true,
      ultimoSyncEm:    r.ultimo_sync_em,
      ultimoSyncSucesso: r.ultimo_sync_sucesso === null ? null : Boolean(r.ultimo_sync_sucesso),
      ultimoSyncErro:  r.ultimo_sync_erro || null
    })
  } catch (err) {
    console.error('[SYNC] Erro ao sincronizar:', err.message)
    return res.status(500).json({ error: 'Erro ao sincronizar' })
  }
})

// ──────────────────────────────────────────────────
// GET /api/sistema/config-publica — sem autenticação
// Retorna apenas configurações não-sensíveis necessárias
// na tela de login (antes de qualquer auth)
// ──────────────────────────────────────────────────
router.get('/config-publica', async (req, res) => {
  try {
    const rows = await query('SELECT rfid_ativo FROM configuracoes WHERE id = 1')
    const row  = rows[0] ?? {}
    return res.json({
      rfid_ativo: row.rfid_ativo !== undefined ? Boolean(row.rfid_ativo) : true
    })
  } catch {
    return res.json({ rfid_ativo: true }) // fallback seguro — nunca quebra o login
  }
})

module.exports = router
