const express = require('express')
const router = express.Router()
const { query } = require('../database/connection')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { montarCupomTeste, enviarParaImpressora } = require('../services/impressao.service')

async function carregarConfig() {
  const rows = await query(`SELECT * FROM configuracoes WHERE id = 1`)
  return rows[0] || {}
}

// POST /api/impressao/teste — imprime um cupom de teste (admin)
router.post('/teste', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const config = await carregarConfig()
    const cupom = montarCupomTeste(config)
    await enviarParaImpressora(cupom, config)
    return res.json({ success: true, message: 'Cupom de teste enviado à impressora' })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

module.exports = router
