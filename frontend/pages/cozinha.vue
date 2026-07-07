<template>
  <div class="min-h-screen bg-neutral-950 transition-colors duration-200" :class="quiosque ? '' : 'com-sidebar'">
    <Sidebar v-if="!quiosque" />
    <Navbar v-if="!quiosque" />

    <main class="p-4 max-w-screen-2xl mx-auto">

      <!-- BANNER OFFLINE -->
      <div v-if="semConexao"
        class="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400">
        <WifiOff :size="18" class="shrink-0" />
        <div>
          <p class="text-sm font-black">Sem conexão com o servidor</p>
          <p class="text-[11px] opacity-80">Os pedidos exibidos podem estar desatualizados — tentando reconectar…</p>
        </div>
      </div>

      <!-- ALERTAS DE CANCELAMENTO -->
      <TransitionGroup name="fade">
        <div v-for="alerta in cancelamentos" :key="alerta.id"
          class="mb-3 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/20 border-2 border-red-500/50">
          <div class="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
            <X :size="18" class="text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-black text-red-300 uppercase">Item cancelado</p>
            <p class="text-sm text-white font-bold truncate">
              {{ alerta.quantidade }}x {{ alerta.produto }} · Mesa {{ alerta.mesa_id }}
              <span v-if="!alerta.removido_tudo" class="text-red-300 font-medium">(reduzida a quantidade)</span>
            </p>
          </div>
          <button @click="dispensarCancelamento(alerta.id)"
            class="h-10 px-4 rounded-xl bg-red-500/30 hover:bg-red-500/50 text-white text-xs font-black transition-all shrink-0">
            OK
          </button>
        </div>
      </TransitionGroup>

      <!-- HEADER -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-2xl font-black text-white">Cozinha</h1>
            <span class="flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg"
              :class="tempoReal ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'">
              <span class="w-1.5 h-1.5 rounded-full" :class="tempoReal ? 'bg-green-400 animate-pulse' : 'bg-amber-400'" />
              {{ tempoReal ? 'Tempo real' : 'Atualização a cada 20s' }}
            </span>
          </div>
          <p class="text-sm text-neutral-500 mt-0.5">
            <span class="text-orange-500 font-black">{{ totalPreparo }}</span> em preparo ·
            <span class="text-green-500 font-black">{{ totalProntos }}</span> aguardando entrega
            <span v-if="ultimaAtualizacao" class="ml-1">· atualizado {{ ultimaAtualizacao }}</span>
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button @click="somAtivo = !somAtivo"
            class="h-10 w-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-all"
            :class="somAtivo ? 'text-white' : 'text-neutral-600'"
            :title="somAtivo ? 'Som ligado' : 'Som desligado'">
            <Volume2 v-if="somAtivo" :size="16" />
            <VolumeX v-else :size="16" />
          </button>
          <button @click="buscar"
            class="h-10 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black transition-all flex items-center gap-2">
            <RefreshCw :size="14" :class="carregando ? 'animate-spin' : ''" />
            Atualizar
          </button>
          <button @click="alternarQuiosque"
            class="h-10 px-4 rounded-xl text-xs font-black transition-all flex items-center gap-2"
            :class="quiosque
              ? 'bg-orange-500 hover:bg-orange-400 text-white'
              : 'bg-neutral-800 hover:bg-neutral-700 text-white'">
            <Minimize2 v-if="quiosque" :size="14" />
            <Maximize2 v-else :size="14" />
            {{ quiosque ? 'Sair do modo tela cheia' : 'Tela cheia' }}
          </button>
        </div>
      </div>

      <!-- ABAS + FILTRO DE ESTAÇÃO -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div class="flex items-center gap-1 bg-neutral-900 rounded-2xl p-1">
          <button @click="abaAtiva = 'preparo'"
            class="h-11 px-5 rounded-xl text-sm font-black transition-all flex items-center gap-2"
            :class="abaAtiva === 'preparo' ? 'bg-orange-500 text-white' : 'text-neutral-500 hover:text-neutral-300'">
            Em preparo
            <span class="min-w-6 h-6 px-1.5 rounded-full text-xs flex items-center justify-center"
              :class="abaAtiva === 'preparo' ? 'bg-white/25' : 'bg-neutral-800'">{{ totalPreparo }}</span>
          </button>
          <button @click="abaAtiva = 'prontos'"
            class="h-11 px-5 rounded-xl text-sm font-black transition-all flex items-center gap-2"
            :class="abaAtiva === 'prontos' ? 'bg-green-500 text-white' : 'text-neutral-500 hover:text-neutral-300'">
            Prontos
            <span class="min-w-6 h-6 px-1.5 rounded-full text-xs flex items-center justify-center"
              :class="abaAtiva === 'prontos' ? 'bg-white/25' : 'bg-neutral-800'">{{ totalProntos }}</span>
          </button>
        </div>

        <div v-if="categorias.length > 1" class="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span class="text-[10px] font-black uppercase tracking-widest text-neutral-600 shrink-0">Estação:</span>
          <button @click="estacoes = []"
            class="h-9 px-3.5 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition-all"
            :class="!estacoes.length ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-neutral-500 hover:text-neutral-300'">
            Todas
          </button>
          <button v-for="cat in categorias" :key="cat" @click="alternarEstacao(cat)"
            class="h-9 px-3.5 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition-all"
            :class="estacoes.includes(cat) ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-neutral-500 hover:text-neutral-300'">
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- SKELETON -->
      <div v-if="carregando && !mesas.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="n in 6" :key="n" class="h-48 rounded-2xl bg-neutral-900 animate-pulse" />
      </div>

      <!-- VAZIO -->
      <div v-else-if="!mesasVisiveis.length" class="flex flex-col items-center justify-center py-28 text-center">
        <div class="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center mb-4">
          <ChefHat :size="28" class="text-neutral-700" />
        </div>
        <h3 class="text-lg font-black text-neutral-500">
          {{ abaAtiva === 'preparo' ? 'Nenhum pedido em preparo' : 'Nenhum prato aguardando entrega' }}
        </h3>
        <p class="text-sm text-neutral-700 mt-1">
          {{ abaAtiva === 'preparo' ? 'Novos pedidos aparecem aqui na hora, com aviso sonoro.' : 'Tudo entregue!' }}
        </p>
      </div>

      <!-- GRID DE MESAS -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="mesa in mesasVisiveis" :key="mesa.mesa_id"
          class="bg-neutral-900 border rounded-2xl overflow-hidden transition-colors"
          :class="abaAtiva === 'preparo' && mesaAtrasada(mesa) ? 'border-red-500/50' : 'border-neutral-800'">

          <!-- Cabeçalho da mesa -->
          <div class="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <p class="text-base font-black text-white">{{ mesa.mesa_nome }}</p>
              <p v-if="mesa.cliente" class="text-[11px] text-neutral-500">{{ mesa.cliente }}</p>
            </div>
            <span class="text-[10px] font-black px-2 py-1 rounded-lg"
              :class="abaAtiva === 'preparo' && mesaAtrasada(mesa)
                ? 'bg-red-500/20 text-red-400'
                : 'bg-neutral-800 text-neutral-400'">
              {{ mesa.itens.length }} item(ns)
            </span>
          </div>

          <!-- Itens -->
          <div class="p-3 space-y-2">
            <div v-for="item in mesa.itens" :key="item.id"
              class="p-3 rounded-xl border transition-all"
              :class="classeCard(item)">

              <div class="flex items-center gap-3">
                <!-- Status dot -->
                <div class="shrink-0 w-2.5 h-2.5 rounded-full" :class="classeDot(item)" />

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-black text-white truncate">{{ item.quantidade }}x {{ item.produto }}</p>
                    <span v-if="ehNovo(item)"
                      class="text-[9px] font-black uppercase bg-yellow-400 text-neutral-900 px-1.5 py-0.5 rounded-md shrink-0 animate-pulse">
                      Novo
                    </span>
                  </div>
                  <p v-if="item.observacao" class="text-[11px] text-orange-400 mt-0.5 truncate">{{ item.observacao }}</p>
                  <p class="text-[11px] mt-0.5" :class="classeTempo(item)">
                    <template v-if="item.status === 'pronto'">pronto há {{ tempoDecorrido(item.updated_at) }}</template>
                    <template v-else>{{ tempoDecorrido(item.created_at) }}</template>
                    <span v-if="item.categoria" class="text-neutral-600"> · {{ item.categoria }}</span>
                  </p>
                </div>
              </div>

              <!-- Ações (grandes, para toque) -->
              <div class="flex gap-2 mt-2.5">
                <template v-if="item.status === 'pendente'">
                  <button @click="atualizarStatus(item, 'preparando')"
                    class="flex-1 h-11 rounded-xl bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-sm font-black transition-all">
                    Iniciar
                  </button>
                </template>
                <template v-else-if="item.status === 'preparando'">
                  <button @click="atualizarStatus(item, 'pendente')" title="Voltar para pendente"
                    class="h-11 w-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-400 flex items-center justify-center transition-all shrink-0">
                    <Undo2 :size="16" />
                  </button>
                  <button @click="atualizarStatus(item, 'pronto')"
                    class="flex-1 h-11 rounded-xl bg-green-500 hover:bg-green-400 active:scale-95 text-white text-sm font-black transition-all">
                    Pronto
                  </button>
                </template>
                <template v-else-if="item.status === 'pronto'">
                  <button @click="atualizarStatus(item, 'preparando')" title="Voltar para preparo"
                    class="h-11 w-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-400 flex items-center justify-center transition-all shrink-0">
                    <Undo2 :size="16" />
                  </button>
                  <button @click="atualizarStatus(item, 'entregue')"
                    class="flex-1 h-11 rounded-xl bg-green-500 hover:bg-green-400 active:scale-95 text-white text-sm font-black transition-all">
                    Entregue
                  </button>
                </template>
              </div>
            </div>
          </div>

          <!-- Ações da mesa -->
          <div v-if="abaAtiva === 'preparo' && mesa.itens.some(i => i.status === 'preparando')" class="px-3 pb-3">
            <button @click="marcarTodosProntos(mesa)"
              class="w-full h-11 rounded-xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 text-sm font-black transition-all">
              Marcar todos como prontos
            </button>
          </div>
          <div v-else-if="abaAtiva === 'prontos'" class="px-3 pb-3">
            <button @click="marcarTodosEntregues(mesa)"
              class="w-full h-11 rounded-xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 text-sm font-black transition-all">
              Marcar todos como entregues
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  RefreshCw, ChefHat, Maximize2, Minimize2, Volume2, VolumeX,
  Undo2, WifiOff, X
} from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import { useApi } from '~/services/api'
import { useSocket } from '~/services/socket'
import { useToastStore } from '~/stores/toast'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: false })

