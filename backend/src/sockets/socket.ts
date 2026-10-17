import { Server } from 'socket.io'
import type { FastifyInstance } from 'fastify'
import { verifyAccessToken } from '../lib/jwt'
import { verificarAcessoTenant } from '../middlewares/tenant.middleware'
import {
  EVENTOS,
  salas,
  type PayloadComanda,
  type PayloadItem,
  type PayloadPagamento,
  type PayloadCaixa,
} from '../lib/eventos'

/**
 * Socket.IO.
 *
 * O isolamento por sala já estava correto e foi mantido. O que muda é a
 * emissão: os nomes agora vêm de `lib/eventos.ts`, o mesmo arquivo que o
 * frontend importa. Era essa divergência que deixava o tempo real morto —
 * o servidor emitia `item_adicionado` e o cliente escutava `cozinha:novo_item`.
 * Nenhum evento emitido era escutado por ninguém, e todas as telas caíram em
 * polling de 15 a 30 segundos.
 */

let io: Server | null = null

export function initSocket(app: FastifyInstance): Server {
  const origensPermitidas = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  io = new Server(app.server, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || origensPermitidas.includes(origin)) return cb(null, true)
        cb(new Error('Origem não permitida'), false)
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  })

  io.use(async (socket, next) => {
    const token = (socket.handshake.auth.token || socket.handshake.query.token) as string | undefined

    if (!token) {
      // Modo TV da cozinha: sem login, só leitura, validado pelo tenant.
      if (socket.handshake.query.mode === 'cozinha_tv') {
        const tenantId = socket.handshake.query.tenantId as string | undefined
        if (!tenantId) return next(new Error('tenantId obrigatório para modo cozinha_tv'))
        try {
          const acesso = await verificarAcessoTenant(tenantId)
          if (!acesso.ok) return next(new Error('Tenant inválido, suspenso ou sem licença'))
        } catch {
          return next(new Error('Erro ao validar tenant'))
        }
        ;(socket as any).user = { cargo: 'cozinha', nome: 'TV Cozinha', tenantId, somenteLeitura: true }
        return next()
      }
      return next(new Error('Token não fornecido'))
    }

    try {
      const payload = verifyAccessToken(token)
      if (payload.type !== 'tenant') return next(new Error('Token não pertence a um tenant'))
      // Mesma regra do requireTenant: suporte da plataforma entra mesmo com licença vencida
      const acesso = await verificarAcessoTenant(payload.tenantId)
      if (!acesso.ok && !(payload.suporte && 'licenca' in acesso)) {
        return next(new Error('Tenant suspenso ou sem licença'))
      }
      ;(socket as any).user = payload
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', (socket) => {
    const user = (socket as any).user
    const tenantId = user?.tenantId as string | undefined
    if (!tenantId) return socket.disconnect(true)

    socket.join(salas.todos(tenantId))
    if (user.cargo) socket.join(salas.cargo(tenantId, user.cargo))

    socket.on('comanda:entrar', (comandaId: string) => {
      if (typeof comandaId === 'string') socket.join(salas.comanda(tenantId, comandaId))
    })
    socket.on('comanda:sair', (comandaId: string) => {
      if (typeof comandaId === 'string') socket.leave(salas.comanda(tenantId, comandaId))
    })
  })

  return io
}

export function getIO(): Server | null {
  return io
}

/**
 * Emissores tipados. Se o socket não estiver inicializado, viram no-op —
 * mas registram aviso, porque silêncio total é o que escondeu o problema
 * anterior por tanto tempo.
 */
export function emitir(tenantId: string) {
  const semIo = () => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[socket] emissão descartada: io não inicializado')
    }
  }

  return {
    comanda(evento: string, payload: PayloadComanda) {
      if (!io) return semIo()
      io.to(salas.todos(tenantId)).emit(evento, payload)
    },

    item(evento: string, payload: PayloadItem) {
      if (!io) return semIo()
      io.to(salas.todos(tenantId)).emit(evento, payload)
      // A cozinha só recebe o que passa por ela.
      if (payload.vaiCozinha) {
        io.to(salas.cargo(tenantId, 'cozinha')).emit(evento, payload)
      }
      // O garçom é avisado quando o prato fica pronto.
      if (evento === EVENTOS.item.statusAlterado && payload.status === 'pronto') {
        io.to(salas.cargo(tenantId, 'garcom')).emit(evento, payload)
      }
    },

    pagamento(evento: string, payload: PayloadPagamento) {
      if (!io) return semIo()
      io.to(salas.todos(tenantId)).emit(evento, payload)
    },

    caixa(evento: string, payload: PayloadCaixa) {
      if (!io) return semIo()
      io.to(salas.todos(tenantId)).emit(evento, payload)
    },
  }
}
