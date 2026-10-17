import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requirePlatform } from '../../middlewares/tenant.middleware'
import * as PlatformAuthService from './platform-auth.service'

const loginSchema   = z.object({ email: z.string().email(), senha: z.string().min(1) })
const refreshSchema = z.object({ refreshToken: z.string().min(1) })
const senhaSchema   = z.object({
  senhaAtual: z.string().min(1),
  novaSenha:  z.string().min(8, 'A nova senha deve ter no mínimo 8 caracteres').max(128),
})

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

  // POST /api/platform/auth/alterar-senha — troca a senha do próprio usuário logado
  app.post('/alterar-senha', { preHandler: requirePlatform }, async (request, reply) => {
    const parsed = senhaSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
    }
    if (parsed.data.senhaAtual === parsed.data.novaSenha) {
      return reply.status(400).send({ error: 'A nova senha deve ser diferente da atual' })
    }
    try {
      await PlatformAuthService.platformAlterarSenha(request.auth!.sub, parsed.data.senhaAtual, parsed.data.novaSenha)
      return reply.send({ ok: true })
    } catch (err: any) {
      // 400 e não 401: o frontend trata 401 como sessão expirada e desloga
      return reply.status(400).send({ error: err.message })
    }
  })

  // POST /api/platform/auth/logout
  app.post('/logout', { config: { public: true } }, async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body)
    if (parsed.success) await PlatformAuthService.platformLogout(parsed.data.refreshToken)
    return reply.send({ ok: true })
  })
}
