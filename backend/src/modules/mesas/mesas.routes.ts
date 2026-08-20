import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './mesas.service'

export async function mesasRoutes(app: FastifyInstance) {
  // GET /api/mesas
  app.get('/', { preHandler: [requireTenant, requirePermissao('abrirMesa')] }, async (request, reply) => {
    const auth = request.auth as TenantJwtPayload
    return Service.listar(request.tenantId!, auth.cargo, auth.sub)
  })

  // POST /api/mesas/abrir
  app.post('/abrir', { preHandler: [requireTenant, requirePermissao('abrirMesa')] }, async (request, reply) => {
    const body = request.body as any
    const auth = request.auth as TenantJwtPayload
    try {
      const mesa = await Service.abrir(request.tenantId!, {
        nomeMesa: body.nomeMesa,
        cliente: body.cliente,
        garcomId: body.garcomId || auth.sub,
        caixaId: body.caixaId,
        capacidade: body.capacidade,
      })
      return reply.status(201).send({ ...mesa, mesa_id: mesa.id, success: true })
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: 'Conflito ao criar mesa' })
      throw err
    }
  })

  // PATCH /api/mesas/:id/fechar
  app.patch('/:id/fechar', { preHandler: [requireTenant, requirePermissao('fecharMesa')] }, async (request, reply) => {
    const { id } = request.params as any
    try {
      const mesa = await Service.fechar(request.tenantId!, id)
      return { success: true, mesa }
    } catch (err: any) {
      if (err.status === 404) return reply.status(404).send({ error: err.message })
      throw err
    }
  })

  // GET /api/mesas/:id/produtos
  app.get('/:id/produtos', { preHandler: [requireTenant] }, async (request, reply) => {
    const { id } = request.params as any
    return Service.produtosDaMesa(request.tenantId!, id)
  })
}
