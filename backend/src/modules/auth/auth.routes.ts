import type { FastifyInstance } from 'fastify'
import { loginSchema, loginRfidSchema, loginPinSchema, refreshSchema } from './auth.schema'
import * as AuthService from './auth.service'

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post('/login', { config: { public: true } }, async (request, reply) => {
    const result = loginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.errors[0].message })
    }
    try {
      const data = await AuthService.loginComEmail(
        result.data.email,
        result.data.senha,
        result.data.slug
      )
      return reply.send(data)
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // POST /api/auth/rfid
  app.post('/rfid', { config: { public: true } }, async (request, reply) => {
    const result = loginRfidSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.errors[0].message })
    }
    try {
      const data = await AuthService.loginComRfid(result.data.cartaoRfid, result.data.slug)
      return reply.send(data)
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // POST /api/auth/pin
  app.post('/pin', { config: { public: true } }, async (request, reply) => {
    const result = loginPinSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.errors[0].message })
    }
    try {
      const data = await AuthService.loginComPin(result.data.pin, result.data.slug)
      return reply.send(data)
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // POST /api/auth/refresh
  app.post('/refresh', { config: { public: true } }, async (request, reply) => {
    const result = refreshSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'refreshToken obrigatório' })
    }
    try {
      const data = await AuthService.refreshAccessToken(result.data.refreshToken)
      return reply.send(data)
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // POST /api/auth/logout
  app.post('/logout', { config: { public: true } }, async (request, reply) => {
    const { refreshToken } = request.body as any
    if (refreshToken) await AuthService.logout(refreshToken)
    return reply.send({ ok: true })
  })

  // GET /api/auth/me
  app.get('/me', async (request, reply) => {
    return reply.send({ auth: request.auth })
  })

  // POST /api/auth/rfid-identify — identifica usuário mid-session via RFID (sem refresh token)
  app.post('/rfid-identify', { config: { public: true } }, async (request, reply) => {
    const body = request.body as any
    const cartaoRfid = body.cartaoRfid || body.rfid || ''
    const slug = body.slug || ''
    if (!cartaoRfid) return reply.status(400).send({ error: 'RFID obrigatório' })
    if (!slug) return reply.status(400).send({ error: 'Slug obrigatório' })
    try {
      const data = await AuthService.loginComRfid(cartaoRfid, slug)
      return reply.send({ usuario: data.usuario })
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })
}
