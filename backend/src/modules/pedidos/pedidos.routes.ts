import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './pedidos.service'

/**
 * Rotas de pedidos.
 *
 * Mudanças em relação à versão anterior:
 *
 * - `/:id/taxa-servico` NÃO aceita mais `taxaPct` do corpo. A versão anterior
 *   fazia `taxaPct = body.taxaPct !== undefined ? Number(body.taxaPct) : 10`,
 *   sem validação nem teto: um POST podia mandar `taxaPct: 500` e a conta
 *   multiplicava por seis. Agora o percentual vem sempre de Configuracoes.
 *
 * - `/:id/abater` passa a usar `requirePermissao('aplicarDesconto')`. Antes
 *   usava `gerenciarCaixa` — funcionalmente o mesmo conjunto de cargos hoje,
 *   mas `aplicarDesconto` já existia em PERMISSOES_CARGO e ficava morta, e é
 *   a chave que um perfil customizado precisa poder negar sem tirar o acesso
 *   ao caixa inteiro.
 *
 * - Cancelamento de item ganhou rota própria e exige motivo. O DELETE
 *   anterior apagava a linha sem rastro e sem avisar a cozinha.
 *
 * - Validação com zod em todos os corpos. Antes eram `if (!body.x) return 400`
 *   soltos, e `quantidade` aceitava float e valores absurdos.
 */

const idParam = z.object({ id: z.string().uuid('id inválido') })
const itemParam = z.object({ itemId: z.string().uuid('itemId inválido') })

const lancarBody = z.object({
  mesaId: z.string().uuid('mesaId inválido'),
  produtoId: z.string().uuid('produtoId inválido'),
  quantidade: z.number().int().min(1).max(999),
  garcomId: z.string().uuid().optional(),
  observacao: z.string().max(200).optional(),
})

const quantidadeBody = z.object({
  quantidade: z.number().int().min(0).max(999),
})

const cancelarBody = z.object({
  motivo: z.string().trim().min(3, 'Informe o motivo do cancelamento').max(200),
})

const taxaBody = z.object({ aplicar: z.boolean() })

const abaterBody = z
  .object({
    tipo: z.enum(['valor', 'percentual', 'cortesia']).default('valor'),
    valor: z.number().positive().optional(),
    percentual: z.number().positive().max(100).optional(),
    motivo: z.string().trim().min(3, 'Informe o motivo do desconto').max(200),
  })
  .refine((d) => d.tipo !== 'valor' || d.valor !== undefined, {
    message: 'valor é obrigatório para desconto em reais',
  })
  .refine((d) => d.tipo !== 'percentual' || d.percentual !== undefined, {
    message: 'percentual é obrigatório para desconto percentual',
  })

const statusBody = z.object({
  status: z.enum(['pendente', 'preparando', 'pronto', 'entregue', 'cancelado']),
})

