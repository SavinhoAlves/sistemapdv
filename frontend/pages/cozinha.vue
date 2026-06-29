<template>
  <div class="min-h-screen bg-neutral-950 transition-colors duration-200">
    <Navbar />

    <main class="p-4 max-w-screen-2xl mx-auto">

      <!-- HEADER -->
      <div class="flex items-center justify-between mb-5">
        <div>
          <h1 class="text-2xl font-black text-white">Cozinha</h1>
          <p class="text-sm text-neutral-500 mt-0.5">
            <span class="text-orange-500 font-black">{{ totalItens }}</span> item(ns) pendente(s)
            <span v-if="ultimaAtualizacao" class="ml-2">· atualizado {{ ultimaAtualizacao }}</span>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-xs text-neutral-500">
            <span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
            Pendente
            <span class="w-2 h-2 rounded-full bg-blue-400 inline-block ml-2" />
            Preparando
          </div>
          <button @click="buscar"
            class="h-9 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black transition-all flex items-center gap-2">
            <RefreshCw :size="13" :class="carregando ? 'animate-spin' : ''" />
            Atualizar
          </button>
        </div>
      </div>

      <!-- SKELETON -->
      <div v-if="carregando && !mesas.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="n in 6" :key="n" class="h-48 rounded-2xl bg-neutral-900 animate-pulse" />
      </div>

      <!-- VAZIO -->
      <div v-else-if="!mesas.length" class="flex flex-col items-center justify-center py-28 text-center">
        <div class="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center mb-4">
          <ChefHat :size="28" class="text-neutral-700" />
        </div>
        <h3 class="text-lg font-black text-neutral-500">Nenhum pedido pendente</h3>
        <p class="text-sm text-neutral-700 mt-1">Todos os itens foram preparados!</p>
      </div>

      <!-- GRID DE MESAS -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="mesa in mesas" :key="mesa.mesa_id"
          class="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">

          <!-- Cabeçalho da mesa -->
          <div class="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <p class="text-sm font-black text-white">{{ mesa.mesa_nome }}</p>
              <p v-if="mesa.cliente" class="text-[11px] text-neutral-500">{{ mesa.cliente }}</p>
            </div>
            <span class="text-[10px] font-black px-2 py-1 rounded-lg bg-neutral-800 text-neutral-400">
              {{ mesa.itens.length }} item(ns)
            </span>
          </div>

          <!-- Itens -->
          <div class="p-3 space-y-2">
            <div v-for="item in mesa.itens" :key="item.id"
              class="flex items-center gap-3 p-3 rounded-xl border transition-all"
              :class="item.status === 'preparando'
                ? 'bg-blue-500/10 border-blue-500/20'
                : 'bg-neutral-800/60 border-neutral-700/50'">

              <!-- Status dot -->
              <div class="shrink-0 w-2 h-2 rounded-full"
                :class="item.status === 'preparando' ? 'bg-blue-400' : 'bg-yellow-400 animate-pulse'" />

              <div class="flex-1 min-w-0">
                <p class="text-xs font-black text-white truncate">{{ item.produto }}</p>
                <p v-if="item.observacao" class="text-[10px] text-orange-400 mt-0.5 truncate">{{ item.observacao }}</p>
                <p class="text-[10px] text-neutral-500 mt-0.5">{{ tempoDecorrido(item.created_at) }}</p>
              </div>

              <div class="shrink-0 flex items-center gap-1">
                <span class="text-sm font-black text-white">{{ item.quantidade }}x</span>
              </div>

              <!-- Ações -->
              <div class="shrink-0 flex flex-col gap-1">
                <button v-if="item.status === 'pendente'" @click="atualizarStatus(item, 'preparando')"
                  class="h-7 px-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-[10px] font-black transition-all">
                  Iniciar
                </button>
                <button v-if="item.status === 'preparando'" @click="atualizarStatus(item, 'pronto')"
                  class="h-7 px-2 rounded-lg bg-green-500 hover:bg-green-400 active:scale-95 text-white text-[10px] font-black transition-all">
                  Pronto
                </button>
              </div>
            </div>
          </div>

          <!-- Marcar todos como prontos -->
          <div v-if="mesa.itens.some(i => i.status === 'preparando')" class="px-3 pb-3">
            <button @click="marcarTodosProntos(mesa)"
              class="w-full h-9 rounded-xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 text-xs font-black transition-all">
              Marcar todos como prontos
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RefreshCw, ChefHat } from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

definePageMeta({ layout: false })

const api        = useApi()
const toastStore = useToastStore()
const config     = useRuntimeConfig()

interface Item {
  id: number; pedido_id: number; produto: string; quantidade: number
  status: string; observacao: string | null; created_at: string
}
interface Mesa {
  mesa_id: number; mesa_nome: string; cliente: string | null; itens: Item[]
}

const mesas     = ref<Mesa[]>([])
const carregando = ref(false)
const ultimaAtualizacao = ref('')
let timer: any = null

const totalItens = computed(() => mesas.value.reduce((s, m) => s + m.itens.length, 0))

async function buscar() {
  carregando.value = true
  try {
    mesas.value = await api.get<Mesa[]>('/pedidos/cozinha')
    ultimaAtualizacao.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    toastStore.error('Erro ao carregar pedidos')
  } finally {
    carregando.value = false
  }
}

async function atualizarStatus(item: Item, novoStatus: string) {
  const statusAnterior = item.status
  item.status = novoStatus
  try {
    await api.patch(`/pedidos/itens/${item.id}/status`, { status: novoStatus })
    if (novoStatus === 'pronto') {
      // Remove item da lista após marcar como pronto
      setTimeout(() => buscar(), 600)
    }
  } catch {
    item.status = statusAnterior
    toastStore.error('Erro ao atualizar status')
  }
}

async function marcarTodosProntos(mesa: Mesa) {
  const preparando = mesa.itens.filter(i => i.status === 'preparando')
  await Promise.all(preparando.map(i => atualizarStatus(i, 'pronto')))
}

function tempoDecorrido(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)  return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h`
}

onMounted(() => {
  buscar()
  timer = setInterval(buscar, 20000) // auto-refresh a cada 20s
})
onBeforeUnmount(() => clearInterval(timer))
</script>
