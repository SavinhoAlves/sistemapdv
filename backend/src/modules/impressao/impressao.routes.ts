import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import { resumoCaixa } from '../caixa/caixa.service'
import {
  carregarConfig, cfgToLegacy, tamanhoLogo,
  montarCupomTeste, montarFichas, montarConta, montarFechamento,
  enviarParaImpressora, logoParaRasterEscPos,
} from './impressao.utils'

export async function impressaoRoutes(app: FastifyInstance) {
  // POST /api/impressao/teste
  app.post('/teste', { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }, async (request, reply) => {
    try {
      const cfg     = await carregarConfig(request.tenantId!)
      const config  = cfgToLegacy(cfg)
      const logo    = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(cfg))
      const cupom   = montarCupomTeste(config, logo)
      await enviarParaImpressora(cupom, config)
      return { success: true, message: 'Cupom de teste enviado' }
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // POST /api/impressao/ficha
  // body: { itens: [{ nome, quantidade }], info?, codigo?, destino? }
  app.post('/ficha', { preHandler: [requireTenant] }, async (request, reply) => {
    const body = request.body as any
    const { itens, info, codigo } = body
    if (!Array.isArray(itens) || !itens.length) {
      return reply.status(400).send({ error: 'Informe os itens da ficha' })
    }
    try {
      const cfg    = await carregarConfig(request.tenantId!)
      const config = cfgToLegacy(cfg)
      const logo   = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(cfg))
      const cupom  = montarFichas(config, { itens, info, codigo }, logo)
      await enviarParaImpressora(cupom, config)
      return { success: true }
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // POST /api/impressao/conta
  // body: { mesa, itens, subtotal, taxa_pct, taxa_valor, pago, restante }
  app.post('/conta', { preHandler: [requireTenant] }, async (request, reply) => {
    const conta = request.body as any
    if (!Array.isArray(conta.itens) || !conta.itens.length) {
      return reply.status(400).send({ error: 'A mesa não tem itens para imprimir' })
    }
    try {
      const cfg    = await carregarConfig(request.tenantId!)
      const config = cfgToLegacy(cfg)
      const logo   = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(cfg))
      const cupom  = montarConta(config, conta, logo)
      await enviarParaImpressora(cupom, config)
      return { success: true }
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // POST /api/impressao/fechamento
  // body: { caixa_id } or { caixaId }
  app.post('/fechamento', { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] }, async (request, reply) => {
    const { caixaId, caixa_id } = request.body as any
    const id = caixaId || caixa_id
    if (!id) return reply.status(400).send({ error: 'Informe o caixa' })

    try {
      const resumo = await resumoCaixa(request.tenantId!, id)
      const cfg    = await carregarConfig(request.tenantId!)
      const config = cfgToLegacy(cfg)
      const logo   = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(cfg))
      const cupom  = montarFechamento(config, resumo, logo)
      await enviarParaImpressora(cupom, config)
      return { success: true }
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}
