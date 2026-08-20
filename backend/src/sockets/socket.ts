import { Server } from 'socket.io'
import type { FastifyInstance } from 'fastify'
import { verifyAccessToken } from '../lib/jwt'

let io: Server | null = null

export function initSocket(app: FastifyInstance): Server {
  io = new Server(app.server, {
    cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.use((socket, next) => {
    const token = (socket.handshake.auth.token || socket.handshake.query.token) as string | undefined

    if (!token) {
      if (socket.handshake.query.mode === 'cozinha_tv') {
        ;(socket as any).user = {
          cargo: 'cozinha',
          nome: 'TV Cozinha',
          tenantId: socket.handshake.query.tenantId,
        }
        return next()
      }
      return next(new Error('Token não fornecido'))
    }

    try {
      const decoded = verifyAccessToken(token)
      ;(socket as any).user = decoded
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', (socket) => {
    const user = (socket as any).user
    const tenantId = user?.tenantId as string | undefined

    if (tenantId && user?.cargo) {
      socket.join(`${tenantId}:cargo:${user.cargo}`)
      socket.join(`${tenantId}:todos`)
    }

    socket.on('entrar_mesa', (mesaId: string) => {
      if (tenantId) socket.join(`${tenantId}:mesa:${mesaId}`)
    })

    socket.on('sair_mesa', (mesaId: string) => {
      if (tenantId) socket.leave(`${tenantId}:mesa:${mesaId}`)
    })

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() })
    })
  })

  return io
}

export function getIO(): Server | null {
  return io
}

export function emitParaTenant(tenantId: string) {
  const noop = () => {}
  if (!io) {
    return {
      novaMesa: noop, mesaAtualizada: noop, mesaFechada: noop,
      novoPedido: noop, itemAdicionado: noop, pedidoPronto: noop,
      pagamentoRegistrado: noop, caixaAberto: noop, caixaFechado: noop,
    }
  }

  const room = (r: string) => io!.to(`${tenantId}:${r}`)

  return {
    novaMesa:            (data: any) => room('todos').emit('nova_mesa', data),
    mesaAtualizada:      (data: any) => room('todos').emit('mesa_atualizada', data),
    mesaFechada:         (data: any) => room('todos').emit('mesa_fechada', data),
    novoPedido:          (data: any) => {
      room('todos').emit('novo_pedido', data)
      room('cargo:cozinha').emit('pedido_cozinha', data)
    },
    itemAdicionado:      (data: any) => {
      room('todos').emit('item_adicionado', data)
      room('cargo:cozinha').emit('item_cozinha', data)
    },
    pedidoPronto:        (data: any) => {
      room('todos').emit('pedido_pronto', data)
      room('cargo:garcom').emit('item_pronto', data)
    },
    pagamentoRegistrado: (data: any) => room('todos').emit('pagamento_registrado', data),
    caixaAberto:         (data: any) => room('todos').emit('caixa_aberto', data),
    caixaFechado:        (data: any) => room('todos').emit('caixa_fechado', data),
  }
}
