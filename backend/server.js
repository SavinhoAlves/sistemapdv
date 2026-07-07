const express = require('express')
const path = require('path')
const cors = require('cors')
const os = require('os')
const http = require('http')
require('dotenv').config()

const app = express()
const server = http.createServer(app)

// Tempo real (KDS da cozinha e afins)
const { iniciarSocket } = require('./src/services/socket.service')
iniciarSocket(server)

// ✅ IMPORTA AS ROTAS
const authRoutes = require('../backend/src/routes/auth.routes')
const caixaRoutes = require('./src/routes/caixa.routes')
const mesasRoutes = require('./src/routes/mesas.routes')
const pedidosRoutes = require('./src/routes/pedidos.routes')
const produtosRoutes = require('./src/routes/produtos.routes')
const categoriasRoutes  = require('./src/routes/categorias.routes')
const pagamentosRoutes  = require('./src/routes/pagamentos.routes')
const dashboardRoutes   = require('./src/routes/dashboard.routes')
const relatoriosRoutes  = require('./src/routes/relatorios.routes')
const sistemaRoutes     = require('./src/routes/sistema.routes')
const usersRoutes       = require('./src/routes/users.routes')
const vendasRoutes          = require('./src/routes/vendas.routes')
const configuracoesRoutes   = require('./src/routes/configuracoes.routes')
const integracoesRoutes     = require('./src/routes/integracoes.routes')

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(cors({ origin: true, credentials: true }))

app.use(express.json())

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'))
})

/*
|--------------------------------------------------------------------------
| INDEX
|--------------------------------------------------------------------------
*/

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'))
})

/*
|--------------------------------------------------------------------------
| ROTAS AUTH
|--------------------------------------------------------------------------
*/

// Rotas livres de licença: autenticação e ativação/status do sistema
app.use('/api/auth', authRoutes)
app.use('/api/sistema', sistemaRoutes)

// Daqui para baixo, tudo exige licença válida
const { exigirLicenca } = require('./src/middlewares/licenca.middleware')
app.use('/api', exigirLicenca)

app.use('/api/caixa', caixaRoutes)
app.use('/api/mesas', mesasRoutes)
app.use('/api/pedidos', pedidosRoutes)
app.use('/api/produtos', produtosRoutes)
app.use('/api/categorias', categoriasRoutes)
app.use('/api/pagamentos', pagamentosRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/relatorios', relatoriosRoutes)
app.use('/api/users',     usersRoutes)
app.use('/api/vendas',         vendasRoutes)
app.use('/api/configuracoes',  configuracoesRoutes)
app.use('/api/integracoes',   integracoesRoutes)
app.use('/api/impressao',      require('./src/routes/impressao.routes'))
/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 3001

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces()
  const ips = Object.values(nets)
    .flat()
    .filter(n => n.family === 'IPv4' && !n.internal)
    .map(n => n.address)

  console.log(`\nServidor rodando na porta ${PORT}`)
  console.log(`  Local:   http://localhost:${PORT}`)
  ips.forEach(ip => console.log(`  Rede:    http://${ip}:${PORT}`))
  console.log('')

  // Backup automático diário do banco de dados
  require('./src/services/backup.service').agendarBackupDiario()
})