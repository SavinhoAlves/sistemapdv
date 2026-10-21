<template>
  <div class="min-h-[100dvh] bg-neutral-950 text-white flex flex-col">

    <main class="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
      <div class="size-16 rounded-[20px] bg-gradient-to-br from-[#FF9B33] to-[#FF7A00] flex items-center justify-center shadow-lg shadow-orange-500/20">
        <UtensilsCrossed :size="28" class="text-white" />
      </div>
      <h1 class="mt-5 text-2xl font-black tracking-tight">RestaurantePDV</h1>
      <p class="mt-1 text-sm text-white/45">App da equipe: garçons e entregadores</p>

      <div class="mt-10 w-full max-w-xs space-y-3">
        <button class="w-full h-14 rounded-2xl bg-orange-500 active:bg-orange-600 text-white font-black flex items-center justify-center gap-2.5" @click="abrirLeitor">
          <ScanLine :size="20" /> Ler QR code
        </button>
        <NuxtLink to="/login?app=1" class="w-full h-12 rounded-2xl border border-white/10 text-white/70 text-sm font-bold flex items-center justify-center gap-2">
          <KeyRound :size="16" /> Entrar com código e senha
        </NuxtLink>
      </div>

      <p v-if="erro" class="mt-6 max-w-xs text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3" role="alert">{{ erro }}</p>

      <p class="mt-10 max-w-xs text-xs leading-relaxed text-white/35">
        O QR é gerado no computador do restaurante, em Configurações › Acesso. Garçom entra com o caixa aberto; entregador, quando o restaurante tem delivery.
      </p>
    </main>

    <!-- Leitor de QR -->
    <Teleport to="body">
      <div v-if="lendo" class="fixed inset-0 z-50 bg-black flex flex-col">
        <video ref="video" class="absolute inset-0 size-full object-cover" playsinline muted />
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="size-64 rounded-3xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
        </div>
        <div class="relative mt-auto p-6 pb-10 text-center">
          <p class="text-sm font-bold">{{ estadoLeitor }}</p>
          <button class="mt-4 h-12 px-8 rounded-2xl bg-white/15 backdrop-blur text-sm font-black" @click="fecharLeitor">Cancelar</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { UtensilsCrossed, ScanLine, KeyRound } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { tokenDoQr, destinoNoCelular } from '~/lib/app'

definePageMeta({ layout: false })

const authStore = useAuthStore()
const erro = ref('')
const lendo = ref(false)
const estadoLeitor = ref('Aponte para o QR code')
const video = ref<HTMLVideoElement | null>(null)

let fluxo: MediaStream | null = null
let quadro = 0
let tela: HTMLCanvasElement | null = null

async function abrirLeitor() {
  erro.value = ''
  if (!navigator.mediaDevices?.getUserMedia) { erro.value = 'Este aparelho não deixa usar a câmera aqui. Entre com código e senha.'; return }
  try {
    fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
  } catch (e: any) {
    erro.value = e?.name === 'NotAllowedError'
      ? 'A câmera foi bloqueada. Libere a câmera para o app nas configurações do celular.'
      : 'Não deu para abrir a câmera. Entre com código e senha.'
    return
  }
  lendo.value = true
  estadoLeitor.value = 'Aponte para o QR code'
  await nextTick()
  video.value!.srcObject = fluxo
  await video.value!.play().catch(() => {})
  procurar()
}

/** Usa o leitor nativo do navegador quando existe; senão decodifica o quadro com jsQR. */
async function procurar() {
  const detector = 'BarcodeDetector' in window ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) : null
  const jsQR = detector ? null : (await import('jsqr')).default
  tela ??= document.createElement('canvas')
  const ctx = tela.getContext('2d', { willReadFrequently: true })!

  const passo = async () => {
    if (!lendo.value || !video.value) return
    const v = video.value
    if (v.readyState >= 2 && v.videoWidth) {
      let texto: string | null = null
      if (detector) {
        const achados = await detector.detect(v).catch(() => [])
        texto = achados[0]?.rawValue ?? null
      } else {
        const escala = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight))
        tela!.width = Math.round(v.videoWidth * escala)
        tela!.height = Math.round(v.videoHeight * escala)
        ctx.drawImage(v, 0, 0, tela!.width, tela!.height)
        const img = ctx.getImageData(0, 0, tela!.width, tela!.height)
        texto = jsQR!(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null
      }
      if (texto) return lido(texto)
    }
    quadro = requestAnimationFrame(passo)
  }
  quadro = requestAnimationFrame(passo)
}

function lido(texto: string) {
  const t = tokenDoQr(texto)
  if (!t) {
    estadoLeitor.value = 'Esse QR não é de acesso ao RestaurantePDV'
    quadro = requestAnimationFrame(() => setTimeout(procurar, 1200))
    return
  }
  fecharLeitor()
  // /m valida o QR (plano, caixa aberto) e leva cada cargo para a sua tela
  navigateTo({ path: '/m', query: { t } })
}

function fecharLeitor() {
  lendo.value = false
  cancelAnimationFrame(quadro)
  fluxo?.getTracks().forEach(t => t.stop())
  fluxo = null
}

onMounted(() => {
  if (authStore.isAuthenticated) navigateTo(destinoNoCelular(authStore.usuario?.cargo), { replace: true })
})
onUnmounted(fecharLeitor)
</script>
