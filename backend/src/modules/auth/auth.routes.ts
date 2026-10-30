import type { FastifyInstance } from 'fastify'
import { loginSchema, loginRfidSchema, refreshSchema } from './auth.schema'
import { terminalDaRequisicao } from '../../lib/terminal'
import * as AuthService from './auth.service'
import { verifyAccessToken, verifyOperadorToken, signOperadorToken, OPERADOR_CARTAO_S, OPERADOR_CELULAR_S, type TenantJwtPayload } from '../../lib/jwt'
import * as Biometria from './biometria.service'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { prisma } from '../../lib/prisma'
import { motivoSemAcessoPeloQr } from '../configuracoes/configuracoes.service'
import { permissoesAtuais } from '../../lib/permissoesAtuais'
import * as Usuarios from '../usuarios/usuarios.service'

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
      // Senha certa agora: pode ativar a biometria deste aparelho em seguida
      Biometria.marcarPinRecente(data.usuario.id)
      return reply.send(data)
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // POST /api/auth/biometria/login/opcoes — desafio para entrar com o rosto/digital do aparelho
  app.post('/biometria/login/opcoes', { config: { public: true } }, async (request, reply) => {
    try {
      return await Biometria.opcoesLogin(request.headers.origin)
    } catch (err: any) {
      return reply.status(err.status ?? 400).send({ error: err.message })
    }
  })

  // POST /api/auth/biometria/login — entra com a chave (passkey) que o aparelho escolheu
  app.post('/biometria/login', { config: { public: true } }, async (request, reply) => {
    const { desafioId, resposta } = (request.body ?? {}) as { desafioId?: string; resposta?: any }
    if (!desafioId || !resposta) return reply.status(400).send({ error: 'Dados incompletos' })
    try {
      const usuario = await Biometria.loginComBiometria(desafioId, resposta, request.headers.origin)
      return reply.send(await AuthService.abrirSessao(usuario, usuario.tenant))
    } catch (err: any) {
      return reply.status(err.status ?? 401).send({ error: err.message })
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
    // Crachá só entra pelos terminais em que o administrador liberou o crachá,
    // e sempre no restaurante dono do terminal
    const terminal = await terminalDaRequisicao(request)
    if (!terminal?.cracha) {
      return reply.status(403).send({ error: 'Login por crachá não liberado neste aparelho. Peça ao administrador em Admin › Terminais.' })
    }
    try {
      const data = await AuthService.loginComRfid(result.data.cartaoRfid, terminal.tenant.slug)
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
    // Permissões de agora (banco), não as do login: é por aqui que o app
    // atualiza menu e telas quando o administrador muda algo.
    const auth = request.auth as any
    if (auth?.type === 'tenant' && auth.tenantId && auth.sub) {
      const atuais = await permissoesAtuais(auth.tenantId, auth.sub)
      // Nome de agora também: o próprio usuário pode corrigi-lo em Meu perfil
      const u = atuais && await prisma.usuario.findFirst({ where: { id: auth.sub, tenantId: auth.tenantId }, select: { nome: true } })
      if (atuais) return reply.send({ auth: { ...auth, ...atuais, ...(u ? { nome: u.nome } : {}) } })
    }
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
      // QR novo: código curto assinado (q1.…). QR antigo: o próprio token de acesso
      const doCodigo = String(token).startsWith('q1.') ? await Usuarios.sessaoPeloCodigoQr(token) : null
      if (String(token).startsWith('q1.') && !doCodigo) return reply.status(401).send({ error: 'QR inválido ou expirado' })
      const payload = doCodigo?.payload ?? verifyAccessToken(token)
      const acesso = doCodigo?.token ?? token
      if (payload.type !== 'tenant') return reply.status(401).send({ error: 'Token inválido' })

      // Mesmas regras de quando o QR foi gerado (o caixa pode ter fechado desde então)
      const motivo = await motivoSemAcessoPeloQr(payload.tenantId, payload.cargo)
      if (motivo) return reply.status(403).send({ error: motivo })

      return reply.send({
        token: acesso,
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
  // No celular (sem leitor) vem, no lugar do cartão, a confirmação de quem está
  // logado: `pin`, `biometria` (Face ID / digital) ou `renovar` (liberação de 5 min
  // ainda válida, renovada a cada uso). Devolve o mesmo que o cartão dele devolveria.
  app.post('/rfid-identify', { preHandler: [requireTenant] }, async (request, reply) => {
    const body = request.body as any
    const cartaoRfid = String(body?.cartaoRfid || body?.rfid || '').trim()
    const pin = typeof body?.pin === 'string' ? body.pin.trim() : ''
    const biometria = body?.biometria && typeof body.biometria === 'object' ? body.biometria : null
    const renovar = typeof body?.renovar === 'string' ? body.renovar : ''
    if (!cartaoRfid && !pin && !biometria && !renovar) return reply.status(400).send({ error: 'RFID obrigatório' })
    const tenantId = request.tenantId!
    const auth = request.auth as TenantJwtPayload
    const celular = !!(pin || biometria || renovar)
    try {
      let usuario
      if (renovar) {
        // Só a liberação do próprio celular, do mesmo usuário e restaurante, ainda válida
        const anterior = verifyOperadorToken(renovar)
        if (!anterior?.cel || anterior.sub !== auth.sub || anterior.tid !== tenantId) {
          return reply.status(409).send({ error: 'Confirme de novo' })
        }
        usuario = await Biometria.usuarioLiberado(auth.sub, tenantId)
      } else if (biometria) {
        usuario = await Biometria.identificarBiometria(auth.sub, tenantId, biometria, request.headers.origin)
      } else if (pin) {
        usuario = await AuthService.identificarPin(auth.sub, pin, tenantId)
      } else {
        usuario = await AuthService.identificarRfid(cartaoRfid, tenantId)
      }
      // 404 (e não 401): 401 derrubaria a sessão do caixa no navegador
      if (!usuario) return reply.status(404).send({ error: celular ? 'Usuário não encontrado' : 'Cartão não reconhecido' })
      const data = { usuario }
      const operadorToken = signOperadorToken(
        { sub: usuario.id, tid: tenantId, nome: usuario.nome, cargo: usuario.cargo, perfilId: usuario.perfilId, permissoes: usuario.permissoes },
        { celular },
      )
      const operadorValidadeS = celular ? OPERADOR_CELULAR_S : OPERADOR_CARTAO_S

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

      return reply.send({ usuario: data.usuario, mesas, operadorToken, operadorValidadeS })
    } catch (err: any) {
      return reply.status(err.status ?? 400).send({ error: err.message })
    }
  })

  // ── Face ID / digital do celular (passkey), sempre do usuário logado ────────
  const biometriaRota = (fn: (auth: TenantJwtPayload, tenantId: string, body: any, origin: string | undefined) => Promise<unknown>) =>
    async (request: any, reply: any) => {
      try {
        return reply.send(await fn(request.auth as TenantJwtPayload, request.tenantId!, request.body ?? {}, request.headers.origin))
      } catch (err: any) {
        return reply.status(err.status ?? 400).send({ error: err.message })
      }
    }

  // Ativar neste celular: exige um PIN certo nos últimos minutos
  app.post('/biometria/opcoes-cadastro', { preHandler: [requireTenant] }, biometriaRota((auth, tenantId, _b, origin) =>
    Biometria.opcoesCadastro(auth.sub, tenantId, origin)))
  app.post('/biometria/cadastrar', { preHandler: [requireTenant] }, biometriaRota((auth, tenantId, body, origin) =>
    Biometria.cadastrar(auth.sub, tenantId, body.resposta, origin, typeof body.aparelho === 'string' ? body.aparelho : undefined)))
  // Desafio para confirmar (a resposta vai em /rfid-identify como `biometria`)
  app.post('/biometria/opcoes', { preHandler: [requireTenant] }, biometriaRota((auth, tenantId, _b, origin) =>
    Biometria.opcoesEntrada(auth.sub, tenantId, origin)))
  app.post('/biometria/remover', { preHandler: [requireTenant] }, biometriaRota(async (auth, tenantId, body) => {
    await Biometria.remover(auth.sub, tenantId, String(body.credentialId ?? ''))
    return { ok: true }
  }))
}