export async function pedidosRoutes(app: FastifyInstance) {
  // ── Lançamento ───────────────────────────────────────────────────────────

  // POST /api/pedidos/lancar  (alias: /adicionar, mantido para o app atual)
  const lancar = async (request: any, reply: any) => {
    const body = lancarBody.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

    const auth = request.auth as TenantJwtPayload
    return reply.status(201).send(
      await Service.lancarItem(request.tenantId!, {
        ...body.data,
        garcomId: body.data.garcomId || auth.sub,
        usuarioId: auth.sub,
      }),
    )
  }

  app.post('/lancar', { preHandler: [requireTenant, requirePermissao('adicionarPedido')] }, lancar)
  app.post('/adicionar', { preHandler: [requireTenant, requirePermissao('adicionarPedido')] }, lancar)

  // ── Quantidade ───────────────────────────────────────────────────────────

  // PATCH /api/pedidos/itens/:itemId/quantidade
  app.patch(
    '/itens/:itemId/quantidade',
    { preHandler: [requireTenant, requirePermissao('adicionarPedido')] },
    async (request, reply) => {
      const params = itemParam.safeParse(request.params)
      const body = quantidadeBody.safeParse(request.body)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

      const auth = request.auth as TenantJwtPayload
      return Service.ajustarQuantidade(
        request.tenantId!,
        params.data.itemId,
        body.data.quantidade,
        auth.sub,
      )
    },
  )

  // PATCH /api/pedidos/itens/:itemId/decrementar — compatibilidade com o app atual
  app.patch(
    '/itens/:itemId/decrementar',
    { preHandler: [requireTenant, requirePermissao('adicionarPedido')] },
    async (request, reply) => {
      const params = itemParam.safeParse(request.params)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })

      const auth = request.auth as TenantJwtPayload
      const atual = await Service.quantidadeDoItem(request.tenantId!, params.data.itemId)
      return Service.ajustarQuantidade(request.tenantId!, params.data.itemId, atual - 1, auth.sub)
    },
  )

  // DELETE /api/pedidos/itens/:itemId
  // Remove um item ainda não enviado à cozinha. Item já em preparo ou entregue
  // não é apagado — usa-se /cancelar, que exige motivo e devolve estoque.
  app.delete(
    '/itens/:itemId',
    { preHandler: [requireTenant, requirePermissao('adicionarPedido')] },
    async (request, reply) => {
      const params = itemParam.safeParse(request.params)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })

      const auth = request.auth as TenantJwtPayload
      return Service.ajustarQuantidade(request.tenantId!, params.data.itemId, 0, auth.sub)
    },
  )

  // POST /api/pedidos/itens/:itemId/cancelar
  app.post(
    '/itens/:itemId/cancelar',
    { preHandler: [requireTenant, requirePermissao('cancelarItemPedido')] },
    async (request, reply) => {
      const params = itemParam.safeParse(request.params)
      const body = cancelarBody.safeParse(request.body)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

      const auth = request.auth as TenantJwtPayload
      return Service.cancelarItem(
        request.tenantId!,
        params.data.itemId,
        body.data.motivo,
        auth.sub,
      )
    },
  )

  // ── Leitura ──────────────────────────────────────────────────────────────
  // Rotas estáticas antes das paramétricas, por clareza — o find-my-way já
  // prioriza segmento estático sobre parâmetro, mas a ordem ajuda quem lê.

  // GET /api/pedidos/cozinha
  app.get(
    '/cozinha',
    { preHandler: [requireTenant, requirePermissao('verCozinha')] },
    async (request) => {
      const { horas } = request.query as { horas?: string }
      const janela = Math.min(Math.max(Number(horas) || 6, 1), 24)
      return Service.filaCozinha(request.tenantId!, janela)
    },
  )

  // GET /api/pedidos/mesa/:mesaId
  app.get('/mesa/:mesaId', { preHandler: [requireTenant] }, async (request, reply) => {
    const { mesaId } = request.params as { mesaId: string }
    return reply.send(await Service.comandaDaMesa(request.tenantId!, mesaId))
  })

  // ── Taxa de serviço ──────────────────────────────────────────────────────

  // PATCH /api/pedidos/:id/taxa-servico
  app.patch(
    '/:id/taxa-servico',
    { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] },
    async (request, reply) => {
      const params = idParam.safeParse(request.params)
      const body = taxaBody.safeParse(request.body)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      if (!body.success) return reply.status(400).send({ error: 'aplicar deve ser true ou false' })

      // O percentual vem SEMPRE das configurações do tenant. Não é mais
      // aceito do corpo da requisição.
      return Service.definirTaxaServico(request.tenantId!, params.data.id, body.data.aplicar)
    },
  )

  // ── Abatimentos ──────────────────────────────────────────────────────────

  // PATCH /api/pedidos/:id/abater
  app.patch(
    '/:id/abater',
    { preHandler: [requireTenant, requirePermissao('aplicarDesconto')] },
    async (request, reply) => {
      const params = idParam.safeParse(request.params)
      const body = abaterBody.safeParse(request.body)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

      const auth = request.auth as TenantJwtPayload
      return Service.abater(request.tenantId!, params.data.id, {
        ...body.data,
        usuarioId: auth.sub,
      })
    },
  )

  // DELETE /api/pedidos/abatimentos/:id
  app.delete(
    '/abatimentos/:id',
    { preHandler: [requireTenant, requirePermissao('aplicarDesconto')] },
    async (request, reply) => {
      const params = idParam.safeParse(request.params)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })

      const auth = request.auth as TenantJwtPayload
      return Service.cancelarAbatimento(request.tenantId!, params.data.id, auth.sub)
    },
  )

  // ── Status de item (cozinha) ─────────────────────────────────────────────

  // PATCH /api/pedidos/itens/:itemId/status
  app.patch(
    '/itens/:itemId/status',
    { preHandler: [requireTenant, requirePermissao('verCozinha')] },
    async (request, reply) => {
      const params = itemParam.safeParse(request.params)
      const body = statusBody.safeParse(request.body)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      if (!body.success) return reply.status(400).send({ error: 'status inválido' })

      // Cancelar exige motivo — não passa por aqui.
      if (body.data.status === 'cancelado') {
        return reply
          .status(400)
          .send({ error: 'Use POST /pedidos/itens/:itemId/cancelar, que exige motivo' })
      }

      await Service.atualizarStatusItem(request.tenantId!, params.data.itemId, body.data.status)
      return { success: true }
    },
  )
}

function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? 'Dados inválidos'
}
