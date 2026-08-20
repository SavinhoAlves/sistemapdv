import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../lib/jwt'
import { tenantStorage } from '../lib/prisma'

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Rotas públicas (marcadas com config.public = true no schema da rota)
  if ((request.routeOptions?.config as any)?.public) {
    request.auth     = null
    request.tenantId = null
    return
  }

  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token não fornecido' })
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyAccessToken(token)
    request.auth     = payload
    request.tenantId = payload.type === 'tenant' ? payload.tenantId : null
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}

// Hook que injeta tenantId no AsyncLocalStorage — deve rodar após authMiddleware
export function withTenantContext(
  handler: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.tenantId) {
      await tenantStorage.run({ tenantId: request.tenantId }, () => handler(request, reply))
    } else {
      await handler(request, reply)
    }
  }
}
