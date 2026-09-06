import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './mesas.service'
import * as Pedidos from '../pedidos/pedidos.service'

/**
 * Rotas de comandas (tabela `mesas`).
 *
 * Mudanças:
 * - `/:id/fechar` agora chama `encerrar()`, que verifica saldo. A rota
 *   anterior chamava `fechar()`, que marcava `fechada` sem olhar a conta:
 *   uma comanda com R$ 300 em aberto sumia da tela do caixa e o pedido ficava
 *   preso em `aberto` para sempre.
 * - `/:id/conta` e `/:id/reabrir` expõem o estado `fechando`, que existia no
 *   enum e nunca era atribuído — dava para lançar item depois de o cliente
 *   ter recebido a conta impressa.
 * - `/:id/transferir` passa a existir. Estava documentada no README e não
 *   tinha implementação.
 * - `capacidade` saiu do corpo: a entidade é comanda, não mesa física.
 */

const idParam = z.object({ id: z.string().uuid('id inválido') })

const abrirBody = z.object({
  nomeMesa: z.string().trim().max(60).optional(),
  cliente: z.string().trim().max(80).optional(),
  garcomId: z.string().uuid().optional(),
  observacoes: z.string().trim().max(200).optional(),
})

const encerrarBody = z.object({
  motivo: z.string().trim().max(200).optional(),
})

const transferirBody = z.object({
  garcomId: z.string().uuid('garcomId inválido'),
})

export async function mesasRoutes(app: FastifyInstance) {
  // GET /api/mesas — resumo do salão, com total, tempo e contagem de prontos
  app.get('/', { preHandler: [requireTenant, requirePermissao('abrirMesa')] }, async (request) => {
    const auth = request.auth as TenantJwtPayload
    return Service.listar(request.tenantId!, auth.cargo, auth.sub)
  })

  // POST /api/mesas/abrir
  app.post(
    '/abrir',
    { preHandler: [requireTenant, requirePermissao('abrirMesa')] },
    async (request, reply) => {
      const body = abrirBody.safeParse(request.body ?? {})
      if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

      const auth = request.auth as TenantJwtPayload
      const mesa = await Service.abrir(request.tenantId!, {
        ...body.data,
        garcomId: body.data.garcomId || auth.sub,
        usuarioId: auth.sub,
      })
      return reply.status(201).send({ ...mesa, mesa_id: mesa.id, success: true })
    },
  )

  // GET /api/mesas/:id/produtos — comanda completa, agrupada por rodada
  app.get('/:id/produtos', { preHandler: [requireTenant] }, async (request, reply) => {
    const params = idParam.safeParse(request.params)
    if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
    return reply.send(await Pedidos.comandaDaMesa(request.tenantId!, params.data.id))
  })

  // PATCH /api/mesas/:id/conta — imprime a conta e trava novos lançamentos
  app.patch(
    '/:id/conta',
    { preHandler: [requireTenant, requirePermissao('adicionarPedido')] },
    async (request, reply) => {
      const params = idParam.safeParse(request.params)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      return { success: true, mesa: await Service.pedirConta(request.tenantId!, params.data.id) }
    },
  )

  // PATCH /api/mesas/:id/reabrir — cliente pediu mais alguma coisa
  app.patch(
    '/:id/reabrir',
    { preHandler: [requireTenant, requirePermissao('adicionarPedido')] },
    async (request, reply) => {
      const params = idParam.safeParse(request.params)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      const auth = request.auth as TenantJwtPayload
      return {
        success: true,
        mesa: await Service.reabrir(request.tenantId!, params.data.id, auth.sub),
      }
    },
  )

  // PATCH /api/mesas/:id/transferir
  app.patch(
    '/:id/transferir',
    { preHandler: [requireTenant, requirePermissao('abrirMesa')] },
    async (request, reply) => {
      const params = idParam.safeParse(request.params)
      const body = transferirBody.safeParse(request.body)
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

      const auth = request.auth as TenantJwtPayload
      return {
        success: true,
        mesa: await Service.transferir(
          request.tenantId!,
          params.data.id,
          body.data.garcomId,
          auth.sub,
        ),
      }
    },
  )

  // PATCH /api/mesas/:id/fechar — encerra a comanda
  //
  // O caminho normal de encerramento é a quitação, em POST /pagamentos.
  // Esta rota é a saída de exceção e devolve 409 com o restante quando há
  // saldo e nenhum motivo foi informado — o frontend usa isso para pedir a
  // justificativa em vez de fechar calado.
  app.patch(
    '/:id/fechar',
    { preHandler: [requireTenant, requirePermissao('fecharMesa')] },
    async (request, reply) => {
      const params = idParam.safeParse(request.params)
      const body = encerrarBody.safeParse(request.body ?? {})
      if (!params.success) return reply.status(400).send({ error: primeiroErro(params.error) })
      if (!body.success) return reply.status(400).send({ error: primeiroErro(body.error) })

      const auth = request.auth as TenantJwtPayload
      const mesa = await Service.encerrar(request.tenantId!, params.data.id, {
        usuarioId: auth.sub,
        motivo: body.data.motivo,
      })
      return { success: true, mesa }
    },
  )
}

function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? 'Dados inválidos'
}
