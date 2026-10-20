import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import * as Service from './relatorios.service'

const DIA = /^\d{4}-\d{2}-\d{2}$/

/** Query → Filtros. "todos" ou vazio = sem filtro. garcomId é o nome antigo de funcionarioId. */
function lerFiltros(q: any): Service.Filtros {
  const v = (x: unknown) => (typeof x === 'string' && x && x !== 'todos' ? x : undefined)
  const dia = (x: unknown) => (typeof x === 'string' && DIA.test(x) ? x : undefined)
  const origem = v(q.origem)
  return {
    dataInicio:    dia(q.dataInicio),
    dataFim:       dia(q.dataFim),
    funcionarioId: v(q.funcionarioId) ?? v(q.garcomId),
    metodoId:      v(q.metodoId),
    categoriaId:   v(q.categoriaId),
    produtoId:     v(q.produtoId),
    origem:        origem === 'mesa' || origem === 'balcao' ? origem : undefined,
    status:        typeof q.status === 'string' ? q.status : undefined,
  }
}

export async function relatoriosRoutes(app: FastifyInstance) {
  const opts = { preHandler: [requireTenant, requirePermissao('verRelatorios')] }

  app.get('/filtros', opts, async (request) => Service.filtros(request.tenantId!))

  app.get('/',          opts, async (request) => Service.visaoGeral(request.tenantId!, lerFiltros(request.query)))
  app.get('/vendas',    opts, async (request) => Service.vendas(request.tenantId!, lerFiltros(request.query)))
  app.get('/produtos',  opts, async (request) => Service.produtos(request.tenantId!, lerFiltros(request.query)))
  app.get('/mesas',     opts, async (request) => Service.mesas(request.tenantId!, lerFiltros(request.query)))
  app.get('/descontos', opts, async (request) => Service.descontos(request.tenantId!, lerFiltros(request.query)))
  app.get('/caixa',     opts, async (request) => Service.caixa(request.tenantId!, lerFiltros(request.query)))
  app.get('/estoque',   opts, async (request) => Service.estoque(request.tenantId!, lerFiltros(request.query)))

  app.get('/auditoria', opts, async (request) => {
    const q = request.query as any
    return Service.auditoria(request.tenantId!, {
      ...lerFiltros(q),
      acao:   typeof q.acao === 'string' && q.acao ? q.acao : undefined,
      limite: q.limite ? Number(q.limite) : undefined,
    })
  })
}
