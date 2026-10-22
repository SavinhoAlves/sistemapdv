import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { useApi } from '~/services/api'

/**
 * Notificação push do app do entregador (Web Push).
 * Android: funciona no Chrome direto. iPhone: só com o app adicionado à tela inicial (iOS 16.4+).
 * No app nativo (apps/entregador) o WebView não tem push do navegador: fica indisponível.
 */
export function usePushEntregador() {
  const api = useApi()
  const suportado = typeof window !== 'undefined' && !Capacitor.isNativePlatform()
    && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const iphoneSemInstalar = typeof window !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
    && !(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone)

  const ativo = ref(false)
  const negado = ref(suportado && Notification.permission === 'denied')
  const semServidor = ref(false)
  const ocupado = ref(false)
  const disponivel = computed(() => suportado && !semServidor.value)

  async function registro() {
    return navigator.serviceWorker.register('/sw-entregador.js', { scope: '/' })
  }

  /** Confere se este aparelho já está inscrito (e reenvia ao servidor, caso o login seja outro). */
  async function verificar() {
    if (!suportado) return
    try {
      const { chave } = await api.get<{ chave: string | null }>('/entregador/push/chave')
      if (!chave) { semServidor.value = true; return }
      const sub = await (await registro()).pushManager.getSubscription()
      if (sub && Notification.permission === 'granted') {
        await api.post('/entregador/push', sub.toJSON())
        ativo.value = true
      }
    } catch { /* sem push: o app segue com socket e atualização a cada 30 s */ }
  }

  async function ativar() {
    if (!suportado) return false
    ocupado.value = true
    try {
      const permissao = await Notification.requestPermission()
      negado.value = permissao === 'denied'
      if (permissao !== 'granted') return false
      const { chave } = await api.get<{ chave: string | null }>('/entregador/push/chave')
      if (!chave) { semServidor.value = true; return false }
      const reg = await registro()
      await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(chave) })
      await api.post('/entregador/push', sub.toJSON())
      ativo.value = true
      return true
    } finally { ocupado.value = false }
  }

  /** Ao sair do login: o aparelho para de receber os pedidos deste entregador. */
  async function desativar() {
    if (!suportado) return
    try {
      const reg = await navigator.serviceWorker.getRegistration('/')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) { await api.post('/entregador/push/sair', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe() }
    } catch { /* nada a fazer */ }
    ativo.value = false
  }

  return { suportado, iphoneSemInstalar, disponivel, ativo, negado, ocupado, verificar, ativar, desativar }
}

function base64ParaBytes(b64: string) {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}
