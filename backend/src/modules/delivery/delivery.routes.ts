import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './delivery.service'
import { chavePublicaPush, inscrever, desinscrever } from '../../lib/push'

/** Configurações do delivery: usadas pelo restaurante e pelo Platform. */
export const configBody = z.object({
  ativo: z.boolean().optional(), entrega: z.boolean().optional(), retirada: z.boolean().optional(),
  taxaEntrega: z.number().min(0).max(500).optional(), pedidoMinimo: z.number().min(0).max(5000).optional(),
  tempoMin: z.number().int().min(5).max(240).optional(), mensagem: z.string().max(200).nullable().optional(),
  mensagemWhatsapp: z.string().max(1000).nullable().optional(),
  local: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable().optional(),
})

export const responder = async (reply: any, fn: () => Promise<any>) => {
  try { return await fn() } catch (e: any) {
    if (e?.status) return reply.status(e.status).send({ error: e.message })
    throw e
  }
}
export const primeiro = (e: z.ZodError) => e.issues[0]?.message ?? 'Dados inválidos'

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
  app.post('/pedidos/:id/cancelar', caixa, async (request, reply) => {
    const b = z.object({ motivo: z.string().trim().min(3, 'Diga ao cliente o motivo') }).safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, () => Service.cancelar(request.tenantId!, id(request), b.data.motivo, usuario(request)))
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

  // ── Entregadores, atribuição e mapa ──
  app.get('/entregadores', caixa, async (request) => Service.entregadores(request.tenantId!))
  app.get('/mapa', caixa, async (request) => Service.mapa(request.tenantId!))
  app.post('/pedidos/:id/atribuir', caixa, async (request, reply) => {
    const b = z.object({ entregadorId: z.string().uuid().nullable() }).safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: 'Entregador inválido' })
    return responder(reply, () => Service.atribuir(request.tenantId!, id(request), b.data.entregadorId))
  })
  app.post('/config/localizar', cfg, async (request, reply) => responder(reply, () => Service.localizarRestaurante(request.tenantId!)))

  app.get('/config', cfg, async (request) => Service.config(request.tenantId!))
  app.put('/config', cfg, async (request, reply) => {
    const b = configBody.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, () => Service.salvarConfig(request.tenantId!, b.data))
  })
}

/** App do entregador (/api/entregador): a própria rota, posição GPS e confirmação de entrega. */
export async function entregadorRoutes(app: FastifyInstance) {
  const ent = { preHandler: [requireTenant, requirePermissao('fazerEntregas')] }
  const usuario = (r: any) => (r.auth as TenantJwtPayload).sub

  app.get('/rota', ent, async (request) => Service.minhaRota(request.tenantId!, usuario(request)))

  // Notificação push: chave pública e inscrição do aparelho
  app.get('/push/chave', ent, async () => ({ chave: chavePublicaPush() }))
  const inscricao = z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  })
  app.post('/push', ent, async (request, reply) => {
    const b = inscricao.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: 'Inscrição inválida' })
    await inscrever(request.tenantId!, usuario(request), b.data)
    return { ok: true }
  })
  app.post('/push/sair', ent, async (request, reply) => {
    const endpoint = (request.body as any)?.endpoint
    if (typeof endpoint !== 'string') return reply.status(400).send({ error: 'Inscrição inválida' })
    await desinscrever(request.tenantId!, usuario(request), endpoint)
    return { ok: true }
  })
  app.post('/rota/iniciar', ent, async (request, reply) => responder(reply, () => Service.iniciarRota(request.tenantId!, usuario(request))))
  app.post('/pedidos/:id/entregue', ent, async (request, reply) =>
    responder(reply, () => Service.confirmarEntrega(request.tenantId!, usuario(request), (request.params as any).id, (request.body as any)?.codigo)))
  // Posição: o app manda a cada ~15 s; limite folgado por usuário
  app.post('/posicao', { ...ent, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const b = z.object({
      lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
      precisao: z.number().nonnegative().max(100000).optional(), velocidade: z.number().min(0).max(100).nullable().optional(),
    }).safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: 'Posição inválida' })
    return Service.registrarPosicao(request.tenantId!, usuario(request), { ...b.data, velocidade: b.data.velocidade ?? undefined })
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
    // 'cartao' só para quem está com o cardápio antigo aberto; o caixa confirma crédito ou débito
    formaPagamento: z.enum(['dinheiro', 'credito', 'debito', 'pix', 'cartao']),
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
