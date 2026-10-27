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
import { suporteRoutes } from './modules/suporte/suporte.routes'
import { deliveryRoutes, deliveryPublicoRoutes, entregadorRoutes } from './modules/delivery/delivery.routes'
import { contaClienteRoutes } from './modules/clientes/clientes.routes'
import { platformAuthRoutes } from './modules/platform/platform-auth.routes'
import { platformTenantsRoutes } from './modules/platform/platform-tenants.routes'
import { platformTicketsRoutes } from './modules/platform/platform-tickets.routes'
import { platformPlanosRoutes } from './modules/platform/platform-planos.routes'
import { platformCobrancaRoutes } from './modules/platform/platform-cobranca.routes'
import { platformContratosRoutes } from './modules/platform/platform-contratos.routes'
import { platformDeliveryRoutes } from './modules/platform/platform-delivery.routes'
import { terminaisRoutes } from './modules/terminais/terminais.routes'
import { modoLocal, bloqueioPara, paginaBloqueio } from './lib/redeLocal'
import fastifyStatic from '@fastify/static'
import path from 'path'
import fs from 'fs'

export async function buildApp() {
  const app = Fastify({
    // Em produção registra só avisos e erros: sem isso o request.log.error do
    // tratador de erros era descartado e todo 500 sumia sem deixar rastro.
    logger: process.env.NODE_ENV !== 'production' ? true : { level: 'warn' },
    bodyLimit: 2 * 1024 * 1024, // 2MB (para logo base64)
  })

  // ── Modo local (Host): trava de rede antes de tudo ────────────────────────
  // Só o próprio Host e os IPs cadastrados em Admin › Terminais entram.
  if (modoLocal()) {
    app.addHook('onRequest', async (request, reply) => {
      const motivo = bloqueioPara(request.ip)
      if (!motivo) return
      if (request.url.startsWith('/api/')) return reply.status(403).send({ error: motivo, bloqueioRede: true })
      return reply.status(403).type('text/html; charset=utf-8').send(paginaBloqueio(motivo))
    })
  }

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
    errorResponseBuilder: () => ({ status: 429, error: 'Muitas requisições. Aguarde um instante e tente de novo.' }),
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
      // Só o que tenta senha/PIN/crachá. Leituras (/me, /restaurante, /mobile-status)
      // rodam a cada página aberta e ficam no limite global — antes 10 navegações
      // em 1 minuto já davam erro e derrubavam o carregamento das telas.
      // A identificação de cartão (rfid-identify) exige a sessão do caixa e roda a cada
      // ação no salão: com 10/min por IP, vários caixas na mesma rede se bloqueavam.
      allowList: (req) => req.method === 'GET' || req.url.startsWith('/api/auth/rfid-identify'),
      // `status` é o que o tratador de erros lê; sem ele o bloqueio saía como 500
      errorResponseBuilder: () => ({
        status: 429,
        error: 'Muitas tentativas. Aguarde 1 minuto antes de tentar novamente.',
      }),
    })
    await authApp.register(authRoutes, { prefix: '/api/auth' })
    await authApp.register(platformAuthRoutes, { prefix: '/api/platform/auth' })
  })

  // ── Módulos de negócio ─────────────────────────────────────────────────────
  await app.register(terminaisRoutes,     { prefix: '/api/terminais' })
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
  await app.register(suporteRoutes,       { prefix: '/api/suporte' })
  await app.register(deliveryRoutes,      { prefix: '/api/delivery' })
  await app.register(deliveryPublicoRoutes, { prefix: '/api/publico' })
  await app.register(contaClienteRoutes,    { prefix: '/api/publico' })
  await app.register(entregadorRoutes,    { prefix: '/api/entregador' })
  await app.register(platformTenantsRoutes, { prefix: '/api/platform/tenants' })
  await app.register(platformTicketsRoutes, { prefix: '/api/platform/tickets' })
  await app.register(platformPlanosRoutes,  { prefix: '/api/platform/planos' })
  await app.register(platformCobrancaRoutes, { prefix: '/api/platform/cobranca' })
  await app.register(platformContratosRoutes, { prefix: '/api/platform/contratos' })
  await app.register(platformDeliveryRoutes, { prefix: '/api/platform/delivery' })

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

      // Aviso para o PDV: mensalidade vencida (na tolerância) ou teste acabando
      const { resumir, contratoAtual, diasEntre, hojeBR } = await import('./modules/platform/assinatura')
      const temPagamento = (await prisma.pagamentoMensalidade.count({ where: { tenantId: tenant.id } })) > 0
      const r = resumir(await contratoAtual(prisma, tenant.id), tenant.status, temPagamento, agora)
      const diasTeste = r.testeAte ? diasEntre(hojeBR(agora), r.testeAte) : null
      // Avisa já a partir de 3 dias antes do vencimento (e no dia), não só na tolerância
      const aviso =
        r.situacao === 'tolerancia' ? { tipo: 'tolerancia', dias: r.diasParaBloquear, liberadoAte: r.liberadoAte }
        : r.situacao === 'teste' && diasTeste !== null && diasTeste <= 2 ? { tipo: 'teste', dias: diasTeste, liberadoAte: r.testeAte }
        : r.situacao === 'em_dia' && r.diasParaVencer !== null && r.diasParaVencer <= 3 ? { tipo: 'vencendo', dias: r.diasParaVencer, liberadoAte: r.proximoVencimento, bloqueioEm: r.liberadoAte }
        : null

      return reply.send({
        ativo: true,
        expirado: false,
        semLicenca: false,
        cliente: tenant.nome,
        dataVencimento: licenca.dataVencimento,
        diasRestantes,
        aviso,
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

  // Modo local: o próprio Host serve as telas (frontend gerado), na mesma porta e
  // atrás da mesma trava. Os terminais abrem http://IP-do-Host.
  const dirFrontend = process.env.FRONTEND_DIR
  if (modoLocal() && dirFrontend && fs.existsSync(path.join(dirFrontend, 'index.html'))) {
    await app.register(fastifyStatic, { root: path.resolve(dirFrontend), wildcard: false })
    // SPA: qualquer rota que não seja /api volta o index.html
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) return reply.sendFile('index.html')
      return reply.status(404).send({ error: 'Rota não encontrada' })
    })
  }

  return app
}
