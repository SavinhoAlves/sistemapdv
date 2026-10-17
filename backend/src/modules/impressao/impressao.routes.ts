import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import { prisma } from '../../lib/prisma'
import { resumoCaixa } from '../caixa/caixa.service'
import {
  carregarConfig, cfgToLegacy, tamanhoLogo,
  montarCupomTeste, montarFichas, montarConta, montarFechamento,
  enviarParaImpressora, logoParaRasterEscPos,
} from './impressao.utils'

const DESTINOS_VALIDOS = ['caixa', 'cozinha', 'bar'] as const
type Destino = typeof DESTINOS_VALIDOS[number]

// Resolve a config de impressão: impressora específica do destino, ou fallback global.
// Retorna [config legada, cfg bruto] para que as rotas possam usar tamanhoLogo(cfg).
async function resolverConfig(tenantId: string, destino?: string) {
  const cfg  = await carregarConfig(tenantId)
  const base = cfgToLegacy(cfg)
  const dest = DESTINOS_VALIDOS.includes(destino as Destino) ? destino as Destino : null
  if (dest) {
    const imp = await prisma.impressora.findFirst({
      where: { tenantId, destino: dest, ativo: true },
    })
    if (imp && imp.tipo !== 'navegador') {
      return [{ ...base, impressora_tipo: imp.tipo, impressora_host: imp.host ?? '',
                impressora_porta: imp.porta, impressora_largura: imp.largura,
                impressora_copias: imp.copias }, cfg] as const
    }
  }
  return [base, cfg] as const
}

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
    const { itens, info, codigo, destino } = body
    if (!Array.isArray(itens) || !itens.length) {
      return reply.status(400).send({ error: 'Informe os itens da ficha' })
    }
    try {
      const [config, cfg] = await resolverConfig(request.tenantId!, destino)
      const logo          = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(cfg))
      const cupom         = montarFichas(config, { itens, info, codigo }, logo)
      await enviarParaImpressora(cupom, config)
      return { success: true }
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // POST /api/impressao/conta
  // body: { mesa, itens, subtotal, taxa_pct, taxa_valor, pago, restante, destino? }
  app.post('/conta', { preHandler: [requireTenant] }, async (request, reply) => {
    const conta = request.body as any
    if (!Array.isArray(conta.itens) || !conta.itens.length) {
      return reply.status(400).send({ error: 'A mesa não tem itens para imprimir' })
    }
    try {
      const [config, cfg] = await resolverConfig(request.tenantId!, conta.destino ?? 'caixa')
      const logo          = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(cfg))
      const cupom         = montarConta(config, conta, logo)
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
      const resumo        = await resumoCaixa(request.tenantId!, id)
      const [config, cfg] = await resolverConfig(request.tenantId!, 'caixa')
      const logo          = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(cfg))
      const cupom         = montarFechamento(config, resumo, logo)
      await enviarParaImpressora(cupom, config)
      return { success: true }
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}
