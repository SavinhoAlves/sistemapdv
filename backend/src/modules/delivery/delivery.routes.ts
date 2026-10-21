import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './delivery.service'

const responder = async (reply: any, fn: () => Promise<any>) => {
  try { return await fn() } catch (e: any) {
    if (e?.status) return reply.status(e.status).send({ error: e.message })
    throw e
  }
}
const primeiro = (e: z.ZodError) => e.issues[0]?.message ?? 'Dados inválidos'

/** Rotas do caixa (/api/delivery): fila de pedidos do cardápio online e configurações. */
export async function deliveryRoutes(app: FastifyInstance) {
  const caixa = { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] }
  const cfg   = { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }
  const id = (r: any) => (r.params as { id: string }).id
  const usuario = (r: any) => (r.auth as TenantJwtPayload).sub

  app.get('/pedidos', caixa, async (request) => Service.listar(request.tenantId!))
  app.post('/pedidos/:id/aceitar', caixa, async (request, reply) =>
    responder(reply, () => Service.aceitar(request.tenantId!, id(request), usuario(request))))
  app.post('/pedidos/:id/recusar', caixa, async (request, reply) => {
    const b = z.object({ motivo: z.string().trim().min(3, 'Diga ao cliente o motivo') }).safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, () => Service.recusar(request.tenantId!, id(request), b.data.motivo))
  })
  app.post('/pedidos/:id/saiu', caixa, async (request, reply) =>
    responder(reply, () => Service.saiu(request.tenantId!, id(request))))
  app.post('/pedidos/:id/concluir', caixa, async (request, reply) => {
    const b = z.object({
      metodoId: z.string().uuid('Escolha a forma de pagamento'),
      valorRecebido: z.number().nonnegative().optional(),
      idempotencyKey: z.string().min(8).max(64),
    }).safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, () => Service.concluir(request.tenantId!, id(request), b.data, usuario(request)))
  })

  app.get('/config', cfg, async (request) => Service.config(request.tenantId!))
  app.put('/config', cfg, async (request, reply) => {
    const b = z.object({
      ativo: z.boolean().optional(), entrega: z.boolean().optional(), retirada: z.boolean().optional(),
      taxaEntrega: z.number().min(0).max(500).optional(), pedidoMinimo: z.number().min(0).max(5000).optional(),
      tempoMin: z.number().int().min(5).max(240).optional(), mensagem: z.string().max(200).nullable().optional(),
    }).safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, () => Service.salvarConfig(request.tenantId!, b.data))
  })
}

/** Rotas públicas (/api/publico): cardápio, envio do pedido e acompanhamento. Sem login. */
export async function deliveryPublicoRoutes(app: FastifyInstance) {
  const publico = { config: { public: true } }

  app.get('/cardapio/:slug', publico, async (request, reply) =>
    responder(reply, () => Service.cardapio((request.params as any).slug)))

  const novoPedido = z.object({
    tipo: z.enum(['entrega', 'retirada']),
    clienteNome: z.string().trim().min(2, 'Informe seu nome').max(80),
    clienteTelefone: z.string().transform((t) => t.replace(/\D/g, '')).pipe(z.string().min(10, 'Informe um telefone com DDD').max(13)),
    endereco: z.string().max(140).optional(), numero: z.string().max(20).optional(), bairro: z.string().max(80).optional(),
    complemento: z.string().max(80).optional(), referencia: z.string().max(140).optional(),
    formaPagamento: z.enum(['dinheiro', 'cartao', 'pix']),
    trocoPara: z.number().nonnegative().nullable().optional(),
    observacao: z.string().max(300).optional(),
    itens: z.array(z.object({
      produtoId: z.string().uuid(), quantidade: z.number().int().min(1).max(99), observacao: z.string().max(140).optional(),
    })).min(1, 'Escolha ao menos um item').max(60),
  })
  // Envio de pedido: limite apertado por IP (o global é 200/min)
  app.post('/cardapio/:slug/pedidos', { ...publico, config: { public: true, rateLimit: { max: 8, timeWindow: '10 minutes' } } }, async (request, reply) => {
    const b = novoPedido.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, async () => reply.status(201).send(await Service.criarPedido((request.params as any).slug, b.data)))
  })

  app.get('/pedidos/:codigo', publico, async (request, reply) =>
    responder(reply, () => Service.acompanhar((request.params as any).codigo)))
}