const api        = useApi()
const socket     = useSocket()
const toastStore = useToastStore()
const authStore  = useAuthStore()

interface Item {
  id: number; pedido_id: number; produto: string; categoria: string | null
  quantidade: number; status: string; observacao: string | null
  created_at: string; updated_at: string
}
interface Mesa {
  mesa_id: number; mesa_nome: string; cliente: string | null; itens: Item[]
}

const mesas             = ref<Mesa[]>([])
const carregando        = ref(false)
const semConexao        = ref(false)
const tempoReal         = ref(false)
const ultimaAtualizacao = ref('')
const abaAtiva          = ref<'preparo' | 'prontos'>('preparo')

// Relógio reativo: cronômetros e cores de atraso atualizam a cada segundo
const agora = ref(Date.now())

// localStorage só existe no navegador (a página passa pelo SSR do Nuxt)
function lsGet(chave: string): string | null {
  return process.client ? localStorage.getItem(chave) : null
}
function lsSet(chave: string, valor: string) {
  if (process.client) localStorage.setItem(chave, valor)
}

// ══ FILTRO DE ESTAÇÃO (persistido por máquina) ══
const estacoes = ref<string[]>([])
try { estacoes.value = JSON.parse(lsGet('kds_estacoes') || '[]') } catch {}
watch(estacoes, v => lsSet('kds_estacoes', JSON.stringify(v)), { deep: true })

