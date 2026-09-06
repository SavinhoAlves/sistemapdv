import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import * as Service from './dashboard.service'

/**
 * Inalterado em relação ao original — já estava correto.
 * Mantido no pacote só para a árvore ficar completa.
 */
export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/stats',
    { preHandler: [requireTenant, requirePermissao('verRelatorios')] },
    async (request) => Service.stats(request.tenantId!),
  )
}
