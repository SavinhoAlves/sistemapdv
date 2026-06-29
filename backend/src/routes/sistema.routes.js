const express = require('express')
const router  = express.Router()
const { query } = require('../database/connection')

// Usa LICENSE_SECRET se definido, caso contrário cai no JWT_SECRET para compatibilidade
const SEGREDO = process.env.LICENSE_SECRET || process.env.JWT_SECRET

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
    const rows = await query(
      `SELECT * FROM pdv_config ORDER BY data_ativacao DESC LIMIT 1`
    )

    if (!rows.length) {
      return res.json({ ativo: false, expirado: false, semLicenca: true })
    }

    const lic   = rows[0]
    const agora = new Date()
    const expira = new Date(lic.data_vencimento)
    const expirado = expira < agora
    const diasRestantes = Math.ceil((expira - agora) / (1000 * 60 * 60 * 24))

    // Decodifica a chave para extrair o nome do cliente
    let cliente = '—'
    try {
      const dados = JSON.parse(decodeURIComponent(escape(Buffer.from(lic.chave_ativacao, 'base64').toString('utf8'))))
      cliente = dados.c || '—'
    } catch {}

    // Atualiza ultima_verificacao e status
    const novoStatus = expirado ? 'bloqueado' : 'ativado'
    await query(
      `UPDATE pdv_config SET ultima_verificacao = ?, status_licenca = ? WHERE id = ?`,
      [agora, novoStatus, lic.id]
    )

    return res.json({
      ativo:          !expirado,
      expirado,
      semLicenca:     false,
      cliente,
      status:         novoStatus,
      dataAtivacao:   lic.data_ativacao,
      dataVencimento: lic.data_vencimento,
      diasRestantes:  expirado ? 0 : diasRestantes
    })
  } catch (err) {
    console.error('[STATUS-LICENÇA]', err)
    return res.status(500).json({ error: 'Erro ao verificar licença' })
  }
})

module.exports = router
