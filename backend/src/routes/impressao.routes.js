const express = require('express')
const router = express.Router()
const { query } = require('../database/connection')
const { authenticate, authorize, permissoes } = require('../middlewares/auth.middleware')
const { montarCupomTeste, montarFichas, montarConta, montarFechamento, enviarParaImpressora, logoParaRasterEscPos, LOGO_LARGURAS } = require('../services/impressao.service')
const { resumoCaixa } = require('../services/caixa.service')

async function carregarConfig() {
  const rows = await query(`SELECT * FROM configuracoes WHERE id = 1`)
  return rows[0] || {}
}

// Carrega a impressora ativa para um destino (caixa/cozinha/bar).
// Se não houver impressora configurada para o destino, usa a config global.
async function carregarImpressoraPorDestino(destino) {
  const globalCfg = await carregarConfig()
  try {
    const rows = await query(
      'SELECT * FROM impressoras WHERE destino = ? AND ativo = 1 ORDER BY id LIMIT 1',
      [destino]
    )
    if (!rows[0]) return globalCfg
    const imp = rows[0]
    return {
      ...globalCfg,
      impressora_tipo:    imp.tipo,
      impressora_host:    imp.host,
      impressora_porta:   imp.porta,
      impressora_largura: imp.largura,
      impressora_copias:  imp.copias,
    }
  } catch {
    return globalCfg
  }
}

function tamanhoLogo(config) {
  if (config.logo_tamanho === 'personalizado') {
    return Math.max(50, Math.min(600, Number(config.logo_altura_custom) || 320))
  }
  return LOGO_LARGURAS[config.logo_tamanho] ?? 0.60
}

// POST /api/impressao/teste — imprime um cupom de teste na impressora padrão (admin)
router.post('/teste', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const config = await carregarConfig()
    const logoRaster = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(config))
    const cupom = montarCupomTeste(config, logoRaster)
    await enviarParaImpressora(cupom, config)
    return res.json({ success: true, message: 'Cupom de teste enviado à impressora' })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/impressao/ficha — fichas de produto
// body: { itens: [{ nome, quantidade }], info?, codigo?, destino? }
// destino: 'caixa' (venda direta) | 'cozinha' (pedido de mesa, padrão) | 'bar'
router.post('/ficha', authenticate, async (req, res) => {
  try {
    const { itens, info, codigo, destino = 'cozinha' } = req.body
    if (!Array.isArray(itens) || !itens.length) {
      return res.status(400).json({ error: 'Informe os itens da ficha' })
    }
    const config = await carregarImpressoraPorDestino(destino)
    const logoRaster = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(config))
    const cupom = montarFichas(config, { itens, info, codigo }, logoRaster)
    await enviarParaImpressora(cupom, config)
    return res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/impressao/conta — conta da mesa (usa impressora do caixa)
// body: { mesa, itens: [{ nome, quantidade, total }], subtotal,
//         abatimentos: [{ motivo, valor }], taxa_pct, taxa_valor, pago, restante }
router.post('/conta', authenticate, async (req, res) => {
  try {
    const conta = req.body
    if (!Array.isArray(conta.itens) || !conta.itens.length) {
      return res.status(400).json({ error: 'A mesa não tem itens para imprimir' })
    }
    const config = await carregarImpressoraPorDestino('caixa')
    const logoRaster = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(config))
    const cupom = montarConta(config, conta, logoRaster)
    await enviarParaImpressora(cupom, config)
    return res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/impressao/fechamento — resumo de fechamento do caixa (usa impressora do caixa)
// body: { caixa_id }
router.post('/fechamento', authenticate, permissoes.gerenciarCaixa, async (req, res) => {
  try {
    const { caixa_id } = req.body
    if (!caixa_id) return res.status(400).json({ error: 'Informe o caixa' })

    const resumo = await resumoCaixa(Number(caixa_id))
    if (!resumo) return res.status(404).json({ error: 'Caixa não encontrado' })

    const config = await carregarImpressoraPorDestino('caixa')
    const logoRaster = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(config))
    const cupom = montarFechamento(config, resumo, logoRaster)
    await enviarParaImpressora(cupom, config)
    return res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

module.exports = router
