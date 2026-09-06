import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './vendas.service'

/**
 * Venda direta (balcão).
 *
 * A permissão mudou de `abrirCaixa` para `gerenciarCaixa`. A chave
 * `abrirCaixa` não existe em PERMISSOES_CARGO, e como o fallback do
 * middleware é `if (!permsCargo[permissao]) return 403`, apenas administrador
 * conseguia fazer venda de balcão — caixa e garçom levavam 403.
 *
 * `precoUnit` saiu do corpo. O preço vem do banco; ver vendas.service.ts.
 */

const vendaBody = z.object({
  idempotencyKey: z.string().min(8, 'idempotencyKey inválida').max(64),
  itens: z
    .array(
      z.object({
        produtoId: z.string().uuid('produtoId inválido'),
        quantidade: z.number().int().min(1).max(999),
        observacao: z.string().max(200).optional(),
      }),
    )
    .min(1, 'Informe ao menos um item')
    .max(100),
  metodoId: z.string().uuid('metodoId inválido'),
  valorRecebido: z.number().nonnegative().optional(),
  cliente: z.string().trim().max(80).optional(),
})

export async function vendasRoutes(app: FastifyInstance) {
  // POST /api/vendas
  app.post(
    '/',
    { preHandler: [requireTenant, requirePermissao('gerenciarCaixa')] },
    async (request, reply) => {
      const body = vendaBody.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.issues[0]?.message ?? 'Dados inválidos' })
      }

      const auth = request.auth as TenantJwtPayload
      const resultado = await Service.registrarVenda(request.tenantId!, {
        ...body.data,
        usuarioId: auth.sub,
      })
      return reply.status(resultado.repetido ? 200 : 201).send(resultado)
    },
  )
}
