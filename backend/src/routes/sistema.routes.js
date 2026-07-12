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

  if (!dados.c || !dados.d || !dados.s) {
    return res.status(400).json({ success: false, message: 'Estrutura da chave inválida' })
  }

  if (dados.s !== SEGREDO) {
    return res.status(403).json({ success: false, message: 'Chave não autorizada' })
  }

  const agora = new Date()
  const dataVencimento = new Date(agora)
  dataVencimento.setDate(dataVencimento.getDate() + Number(dados.d))

  try {
    // Remove registros anteriores e insere novo
    await query(`DELETE FROM pdv_config`)

    await query(
      `INSERT INTO pdv_config (chave_ativacao, status_licenca, data_ativacao, data_vencimento, ultima_verificacao)
       VALUES (?, 'ativado', ?, ?, ?)`,
      [chave, agora, dataVencimento, agora]
    )

    limparCacheLicenca()
    console.log(`[ATIVAÇÃO] Sucesso: ${dados.c} | Válido até: ${dataVencimento.toISOString().slice(0, 10)}`)

    return res.json({
      success: true,
      message: `Sistema ativado para "${dados.c}" até ${dataVencimento.toLocaleDateString('pt-BR')}`,
      cliente: dados.c,
      dataVencimento: dataVencimento.toISOString().slice(0, 10),
      diasValidade: dados.d
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

    // Atualiza ultima_verificacao e status
    const novoStatus = info.expirado ? 'bloqueado' : 'ativado'
    await query(
      `UPDATE pdv_config SET ultima_verificacao = ?, status_licenca = ? WHERE id = ?`,
      [agora, novoStatus, lic.id]
    )

    return res.json({
      ativo:          !info.expirado,
      expirado:       info.expirado,
      semLicenca:     false,
      cliente,
      status:         novoStatus,
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

module.exports = router
