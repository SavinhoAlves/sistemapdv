import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import * as Service from './dashboard.service'

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/stats', { preHandler: [requireTenant, requirePermissao('verRelatorios')] }, async (request) => {
    return Service.stats(request.tenantId!)
  })
}
