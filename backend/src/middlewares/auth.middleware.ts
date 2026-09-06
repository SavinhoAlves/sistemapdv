import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../lib/jwt'

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

// withTenantContext saiu daqui. A instalação do contexto agora acontece em
// middlewares/tenant-context.ts, registrada em app.ts — antes esta função
// existia e nunca era chamada, deixando a extensão do Prisma inerte.

