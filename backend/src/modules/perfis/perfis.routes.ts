import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import * as Service from './perfis.service'

export async function perfisRoutes(app: FastifyInstance) {
  // GET /api/perfis
  app.get('/', { preHandler: [requireTenant] }, async (request, reply) => {
    return Service.listar(request.tenantId!)
  })

  // POST /api/perfis
  app.post('/', { preHandler: [requireTenant, requirePermissao('gerenciarPerfis')] }, async (request, reply) => {
    const body = request.body as any
    if (typeof body.nome !== 'string' || !body.nome.trim()) return reply.status(400).send({ error: 'nome é obrigatório' })
    try {
      const perfil = await Service.criar(request.tenantId!, {
        nome: body.nome,
        descricao: body.descricao,
        permissoes: body.permissoes,
      })
      return reply.status(201).send(perfil)
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: 'Já existe um perfil com esse nome' })
      throw err
    }
  })

  // PUT /api/perfis/:id
  app.put('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarPerfis')] }, async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    try {
      const perfil = await Service.atualizar(request.tenantId!, id, {
        nome: body.nome,
        descricao: body.descricao,
        permissoes: body.permissoes,
      })
      return perfil
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: 'Já existe um perfil com esse nome' })
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Perfil não encontrado' })
      throw err
    }
  })

  // POST /api/perfis/seed
  app.post('/seed', { preHandler: [requireTenant, requirePermissao('gerenciarPerfis')] }, async (request, reply) => {
    const result = await Service.seed(request.tenantId!)
    return { success: true, perfis: result }
  })
}
