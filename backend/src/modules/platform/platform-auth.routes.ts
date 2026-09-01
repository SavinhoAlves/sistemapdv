import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as PlatformAuthService from './platform-auth.service'

const loginSchema   = z.object({ email: z.string().email(), senha: z.string().min(1) })
const refreshSchema = z.object({ refreshToken: z.string().min(1) })

export async function platformAuthRoutes(app: FastifyInstance) {
  // POST /api/platform/auth/login
  app.post('/login', { config: { public: true } }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Email e senha obrigatórios' })
    }
    try {
      const data = await PlatformAuthService.platformLogin(parsed.data.email, parsed.data.senha)
      return reply.send(data)
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // POST /api/platform/auth/refresh
  app.post('/refresh', { config: { public: true } }, async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: 'refreshToken obrigatório' })
    try {
      const data = await PlatformAuthService.platformRefresh(parsed.data.refreshToken)
      return reply.send(data)
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // POST /api/platform/auth/logout
  app.post('/logout', { config: { public: true } }, async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body)
    if (parsed.success) await PlatformAuthService.platformLogout(parsed.data.refreshToken)
    return reply.send({ ok: true })
  })
}
