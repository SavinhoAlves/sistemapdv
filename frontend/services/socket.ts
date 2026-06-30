// services/socket.ts
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function useSocket() {
  const authStore = useAuthStore()

  function connect(mode?: string) {
    if (socket?.connected) return socket

    const opts: any = {
      auth: { token: authStore.token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      transports: ['websocket', 'polling']
    }

    if (mode) opts.query = { mode }

    const socketUrl = process.client
      ? `http://${window.location.hostname}:3001`
      : 'http://localhost:3001'

    socket = io(socketUrl, opts)

    socket.on('connect', () => {
      console.log('✅ Socket conectado:', socket?.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket desconectado:', reason)
    })

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message)
    })

    return socket
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
  }

  function getSocket() {
    return socket
  }

  function on(event: string, handler: (...args: any[]) => void) {
    socket?.on(event, handler)
    return () => socket?.off(event, handler)
  }

  function off(event: string, handler?: (...args: any[]) => void) {
    socket?.off(event, handler)
  }

  function emit(event: string, data?: any) {
    socket?.emit(event, data)
  }

  function entrarMesa(mesaId: number) {
    socket?.emit('entrar_mesa', mesaId)
  }

  function sairMesa(mesaId: number) {
    socket?.emit('sair_mesa', mesaId)
  }

  return {
    connect,
    disconnect,
    getSocket,
    on,
    off,
    emit,
    entrarMesa,
    sairMesa,
    isConnected: () => socket?.connected ?? false
  }
}
