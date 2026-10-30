<template>
  <PlatformShell ativo="restaurantes" titulo="Tela ao vivo">
    <div class="pf-head">
      <div>
        <h1>{{ tenantNome || 'Tela ao vivo' }}</h1>
        <p>{{ subtitulo }}</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button v-if="estado === 'aovivo'" class="pf-btn" @click="pedirQuadro"><RefreshCw :size="16" /> Recarregar tela</button>
        <button v-if="estado === 'aguardando' || estado === 'aovivo'" class="pf-btn d" @click="encerrar"><PhoneOff :size="16" /> Encerrar</button>
        <button v-else-if="estado === 'fim'" class="pf-btn p" @click="pedir"><MonitorPlay :size="16" /> Pedir de novo</button>
        <NuxtLink to="/platform/restaurantes" class="pf-btn">Voltar</NuxtLink>
      </div>
    </div>

    <div v-if="estado !== 'aovivo'" class="esp-vazio pf-card">
      <span v-if="estado === 'conectando' || estado === 'aguardando'" class="pf-spin" />
      <MonitorX v-else :size="28" />
      <strong>{{ estado === 'conectando' ? 'Conectando…' : estado === 'aguardando' ? 'Aguardando o cliente aceitar' : 'Sessão encerrada' }}</strong>
      <p>{{ estado === 'aguardando' ? 'Os aparelhos logados neste restaurante estão vendo o pedido. O primeiro que permitir aparece aqui.' : motivo }}</p>
    </div>

    <div v-show="estado === 'aovivo'" class="esp-moldura pf-card">
      <div class="esp-barra"><span class="esp-vivo"><i /> Ao vivo</span><span class="esp-url">{{ endereco }}</span></div>
      <div ref="palcoRef" class="esp-palco" :style="{ height: alturaPalco + 'px' }" />
    </div>
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { MonitorPlay, MonitorX, PhoneOff, RefreshCw } from 'lucide-vue-next'
import { io, type Socket } from 'socket.io-client'
import { Replayer, EventType } from 'rrweb'
import 'rrweb/dist/style.css'
import { EVENTOS } from '~/shared/eventos'
import { urlNaOrigemAtual } from '~/services/url'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

const E = EVENTOS.espelho
const route = useRoute()
const config = useRuntimeConfig()
const platformAuth = usePlatformAuthStore()
const { platformFetch } = usePlatformFetch()

const tenantId = String(route.params.id)
const tenantNome = ref('')
const estado = ref<'conectando' | 'aguardando' | 'aovivo' | 'fim'>('conectando')
const motivo = ref('')
const usuario = ref('')
const endereco = ref('')
const palcoRef = ref<HTMLDivElement>()
const alturaPalco = ref(560)

const subtitulo = computed(() => estado.value === 'aovivo'
  ? `Vendo a tela de ${usuario.value || 'um aparelho do restaurante'}. Só visualização: você não mexe na tela do cliente.`
  : 'O cliente precisa aceitar o pedido na tela dele.')

let socket: Socket | null = null
let sessao = ''
let player: Replayer | null = null
let tela = { w: 1280, h: 720 }

function conectar() {
  socket = io(urlNaOrigemAtual(config.public.socketUrl as string), {
    auth: { token: platformAuth.token },
    transports: ['websocket', 'polling'],
    reconnection: false,
  })
  socket.on('connect', pedir)
  socket.on('connect_error', (e) => fim(`Não deu para conectar: ${e.message}`))
  socket.on(E.aceito, (d: { sessao: string; usuario: string; tela: string }) => {
    if (d.sessao !== sessao) return
    usuario.value = d.usuario
    endereco.value = d.tela
    estado.value = 'aovivo'
  })
  socket.on(E.gravacao, (d: { sessao: string; eventos: any[] }) => { if (d.sessao === sessao) receber(d.eventos) })
  socket.on(E.encerrado, (d: { sessao: string; motivo?: string }) => { if (d.sessao === sessao) fim(d.motivo || 'Sessão encerrada') })
}