function alternarEstacao(cat: string) {
  const i = estacoes.value.indexOf(cat)
  if (i >= 0) estacoes.value.splice(i, 1)
  else estacoes.value.push(cat)
}

const categorias = computed(() => {
  const set = new Set<string>()
  for (const m of mesas.value) for (const i of m.itens) if (i.categoria) set.add(i.categoria)
  return [...set].sort()
})

// ══ LISTAS ══
function itemVisivel(i: Item) {
  if (estacoes.value.length && i.categoria && !estacoes.value.includes(i.categoria)) return false
  return abaAtiva.value === 'preparo'
    ? ['pendente', 'preparando'].includes(i.status)
    : i.status === 'pronto'
}

const mesasVisiveis = computed(() =>
  mesas.value
    .map(m => ({ ...m, itens: m.itens.filter(itemVisivel) }))
    .filter(m => m.itens.length)
    // mais urgente primeiro: mesa com o item mais antigo no topo
    .sort((a, b) =>
      Math.min(...a.itens.map(i => new Date(i.created_at).getTime())) -
      Math.min(...b.itens.map(i => new Date(i.created_at).getTime()))
    )
)

function contar(status: string[]) {
  let n = 0
  for (const m of mesas.value) {
    for (const i of m.itens) {
      if (!status.includes(i.status)) continue
      if (estacoes.value.length && i.categoria && !estacoes.value.includes(i.categoria)) continue
      n++
    }
  }
  return n
}
const totalPreparo = computed(() => contar(['pendente', 'preparando']))
const totalProntos = computed(() => contar(['pronto']))

