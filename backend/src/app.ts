import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { authMiddleware } from './middlewares/auth.middleware'
import { authRoutes } from './modules/auth/auth.routes'
import { categoriasRoutes } from './modules/categorias/categorias.routes'
import { produtosRoutes } from './modules/produtos/produtos.routes'
import { mesasRoutes } from './modules/mesas/mesas.routes'
import { pedidosRoutes } from './modules/pedidos/pedidos.routes'
import { pagamentosRoutes } from './modules/pagamentos/pagamentos.routes'
import { caixaRoutes } from './modules/caixa/caixa.routes'
import { usuariosRoutes } from './modules/usuarios/usuarios.routes'
import { configuracoesRoutes } from './modules/configuracoes/configuracoes.routes'
import { perfisRoutes } from './modules/perfis/perfis.routes'
import { dashboardRoutes } from './modules/dashboard/dashboard.routes'
import { relatoriosRoutes } from './modules/relatorios/relatorios.routes'
import { impressaoRoutes } from './modules/impressao/impressao.routes'
import { impressorasRoutes } from './modules/impressoras/impressoras.routes'
import { vendasRoutes } from './modules/vendas/vendas.routes'
import { integracoesRoutes } from './modules/integracoes/integracoes.routes'
import { platformAuthRoutes } from './modules/platform/platform-auth.routes'
import { platformTenantsRoutes } from './modules/platform/platform-tenants.routes'

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
}

function normalizeBodyKeys(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(normalizeBodyKeys)
  if (val !== null && typeof val === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[snakeToCamel(k)] = normalizeBodyKeys(v)
    }
    return out
  }
  return val
}

