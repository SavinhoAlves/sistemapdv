import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './caixa.service'

/**
 * Rotas de caixa.
 *
 * Mudanças:
 * - `/fechar` devolve 409 com a lista de comandas quando há saldo em aberto.
 *   Antes dava para fechar o caixa com comandas ativas, e os pagamentos
 *   seguintes travavam em "nenhum caixa aberto" no meio do serviço.
 * - `forcar: true` permite fechar mesmo assim, e isso vai para a auditoria.
 * - `/historico` paginado. Antes era `take: 30` fixo, sem paginação.
 */

const abrirBody = z.object({
  valorInicial: z.number().nonnegative().default(0),
  funcionarioId: z.string().uuid().optional(),
})

const fecharBody = z.object({
  caixaId: z.string().uuid('caixaId inválido'),
  valorContado: z.number().nonnegative('valorContado é obrigatório'),
  observacao: z.string().trim().max(300).optional(),
  forcar: z.boolean().optional(),
})

const movimentoBody = z.object({
  tipo: z.enum(['suprimento', 'sangria'], {
    errorMap: () => ({ message: 'tipo deve ser "suprimento" ou "sangria"' }),
  }),
  valor: z.number().positive('valor deve ser maior que zero'),
  descricao: z.string().trim().max(200).optional(),
})

const idParam = z.object({ id: z.string().uuid('id inválido') })

export async function caixaRoutes(app: FastifyInstance) {
  // GET /api/caixa/atual — agora já vem com o resumo da conferência
  app.get('/atual', { preHandler: [requireTenant] }, async (request) =>
    Service.caixaAtual(request.tenantId!),
  )

  app.post(
    '/abrir',
    { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] },
    async (request, reply) => {
      const body = abrirBody.safeParse(request.body ?? {})
      if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

      const auth = request.auth as TenantJwtPayload
      const caixa = await Service.abrirCaixa(request.tenantId!, {
        funcionarioId: body.data.funcionarioId || auth.sub,
        valorInicial: body.data.valorInicial,
      })
      return reply.status(201).send(caixa)
    },
  )

  app.post(
    '/fechar',
    { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] },
    async (request, reply) => {
      const body = fecharBody.safeParse(request.body)
      if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

      const auth = request.auth as TenantJwtPayload
      return Service.fecharCaixa(request.tenantId!, {
        ...body.data,
        fechadoPorId: auth.sub,
      })
    },
  )

  app.post(
    '/movimento',
    { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] },
    async (request, reply) => {
      const body = movimentoBody.safeParse(request.body)
      if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

      const auth = request.auth as TenantJwtPayload
      const mov = await Service.registrarMovimento(request.tenantId!, {
        ...body.data,
        usuarioId: auth.sub,
      })
      return reply.status(201).send(mov)
    },
  )

  app.get('/mesas-abertas', { preHandler: [requireTenant] }, async (request) =>
    Service.mesasAbertas(request.tenantId!),
  )

  app.get('/movimentos', { preHandler: [requireTenant] }, async (request) =>
    Service.movimentos(request.tenantId!),
  )

  app.get(
    '/historico',
    { preHandler: [requireTenant, requirePermissao('verRelatorios')] },
    async (request) => {
      const { pagina, porPagina } = request.query as { pagina?: string; porPagina?: string }
      return Service.historico(
        request.tenantId!,
        Math.max(Number(pagina) || 1, 1),
        Math.min(Math.max(Number(porPagina) || 20, 1), 100),
      )
    },
  )

  app.get(
    '/historico/:id',
    { preHandler: [requireTenant, requirePermissao('verRelatorios')] },
    async (request, reply) => {
      const params = idParam.safeParse(request.params)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      return Service.historicoDetalhe(request.tenantId!, params.data.id)
    },
  )
}

function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? 'Dados inválidos'
}
