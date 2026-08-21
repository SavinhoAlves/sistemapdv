<template>
  <div class="min-h-screen bg-neutral-950 text-white flex flex-col select-none" @click="destravarAudio">

    <!-- ══ TOPBAR ══ -->
    <header class="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-neutral-900/60 backdrop-blur shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <ChefHat :size="16" class="text-orange-400" />
        </div>
        <div>
          <p class="text-sm font-black text-white leading-none">Painel da Cozinha</p>
          <p class="text-[10px] text-white/30 font-bold leading-none mt-0.5">Exibição em tempo real</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Contador de status -->
        <div class="flex items-center gap-2">
          <span class="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/15">
            <span class="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            {{ totalPendente }} pendente{{ totalPendente !== 1 ? 's' : '' }}
          </span>
          <span class="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/15">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {{ totalPreparando }} em preparo
          </span>
          <span class="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/15">
            <span class="w-1.5 h-1.5 rounded-full bg-green-400" />
            {{ totalPronto }} pronto{{ totalPronto !== 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Relógio -->
        <div class="hidden sm:flex flex-col items-end">
          <p class="text-base font-black tabular-nums text-white leading-none">{{ horaAtual }}</p>
          <p class="text-[10px] text-white/25 font-bold leading-none mt-0.5">{{ dataAtual }}</p>
        </div>

        <!-- Controles -->
        <div class="flex items-center gap-1.5">
          <button @click="toggleSom"
            class="h-8 w-8 rounded-xl hover:bg-white/[0.06] flex items-center justify-center transition-all"
            :class="somAtivo ? 'text-white' : 'text-white/25'"
            :title="somAtivo ? 'Som ligado' : 'Som desligado'">
            <Volume2 v-if="somAtivo" :size="14" />
            <VolumeX v-else :size="14" />
          </button>
          <button @click="alternarFullscreen"
            class="h-8 w-8 rounded-xl hover:bg-white/[0.06] text-white/40 hover:text-white flex items-center justify-center transition-all"
            :title="fullscreen ? 'Sair da tela cheia' : 'Tela cheia'">
            <Minimize2 v-if="fullscreen" :size="14" />
            <Maximize2 v-else :size="14" />
          </button>
          <NuxtLink to="/cozinha"
            class="h-8 px-3 rounded-xl hover:bg-white/[0.06] text-white/25 hover:text-white text-xs font-black flex items-center gap-1.5 transition-all">
            <ArrowLeft :size="12" />
            Cozinha
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- ══ BANNER OFFLINE ══ -->
    <div v-if="semConexao"
      class="flex items-center gap-3 px-5 py-2.5 bg-red-500/15 border-b border-red-500/20 text-red-400 text-xs font-bold shrink-0">
      <WifiOff :size="14" />
      Sem conexão com o servidor — exibindo dados em cache
    </div>

    <!-- ══ CONTEÚDO ══ -->
    <main class="flex-1 p-4 overflow-auto">

      <!-- Vazio -->
      <div v-if="!carregando && !mesasVisiveis.length"
        class="flex flex-col items-center justify-center h-full py-24 gap-4 text-center">
        <div class="w-20 h-20 rounded-3xl bg-white/[0.04] flex items-center justify-center">
          <ChefHat :size="36" class="text-white/10" />
        </div>
        <p class="text-2xl font-black text-white/20">Nenhum pedido no momento</p>
        <p class="text-sm text-white/10">Os pedidos aparecerão aqui em tempo real</p>
      </div>

      <!-- Grid de mesas -->
      <TransitionGroup
        name="mesa"
        tag="div"
        class="grid gap-3"
        :style="`grid-template-columns: repeat(auto-fill, minmax(${colWidth}, 1fr))`"
      >
        <div
          v-for="mesa in mesasVisiveis"
          :key="mesa.mesa_id"
          class="rounded-2xl border overflow-hidden transition-all duration-300"
          :class="cardBorda(mesa)"
        >
          <!-- Cabeçalho da mesa -->
          <div class="px-4 py-3 flex items-center justify-between"
            :class="cardCabecalho(mesa)">
            <div>
              <p class="text-lg font-black leading-none">{{ mesa.mesa_nome }}</p>
              <p v-if="mesa.cliente" class="text-[11px] opacity-60 mt-0.5">{{ mesa.cliente }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <!-- contagem por status -->
              <span v-if="conta(mesa, 'pendente')" class="text-[10px] font-black px-2 py-1 rounded-lg bg-yellow-400/20 text-yellow-300">
                {{ conta(mesa, 'pendente') }} pend.
              </span>
              <span v-if="conta(mesa, 'preparando')" class="text-[10px] font-black px-2 py-1 rounded-lg bg-blue-400/20 text-blue-300">
                {{ conta(mesa, 'preparando') }} prep.
              </span>
              <span v-if="conta(mesa, 'pronto')" class="text-[10px] font-black px-2 py-1 rounded-lg bg-green-400/20 text-green-300">
                {{ conta(mesa, 'pronto') }} pronto
              </span>
            </div>
          </div>

          <!-- Lista de itens -->
          <div class="p-3 space-y-1.5">
            <div
              v-for="item in mesa.itens"
              :key="item.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              :class="itemBg(item)"
            >
              <!-- Dot status -->
              <div class="w-2.5 h-2.5 rounded-full shrink-0" :class="itemDot(item)" />

              <!-- Nome + qtd -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-black leading-none truncate">
                  <span class="text-orange-400">{{ item.quantidade }}×</span>
                  {{ item.produto }}
                </p>
                <p v-if="item.observacao" class="text-[10px] text-orange-300/80 mt-0.5 truncate">{{ item.observacao }}</p>
              </div>

              <!-- Tempo + badge novo -->
              <div class="text-right shrink-0">
                <span v-if="ehNovo(item)"
                  class="text-[9px] font-black uppercase bg-yellow-400 text-neutral-900 px-1.5 py-0.5 rounded-md animate-pulse">
                  Novo
                </span>
                <p v-else class="text-[11px] font-bold" :class="corTempo(item)">
                  {{ item.status === 'pronto' ? '✓ pronto' : tempoDecorrido(item.created_at) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </main>

    <!-- ══ RODAPÉ ══ -->
    <footer class="flex items-center justify-between px-6 py-2 border-t border-white/[0.04] bg-neutral-900/40 text-[10px] text-white/20 font-bold shrink-0">
      <span>Restaurante PDV · Painel da Cozinha</span>
      <span v-if="ultimaAtualizacao">Atualizado às {{ ultimaAtualizacao }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ChefHat, Volume2, VolumeX, Maximize2, Minimize2, WifiOff, ArrowLeft } from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useSocket } from '~/services/socket'

definePageMeta({ layout: false })

const api    = useApi()
const socket = useSocket()

interface Item {
  id: number; produto: string; categoria: string | null
  quantidade: number; status: string; observacao: string | null
  created_at: string; updated_at: string
}
interface Mesa {
  mesa_id: number; mesa_nome: string; cliente: string | null; itens: Item[]
}

const mesas             = ref<Mesa[]>([])
const carregando        = ref(false)
const semConexao        = ref(false)
const fullscreen        = ref(false)
const ultimaAtualizacao = ref('')
const agora             = ref(Date.now())

function lsGet(k: string) { return process.client ? localStorage.getItem(k) : null }
function lsSet(k: string, v: string) { if (process.client) localStorage.setItem(k, v) }

const somAtivo = ref(lsGet('kds_som') !== 'off')

function toggleSom() {
  somAtivo.value = !somAtivo.value
  lsSet('kds_som', somAtivo.value ? 'on' : 'off')
  if (somAtivo.value) tocarSom('novo')
}

let audioCtx: AudioContext | null = null
function tocarSom(tipo: 'novo' | 'cancelado') {
  if (!somAtivo.value) return
  try {
    audioCtx = audioCtx || new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const notas = tipo === 'novo' ? [880, 1174.66] : [440, 220]
    notas.forEach((freq, i) => {
      const osc  = audioCtx!.createOscillator()
      const gain = audioCtx!.createGain()
      osc.connect(gain); gain.connect(audioCtx!.destination)
      osc.type = 'square'
      osc.frequency.value = freq
      const t = audioCtx!.currentTime + i * 0.18
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      osc.start(t); osc.stop(t + 0.18)
    })
  } catch {}
}
function destravarAudio() {
  try {
    audioCtx = audioCtx || new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  } catch {}
}

const mesasVisiveis = computed(() =>
  mesas.value
    .map(m => ({ ...m, itens: m.itens.filter(i => ['pendente', 'preparando', 'pronto'].includes(i.status)) }))
    .filter(m => m.itens.length)
    .sort((a, b) =>
      Math.min(...a.itens.map(i => new Date(i.created_at).getTime())) -
      Math.min(...b.itens.map(i => new Date(i.created_at).getTime()))
    )
)

const totalPendente  = computed(() => mesas.value.flatMap(m => m.itens).filter(i => i.status === 'pendente').length)
const totalPreparando = computed(() => mesas.value.flatMap(m => m.itens).filter(i => i.status === 'preparando').length)
const totalPronto    = computed(() => mesas.value.flatMap(m => m.itens).filter(i => i.status === 'pronto').length)

const colWidth = computed(() => {
  const n = mesasVisiveis.value.length
  if (n <= 2)  return '340px'
  if (n <= 6)  return '280px'
  if (n <= 12) return '240px'
  return '200px'
})

function conta(mesa: Mesa, status: string) {
  return mesa.itens.filter(i => i.status === status).length
}

function prioridadeMesa(mesa: Mesa) {
  if (mesa.itens.some(i => i.status === 'pendente'))   return 0
  if (mesa.itens.some(i => i.status === 'preparando')) return 1
  return 2
}

function cardBorda(mesa: Mesa) {
  const p = prioridadeMesa(mesa)
  if (p === 0) return 'border-yellow-500/30 bg-yellow-500/[0.04]'
  if (p === 1) return 'border-blue-500/30 bg-blue-500/[0.03]'
  return 'border-green-500/30 bg-green-500/[0.03]'
}

function cardCabecalho(mesa: Mesa) {
  const p = prioridadeMesa(mesa)
  if (p === 0) return 'bg-yellow-500/10 text-yellow-100'
  if (p === 1) return 'bg-blue-500/10 text-blue-100'
  return 'bg-green-500/10 text-green-100'
}

function itemBg(item: Item) {
  if (item.status === 'pronto')     return 'bg-green-500/10 border border-green-500/15'
  if (item.status === 'preparando') return 'bg-blue-500/10 border border-blue-500/15'
  if (minutosDesde(item.created_at) >= 15) return 'bg-red-500/15 border border-red-500/20'
  return 'bg-white/[0.04] border border-white/[0.06]'
}

function itemDot(item: Item) {
  if (item.status === 'pronto')     return 'bg-green-400'
  if (item.status === 'preparando') return 'bg-blue-400 animate-pulse'
  if (minutosDesde(item.created_at) >= 15) return 'bg-red-400 animate-pulse'
  return 'bg-yellow-400 animate-pulse'
}

function corTempo(item: Item) {
  const m = minutosDesde(item.created_at)
  if (m >= 15) return 'text-red-400 font-black'
  if (m >= 10) return 'text-amber-400 font-bold'
  return 'text-white/35'
}

function minutosDesde(iso: string) {
  return Math.floor((agora.value - new Date(iso).getTime()) / 60000)
}
function tempoDecorrido(iso: string) {
  const diff = Math.floor((agora.value - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${Math.max(0, diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h${Math.floor((diff % 3600) / 60)}min`
}
function ehNovo(item: Item) {
  return item.status === 'pendente' && minutosDesde(item.created_at) < 2
}

// Relógio
const horaAtual = ref('')
const dataAtual = ref('')
function atualizarRelogio() {
  const agr = new Date()
  horaAtual.value = agr.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  dataAtual.value = agr.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function alternarFullscreen() {
  fullscreen.value = !fullscreen.value
  try {
    if (fullscreen.value) document.documentElement.requestFullscreen?.()
    else if (document.fullscreenElement) document.exitFullscreen?.()
  } catch {}
}

let idsConhecidos = new Set<number>()
let primeiraBusca = true

async function buscar() {
  carregando.value = true
  try {
    const dados = await api.get<Mesa[]>('/pedidos/cozinha')
    mesas.value = Array.isArray(dados) ? dados : []
    semConexao.value = false
    ultimaAtualizacao.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    const idsAtuais = new Set<number>()
    let chegouNovo = false
    for (const m of mesas.value) for (const i of m.itens) {
      idsAtuais.add(i.id)
      if (!primeiraBusca && !idsConhecidos.has(i.id) && i.status === 'pendente') chegouNovo = true
    }
    if (chegouNovo) tocarSom('novo')
    idsConhecidos = idsAtuais
    primeiraBusca = false
  } catch {
    semConexao.value = true
  } finally {
    carregando.value = false
  }
}

let buscaAgendada: any = null
function agendarBusca() {
  if (buscaAgendada) return
  buscaAgendada = setTimeout(() => { buscaAgendada = null; buscar() }, 300)
}

let timerPolling: any = null
let timerRelogio: any = null
let timerAgora: any   = null
const desinscrever: Array<() => void> = []

onMounted(() => {
  buscar()
  atualizarRelogio()

  const s = socket.connect()
  s?.on('connect', () => agendarBusca())
  desinscrever.push(socket.on('cozinha:novo_item', () => { tocarSom('novo'); agendarBusca() }))
  desinscrever.push(socket.on('cozinha:item_status', () => agendarBusca()))
  desinscrever.push(socket.on('cozinha:item_cancelado', () => { tocarSom('cancelado'); agendarBusca() }))

  timerPolling = setInterval(() => { if (!document.hidden) buscar() }, 15000)
  timerAgora   = setInterval(() => { agora.value = Date.now() }, 1000)
  timerRelogio = setInterval(atualizarRelogio, 1000)

  document.addEventListener('fullscreenchange', () => {
    fullscreen.value = !!document.fullscreenElement
  })
})

onBeforeUnmount(() => {
  clearInterval(timerPolling)
  clearInterval(timerAgora)
  clearInterval(timerRelogio)
  desinscrever.forEach(fn => fn())
  socket.disconnect()
})
</script>

<style scoped>
.mesa-enter-active, .mesa-leave-active { transition: all 0.3s ease; }
.mesa-enter-from { opacity: 0; transform: scale(0.95); }
.mesa-leave-to   { opacity: 0; transform: scale(0.95); }
</style>
