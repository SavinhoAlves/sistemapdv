import type { FastifyInstance } from 'fastify'
import { requirePlatform } from '../../middlewares/tenant.middleware'
import { prisma } from '../../lib/prisma'

export async function platformTenantsRoutes(app: FastifyInstance) {
  // GET /api/platform/tenants — lista todos com rfidDisponivel
  app.get('/', { preHandler: requirePlatform }, async (_request, reply) => {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        nome: true,
        slug: true,
        cnpj: true,
        contato: true,
        responsavel: true,
        telefone: true,
        status: true,
        rfidDisponivel: true,
        vendaMobilePermitida: true,
      },
      orderBy: { nome: 'asc' },
    })
    return reply.send(tenants)
  })

  // PATCH /api/platform/tenants/:id/rfid — ativa ou desativa RFID para o tenant
  app.patch('/:id/rfid', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { disponivel } = request.body as { disponivel: boolean }

    if (typeof disponivel !== 'boolean') {
      return reply.status(400).send({ error: '"disponivel" deve ser boolean' })
    }

    try {
      const tenant = await prisma.tenant.update({
        where: { id },
        data: { rfidDisponivel: disponivel },
        select: { id: true, nome: true, slug: true, rfidDisponivel: true },
      })
      return reply.send(tenant)
    } catch (err: any) {
      if (err.code === 'P2025') {
        return reply.status(404).send({ error: 'Tenant não encontrado' })
      }
      throw err
    }
  })
}
