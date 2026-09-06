import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './pagamentos.service'

/**
 * Rotas de pagamento.
 *
 * Mudanças:
 * - `idempotencyKey` é obrigatória. Sem ela, duplo toque no tablet ou retry
 *   após timeout gravava dois pagamentos e dois movimentos de caixa.
 * - `pedidoId` é obrigatório e `mesaId` sumiu. Antes `mesaId` era exigido e
 *   `pedidoId` era recebido e ignorado — com dois pedidos abertos na mesma
 *   mesa, pagava o errado; e venda de balcão (sem mesa) não podia pagar.
 * - `caixaId` sumiu do corpo. O cliente mandava e o servidor ignorava,
 *   buscando o caixa aberto por conta própria — payload morto.
 * - Existe rota de estorno.
 */

const pagarBody = z.object({
  // Gerada pelo cliente com crypto.randomUUID() e REENVIADA em caso de retry.
  idempotencyKey: z.string().min(8, 'idempotencyKey inválida').max(64),
  pedidoId: z.string().uuid('pedidoId inválido'),
  metodoId: z.string().uuid('metodoId inválido'),
  valorPago: z.number().positive('valorPago deve ser maior que zero'),
  valorRecebido: z.number().nonnegative().optional(),
})

const estornarBody = z.object({
  motivo: z.string().trim().min(5, 'Informe o motivo do estorno').max(200),
})

const metodoBody = z.object({ nome: z.string().trim().min(1, 'nome é obrigatório').max(40) })
const toggleBody = z.object({ ativo: z.boolean() })
const idParam = z.object({ id: z.string().uuid('id inválido') })

export async function pagamentosRoutes(app: FastifyInstance) {
  // ── Formas de pagamento ──────────────────────────────────────────────────

  app.get('/metodos', { preHandler: [requireTenant] }, async (request) =>
    Service.listarMetodos(request.tenantId!),
  )

  app.get(
    '/metodos/todos',
    { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] },
    async (request) => Service.todosMetodos(request.tenantId!),
  )

  app.post(
    '/metodos',
    { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] },
    async (request, reply) => {
      const body = metodoBody.safeParse(request.body)
      if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })
      return reply.status(201).send(await Service.criarMetodo(request.tenantId!, body.data.nome))
    },
  )

  app.patch(
    '/metodos/:id',
    { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] },
    async (request, reply) => {
      const params = idParam.safeParse(request.params)
      const body = toggleBody.safeParse(request.body)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      if (!body.success) return reply.status(400).send({ error: 'ativo deve ser true ou false' })
      return Service.toggleMetodo(request.tenantId!, params.data.id, body.data.ativo)
    },
  )

  // ── Recebimento ──────────────────────────────────────────────────────────

  // POST /api/pagamentos
  //
  // Resposta traz `repetido: true` quando a chave de idempotência já havia
  // sido usada. O frontend deve tratar isso como sucesso, não como erro —
  // significa que o pagamento anterior valeu.
  app.post('/', { preHandler: [requireTenant] }, async (request, reply) => {
    const body = pagarBody.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

    const auth = request.auth as TenantJwtPayload
    const resultado = await Service.registrarPagamento(request.tenantId!, {
      ...body.data,
      usuarioId: auth.sub,
      ip: request.ip,
    })
    return reply.status(resultado.repetido ? 200 : 201).send(resultado)
  })

  // POST /api/pagamentos/:id/estornar
  app.post(
    '/:id/estornar',
    { preHandler: [requireTenant, requirePermissao('estornarPagamento')] },
    async (request, reply) => {
      const params = idParam.safeParse(request.params)
      const body = estornarBody.safeParse(request.body)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

      const auth = request.auth as TenantJwtPayload
      return Service.estornarPagamento(
        request.tenantId!,
        params.data.id,
        body.data.motivo,
        auth.sub,
      )
    },
  )
}

function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? 'Dados inválidos'
}
