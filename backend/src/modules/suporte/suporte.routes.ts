import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { prisma } from '../../lib/prisma'
import type { TenantJwtPayload } from '../../lib/jwt'

/**
 * Tickets de suporte abertos pelo próprio restaurante.
 *
 * TicketSuporte não está em MODELOS_COM_TENANT (o painel da plataforma lista
 * tickets de todos os tenants), então o filtro por tenantId aqui é explícito
 * em toda consulta.
 */

const novoTicket = z.object({
  tipo:       z.enum(['bug', 'instalacao', 'cobranca', 'outro']).default('outro'),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
  titulo:     z.string().trim().min(3, 'Informe um título').max(120),
  descricao:  z.string().trim().max(4000).optional(),
})

async function requireAdministrador(request: FastifyRequest, reply: FastifyReply) {
  if ((request.auth as TenantJwtPayload).cargo !== 'administrador') {
    return reply.status(403).send({ error: 'Apenas o administrador pode acessar o suporte' })
  }
}

export async function suporteRoutes(app: FastifyInstance) {
  const preHandler = [requireTenant, requireAdministrador]

  // GET /api/suporte/tickets — tickets do restaurante logado
  app.get('/tickets', { preHandler }, async (request, reply) => {
    const tickets = await prisma.ticketSuporte.findMany({
      where: { tenantId: request.tenantId! },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, tipo: true, prioridade: true, status: true,
        titulo: true, descricao: true, resolucao: true,
        createdAt: true, updatedAt: true,
      },
    })
    return reply.send(tickets)
  })

  // POST /api/suporte/tickets — abre um ticket para o suporte da plataforma
  app.post('/tickets', { preHandler }, async (request, reply) => {
    const parsed = novoTicket.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
    }

    const { nome } = request.auth as TenantJwtPayload
    const corpo = parsed.data.descricao ? `${parsed.data.descricao}\n\n` : ''

    const ticket = await prisma.ticketSuporte.create({
      data: {
        tenantId:   request.tenantId!,
        tipo:       parsed.data.tipo,
        prioridade: parsed.data.prioridade,
        titulo:     parsed.data.titulo,
        descricao:  `${corpo}— Aberto pelo cliente: ${nome}`,
      },
      select: {
        id: true, tipo: true, prioridade: true, status: true,
        titulo: true, descricao: true, resolucao: true,
        createdAt: true, updatedAt: true,
      },
    })
    return reply.status(201).send(ticket)
  })
}
