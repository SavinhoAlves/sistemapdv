const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Middleware de autenticação Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      // Permitir conexão sem auth para tela da cozinha (TV mode)
      if (socket.handshake.query.mode === 'cozinha_tv') {
        socket.user = { cargo: 'cozinha', nome: 'TV Cozinha' };
        return next();
      }
      return next(new Error('Token não fornecido'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('Socket conectado', {
      id: socket.id,
      user: socket.user?.nome,
      cargo: socket.user?.cargo
    });

    // Entrar em sala por cargo
    if (socket.user?.cargo) {
      socket.join(`cargo:${socket.user.cargo}`);
      socket.join('todos');
    }

    // Garçom entra na sala da sua mesa
    socket.on('entrar_mesa', (mesaId) => {
      socket.join(`mesa:${mesaId}`);
      logger.info(`Socket entrou na mesa ${mesaId}`, { user: socket.user?.nome });
    });

    socket.on('sair_mesa', (mesaId) => {
      socket.leave(`mesa:${mesaId}`);
    });

    // Ping para verificar conexão
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      logger.info('Socket desconectado', { id: socket.id, reason, user: socket.user?.nome });
    });

    socket.on('error', (error) => {
      logger.error('Erro no socket:', { id: socket.id, error: error.message });
    });
  });

  logger.info('✅ Socket.IO inicializado');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO não foi inicializado');
  return io;
}

// Helpers para emitir eventos tipados
const eventos = {
  novaMesa: (data) => getIO().emit('nova_mesa', data),
  mesaAtualizada: (data) => getIO().emit('mesa_atualizada', data),
  mesaFechada: (data) => getIO().emit('mesa_fechada', data),
  novoPedido: (data) => {
    getIO().emit('novo_pedido', data);
    getIO().to('cargo:cozinha').emit('pedido_cozinha', data);
  },
  itemAdicionado: (data) => {
    getIO().emit('item_adicionado', data);
    getIO().to('cargo:cozinha').emit('item_cozinha', data);
  },
  pedidoPronto: (data) => {
    getIO().emit('pedido_pronto', data);
    getIO().to('cargo:garcom').emit('item_pronto', data);
  },
  pagamentoRegistrado: (data) => getIO().emit('pagamento_registrado', data),
  caixaAberto: (data) => getIO().emit('caixa_aberto', data),
  caixaFechado: (data) => getIO().emit('caixa_fechado', data)
};

module.exports = { initializeSocket, getIO, eventos };
