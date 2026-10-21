import { ref, onUnmounted } from 'vue'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { useApi } from '~/services/api'

// Plugin nativo (apps/entregador). No navegador comum fica sem implementação e não é usado.
const BackgroundGeolocation = registerPlugin<any>('BackgroundGeolocation')

/**
 * GPS do entregador durante a rota.
 *
 * - No app Android (Capacitor), usa o plugin @capacitor-community/background-geolocation:
 *   continua enviando com a tela apagada (notificação fixa "Rota em andamento").
 * - No navegador, usa watchPosition e pede para a tela ficar acesa (Wake Lock):
 *   com a tela apagada o navegador para de mandar posição.
 *
 * Envia no máximo a cada 15 s, ou antes se andou mais de 60 m.
 */
type Estado = 'parado' | 'ativo' | 'sem-permissao' | 'indisponivel'

const INTERVALO_MS = 15000
const DISTANCIA_M = 60

function metros(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, r = Math.PI / 180
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function useRastreioEntregador() {
  const api = useApi()
  const estado = ref<Estado>('parado')
  const ultima = ref<{ lat: number; lng: number; em: number } | null>(null)
  const nativo = Capacitor.isNativePlatform()

  let enviada: { lat: number; lng: number; em: number } | null = null
  let watchId: number | string | null = null
  let travaTela: any = null

  async function enviar(lat: number, lng: number, precisao?: number, velocidade?: number | null) {
    const agora = Date.now()
    ultima.value = { lat, lng, em: agora }
    if (enviada && agora - enviada.em < INTERVALO_MS && metros(enviada, { lat, lng }) < DISTANCIA_M) return
    enviada = { lat, lng, em: agora }
    try { await api.post('/entregador/posicao', { lat, lng, precisao, velocidade: velocidade ?? null }) } catch { enviada = null }
  }

  async function iniciar() {
    if (watchId !== null) return
    if (nativo) {
      watchId = await BackgroundGeolocation.addWatcher(
        { backgroundTitle: 'Rota em andamento', backgroundMessage: 'Enviando sua localização ao restaurante e aos clientes', requestPermissions: true, stale: false, distanceFilter: 25 },
        (loc: any, erro: any) => {
          if (erro) { if (erro.code === 'NOT_AUTHORIZED') estado.value = 'sem-permissao'; return }
          if (loc) { estado.value = 'ativo'; enviar(loc.latitude, loc.longitude, loc.accuracy, loc.speed) }
        },
      )
      estado.value = 'ativo'
      return
    }
    if (!('geolocation' in navigator)) { estado.value = 'indisponivel'; return }
    watchId = navigator.geolocation.watchPosition(
      (p) => { estado.value = 'ativo'; enviar(p.coords.latitude, p.coords.longitude, p.coords.accuracy, p.coords.speed) },
      (e) => { estado.value = e.code === e.PERMISSION_DENIED ? 'sem-permissao' : 'indisponivel' },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    )
    try { travaTela = await (navigator as any).wakeLock?.request('screen') } catch {}
  }

  async function parar() {
    if (watchId === null) return
    if (nativo) await BackgroundGeolocation.removeWatcher({ id: watchId })
    else navigator.geolocation.clearWatch(watchId as number)
    watchId = null
    estado.value = 'parado'
    try { await travaTela?.release() } catch {}
    travaTela = null
  }

  onUnmounted(() => { if (!nativo) parar() })
  return { estado, ultima, nativo, iniciar, parar }
}
