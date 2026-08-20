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

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
}

function normalizeBodyKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = snakeToCamel(k)
    out[key] = v !== null && typeof v === 'object' && !Array.isArray(v)
      ? normalizeBodyKeys(v as Record<string, unknown>)
      : v
  }
  return out
}

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'production',
    bodyLimit: 2 * 1024 * 1024, // 2MB (para logo base64)
  })

  // ── Plugins de segurança ───────────────────────────────────────────────────
  await app.register(cors, {
    origin: true,
    credentials: true,
  })

  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  })

  // ── Decorators ─────────────────────────────────────────────────────────────
  app.decorateRequest('auth', null)
  app.decorateRequest('tenantId', null)

  // ── Middleware global de autenticação ──────────────────────────────────────
  app.addHook('onRequest', authMiddleware)

  // ── Body normalizer: aceita snake_case do frontend legado ─────────────────
  app.addHook('preHandler', async (request) => {
    if (request.body && typeof request.body === 'object' && !Array.isArray(request.body)) {
      request.body = normalizeBodyKeys(request.body as Record<string, unknown>)
    }
  })

  // ── Rotas ──────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/api/auth' })

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

  // Health check
  app.get('/health', { config: { public: true } }, async () => ({ ok: true }))

  // Config pública — usada pela tela de login para saber se RFID está ativo
  app.get('/api/sistema/config-publica', { config: { public: true } }, async (request, reply) => {
    const slug = (request.query as any).slug as string | undefined
    if (!slug) return reply.send({ rfid_ativo: true })
    try {
      const { prisma } = await import('./lib/prisma')
      const tenant = await prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) return reply.send({ rfid_ativo: true })
      const cfg = await prisma.configuracoes.findFirst({ where: { tenantId: tenant.id } })
      return reply.send({ rfid_ativo: cfg?.rfidAtivo ?? true })
    } catch {
      return reply.send({ rfid_ativo: true })
    }
  })

  // Status-licença — bypass para nova API (licença gerenciada no modelo Licenca)
  app.get('/api/sistema/status-licenca', { config: { public: true } }, async () => ({
    ativo: true, expirado: false, semLicenca: false
  }))

  // Ativação de licença — no SaaS a licença é gerenciada pela plataforma central
  app.post('/api/sistema/ativar', { config: { public: true } }, async () => ({
    success: true,
    message: 'Licença gerenciada pela plataforma SaaS — sempre ativa',
    cliente: 'SaaS',
  }))

  return app
}
