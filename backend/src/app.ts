import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { authMiddleware } from './middlewares/auth.middleware'
import { registrarContextoTenant } from './middlewares/tenant-context'
import { registrarTratadorDeErros } from './lib/erros'
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
import { platformTicketsRoutes } from './modules/platform/platform-tickets.routes'

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

  // ── Contexto de tenant ─────────────────────────────────────────────────────
  // Instala o tenantId no AsyncLocalStorage para o resto do ciclo da
  // requisição. Sem esta linha a extensão do Prisma em lib/prisma.ts é um
  // no-op — era exatamente o que acontecia antes: `withTenantContext` existia
  // e nunca era chamado, então todo o isolamento entre restaurantes dependia
  // de cada service lembrar de escrever `tenantId` no where.
  registrarContextoTenant(app)

  // ── Tratamento de erros ────────────────────────────────────────────────────
  // Traduz erro de negócio (Object.assign(new Error, { status })), ZodError e
  // códigos do Prisma para respostas HTTP. Antes cada rota repetia o mesmo
  // try/catch, e onde o `if (409)` faltava um conflito de negócio virava 500.
  registrarTratadorDeErros(app)

  // NOTA: os hooks de conversão snake_case ↔ camelCase foram removidos.
  // Eles reserializavam todo JSON de entrada e saída em toda requisição,
  // mutilavam chaves de DADOS junto com as de schema (um objeto `permissoes`
  // com chave `adicionarPedido` saía como `adicionar_pedido`), e existiam para
  // compatibilidade com um frontend que hoje está inteiro sob seu controle.
  // Os services já devolvem snake_case onde o frontend espera.

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
  await app.register(platformTicketsRoutes, { prefix: '/api/platform/tickets' })

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

      const agora = new Date()
      const expirado = licenca.dataVencimento ? licenca.dataVencimento < agora : false
      if (expirado) {
        return reply.send({
          ativo: false,
          expirado: true,
          motivo: 'expirado',
          dataVencimento: licenca.dataVencimento,
          cliente: tenant.nome,
        })
      }

      const diasRestantes = licenca.dataVencimento
        ? Math.ceil((licenca.dataVencimento.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
        : null

      return reply.send({
        ativo: true,
        expirado: false,
        semLicenca: false,
        cliente: tenant.nome,
        dataVencimento: licenca.dataVencimento,
        diasRestantes,
      })
    } catch {
      // Fail-closed: em caso de erro no banco, bloqueia o acesso
      return reply.send({ ativo: false, semLicenca: true, motivo: 'erro_interno' })
    }
  })

  // Ativação de licença — no SaaS a licença é gerenciada pela plataforma central
  app.post('/api/sistema/ativar', { config: { public: true } }, async () => ({
    success: false,
    message: 'Licença gerenciada pela plataforma central SaaS — acesse o painel em /platform',
  }))

  return app
}
