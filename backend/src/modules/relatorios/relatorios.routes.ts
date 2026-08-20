import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import * as Service from './relatorios.service'

export async function relatoriosRoutes(app: FastifyInstance) {
  const opts = { preHandler: [requireTenant, requirePermissao('verRelatorios')] }

  app.get('/filtros', opts, async (request) => {
    return Service.filtros(request.tenantId!)
  })

  app.get('/', opts, async (request) => {
    const q = request.query as any
    return Service.visaoGeral(request.tenantId!, {
      dataInicio: q.dataInicio,
      dataFim:    q.dataFim,
      garcomId:   q.garcomId !== 'todos' ? q.garcomId : undefined,
      metodoId:   q.metodoId !== 'todos' ? q.metodoId : undefined,
    })
  })

  app.get('/produtos', opts, async (request) => {
    const q = request.query as any
    return Service.produtos(request.tenantId!, {
      dataInicio:  q.dataInicio,
      dataFim:     q.dataFim,
      garcomId:    q.garcomId !== 'todos' ? q.garcomId : undefined,
      categoriaId: q.categoriaId !== 'todos' ? q.categoriaId : undefined,
    })
  })

  app.get('/mesas', opts, async (request) => {
    const q = request.query as any
    return Service.mesas(request.tenantId!, {
      dataInicio: q.dataInicio,
      dataFim:    q.dataFim,
      garcomId:   q.garcomId !== 'todos' ? q.garcomId : undefined,
      metodoId:   q.metodoId !== 'todos' ? q.metodoId : undefined,
    })
  })

  app.get('/caixa', opts, async (request) => {
    const q = request.query as any
    return Service.caixa(request.tenantId!, {
      dataInicio:    q.dataInicio,
      dataFim:       q.dataFim,
      funcionarioId: q.funcionarioId !== 'todos' ? q.funcionarioId : undefined,
    })
  })

  app.get('/auditoria', opts, async (request) => {
    const q = request.query as any
    return Service.auditoria(request.tenantId!, {
      acao:       q.acao,
      dataInicio: q.dataInicio,
      dataFim:    q.dataFim,
      limite:     q.limite ? Number(q.limite) : undefined,
    })
  })
}
