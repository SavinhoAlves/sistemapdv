import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './caixa.service'

export async function caixaRoutes(app: FastifyInstance) {
  // GET /api/caixa/atual
  app.get('/atual', { preHandler: [requireTenant] }, async (request, reply) => {
    return Service.caixaAtual(request.tenantId!)
  })

  // POST /api/caixa/abrir
  app.post('/abrir', { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] }, async (request, reply) => {
    const body = request.body as any
    const auth = request.auth as TenantJwtPayload
    const valorInicial = body.valorInicial !== undefined ? Number(body.valorInicial) : 0
    try {
      const caixa = await Service.abrirCaixa(request.tenantId!, {
        funcionarioId: body.funcionarioId || auth.sub,
        valorInicial,
      })
      return reply.status(201).send(caixa)
    } catch (err: any) {
      if (err.status === 400) return reply.status(400).send({ error: err.message })
      throw err
    }
  })

  // POST /api/caixa/fechar
  app.post('/fechar', { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] }, async (request, reply) => {
    const body = request.body as any
    const auth = request.auth as TenantJwtPayload

    if (!body.caixaId) return reply.status(400).send({ error: 'caixaId é obrigatório' })
    if (body.valorContado === undefined) return reply.status(400).send({ error: 'valorContado é obrigatório' })

    try {
      const caixa = await Service.fecharCaixa(request.tenantId!, {
        caixaId: body.caixaId,
        valorContado: Number(body.valorContado),
        observacao: body.observacao,
        fechadoPorId: auth.sub,
      })
      return caixa
    } catch (err: any) {
      if (err.status === 404) return reply.status(404).send({ error: err.message })
      throw err
    }
  })

  // POST /api/caixa/movimento
  app.post('/movimento', { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] }, async (request, reply) => {
    const body = request.body as any
    const auth = request.auth as TenantJwtPayload

    const tipo = body.tipo as 'suprimento' | 'sangria'
    if (!tipo || !['suprimento', 'sangria'].includes(tipo))
      return reply.status(400).send({ error: 'tipo deve ser "suprimento" ou "sangria"' })
    if (!body.valor || Number(body.valor) <= 0)
      return reply.status(400).send({ error: 'valor deve ser maior que zero' })

    try {
      const mov = await Service.registrarMovimento(request.tenantId!, {
        tipo,
        valor: Number(body.valor),
        descricao: body.descricao,
        usuarioId: auth.sub,
      })
      return reply.status(201).send(mov)
    } catch (err: any) {
      if (err.status === 400) return reply.status(400).send({ error: err.message })
      throw err
    }
  })

  // GET /api/caixa/mesas-abertas
  app.get('/mesas-abertas', { preHandler: [requireTenant] }, async (request, reply) => {
    return Service.mesasAbertas(request.tenantId!)
  })

  // GET /api/caixa/movimentos
  app.get('/movimentos', { preHandler: [requireTenant] }, async (request, reply) => {
    return Service.movimentos(request.tenantId!)
  })

  // GET /api/caixa/historico
  app.get('/historico', { preHandler: [requireTenant, requirePermissao('verRelatorios')] }, async (request, reply) => {
    return Service.historico(request.tenantId!)
  })

  // GET /api/caixa/historico/:id
  app.get('/historico/:id', { preHandler: [requireTenant, requirePermissao('verRelatorios')] }, async (request, reply) => {
    const { id } = request.params as any
    try {
      return await Service.historicoDetalhe(request.tenantId!, id)
    } catch (err: any) {
      if (err.status === 404) return reply.status(404).send({ error: err.message })
      throw err
    }
  })
}
