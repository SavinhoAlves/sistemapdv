import type { FastifyInstance } from 'fastify'
import { timingSafeEqual } from 'crypto'
import { requirePlatform } from '../../middlewares/tenant.middleware'
import { AsaasErro } from '../../lib/asaas'
import * as Asaas from './asaas.service'

const responder = (reply: any, e: any) =>
  reply.status(e instanceof AsaasErro ? e.status : (e?.status ?? 500)).send({ error: e?.message || 'Erro no Asaas' })

/** Painel: ligar, ver e desligar a cobrança automática de um restaurante. */
export async function platformAsaasRoutes(app: FastifyInstance) {
  app.get('/:id/cobranca-automatica', { preHandler: requirePlatform }, async (request, reply) => {
    try { return await Asaas.situacaoCobranca((request.params as any).id) } catch (e) { return responder(reply, e) }
  })
  app.post('/:id/cobranca-automatica', { preHandler: requirePlatform }, async (request, reply) => {
    try { return await Asaas.ativarCobranca((request.params as any).id) } catch (e) { return responder(reply, e) }
  })
  app.delete('/:id/cobranca-automatica', { preHandler: requirePlatform }, async (request, reply) => {
    try { return await Asaas.desativarCobranca((request.params as any).id) } catch (e) { return responder(reply, e) }
  })
}

function tokenConfere(recebido: unknown) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN
  if (!esperado || typeof recebido !== 'string') return false
  const a = Buffer.from(recebido), b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * POST /api/webhooks/asaas — avisos do Asaas (pagamento recebido etc.).
 * Só aceita com o token configurado no Asaas (cabeçalho asaas-access-token).
 * Responde 200 mesmo para eventos ignorados, senão o Asaas pausa a fila.
 */
export async function webhookAsaasRoutes(app: FastifyInstance) {
  app.post('/asaas', { config: { public: true } }, async (request, reply) => {
    if (!tokenConfere(request.headers['asaas-access-token'])) return reply.status(401).send({ error: 'Token inválido' })
    try {
      return await Asaas.processarEvento((request.body ?? {}) as any)
    } catch (e: any) {
      request.log.error({ err: e }, 'webhook asaas')
      return reply.status(500).send({ error: 'Falha ao processar' })
    }
  })
}
