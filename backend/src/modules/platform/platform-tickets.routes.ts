import type { FastifyInstance } from 'fastify'
import { requirePlatform } from '../../middlewares/tenant.middleware'
import { prisma } from '../../lib/prisma'

const TIPOS_VALIDOS      = ['sync', 'instalacao', 'bug', 'cobranca', 'outro'] as const
const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta', 'urgente'] as const
const STATUS_VALIDOS      = ['aberto', 'em_andamento', 'resolvido', 'fechado'] as const

export async function platformTicketsRoutes(app: FastifyInstance) {
  // GET /api/platform/tickets — lista global com filtros opcionais
  app.get('/', { preHandler: requirePlatform }, async (request, reply) => {
    const { tenantId, status } = request.query as Record<string, string>
    const where: Record<string, any> = {}
    if (tenantId) where.tenantId = tenantId
    if (status)   where.status   = status

    const tickets = await prisma.ticketSuporte.findMany({
      where,
      orderBy: [{ prioridade: 'desc' }, { createdAt: 'desc' }],
      include: { tenant: { select: { nome: true, slug: true } } },
    })
    return reply.send(tickets)
  })

  // GET /api/platform/tickets/stats — contadores por status para o dashboard
  app.get('/stats', { preHandler: requirePlatform }, async (_request, reply) => {
    const [abertos, emAndamento, resolvidos, urgentes] = await Promise.all([
      prisma.ticketSuporte.count({ where: { status: 'aberto' } }),
      prisma.ticketSuporte.count({ where: { status: 'em_andamento' } }),
      prisma.ticketSuporte.count({ where: { status: 'resolvido' } }),
      prisma.ticketSuporte.count({ where: { prioridade: 'urgente', status: { notIn: ['resolvido', 'fechado'] } } }),
    ])
    return reply.send({ abertos, emAndamento, resolvidos, urgentes })
  })

  // POST /api/platform/tickets — criar ticket para um tenant
  app.post('/', { preHandler: requirePlatform }, async (request, reply) => {
    const { tenantId, tipo, prioridade, titulo, descricao } = request.body as any

    if (!tenantId?.trim()) return reply.status(400).send({ error: 'tenantId obrigatório' })
    if (!titulo?.trim())   return reply.status(400).send({ error: 'Título obrigatório' })

    const ticket = await prisma.ticketSuporte.create({
      data: {
        tenantId,
        tipo:       TIPOS_VALIDOS.includes(tipo) ? tipo : 'outro',
        prioridade: PRIORIDADES_VALIDAS.includes(prioridade) ? prioridade : 'media',
        titulo:     titulo.trim(),
        descricao:  descricao?.trim() || null,
      },
      include: { tenant: { select: { nome: true, slug: true } } },
    })
    return reply.status(201).send(ticket)
  })

  // PATCH /api/platform/tickets/:id — atualizar status/prioridade/resolução
  app.patch('/:id', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { tipo, prioridade, status, titulo, descricao, resolucao } = request.body as any

    const data: Record<string, any> = {}
    if (tipo       !== undefined) data.tipo       = TIPOS_VALIDOS.includes(tipo) ? tipo : 'outro'
    if (prioridade !== undefined) data.prioridade = PRIORIDADES_VALIDAS.includes(prioridade) ? prioridade : 'media'
    if (status     !== undefined) data.status     = STATUS_VALIDOS.includes(status) ? status : 'aberto'
    if (titulo     !== undefined) data.titulo     = titulo.trim()
    if (descricao  !== undefined) data.descricao  = descricao?.trim() || null
    if (resolucao  !== undefined) data.resolucao  = resolucao?.trim() || null

    if (!Object.keys(data).length) return reply.status(400).send({ error: 'Nenhum campo para atualizar' })

    const ticket = await prisma.ticketSuporte.update({
      where: { id },
      data,
      include: { tenant: { select: { nome: true, slug: true } } },
    })
    return reply.send(ticket)
  })

  // DELETE /api/platform/tickets/:id
  app.delete('/:id', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.ticketSuporte.delete({ where: { id } })
    return reply.send({ success: true })
  })
}