function pedir() {
  destruirPlayer()
  estado.value = 'aguardando'
  motivo.value = ''
  socket?.emit(E.pedir, { tenantId }, (r: { sessao?: string; erro?: string }) => {
    if (r?.erro || !r?.sessao) return fim(r?.erro || 'Não deu para pedir')
    sessao = r.sessao
  })
}

function receber(eventos: any[]) {
  for (const ev of eventos) {
    if (ev.type === EventType.Custom && ev.data?.tag === 'rota') endereco.value = String(ev.data.payload?.caminho ?? '')
    if (ev.type === EventType.Meta) {
      endereco.value = String(ev.data?.href ?? '').replace(/^https?:\/\/[^/]+/, '')
      tela = { w: ev.data?.width || tela.w, h: ev.data?.height || tela.h }
    }
    if (!player) {
      // Sem a tela inteira ainda (chegou no meio): pede de novo
      if (ev.type !== EventType.Meta && ev.type !== EventType.FullSnapshot) { pedirQuadro(); continue }
      player = new Replayer([], { root: palcoRef.value!, liveMode: true, mouseTail: false })
      player.on('resize', (d: any) => { tela = { w: d.width, h: d.height }; ajustar() })
      player.startLive(ev.timestamp - 500)
    }
    player.addEvent(ev)
  }
  ajustar()
}

// Cabe a tela do cliente na largura disponível, sem distorcer
function ajustar() {
  const palco = palcoRef.value
  const wrapper = palco?.querySelector<HTMLElement>('.replayer-wrapper')
  if (!palco || !wrapper) return
  const escala = Math.min(1, palco.clientWidth / tela.w)
  wrapper.style.transformOrigin = 'top left'
  wrapper.style.transform = `scale(${escala})`
  alturaPalco.value = Math.round(tela.h * escala)
}

function pedirQuadro() {
  if (sessao) socket?.emit(E.quadroCompleto, { sessao })
}

function encerrar() {
  if (sessao) socket?.emit(E.encerrar, { sessao })
  fim('Você encerrou')
}

function fim(texto: string) {
  estado.value = 'fim'
  motivo.value = texto
  sessao = ''
  destruirPlayer()
}

function destruirPlayer() {
  player?.pause()
  player = null
  if (palcoRef.value) palcoRef.value.innerHTML = ''
}

onMounted(async () => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) return navigateTo('/platform/login')
  platformFetch<{ nome: string }>(`/platform/tenants/${tenantId}`).then(t => { tenantNome.value = t?.nome ?? '' }).catch(() => {})
  conectar()
  window.addEventListener('resize', ajustar)
})

onUnmounted(() => {
  window.removeEventListener('resize', ajustar)
  if (sessao) socket?.emit(E.encerrar, { sessao })
  socket?.disconnect()
  destruirPlayer()
})
</script>

<style scoped>
.esp-vazio { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 56px 24px; color: var(--pf-muted); }
.esp-vazio strong { color: var(--pf-ink); font-size: 17px; }
.esp-vazio p { margin: 0; max-width: 52ch; font-size: 14px; }
.esp-moldura { overflow: hidden; }
.esp-barra { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--pf-line); font-size: 13px; }
.esp-vivo { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: #B42318; }
.esp-vivo i { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: esp-pulso 1.2s ease-in-out infinite; }
.esp-url { color: var(--pf-muted); font-family: ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.esp-palco { position: relative; overflow: hidden; background: #111; }
.esp-palco :deep(.replayer-wrapper) { position: absolute; top: 0; left: 0; }
.esp-palco :deep(iframe) { border: 0; pointer-events: none; }
@keyframes esp-pulso { 50% { opacity: .3 } }
@media (prefers-reduced-motion: reduce) { .esp-vivo i { animation: none } }
</style>
