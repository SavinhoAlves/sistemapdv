const express = require('express')
const path = require('path')
require('dotenv').config()

const app = express()

// Sem CORS: o painel serve seu próprio front (public/) na mesma origem, e
// /api/sync é chamado servidor-a-servidor pelas instalações do PDV (fetch
// do Node, não do navegador) — CORS não se aplica a esse caso. Refletir
// qualquer origin com credentials:true não protegia nada aqui.
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/api/auth', require('./src/routes/auth.routes'))
app.use('/api/sync', require('./src/routes/sync.routes'))
app.use('/api/clientes', require('./src/routes/clientes.routes'))

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`\nPainel central de suporte rodando na porta ${PORT}`)
  console.log(`  http://localhost:${PORT}\n`)
})
