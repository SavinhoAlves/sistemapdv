// Servidor socket.io — barramento de notificações em tempo real.
// Os eventos avisam as telas (KDS da cozinha, mesas) que algo mudou;
// a fonte de verdade continua sendo a API HTTP, que o cliente re-consulta.

const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

let io = null

function iniciarSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true }
  })

  // Mesmo JWT da API — telas não autenticadas não recebem eventos
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Token não fornecido'))
      socket.user = jwt.verify(token, process.env.JWT_SECRET)
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', (socket) => {
    socket.on('entrar_mesa', (mesaId) => socket.join(`mesa:${mesaId}`))
    socket.on('sair_mesa', (mesaId) => socket.leave(`mesa:${mesaId}`))
  })

  return io
}

// Broadcast para todas as telas conectadas. Nunca lança: eventos são
// best-effort e não podem derrubar a rota que os emite.
function emitir(evento, dados = {}) {
  try {
    if (io) io.emit(evento, dados)
  } catch (err) {
    console.error(`Falha ao emitir evento ${evento}:`, err.message)
  }
}

module.exports = { iniciarSocket, emitir }
