const express = require('express')
const router = express.Router()
const { query } = require('../database/connection')
const { authenticate, authorize, permissoes } = require('../middlewares/auth.middleware')
const { montarCupomTeste, montarFichas, montarConta, montarFechamento, enviarParaImpressora } = require('../services/impressao.service')
const { resumoCaixa } = require('../services/caixa.service')

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

// POST /api/impressao/ficha — fichas de produto (venda do caixa ou reimpressão)
// body: { itens: [{ nome, quantidade }], info?, codigo? }
router.post('/ficha', authenticate, async (req, res) => {
  try {
    const { itens, info, codigo } = req.body
    if (!Array.isArray(itens) || !itens.length) {
      return res.status(400).json({ error: 'Informe os itens da ficha' })
    }
    const config = await carregarConfig()
    const cupom = montarFichas(config, { itens, info, codigo })
    await enviarParaImpressora(cupom, config)
    return res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/impressao/conta — conta da mesa
// body: { mesa, itens: [{ nome, quantidade, total }], subtotal,
//         abatimentos: [{ motivo, valor }], taxa_pct, taxa_valor, pago, restante }
router.post('/conta', authenticate, async (req, res) => {
  try {
    const conta = req.body
    if (!Array.isArray(conta.itens) || !conta.itens.length) {
      return res.status(400).json({ error: 'A mesa não tem itens para imprimir' })
    }
    const config = await carregarConfig()
    const cupom = montarConta(config, conta)
    await enviarParaImpressora(cupom, config)
    return res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/impressao/fechamento — resumo de fechamento do caixa
// body: { caixa_id }
router.post('/fechamento', authenticate, permissoes.gerenciarCaixa, async (req, res) => {
  try {
    const { caixa_id } = req.body
    if (!caixa_id) return res.status(400).json({ error: 'Informe o caixa' })

    const resumo = await resumoCaixa(Number(caixa_id))
    if (!resumo) return res.status(404).json({ error: 'Caixa não encontrado' })

    const config = await carregarConfig()
    const cupom = montarFechamento(config, resumo)
    await enviarParaImpressora(cupom, config)
    return res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

module.exports = router
