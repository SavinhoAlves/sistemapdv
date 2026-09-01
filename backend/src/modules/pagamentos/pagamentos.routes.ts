import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './pagamentos.service'

export async function pagamentosRoutes(app: FastifyInstance) {
  // GET /api/pagamentos/metodos
  app.get('/metodos', { preHandler: [requireTenant] }, async (request, reply) => {
    return Service.listarMetodos(request.tenantId!)
  })

  // GET /api/pagamentos/metodos/todos
  app.get('/metodos/todos', { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] }, async (request, reply) => {
    return Service.todosMetodos(request.tenantId!)
  })

  // POST /api/pagamentos/metodos
  app.post('/metodos', { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] }, async (request, reply) => {
    const { nome } = request.body as any
    if (typeof nome !== 'string' || !nome.trim()) return reply.status(400).send({ error: 'nome é obrigatório' })
    try {
      const metodo = await Service.criarMetodo(request.tenantId!, nome)
      return reply.status(201).send(metodo)
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: 'Já existe um método com esse nome' })
      throw err
    }
  })

  // PATCH /api/pagamentos/metodos/:id
  app.patch('/metodos/:id', { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] }, async (request, reply) => {
    const { id } = request.params as any
    const { ativo } = request.body as any
    try {
      const metodo = await Service.toggleMetodo(request.tenantId!, id, Boolean(ativo))
      return metodo
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Método não encontrado' })
      throw err
    }
  })

  // POST /api/pagamentos
  app.post('/', { preHandler: [requireTenant] }, async (request, reply) => {
    const body = request.body as any
    const auth = request.auth as TenantJwtPayload

    if (!body.mesaId) return reply.status(400).send({ error: 'mesaId é obrigatório' })
    if (!body.metodoId) return reply.status(400).send({ error: 'metodoId é obrigatório' })
    if (!body.valorPago || Number(body.valorPago) <= 0)
      return reply.status(400).send({ error: 'valorPago deve ser maior que zero' })

    try {
      const result = await Service.registrarPagamento(request.tenantId!, {
        mesaId: body.mesaId,
        pedidoId: body.pedidoId,
        metodoId: body.metodoId,
        valorPago: Number(body.valorPago),
        valorRecebido: body.valorRecebido !== undefined ? Number(body.valorRecebido) : undefined,
        usuarioId: auth.sub,
      })
      return reply.status(201).send(result)
    } catch (err: any) {
      if (err.status === 400) return reply.status(400).send({ error: err.message })
      if (err.status === 404) return reply.status(404).send({ error: err.message })
      throw err
    }
  })
}
