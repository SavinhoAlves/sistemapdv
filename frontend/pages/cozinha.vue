<template>
  <div class="min-h-screen transition-colors duration-200" :class="quiosque ? '' : 'com-sidebar'">
    <Sidebar v-if="!quiosque" />
    <Navbar v-if="!quiosque" />

    <main class="p-4 w-full relative min-h-[calc(100vh-4rem)]">
      <CaixaFechado v-if="!quiosque" acao="receber pedidos na cozinha" />

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
            <p class="text-sm text-gray-900 dark:text-white font-bold truncate">
              {{ alerta.quantidade }}x {{ alerta.produto }} · {{ alerta.onde }}
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
            <h1 class="text-2xl font-black text-gray-900 dark:text-white">Cozinha</h1>
            <span class="flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg"
              :class="tempoReal ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'">
              <span class="w-1.5 h-1.5 rounded-full" :class="tempoReal ? 'bg-green-400 animate-pulse' : 'bg-amber-400'" />
              {{ tempoReal ? 'Tempo real' : 'Atualização a cada 20s' }}
            </span>
          </div>
          <p class="text-sm text-gray-500 dark:text-white/40 mt-0.5">
            <span class="text-orange-500 font-black">{{ totalPreparo }}</span> em preparo ·
            <span class="text-green-500 font-black">{{ totalProntos }}</span> aguardando entrega
            <span v-if="ultimaAtualizacao" class="ml-1">· atualizado {{ ultimaAtualizacao }}</span>
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button @click="toggleSom"
            class="h-10 w-10 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-all"
            :class="somAtivo ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/30'"
            :title="somAtivo ? 'Som ligado (clique para desligar)' : 'Som desligado (clique para ligar e testar)'">
            <Volume2 v-if="somAtivo" :size="16" />
            <VolumeX v-else :size="16" />
          </button>
          <button @click="buscar"
            class="h-10 px-4 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white text-xs font-black transition-all flex items-center gap-2">
            <RefreshCw :size="14" :class="carregando ? 'animate-spin' : ''" />
            Atualizar
          </button>
          <NuxtLink to="/cozinha/painel-cozinha"
            class="h-10 px-4 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white text-xs font-black transition-all flex items-center gap-2"
            title="Abrir painel para exibição na cozinha/balcão">
            <Monitor :size="14" />
            Painel
          </NuxtLink>
          <button @click="alternarQuiosque"
            class="h-10 px-4 rounded-xl text-xs font-black transition-all flex items-center gap-2"
            :class="quiosque
              ? 'bg-orange-500 hover:bg-orange-400 text-white'
              : 'bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white'">
            <Minimize2 v-if="quiosque" :size="14" />
            <Maximize2 v-else :size="14" />
            {{ quiosque ? 'Sair do modo tela cheia' : 'Tela cheia' }}
          </button>
        </div>
      </div>

      <!-- ABAS + FILTRO DE ESTAÇÃO -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div class="flex items-center gap-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-1">
          <button @click="abaAtiva = 'preparo'"
            class="h-11 px-5 rounded-xl text-sm font-black transition-all flex items-center gap-2"
            :class="abaAtiva === 'preparo' ? 'bg-orange-500 text-white' : 'text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70'">
            Em preparo
            <span class="min-w-6 h-6 px-1.5 rounded-full text-xs flex items-center justify-center"
              :class="abaAtiva === 'preparo' ? 'bg-white/25' : 'bg-gray-200 dark:bg-white/[0.06]'">{{ totalPreparo }}</span>
          </button>
          <button @click="abaAtiva = 'prontos'"
            class="h-11 px-5 rounded-xl text-sm font-black transition-all flex items-center gap-2"
            :class="abaAtiva === 'prontos' ? 'bg-green-500 text-white' : 'text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70'">
            Prontos
            <span class="min-w-6 h-6 px-1.5 rounded-full text-xs flex items-center justify-center"
              :class="abaAtiva === 'prontos' ? 'bg-white/25' : 'bg-gray-200 dark:bg-white/[0.06]'">{{ totalProntos }}</span>
          </button>
        </div>

        <div v-if="categorias.length > 1" class="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/30 shrink-0">Estação:</span>
          <button @click="estacoes = []"
            class="h-9 px-3.5 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition-all"
            :class="!estacoes.length ? 'bg-gray-900 dark:bg-white text-white dark:text-neutral-900' : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70'">
            Todas
          </button>
          <button v-for="cat in categorias" :key="cat" @click="alternarEstacao(cat)"
            class="h-9 px-3.5 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition-all"
            :class="estacoes.includes(cat) ? 'bg-gray-900 dark:bg-white text-white dark:text-neutral-900' : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70'">
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- SKELETON -->
      <div v-if="!iniciado" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="n in 6" :key="n" class="h-48 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
      </div>

      <!-- VAZIO -->
      <div v-else-if="!mesasVisiveis.length" class="flex flex-col items-center justify-center py-28 text-center">
        <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
          <ChefHat :size="28" class="text-gray-300 dark:text-white/20" />
        </div>
        <h3 class="text-lg font-black text-gray-400 dark:text-white/40">
          {{ abaAtiva === 'preparo' ? 'Nenhum pedido em preparo' : 'Nenhum prato aguardando entrega' }}
        </h3>
        <p class="text-sm text-gray-400 dark:text-white/25 mt-1">
          {{ abaAtiva === 'preparo' ? 'Novos pedidos aparecem aqui na hora, com aviso sonoro.' : 'Tudo entregue!' }}
        </p>
      </div>

      <!-- GRID DE MESAS -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="mesa in mesasVisiveis" :key="mesa.mesa_id"
          class="bg-white dark:bg-white/5 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all shadow-lg shadow-gray-200/50 dark:shadow-black/30"
          :class="abaAtiva === 'preparo' && mesaAtrasada(mesa) ? 'border-red-500/40 shadow-red-900/20' : 'border-gray-200 dark:border-white/[0.08]'">

          <!-- Cabeçalho: de onde vem (mesa, balcão, delivery, retirada), quem é e há quanto tempo -->
          <div class="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] flex items-start justify-between gap-3">
            <div class="min-w-0">
              <span class="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md" :class="TIPO[mesa.tipo].classe">
                <component :is="TIPO[mesa.tipo].icone" :size="11" /> {{ TIPO[mesa.tipo].rotulo }}
              </span>
              <p class="mt-1 text-lg font-black leading-tight text-gray-900 dark:text-white truncate">{{ tituloFicha(mesa) }}</p>
              <p v-if="subtituloFicha(mesa)" class="text-xs text-gray-500 dark:text-white/45 truncate">{{ subtituloFicha(mesa) }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xl font-black tabular-nums leading-none" :class="classeRelogio(mesa)">{{ tempoFicha(mesa) }}</p>
              <p class="text-[10px] font-bold text-gray-400 dark:text-white/35 mt-1">{{ totalItens(mesa) }} {{ totalItens(mesa) === 1 ? 'item' : 'itens' }}</p>
            </div>
          </div>
          <!-- Observação geral do pedido (cardápio online) -->
          <p v-if="mesa.observacao" class="mx-3 mt-3 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/25 text-xs font-bold text-orange-600 dark:text-orange-300 flex gap-1.5">
            <MessageSquareText :size="14" class="shrink-0 mt-px" /> {{ mesa.observacao }}
          </p>

          <!-- Itens -->
          <div class="p-3 space-y-2">
            <div v-for="item in mesa.itens" :key="item.id"
              class="p-3 rounded-xl border transition-all"
              :class="classeCard(item)">

              <div class="flex items-start gap-3">
                <!-- Quantidade em destaque (a cor mostra a etapa) -->
                <span class="shrink-0 min-w-9 h-9 px-1.5 rounded-lg flex items-center justify-center text-base font-black tabular-nums" :class="classeQtd(item)">{{ item.quantidade }}×</span>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-black text-gray-900 dark:text-white leading-snug">{{ item.produto }}</p>
                    <span v-if="ehNovo(item)"
                      class="text-[9px] font-black uppercase bg-yellow-400 text-neutral-900 px-1.5 py-0.5 rounded-md shrink-0">
                      Novo
                    </span>
                  </div>
                  <!-- Observação inteira: é o que a cozinha não pode perder -->
                  <p v-if="item.observacao" class="text-xs font-bold text-orange-600 dark:text-orange-300 mt-0.5 break-words flex gap-1">
                    <MessageSquareText :size="13" class="shrink-0 mt-px" /> {{ item.observacao }}
                  </p>
                  <p class="text-[11px] mt-0.5 text-gray-400 dark:text-white/35">
                    <span v-if="item.status === 'pronto'" class="text-green-500 font-bold">pronto há {{ tempoDecorrido(item.updated_at) }}</span>
                    <template v-else>{{ ROTULO_STATUS[item.status] ?? item.status }}</template>
                    <template v-if="item.categoria"> · {{ item.categoria }}</template>
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
                    class="h-11 w-11 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95 text-gray-400 dark:text-white/40 flex items-center justify-center transition-all shrink-0">
                    <Undo2 :size="16" />
                  </button>
                  <button @click="atualizarStatus(item, 'pronto')"
                    class="flex-1 h-11 rounded-xl bg-green-500 hover:bg-green-400 active:scale-95 text-white text-sm font-black transition-all">
                    Pronto
                  </button>
                </template>
                <template v-else-if="item.status === 'pronto'">
                  <button @click="atualizarStatus(item, 'preparando')" title="Voltar para preparo"
                    class="h-11 w-11 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95 text-gray-400 dark:text-white/40 flex items-center justify-center transition-all shrink-0">
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
              class="w-full h-11 rounded-xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-500 dark:text-green-400 text-sm font-black transition-all">
              Marcar todos como prontos
            </button>
          </div>
          <div v-else-if="abaAtiva === 'prontos'" class="px-3 pb-3">
            <button @click="marcarTodosEntregues(mesa)"
              class="w-full h-11 rounded-xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-500 dark:text-green-400 text-sm font-black transition-all">
              Marcar todos como entregues
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { minutosDesde as minutosNoServidor, agoraServidor } from '~/lib/relogio'
import { EVENTOS, type PayloadItem } from '~/shared/eventos'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  RefreshCw, ChefHat, Maximize2, Minimize2, Volume2, VolumeX,
  Undo2, WifiOff, X, Monitor, UtensilsCrossed, Store, Bike, ShoppingBag, MessageSquareText
} from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import { useApi } from '~/services/api'
import { useSocket } from '~/services/socket'
import { fichasDaCozinha, type ItemCozinha, type FichaCozinha } from '~/lib/cozinha'
import { useToastStore } from '~/stores/toast'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: false })

