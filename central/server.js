const express    = require('express')
const path       = require('path')
const cors       = require('cors')
const helmet     = require('helmet')
const rateLimit  = require('express-rate-limit')
require('dotenv').config()

const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}))
app.use(express.json())

const limiterGeral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
})
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
})

app.use('/api', limiterGeral)
app.use('/api/auth', limiterAuth)
app.use(express.static(path.join(__dirname, 'public')))

app.use('/api/auth',      require('./src/routes/auth.routes'))
app.use('/api/sync',      require('./src/routes/sync.routes'))
app.use('/api/clientes',  require('./src/routes/clientes.routes'))
app.use('/api/contratos', require('./src/routes/contratos.routes'))
app.use('/api/tickets',   require('./src/routes/tickets.routes'))

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`\nPainel central de suporte rodando na porta ${PORT}`)
  console.log(`  http://localhost:${PORT}\n`)
})
