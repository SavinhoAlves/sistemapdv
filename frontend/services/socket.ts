// services/socket.ts
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '~/stores/auth'

let socket: Socket | null = null

// Celular suspende a conexão de WebSocket quando a tela bloqueia ou o
// navegador vai pra segundo plano; o backoff automático do socket.io pode
// demorar a perceber isso. Forçamos uma tentativa assim que a aba volta a
// ficar visível, em vez de esperar o próximo ciclo de reconexão.
let reconexaoAoVoltarRegistrada = false
function registrarReconexaoAoVoltar() {
  if (reconexaoAoVoltarRegistrada || typeof document === 'undefined') return
  reconexaoAoVoltarRegistrada = true
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && socket && !socket.connected) {
      socket.connect()
    }
  })
}

export function useSocket() {
  const authStore = useAuthStore()

  function connect(mode?: string) {
    registrarReconexaoAoVoltar()

    // Checa a existência da instância, não o estado ".connected": várias
    // telas/componentes podem chamar connect() em ordens diferentes (ex.:
    // componente filho monta antes do pai) — reconectar/aguardar handshake
    // é papel do próprio socket.io, aqui só evitamos criar duas instâncias
    if (socket) return socket

    const opts: any = {
      auth: { token: authStore.token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      transports: ['websocket', 'polling']
    }

    if (mode) opts.query = { mode }

    // Mesmo protocolo da página (https quando o certificado local mkcert
    // está configurado) — wss:// exige origem https
    const socketUrl = process.client
      ? `${window.location.protocol}//${window.location.hostname}:3001`
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
