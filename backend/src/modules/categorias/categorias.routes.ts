import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import * as Service from './categorias.service'

export async function categoriasRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireTenant] }, async (request, reply) => {
    const tenantId = request.tenantId!
    return Service.listar(tenantId)
  })

  app.post('/', { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] }, async (request, reply) => {
    const { nome } = request.body as any
    if (!nome?.trim()) return reply.status(400).send({ error: 'nome é obrigatório' })
    try {
      const cat = await Service.criar(request.tenantId!, nome)
      return reply.status(201).send({ success: true, id: cat.id, nome: cat.nome })
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: 'Já existe uma categoria com esse nome' })
      throw err
    }
  })

  app.put('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] }, async (request, reply) => {
    const { id } = request.params as any
    const { nome } = request.body as any
    if (!nome?.trim()) return reply.status(400).send({ error: 'nome é obrigatório' })
    try {
      await Service.atualizar(request.tenantId!, id, nome)
      return { success: true }
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: 'Já existe uma categoria com esse nome' })
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Categoria não encontrada' })
      throw err
    }
  })

  app.patch('/:id/cozinha', { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] }, async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    const vaiCozinha = body.vaiCozinha ?? body.vai_cozinha
    await Service.atualizarCozinha(request.tenantId!, id, Boolean(vaiCozinha))
    return { success: true, vaiCozinha: Boolean(vaiCozinha) }
  })

  app.delete('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] }, async (request, reply) => {
    const { id } = request.params as any
    try {
      await Service.excluir(request.tenantId!, id)
      return { success: true }
    } catch (err: any) {
      if (err.status === 400) return reply.status(400).send({ error: err.message })
      throw err
    }
  })
}