// ══ TEMPOS / ATRASO ══
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
function classeTempo(item: Item) {
  if (item.status === 'pronto') return 'text-green-500 font-bold'
  const m = minutosDesde(item.created_at)
  if (m >= 15) return 'text-red-400 font-black'
  if (m >= 10) return 'text-amber-400 font-bold'
  return 'text-neutral-500'
}
function classeDot(item: Item) {
  if (item.status === 'pronto')     return 'bg-green-400'
  if (item.status === 'preparando') return 'bg-blue-400'
  return 'bg-yellow-400 animate-pulse'
}
function classeCard(item: Item) {
  if (item.status === 'pronto')     return 'bg-green-500/10 border-green-500/20'
  if (item.status === 'preparando') return 'bg-blue-500/10 border-blue-500/20'
  if (minutosDesde(item.created_at) >= 15) return 'bg-red-500/10 border-red-500/40'
  return 'bg-neutral-800/60 border-neutral-700/50'
}
function mesaAtrasada(mesa: Mesa) {
  return mesa.itens.some(i => i.status !== 'pronto' && minutosDesde(i.created_at) >= 15)
}

// ══ SOM (WebAudio — sem depender de arquivo de áudio) ══
const somAtivo = ref(lsGet('kds_som') !== 'off')
watch(somAtivo, v => lsSet('kds_som', v ? 'on' : 'off'))

