import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requireAlgumaPermissao } from '../../middlewares/permission.middleware'
import * as Service from './dashboard.service'

/**
 * Resumo do dia. Quem vê relatórios vê o Dashboard; o garçom também
 * (verDashboard), para o terminal de evento ter para onde sair das Mesas.
 */
export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/stats',
    { preHandler: [requireTenant, requireAlgumaPermissao('verDashboard', 'verRelatorios')] },
    async (request) => Service.stats(request.tenantId!),
  )
}
