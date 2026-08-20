import 'dotenv/config'
import { buildApp } from './app'
import { prisma } from './lib/prisma'
import { initSocket } from './sockets/socket'

const PORT = parseInt(process.env.PORT ?? '3002', 10)
const HOST = process.env.HOST ?? '0.0.0.0'

async function start() {
  const app = await buildApp()

  // Inicializa Socket.IO antes do listen (usa o mesmo HTTP server do Fastify)
  initSocket(app)

  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`Servidor Fastify rodando em http://${HOST}:${PORT}`)
  } catch (err) {
    app.log.error(err)
    await prisma.$disconnect()
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

start()
