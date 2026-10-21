import type { FastifyInstance } from 'fastify'
import { requirePlatform } from '../../middlewares/tenant.middleware'
import { comTenant } from '../../lib/prisma'
import * as Delivery from '../delivery/delivery.service'
import { configBody, primeiro, responder } from '../delivery/delivery.routes'

/**
 * Delivery no Platform (/api/platform/delivery): visão geral de todos os
 * restaurantes e as mesmas configurações que o restaurante tem em
 * Configurações › Delivery, ajustadas pelo gestor.
 */
export async function platformDeliveryRoutes(app: FastifyInstance) {
  const tenant = (r: any) => (r.params as { tenantId: string }).tenantId

  app.get('/', { preHandler: requirePlatform }, async () => Delivery.visaoGeralPlatform())

  app.get('/:tenantId', { preHandler: requirePlatform }, async (request) =>
    comTenant(tenant(request), async () => await Delivery.config(tenant(request))))

  app.put('/:tenantId', { preHandler: requirePlatform }, async (request, reply) => {
    const b = configBody.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, () => comTenant(tenant(request), async () => await Delivery.salvarConfig(tenant(request), b.data)))
  })

  app.post('/:tenantId/localizar', { preHandler: requirePlatform }, async (request, reply) =>
    responder(reply, () => comTenant(tenant(request), async () => await Delivery.localizarRestaurante(tenant(request)))))
}
