const express = require('express')
const path = require('path')
const cors = require('cors')
require('dotenv').config()

const app = express()

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

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

// Em desenvolvimento aceita qualquer origem; em produção usa CORS_ORIGIN
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN
    : true,
  credentials: true
}))

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

app.use('/api/auth', authRoutes)
app.use('/api/caixa', caixaRoutes)
app.use('/api/mesas', mesasRoutes)
app.use('/api/pedidos', pedidosRoutes)
app.use('/api/produtos', produtosRoutes)
app.use('/api/categorias', categoriasRoutes)
app.use('/api/pagamentos', pagamentosRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/relatorios', relatoriosRoutes)
app.use('/api/sistema',   sistemaRoutes)
app.use('/api/users',     usersRoutes)
app.use('/api/vendas',         vendasRoutes)
app.use('/api/configuracoes',  configuracoesRoutes)
/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando:`)
  console.log(`http://192.168.1.8:${PORT}`)
})