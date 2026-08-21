import type { FastifyInstance } from 'fastify'
import { loginSchema, loginRfidSchema, loginPinSchema, refreshSchema } from './auth.schema'
import * as AuthService from './auth.service'
import { verifyAccessToken } from '../../lib/jwt'
import { prisma } from '../../lib/prisma'

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

  // GET /api/auth/mobile-status — verifica se vendas mobile estão habilitadas no tenant
  app.get('/mobile-status', { config: { public: true } }, async (request, reply) => {
    const slug = (request.query as any).slug as string | undefined
    if (!slug) return reply.send({ ativo: true })
    try {
      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      return reply.send({ ativo: tenant ? tenant.vendaMobilePermitida : false })
    } catch {
      return reply.send({ ativo: true })
    }
  })

  // POST /api/auth/mobile — valida token mobile (gerado via /usuarios/:id/mobile-token)
  app.post('/mobile', { config: { public: true } }, async (request, reply) => {
    const { token } = request.body as any
    if (!token) return reply.status(400).send({ error: 'Token obrigatório' })
    try {
      const payload = verifyAccessToken(token)
      if (payload.type !== 'tenant') return reply.status(401).send({ error: 'Token inválido' })

      const tenant = await prisma.tenant.findUnique({ where: { id: payload.tenantId } })
      if (!tenant || !tenant.vendaMobilePermitida) {
        return reply.status(403).send({ error: 'Acesso mobile não permitido para este restaurante' })
      }

      const caixaAberto = await prisma.caixa.findFirst({
        where: { tenantId: payload.tenantId, status: 'aberto' },
      })
      if (!caixaAberto) return reply.status(403).send({ error: 'Caixa fechado' })

      return reply.send({
        token,
        usuario: {
          id:         payload.sub,
          nome:       payload.nome,
          cargo:      payload.cargo,
          perfilId:   payload.perfilId,
          permissoes: payload.permissoes ?? {},
        },
      })
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' })
    }
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
