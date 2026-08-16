require('dotenv').config()

const express = require('express')
const http = require('http')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const logger = require('./utils/logger')
const { testConnection } = require('./database/connection')
const { initializeSocket } = require('./sockets/index')
const { exigirLicenca } = require('./middlewares/licenca.middleware')

// ── Rotas ────────────────────────────────────────────────────────────────────
const authRoutes          = require('./routes/auth.routes')
const usuariosRoutes      = require('./routes/users.routes')
const produtosRoutes      = require('./routes/produtos.routes')
const categoriasRoutes    = require('./routes/categorias.routes')
const mesasRoutes         = require('./routes/mesas.routes')
const pedidosRoutes       = require('./routes/pedidos.routes')
const vendasRoutes        = require('./routes/vendas.routes')
const pagamentosRoutes    = require('./routes/pagamentos.routes')
const caixaRoutes         = require('./routes/caixa.routes')
const impressaoRoutes     = require('./routes/impressao.routes')
const configuracaoRoutes  = require('./routes/configuracoes.routes')
const relatoriosRoutes    = require('./routes/relatorios.routes')
const dashboardRoutes     = require('./routes/dashboard.routes')
const sistemaRoutes       = require('./routes/sistema.routes')
const integracoesRoutes   = require('./routes/integracoes.routes')
const perfisRoutes        = require('./routes/perfis.routes')

// ── App ───────────────────────────────────────────────────────────────────────
const app = express()
const server = http.createServer(app)

// ── Middlewares globais ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(morgan('dev', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
})
app.use('/api/', limiter)

// ── Rotas da API ──────────────────────────────────────────────────────────────
// auth e sistema são públicos — não exigem licença válida
app.use('/api/auth',          authRoutes)
app.use('/api/sistema',       sistemaRoutes)

// Todas as demais rotas exigem licença ativa
app.use('/api', exigirLicenca)
app.use('/api/users',         usuariosRoutes)
app.use('/api/produtos',      produtosRoutes)
app.use('/api/categorias',    categoriasRoutes)
app.use('/api/mesas',         mesasRoutes)
app.use('/api/pedidos',       pedidosRoutes)
app.use('/api/vendas',        vendasRoutes)
app.use('/api/pagamentos',    pagamentosRoutes)
app.use('/api/caixa',         caixaRoutes)
app.use('/api/impressao',     impressaoRoutes)
app.use('/api/configuracoes', configuracaoRoutes)
app.use('/api/relatorios',    relatoriosRoutes)
app.use('/api/dashboard',     dashboardRoutes)
app.use('/api/integracoes',   integracoesRoutes)
app.use('/api/perfis',        perfisRoutes)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }))

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error('Erro não tratado:', { message: err.message, stack: err.stack })
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor' })
})

// ── Inicialização ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001

async function iniciar() {
  try {
    await testConnection()
    logger.info('✅ Banco de dados conectado')

    initializeSocket(server)

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`)
    })
  } catch (err) {
    logger.error('❌ Falha ao iniciar servidor:', err.message)
    process.exit(1)
  }
}

iniciar()