const api        = useApi()
const socket     = useSocket()
const toastStore = useToastStore()
const authStore  = useAuthStore()

type Item = ItemCozinha
type Mesa = FichaCozinha

const mesas             = ref<Mesa[]>([])
const carregando        = ref(false)
// Esqueleto só até a 1ª resposta; depois as buscas trocam os dados sem esconder a tela
const iniciado          = ref(false)
const semConexao        = ref(false)
const tempoReal         = ref(false)
const ultimaAtualizacao = ref('')
const abaAtiva          = ref<'preparo' | 'prontos'>('preparo')

const agora = ref(agoraServidor())

function lsGet(chave: string): string | null {
  return process.client ? localStorage.getItem(chave) : null
}
function lsSet(chave: string, valor: string) {
  if (process.client) localStorage.setItem(chave, valor)
}

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

function minutosDesde(iso: string) {
  return minutosNoServidor(iso, agora.value)
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
  return 'text-gray-400 dark:text-white/40'
}
// ── Cartão: tipo, título e tempo da ficha ──
const TIPO = {
  mesa:     { rotulo: 'Mesa',     icone: UtensilsCrossed, classe: 'bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/60' },
  balcao:   { rotulo: 'Balcão',   icone: Store,           classe: 'bg-violet-500/15 text-violet-600 dark:text-violet-300' },
  entrega:  { rotulo: 'Delivery', icone: Bike,            classe: 'bg-orange-500/15 text-orange-600 dark:text-orange-300' },
  retirada: { rotulo: 'Retirada', icone: ShoppingBag,     classe: 'bg-sky-500/15 text-sky-600 dark:text-sky-300' },
} as const
const ROTULO_STATUS: Record<string, string> = { pendente: 'Na fila', preparando: 'Preparando' }
// Delivery e retirada: o cliente vira o título; o código do pedido fica embaixo
function tituloFicha(m: Mesa) {
  if ((m.tipo === 'entrega' || m.tipo === 'retirada') && m.cliente) return m.cliente
  return m.tipo === 'balcao' && m.pedido_numero ? `Balcão nº ${m.pedido_numero}` : m.mesa_nome
}
function subtituloFicha(m: Mesa) {
  if (m.tipo === 'entrega' || m.tipo === 'retirada') return m.mesa_nome.replace(/^(Delivery|Retirada)\s*/, 'Pedido ')
  return [m.cliente, m.lancada_por ? `por ${m.lancada_por.split(' ')[0]}` : null].filter(Boolean).join(' · ')
}
const totalItens = (m: Mesa) => m.itens.reduce((s, i) => s + i.quantidade, 0)
// Tempo desde o item mais antigo do cartão (em preparo) ou desde o pronto (prontos)
function tempoFicha(m: Mesa) {
  const campo = abaAtiva.value === 'prontos' ? 'updated_at' : 'created_at'
  return tempoDecorrido(m.itens.reduce((a, i) => (i[campo] < a ? i[campo] : a), m.itens[0][campo]))
}
function classeRelogio(m: Mesa) {
  if (abaAtiva.value === 'prontos') return 'text-green-500'
  const min = Math.max(...m.itens.map(i => minutosDesde(i.created_at)))
  return min >= 15 ? 'text-red-500' : min >= 10 ? 'text-amber-500' : 'text-gray-900 dark:text-white'
}
function classeQtd(item: Item) {
  if (item.status === 'pronto')     return 'bg-green-500 text-white'
  if (item.status === 'preparando') return 'bg-blue-500 text-white'
  return 'bg-gray-900 dark:bg-white text-white dark:text-neutral-900'
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
  return 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/[0.08]'
}
function mesaAtrasada(mesa: Mesa) {
  return mesa.itens.some(i => i.status !== 'pronto' && minutosDesde(i.created_at) >= 15)
}