let audioCtx: AudioContext | null = null
function tocarSom(tipo: 'novo' | 'cancelado') {
  if (!somAtivo.value) return
  try {
    audioCtx = audioCtx || new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const notas = tipo === 'novo' ? [880, 1174.66] : [440, 220]
    notas.forEach((freq, i) => {
      const osc = audioCtx!.createOscillator()
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
// Navegadores exigem interação antes de tocar áudio — destrava no primeiro toque
function destravarAudio() {
  try {
    audioCtx = audioCtx || new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  } catch {}
  document.removeEventListener('pointerdown', destravarAudio)
}

// ══ ALERTAS DE CANCELAMENTO ══
interface Cancelamento { id: number; produto: string; quantidade: number; mesa_id: number; removido_tudo: boolean }
const cancelamentos = ref<Cancelamento[]>([])
let cancelSeq = 0

function registrarCancelamento(d: any) {
  const alerta = { id: ++cancelSeq, produto: d.produto, quantidade: d.quantidade, mesa_id: d.mesa_id, removido_tudo: !!d.removido_tudo }
  cancelamentos.value.push(alerta)
  tocarSom('cancelado')
  // some sozinho depois de 60s se ninguém der OK
  setTimeout(() => dispensarCancelamento(alerta.id), 60000)
}
function dispensarCancelamento(id: number) {
  cancelamentos.value = cancelamentos.value.filter(c => c.id !== id)
}

// ══ BUSCA (fonte de verdade) ══
let idsConhecidos = new Set<number>()
let primeiraBusca = true

async function buscar() {
  carregando.value = true
  try {
    const dados = await api.get<Mesa[]>('/pedidos/cozinha')
    mesas.value = Array.isArray(dados) ? dados : []
    semConexao.value = false
    ultimaAtualizacao.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    // Detecta itens que chegaram sem passar pelo socket (fallback do polling)
    const idsAtuais = new Set<number>()
    let chegouNovo = false
    for (const m of mesas.value) for (const i of m.itens) {
      idsAtuais.add(i.id)
      if (!primeiraBusca && !idsConhecidos.has(i.id) && i.status === 'pendente') chegouNovo = true
    }
    if (chegouNovo && !tempoReal.value) tocarSom('novo')
    idsConhecidos = idsAtuais
    primeiraBusca = false
  } catch {
    semConexao.value = true
  } finally {
    carregando.value = false
  }
}

// Colapsa rajadas de eventos numa única re-busca
let buscaAgendada: any = null
function agendarBusca() {
  if (buscaAgendada) return
  buscaAgendada = setTimeout(() => { buscaAgendada = null; buscar() }, 300)
}

// ══ AÇÕES ══
async function atualizarStatus(item: Item, novoStatus: string) {
  const statusAnterior = item.status
  item.status = novoStatus
  try {
    await api.patch(`/pedidos/itens/${item.id}/status`, { status: novoStatus })
    agendarBusca()
  } catch (e: any) {
    item.status = statusAnterior
    toastStore.error('Erro ao atualizar status', e?.message)
  }
}

async function marcarTodosProntos(mesa: Mesa) {
  const preparando = mesa.itens.filter(i => i.status === 'preparando')
  await Promise.all(preparando.map(i =>
    api.patch(`/pedidos/itens/${i.id}/status`, { status: 'pronto' }).catch(() => {})
  ))
  buscar()
}

async function marcarTodosEntregues(mesa: Mesa) {
  const prontos = mesa.itens.filter(i => i.status === 'pronto')
  await Promise.all(prontos.map(i =>
    api.patch(`/pedidos/itens/${i.id}/status`, { status: 'entregue' }).catch(() => {})
  ))
  buscar()
}

// ══ MODO QUIOSQUE ══
const quiosque = ref(false)
function alternarQuiosque() {
  quiosque.value = !quiosque.value
  lsSet('kds_quiosque', quiosque.value ? 'on' : 'off')
  try {
    if (quiosque.value) document.documentElement.requestFullscreen?.()
    else if (document.fullscreenElement) document.exitFullscreen?.()
  } catch {}
}

// ══ CICLO DE VIDA ══
let timerPolling: any = null
let timerRelogio: any = null
let timerToken: any = null
const desinscrever: Array<() => void> = []

onMounted(() => {
  quiosque.value = lsGet('kds_quiosque') === 'on'
  buscar()

  // Tempo real via socket; o polling continua como rede de segurança
  const s = socket.connect()
  tempoReal.value = socket.isConnected()
  s?.on('connect', () => { tempoReal.value = true; agendarBusca() })
  s?.on('disconnect', () => { tempoReal.value = false })
  desinscrever.push(socket.on('cozinha:novo_item', (d: any) => {
    tocarSom('novo')
    toastStore.success(`Novo pedido: ${d.quantidade}x ${d.produto}`)
    agendarBusca()
  }))
  desinscrever.push(socket.on('cozinha:item_status', () => agendarBusca()))
  desinscrever.push(socket.on('cozinha:item_cancelado', (d: any) => {
    registrarCancelamento(d)
    agendarBusca()
  }))

  timerPolling = setInterval(() => { if (!document.hidden) buscar() }, 20000)
  timerRelogio = setInterval(() => { agora.value = Date.now() }, 1000)

  // Renova o token a cada 45min — a tela fica ligada o turno inteiro
  timerToken = setInterval(async () => {
    try {
      const resp = await api.get<any>('/auth/renovar')
      if (resp?.token) authStore.setAuth(resp.token, resp.usuario || authStore.usuario!)
    } catch {}
  }, 45 * 60 * 1000)

  document.addEventListener('pointerdown', destravarAudio)
})

onBeforeUnmount(() => {
  clearInterval(timerPolling)
  clearInterval(timerRelogio)
  clearInterval(timerToken)
  desinscrever.forEach(fn => fn())
  socket.disconnect()
  document.removeEventListener('pointerdown', destravarAudio)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-6px); }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
