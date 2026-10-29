import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requireAlgumaPermissao } from '../../middlewares/permission.middleware'
import * as Service from './dashboard.service'

/**
 * Resumo por período (hoje, ontem, 7 ou 30 dias). Quem vê relatórios vê o Dashboard; o garçom também
 * (verDashboard), para o terminal de evento ter para onde sair das Mesas.
 */
export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/stats',
    { preHandler: [requireTenant, requireAlgumaPermissao('verDashboard', 'verRelatorios')] },
    async (request) => {
      // ?periodo=hoje|ontem|7d|30d (padrão: hoje)
      const p = String((request.query as any)?.periodo ?? 'hoje')
      return Service.stats(request.tenantId!, (Service.PERIODOS as readonly string[]).includes(p) ? p as Service.Periodo : 'hoje')
    },
  )
}
