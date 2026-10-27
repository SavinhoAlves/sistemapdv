import 'dotenv/config'
import { buildApp } from './app'
import { prisma } from './lib/prisma'
import { initSocket } from './sockets/socket'
import { iniciarSchedulerLicencas } from './jobs/licenca-checker'
import { modoLocal, recarregarRede, estadoRede } from './lib/redeLocal'

const PORT = parseInt(process.env.PORT ?? '3002', 10)
const HOST = process.env.HOST ?? '0.0.0.0'

async function start() {
  const app = await buildApp()

  // Inicializa Socket.IO antes do listen (usa o mesmo HTTP server do Fastify)
  initSocket(app)

  // Job de bloqueio automático de licenças vencidas / tenants suspensos
  iniciarSchedulerLicencas()

  try {
    // Modo local: confere a rede do Host e aplica a trava antes de atender
    if (modoLocal()) {
      await recarregarRede()
      const e = estadoRede()
      console.log(`[rede-local] Host ${e.hostIp ?? '(sem IP configurado)'} · ${e.terminais.length} terminal(is)${e.bloqueado ? ' · BLOQUEADO: ' + e.motivo : ''}`)
    }
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
