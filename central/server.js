const express = require('express')
const path = require('path')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors({ origin: true, credentials: true }))
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