const somAtivo = ref(lsGet('kds_som') !== 'off')
watch(somAtivo, v => lsSet('kds_som', v ? 'on' : 'off'))
function toggleSom() {
  somAtivo.value = !somAtivo.value
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
function destravarAudio() {
  try {
    audioCtx = audioCtx || new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  } catch {}
  document.removeEventListener('pointerdown', destravarAudio)
}

interface Cancelamento { id: number; produto: string; quantidade: number; onde: string; removido_tudo: boolean }
const cancelamentos = ref<Cancelamento[]>([])
let cancelSeq = 0

function registrarCancelamento(d: any) {
  // O evento traz o id da comanda/pedido: mostra o nome do cartão (antes saía "Mesa 3f2a…")
  const ficha = mesas.value.find(m => m.itens.some(i => i.pedido_id === d.mesa_id) || m.mesa_id.startsWith(`${d.mesa_id}:`))
  const alerta = { id: ++cancelSeq, produto: d.produto, quantidade: d.quantidade, onde: ficha ? tituloFicha(ficha) : 'pedido', removido_tudo: !!d.removido_tudo }
  cancelamentos.value.push(alerta)
  tocarSom('cancelado')
  setTimeout(() => dispensarCancelamento(alerta.id), 60000)
}
function dispensarCancelamento(id: number) {
  cancelamentos.value = cancelamentos.value.filter(c => c.id !== id)
}

let idsConhecidos = new Set<number>()
let primeiraBusca = true

async function buscar() {
  carregando.value = true
  try {
    const dados = await api.get<any[]>('/pedidos/cozinha')
    mesas.value = Array.isArray(dados) ? fichasDaCozinha(dados) : []
    semConexao.value = false
    ultimaAtualizacao.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

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
    iniciado.value = true
  }
}

let buscaAgendada: any = null
function agendarBusca() {
  if (buscaAgendada) return
  buscaAgendada = setTimeout(() => { buscaAgendada = null; buscar() }, 300)
}

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

const quiosque = ref(false)
function alternarQuiosque() {
  quiosque.value = !quiosque.value
  lsSet('kds_quiosque', quiosque.value ? 'on' : 'off')
  try {
    if (quiosque.value) document.documentElement.requestFullscreen?.()
    else if (document.fullscreenElement) document.exitFullscreen?.()
  } catch {}
}

let timerPolling: any = null
let timerRelogio: any = null
let timerToken: any = null
const desinscrever: Array<() => void> = []

onMounted(() => {
  quiosque.value = lsGet('kds_quiosque') === 'on'
  buscar()

  tempoReal.value = socket.isConnected()
  desinscrever.push(socket.on('connect', () => { tempoReal.value = true; agendarBusca() }))
  desinscrever.push(socket.on('disconnect', () => { tempoReal.value = false }))
  // Nomes de evento da fonte única (shared/eventos.ts). Antes a tela escutava
  // 'cozinha:novo_item', que o servidor não emite: só o polling de 20 s atualizava.
  desinscrever.push(socket.on(EVENTOS.item.lancado, (d: PayloadItem) => {
    if (!d.vaiCozinha) return
    tocarSom('novo')
    toastStore.success(`Novo pedido: ${d.quantidade}x ${d.produtoNome}`)
    agendarBusca()
  }))
  desinscrever.push(socket.on(EVENTOS.item.statusAlterado, (d: PayloadItem) => {
    if (d.status === 'cancelado' && d.vaiCozinha) registrarCancelamento({ produto: d.produtoNome, quantidade: d.quantidade, mesa_id: d.comandaId })
    agendarBusca()
  }))
  desinscrever.push(socket.on(EVENTOS.item.removido, (d: PayloadItem) => {
    if (d.vaiCozinha) registrarCancelamento({ produto: d.produtoNome, quantidade: d.quantidade, mesa_id: d.comandaId, removido_tudo: true })
    agendarBusca()
  }))

  timerPolling = setInterval(() => { if (!document.hidden) buscar() }, 20000)
  timerRelogio = setInterval(() => { agora.value = agoraServidor() }, 1000)

  timerToken = setInterval(async () => {
    try {
      const rt = authStore.refreshToken
      if (!rt) return
      const resp = await api.post<any>('/auth/refresh', { refreshToken: rt })
      if (resp?.access_token) authStore.setAuth(resp.access_token, authStore.usuario!, resp.refresh_token)
    } catch {}
  }, 45 * 60 * 1000)

  document.addEventListener('pointerdown', destravarAudio)
})

onBeforeUnmount(() => {
  clearInterval(timerPolling)
  clearInterval(timerRelogio)
  clearInterval(timerToken)
  desinscrever.forEach(fn => fn())
  document.removeEventListener('pointerdown', destravarAudio)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-6px); }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
