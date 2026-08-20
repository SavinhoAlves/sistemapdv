import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './pedidos.service'
import { prisma } from '../../lib/prisma'

export async function pedidosRoutes(app: FastifyInstance) {
  // POST /api/pedidos/adicionar
  app.post('/adicionar', { preHandler: [requireTenant, requirePermissao('adicionarPedido')] }, async (request, reply) => {
    const body = request.body as any
    const auth = request.auth as TenantJwtPayload
    const tenantId = request.tenantId!

    if (!body.mesaId) return reply.status(400).send({ error: 'mesaId é obrigatório' })
    if (!body.produtoId) return reply.status(400).send({ error: 'produtoId é obrigatório' })
    if (!body.quantidade || Number(body.quantidade) <= 0)
      return reply.status(400).send({ error: 'quantidade deve ser maior que zero' })

    try {
      const result = await Service.adicionarItem(tenantId, {
        mesaId: body.mesaId,
        produtoId: body.produtoId,
        quantidade: Number(body.quantidade),
        garcomId: body.garcomId || auth.sub,
        usuarioId: auth.sub,
        observacao: body.observacao,
      })
      return reply.status(201).send(result)
    } catch (err: any) {
      if (err.status === 404) return reply.status(404).send({ error: err.message })
      if (err.status === 400) return reply.status(400).send({ error: err.message })
      throw err
    }
  })

  // PATCH /api/pedidos/itens/:itemId/decrementar
  app.patch('/itens/:itemId/decrementar', { preHandler: [requireTenant, requirePermissao('adicionarPedido')] }, async (request, reply) => {
    const { itemId } = request.params as any
    const auth = request.auth as TenantJwtPayload
    try {
      return await Service.decrementarItem(request.tenantId!, itemId, auth.sub)
    } catch (err: any) {
      if (err.status === 404) return reply.status(404).send({ error: err.message })
      throw err
    }
  })

  // DELETE /api/pedidos/itens/:itemId
  app.delete('/itens/:itemId', { preHandler: [requireTenant, requirePermissao('adicionarPedido')] }, async (request, reply) => {
    const { itemId } = request.params as any
    const auth = request.auth as TenantJwtPayload
    try {
      return await Service.excluirItem(request.tenantId!, itemId, auth.sub)
    } catch (err: any) {
      if (err.status === 404) return reply.status(404).send({ error: err.message })
      throw err
    }
  })

  // GET /api/pedidos/cozinha — antes do /:id para evitar conflito de rota
  app.get('/cozinha', { preHandler: [requireTenant, requirePermissao('verCozinha')] }, async (request, reply) => {
    return Service.pedidosCozinha(request.tenantId!)
  })

  // GET /api/pedidos/mesa/:mesaId
  app.get('/mesa/:mesaId', { preHandler: [requireTenant] }, async (request, reply) => {
    const { mesaId } = request.params as any
    const pedido = await Service.pedidoAtualDaMesa(request.tenantId!, mesaId)
    if (!pedido) return reply.status(404).send({ error: 'Nenhum pedido aberto nessa mesa' })
    return pedido
  })

  // PATCH /api/pedidos/:id/taxa-servico
  app.patch('/:id/taxa-servico', { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] }, async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    const tenantId = request.tenantId!

    const aplicar = Boolean(body.aplicar)
    // Busca taxa padrão das configurações se aplicar=true e não forneceu taxaPct
    let taxaPct = body.taxaPct !== undefined ? Number(body.taxaPct) : 10

    if (aplicar && body.taxaPct === undefined) {
      const config = await prisma.configuracoes.findFirst({ where: { tenantId } })
      taxaPct = config ? Number(config.taxaServicoPct) : 10
    }

    try {
      await Service.aplicarTaxaServico(tenantId, id, aplicar, taxaPct)
      return { success: true }
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Pedido não encontrado' })
      throw err
    }
  })

  // PATCH /api/pedidos/:id/abater
  app.patch('/:id/abater', { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] }, async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    const auth = request.auth as TenantJwtPayload

    if (!body.valor || Number(body.valor) <= 0)
      return reply.status(400).send({ error: 'valor deve ser maior que zero' })

    try {
      await Service.aplicarDesconto(
        request.tenantId!,
        id,
        Number(body.valor),
        body.motivo || 'Desconto aplicado',
        auth.sub,
      )
      return { success: true }
    } catch (err: any) {
      if (err.status === 404) return reply.status(404).send({ error: err.message })
      throw err
    }
  })

  // PATCH /api/pedidos/itens/:itemId/status
  app.patch('/itens/:itemId/status', { preHandler: [requireTenant, requirePermissao('verCozinha')] }, async (request, reply) => {
    const { itemId } = request.params as any
    const { status } = request.body as any

    if (!status) return reply.status(400).send({ error: 'status é obrigatório' })

    try {
      await Service.atualizarStatusItem(request.tenantId!, itemId, status)
      return { success: true }
    } catch (err: any) {
      if (err.status === 400) return reply.status(400).send({ error: err.message })
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Item não encontrado' })
      throw err
    }
  })
}