function normalizeResponseKeys(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(normalizeResponseKeys)
  if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[camelToSnake(k)] = normalizeResponseKeys(v)
    }
    return out
  }
  return val
}

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'production',
    bodyLimit: 2 * 1024 * 1024, // 2MB (para logo base64)
  })

  // ── Plugins de segurança ───────────────────────────────────────────────────
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  await app.register(cors, {
    origin: (origin, cb) => {
      // Permite requisições sem origin (mobile, Postman em dev, etc.)
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error('Origem não permitida pelo CORS'), false)
    },
    credentials: true,
  })

  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  // Rate limit global
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  })

  // ── Decorators ─────────────────────────────────────────────────────────────
  app.decorateRequest('auth', null)
  app.decorateRequest('tenantId', null)

  // ── Middleware global de autenticação ──────────────────────────────────────
  app.addHook('onRequest', authMiddleware)

  // ── Body normalizer: aceita snake_case do frontend legado ─────────────────
  app.addHook('preHandler', async (request) => {
    if (request.body && typeof request.body === 'object') {
      request.body = normalizeBodyKeys(request.body)
    }
  })

  // ── Response normalizer: converte camelCase → snake_case para o frontend ──
  app.addHook('onSend', async (_request, reply, payload) => {
    const ct = reply.getHeader('content-type') as string | undefined
    if (typeof payload !== 'string' || !ct?.includes('application/json')) return payload
    try {
      const parsed = JSON.parse(payload)
      return JSON.stringify(normalizeResponseKeys(parsed))
    } catch {
      return payload
    }
  })

  // ── Rotas ──────────────────────────────────────────────────────────────────
  // Rate limit mais restrito para endpoints de autenticação (anti brute-force)
  await app.register(async (authApp) => {
    await authApp.register(rateLimit, {
      max: 10,
      timeWindow: '1 minute',
      keyGenerator: (req) => req.ip,
      errorResponseBuilder: () => ({
        error: 'Muitas tentativas. Aguarde 1 minuto antes de tentar novamente.',
      }),
    })
    await authApp.register(authRoutes, { prefix: '/api/auth' })
    await authApp.register(platformAuthRoutes, { prefix: '/api/platform/auth' })
  })

  // ── Módulos de negócio ─────────────────────────────────────────────────────
  await app.register(categoriasRoutes,    { prefix: '/api/categorias' })
  await app.register(produtosRoutes,      { prefix: '/api/produtos' })
  await app.register(mesasRoutes,         { prefix: '/api/mesas' })
  await app.register(pedidosRoutes,       { prefix: '/api/pedidos' })
  await app.register(pagamentosRoutes,    { prefix: '/api/pagamentos' })
  await app.register(caixaRoutes,         { prefix: '/api/caixa' })
  await app.register(usuariosRoutes,      { prefix: '/api/usuarios' })
  await app.register(configuracoesRoutes, { prefix: '/api/configuracoes' })
  await app.register(perfisRoutes,        { prefix: '/api/perfis' })
  await app.register(dashboardRoutes,     { prefix: '/api/dashboard' })
  await app.register(relatoriosRoutes,    { prefix: '/api/relatorios' })
  await app.register(impressaoRoutes,     { prefix: '/api/impressao' })
  await app.register(impressorasRoutes,   { prefix: '/api/impressoras' })
  await app.register(vendasRoutes,        { prefix: '/api/vendas' })
  await app.register(integracoesRoutes,   { prefix: '/api/integracoes' })
  await app.register(platformTenantsRoutes, { prefix: '/api/platform/tenants' })

  // Health check
  app.get('/health', { config: { public: true } }, async () => ({ ok: true }))

  // Config pública — usada pela tela de login para saber se RFID está ativo
  app.get('/api/sistema/config-publica', { config: { public: true } }, async (request, reply) => {
    const slug = (request.query as any).slug as string | undefined
    if (!slug) return reply.send({ rfid_ativo: true })
    try {
      const { prisma } = await import('./lib/prisma')
      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) return reply.send({ rfid_ativo: false })
      const cfg = await prisma.configuracoes.findFirst({ where: { tenantId: tenant.id } })
      // rfidDisponivel = habilitado pelo super admin (feature paga)
      // rfidAtivo     = habilitado pelo admin do tenant (configuração local)
      const rfidAtivo = Boolean(tenant.rfidDisponivel) && Boolean(cfg?.rfidAtivo ?? false)
      return reply.send({ rfid_ativo: rfidAtivo, rfid_disponivel: tenant.rfidDisponivel })
    } catch {
      return reply.send({ rfid_ativo: true })
    }
  })

  // Status-licença — verifica o tenant pelo slug e checa a Licenca no banco
  app.get('/api/sistema/status-licenca', { config: { public: true } }, async (request, reply) => {
    const slug = (request.query as any).slug as string | undefined
    if (!slug) {
      return reply.send({ ativo: false, semLicenca: true, motivo: 'slug_ausente' })
    }
    try {
      const { prisma } = await import('./lib/prisma')

      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) {
        return reply.send({ ativo: false, semLicenca: true, motivo: 'tenant_nao_encontrado' })
      }
      if (tenant.status === 'suspenso' || tenant.status === 'cancelado') {
        return reply.send({ ativo: false, suspenso: true, motivo: tenant.status })
      }

      const licenca = await prisma.licenca.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
      })
      if (!licenca || licenca.status === 'pendente' || licenca.status === 'bloqueado') {
        return reply.send({ ativo: false, semLicenca: true, motivo: licenca?.status ?? 'sem_licenca' })
      }

      const expirado = licenca.dataVencimento ? licenca.dataVencimento < new Date() : false
      if (expirado) {
        return reply.send({ ativo: false, expirado: true, motivo: 'expirado', venceu_em: licenca.dataVencimento })
      }

      return reply.send({
        ativo: true,
        expirado: false,
        semLicenca: false,
        expira_em: licenca.dataVencimento,
      })
    } catch {
      // Fail-closed: em caso de erro no banco, bloqueia o acesso
      return reply.send({ ativo: false, semLicenca: true, motivo: 'erro_interno' })
    }
  })

  // Ativação de licença — no SaaS a licença é gerenciada pela plataforma central
  app.post('/api/sistema/ativar', { config: { public: true } }, async () => ({
    success: false,
    message: 'Licença gerenciada pela plataforma central SaaS — acesse o painel em :4000',
  }))

  return app
}
