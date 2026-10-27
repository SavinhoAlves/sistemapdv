import type { FastifyInstance } from 'fastify'
import { loginSchema, loginRfidSchema, refreshSchema } from './auth.schema'
import * as AuthService from './auth.service'
import { verifyAccessToken, signOperadorToken, type TenantJwtPayload } from '../../lib/jwt'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { prisma } from '../../lib/prisma'
import { motivoSemAcessoPeloQr } from '../configuracoes/configuracoes.service'

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post('/login', { config: { public: true } }, async (request, reply) => {
    const result = loginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: result.error.errors[0].message })
    }
    try {
      const data = await AuthService.loginComSenha(
        result.data.identificador,
        result.data.senha,
        result.data.slug
      )
      return reply.send(data)
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // GET /api/auth/restaurante?ref=1001 — resolve código numérico ou slug do restaurante
  app.get('/restaurante', { config: { public: true } }, async (request, reply) => {
    const ref = String((request.query as any).ref ?? '').trim()
    if (!ref) return reply.status(400).send({ error: 'Informe o código do restaurante' })
    const tenant = await AuthService.buscarTenant(ref)
    if (!tenant) return reply.status(404).send({ error: 'Restaurante não encontrado' })
    return reply.send({ codigo: tenant.codigo, slug: tenant.slug, nome: tenant.nome })
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

  // POST /api/auth/pin — desativado. Entrava só com PIN + restaurante, sem
  // senha; com o PIN do celular (4 a 6 dígitos) cadastrado, isso abriria uma
  // sessão de administrador para quem chutasse números. Nenhuma tela usava.
  app.post('/pin', { config: { public: true } }, async (_request, reply) => {
    return reply.status(410).send({ error: 'Entrada só com PIN foi desativada. Use usuário e senha, código ou QR' })
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
      if (!tenant?.vendaMobilePermitida) return reply.send({ ativo: false })
      const cfg = await prisma.configuracoes.findFirst({ where: { tenantId: tenant.id }, select: { vendaMobileAtiva: true } })
      return reply.send({ ativo: cfg?.vendaMobileAtiva ?? true })
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

      // Mesmas regras de quando o QR foi gerado (o caixa pode ter fechado desde então)
      const motivo = await motivoSemAcessoPeloQr(payload.tenantId, payload.cargo)
      if (motivo) return reply.status(403).send({ error: motivo })

      return reply.send({
        token,
        slug: payload.slug,
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

  // POST /api/auth/rfid-identify — identifica quem passou o cartão durante a sessão.
  // Exige a sessão do restaurante (antes era pública e revelava as mesas do garçom
  // a quem tivesse um código de cartão) e não cria sessão nova. Devolve o token
  // curto do operador (X-Operador) e as mesas abertas do garçom.
  // No celular (sem leitor) vem `pin` no lugar do cartão: confere o PIN de quem
  // está logado e devolve o mesmo que o cartão dele devolveria.
  app.post('/rfid-identify', { preHandler: [requireTenant] }, async (request, reply) => {
    const body = request.body as any
    const cartaoRfid = String(body?.cartaoRfid || body?.rfid || '').trim()
    const pin = typeof body?.pin === 'string' ? body.pin.trim() : ''
    if (!cartaoRfid && !pin) return reply.status(400).send({ error: 'RFID obrigatório' })
    const tenantId = request.tenantId!
    const auth = request.auth as TenantJwtPayload
    try {
      const usuario = pin
        ? await AuthService.identificarPin(auth.sub, pin, tenantId)
        : await AuthService.identificarRfid(cartaoRfid, tenantId)
      // 404 (e não 401): 401 derrubaria a sessão do caixa no navegador
      if (!usuario) return reply.status(404).send({ error: pin ? 'Usuário não encontrado' : 'Cartão não reconhecido' })
      const data = { usuario }
      const operadorToken = signOperadorToken({ sub: usuario.id, tid: tenantId, nome: usuario.nome, cargo: usuario.cargo, perfilId: usuario.perfilId, permissoes: usuario.permissoes })

      const tenant = { id: tenantId }
      let mesas: object[] = []
      if (tenant) {
        const mesasDb = await prisma.mesa.findMany({
          where: { tenantId: tenant.id, garcomId: data.usuario.id, status: 'aberta' },
          include: {
            pedidos: {
              where: { status: { not: 'fechado' } },
              include: {
                itens: { where: { status: { not: 'cancelado' } } },
              },
            },
          },
          orderBy: { numero: 'asc' },
        })
        mesas = mesasDb.map(m => {
          const itens  = m.pedidos.flatMap(p => p.itens)
          const total  = itens.reduce((s, i) => s + Number(i.precoTotal), 0)
          const nItens = itens.reduce((s, i) => s + i.quantidade, 0)
          return { id: m.id, numero: m.numero, nome_mesa: m.nomeMesa, cliente: m.cliente, total, n_itens: nItens }
        })
      }

      return reply.send({ usuario: data.usuario, mesas, operadorToken })
    } catch (err: any) {
      return reply.status(err.status ?? 400).send({ error: err.message })
    }
  })
}
