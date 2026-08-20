import type { FastifyInstance } from 'fastify'
import * as PlatformAuthService from './platform-auth.service'

export async function platformAuthRoutes(app: FastifyInstance) {
  // POST /api/platform/auth/login
  app.post('/login', { config: { public: true } }, async (request, reply) => {
    const { email, senha } = request.body as any
    if (!email || !senha) {
      return reply.status(400).send({ error: 'Email e senha obrigatórios' })
    }
    try {
      const data = await PlatformAuthService.platformLogin(email, senha)
      return reply.send(data)
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // POST /api/platform/auth/refresh
  app.post('/refresh', { config: { public: true } }, async (request, reply) => {
    const { refreshToken } = request.body as any
    if (!refreshToken) return reply.status(400).send({ error: 'refreshToken obrigatório' })
    try {
      const data = await PlatformAuthService.platformRefresh(refreshToken)
      return reply.send(data)
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // POST /api/platform/auth/logout
  app.post('/logout', { config: { public: true } }, async (request, reply) => {
    const { refreshToken } = request.body as any
    if (refreshToken) await PlatformAuthService.platformLogout(refreshToken)
    return reply.send({ ok: true })
  })
}
