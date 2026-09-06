import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { tenantStorage } from '../lib/prisma'

/**
 * Instala o tenant no AsyncLocalStorage para o resto do ciclo da requisição.
 *
 * Precisa ser registrado como wrapper do handler, não como hook comum: um
 * `onRequest` que chame `tenantStorage.run()` perde o contexto assim que
 * retorna, porque o handler roda fora daquele escopo assíncrono.
 *
 * Uso em app.ts, logo depois do authMiddleware:
 *
 *     app.addHook('preHandler', instalarContextoTenant)
 *
 * `preHandler` funciona porque o Fastify encadeia preHandler → handler dentro
 * do mesmo contexto assíncrono quando o hook não retorna antes de resolver.
 * Para garantir isso em todas as versões, usamos `enterWith`, que fixa o
 * store no contexto atual em vez de criar um novo escopo aninhado.
 */
export async function instalarContextoTenant(request: FastifyRequest, _reply: FastifyReply) {
  const tenantId = request.tenantId

  if (tenantId) {
    tenantStorage.enterWith({ tenantId })
    return
  }

  // Rotas de plataforma e rotas públicas cruzam tenants por natureza.
  // Marca explicitamente para a extensão do Prisma não bloquear.
  const auth = request.auth as { type?: string } | null
  if (auth?.type === 'platform' || (request.routeOptions?.config as any)?.public) {
    tenantStorage.enterWith({ tenantId: '' })
  }
}

/**
 * Registro conveniente. Chame depois de `app.addHook('onRequest', authMiddleware)`.
 */
export function registrarContextoTenant(app: FastifyInstance) {
  app.addHook('preHandler', instalarContextoTenant)
}
