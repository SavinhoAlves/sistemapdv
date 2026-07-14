const express = require('express')
const router  = express.Router()
const { query } = require('../database/connection')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const mp = require('../services/mercadopago.service')

async function getCfg() {
  const rows = await query('SELECT mp_ativado, mp_access_token, mp_device_id FROM configuracoes WHERE id = 1')
  return rows[0] ?? {}
}

// GET /integracoes/mp — retorna config (token mascarado)
router.get('/mp', authenticate, async (req, res) => {
  try {
    const cfg = await getCfg()
    return res.json({
      ativado:      Boolean(cfg.mp_ativado),
      token_salvo:  cfg.mp_access_token ? true : false,
      token_sufixo: cfg.mp_access_token ? cfg.mp_access_token.slice(-4) : null,
      device_id:    cfg.mp_device_id ?? null
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// PUT /integracoes/mp — salva config (admin)
router.put('/mp', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { ativado, access_token, device_id } = req.body

    // Se vier token vazio/nulo, mantém o existente
    if (access_token && access_token.trim()) {
      await query(
        'UPDATE configuracoes SET mp_ativado = ?, mp_access_token = ?, mp_device_id = ? WHERE id = 1',
        [ativado ? 1 : 0, access_token.trim(), device_id || null]
      )
    } else {
      await query(
        'UPDATE configuracoes SET mp_ativado = ?, mp_device_id = ? WHERE id = 1',
        [ativado ? 1 : 0, device_id || null]
      )
    }
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /integracoes/mp/dispositivos — lista terminais vinculados ao token
router.get('/mp/dispositivos', authenticate, async (req, res) => {
  try {
    const cfg = await getCfg()
    if (!cfg.mp_access_token) return res.status(400).json({ error: 'Token MP não configurado' })
    const data = await mp.listarDispositivos(cfg.mp_access_token)
    return res.json(data)
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }
})

// POST /integracoes/mp/pagamento — envia cobrança para o terminal
router.post('/mp/pagamento', authenticate, async (req, res) => {
  try {
    const cfg = await getCfg()
    if (!cfg.mp_ativado)       return res.status(400).json({ error: 'Integração MP desativada' })
    if (!cfg.mp_access_token)  return res.status(400).json({ error: 'Token MP não configurado' })
    if (!cfg.mp_device_id)     return res.status(400).json({ error: 'Dispositivo MP não selecionado' })

    const { valor, tipo, descricao, referencia } = req.body
    if (!valor || !tipo) return res.status(400).json({ error: 'valor e tipo são obrigatórios' })

    const data = await mp.criarIntencao(cfg.mp_access_token, cfg.mp_device_id, {
      valor, tipo, descricao, referencia
    })
    return res.json(data)
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }
})

// GET /integracoes/mp/pagamento/:id — consulta status da intenção
router.get('/mp/pagamento/:id', authenticate, async (req, res) => {
  try {
    const cfg = await getCfg()
    if (!cfg.mp_access_token) return res.status(400).json({ error: 'Token MP não configurado' })
    const data = await mp.verificarIntencao(cfg.mp_access_token, req.params.id)
    return res.json(data)
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }
})

// DELETE /integracoes/mp/pagamento/:id — cancela intenção no terminal
router.delete('/mp/pagamento/:id', authenticate, async (req, res) => {
  try {
    const cfg = await getCfg()
    if (!cfg.mp_access_token || !cfg.mp_device_id) return res.status(400).json({ error: 'MP não configurado' })
    await mp.cancelarIntencao(cfg.mp_access_token, cfg.mp_device_id, req.params.id)
    return res.json({ success: true })
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }
})

module.exports = router
