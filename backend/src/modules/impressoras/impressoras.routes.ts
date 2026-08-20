import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import { prisma } from '../../lib/prisma'
import {
  carregarConfig, cfgToLegacy, tamanhoLogo,
  montarCupomTeste, enviarParaImpressora, logoParaRasterEscPos,
} from '../impressao/impressao.utils'

const DESTINOS_VALIDOS = ['caixa', 'cozinha', 'bar']
const TIPOS_VALIDOS    = ['navegador', 'rede', 'windows']

function normalizar(body: any) {
  return {
    nome:    String(body.nome || 'Impressora').slice(0, 100),
    destino: DESTINOS_VALIDOS.includes(body.destino) ? body.destino : 'caixa',
    tipo:    TIPOS_VALIDOS.includes(body.tipo) ? body.tipo : 'navegador',
    host:    body.host || null,
    porta:   Number(body.porta) || 9100,
    largura: [58, 80].includes(Number(body.largura)) ? Number(body.largura) : 80,
    copias:  Math.min(5, Math.max(1, Number(body.copias) || 1)),
    ativo:   body.ativo !== false && body.ativo !== 0,
  }
}

export async function impressorasRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireTenant] }, async (request) => {
    return prisma.impressora.findMany({
      where: { tenantId: request.tenantId! },
      orderBy: [{ destino: 'asc' }, { createdAt: 'asc' }],
    })
  })

  app.post('/', { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }, async (request, reply) => {
    const dados = normalizar(request.body as any)
    const nova = await prisma.impressora.create({
      data: { tenantId: request.tenantId!, ...dados },
    })
    return reply.status(201).send(nova)
  })

  app.put('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }, async (request, reply) => {
    const { id } = request.params as any
    const dados  = normalizar(request.body as any)
    try {
      const atualizada = await prisma.impressora.update({
        where: { id, tenantId: request.tenantId! },
        data: dados,
      })
      return reply.send(atualizada)
    } catch {
      return reply.status(404).send({ error: 'Impressora não encontrada' })
    }
  })

  app.delete('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }, async (request, reply) => {
    const { id } = request.params as any
    try {
      await prisma.impressora.delete({ where: { id, tenantId: request.tenantId! } })
      return reply.send({ success: true })
    } catch {
      return reply.status(404).send({ error: 'Impressora não encontrada' })
    }
  })

  app.post('/:id/teste', { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }, async (request, reply) => {
    const { id } = request.params as any
    const impressora = await prisma.impressora.findFirst({ where: { id, tenantId: request.tenantId! } })
    if (!impressora) return reply.status(404).send({ error: 'Impressora não encontrada' })
    if (impressora.tipo === 'navegador') {
      return reply.status(400).send({ error: 'Impressão via navegador não suporta teste direto' })
    }
    try {
      const cfg    = await carregarConfig(request.tenantId!)
      const config = {
        ...cfgToLegacy(cfg),
        impressora_tipo:    impressora.tipo,
        impressora_host:    impressora.host,
        impressora_porta:   impressora.porta,
        impressora_largura: impressora.largura,
        impressora_copias:  impressora.copias,
      }
      const logo  = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(cfg))
      const cupom = montarCupomTeste(config, logo)
      await enviarParaImpressora(cupom, config)
      return reply.send({ success: true, message: 'Cupom de teste enviado' })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}
