<template>
  <div class="h-screen overflow-hidden com-sidebar">

    <Sidebar />

    <div
      class="pagina-mesas h-screen flex flex-col"
      :class="{ 'sidebar-open': sidebarMesa }"
    >
      <Navbar />

      <main class="flex-1 overflow-hidden">

        <!-- LISTA DE MESAS -->
        <div v-if="!modoProdutos" class="h-full overflow-auto p-4 sm:p-6 lg:p-8">

          <!-- HEADER -->
          <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div class="flex items-center gap-3">
              <div class="w-1 h-9 bg-orange-500 rounded-full shrink-0"></div>
              <div>
                <h1 class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Mesas</h1>
                <p class="text-sm text-gray-500 dark:text-white/40 mt-0.5">
                  {{ mesas.length }} mesa{{ mesas.length !== 1 ? 's' : '' }} em atendimento
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <!-- Toggle de visualização -->
              <div class="flex items-center bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.07] rounded-xl p-1 gap-0.5">
                <button
                  @click="viewMode = 'grade'"
                  :title="'Visualização em grade'"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  :class="viewMode === 'grade'
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                    : 'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-200 dark:hover:bg-white/[0.05]'"
                >
                  <LayoutGrid :size="15" />
                </button>
                <button
                  @click="viewMode = 'lista'"
                  :title="'Visualização em lista'"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  :class="viewMode === 'lista'
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                    : 'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-200 dark:hover:bg-white/[0.05]'"
                >
                  <List :size="15" />
                </button>
              </div>

              <button
                @click="caixaAberto ? modalAbrirMesa = true : toastStore.warning('Abra o caixa para iniciar atendimentos')"
                class="h-9 px-5 rounded-xl text-white font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 shrink-0"
                :class="caixaAberto
                  ? 'bg-orange-500 hover:bg-orange-400 active:scale-95'
                  : 'bg-gray-200 dark:bg-white/10 cursor-not-allowed opacity-60'"
              >
                <Plus :size="15" />
                Nova Mesa
              </button>
            </div>
          </div>

          <!-- SKELETON LOADING -->
          <template v-if="loading">
            <div v-if="viewMode === 'grade'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <div v-for="n in 10" :key="n" class="h-44 rounded-2xl bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] animate-pulse" />
            </div>
            <div v-else class="space-y-2">
              <div v-for="n in 6" :key="n" class="h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] animate-pulse" />
            </div>
          </template>

          <!-- ESTADO VAZIO -->
          <div v-else-if="mesas.length === 0" class="flex items-center justify-center h-[60vh]">
            <div class="text-center">
              <div class="w-20 h-20 mx-auto rounded-3xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center mb-5">
                <LayoutGrid :size="32" class="text-orange-400/50" />
              </div>
              <h3 class="text-xl font-black text-gray-500 dark:text-white/70">Nenhuma mesa aberta</h3>
              <p class="text-gray-400 dark:text-white/30 mt-2 text-sm max-w-xs mx-auto">
                Clique em "Nova Mesa" para iniciar um atendimento
              </p>
              <button
                @click="caixaAberto ? modalAbrirMesa = true : toastStore.warning('Abra o caixa para iniciar atendimentos')"
                class="mt-6 h-10 px-7 rounded-xl text-white font-black text-sm uppercase tracking-wider transition-all active:scale-95"
                :class="caixaAberto ? 'bg-orange-500 hover:bg-orange-400' : 'bg-gray-200 dark:bg-white/10 cursor-not-allowed opacity-60'"
              >
                Abrir Primeira Mesa
              </button>
            </div>
          </div>

          <!-- ── GRADE ── -->
          <div v-else-if="viewMode === 'grade'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <button
              v-for="mesa in mesas"
              :key="mesa.id"
              @click="abrirMesa(mesa)"
              class="group relative rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden text-left"
              :class="mesaSelecionada?.id === mesa.id
                ? 'bg-orange-500 border-orange-400/40 shadow-xl shadow-orange-500/30 -translate-y-0.5'
                : 'bg-white dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.07] hover:bg-gray-50 dark:hover:bg-white/[0.07] hover:border-gray-300 dark:hover:border-white/[0.12] hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/40'"
            >
              <div
                v-if="mesaSelecionada?.id !== mesa.id"
                class="absolute inset-0 bg-gradient-to-br from-orange-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
              ></div>

              <div class="absolute top-0 inset-x-0 h-px"
                :class="mesaSelecionada?.id === mesa.id
                  ? 'bg-gradient-to-r from-transparent via-white/40 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-gray-200 dark:via-white/[0.08] to-transparent'"
              ></div>

              <div class="absolute top-3.5 right-3.5 w-1.5 h-1.5 rounded-full"
                :class="mesaSelecionada?.id === mesa.id ? 'bg-white/70' : 'bg-orange-500/60'">
              </div>

              <div class="relative p-4 pt-5 flex flex-col items-center min-h-[11rem] justify-center gap-1.5">
                <span class="text-[9px] font-black uppercase tracking-[0.14em] transition-colors"
                  :class="mesaSelecionada?.id === mesa.id ? 'text-white/60' : 'text-orange-400/70'">
                  {{ mesa.nome_mesa || `Mesa ${mesa.id}` }}
                </span>

                <div class="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl my-1 transition-all duration-200"
                  :class="mesaSelecionada?.id === mesa.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/50 border border-gray-200 dark:border-white/[0.08] group-hover:bg-orange-500/10 group-hover:text-orange-400 group-hover:border-orange-500/20'">
                  {{ mesa.cliente ? mesa.cliente.charAt(0).toUpperCase() : '?' }}
                </div>

                <p class="text-sm font-bold text-center truncate w-full px-2 leading-tight"
                  :class="mesaSelecionada?.id === mesa.id ? 'text-white' : 'text-gray-700 dark:text-white/80'">
                  {{ mesa.cliente || '—' }}
                </p>

                <p v-if="mesa.garcom" class="text-[10px] text-center"
                  :class="mesaSelecionada?.id === mesa.id ? 'text-white/50' : 'text-gray-400 dark:text-white/30'">
                  {{ mesa.garcom }}
                </p>
              </div>
            </button>
          </div>

          <!-- ── LISTA ── -->
          <div v-else class="bg-white dark:bg-white/[0.04] backdrop-blur-xl border border-gray-200 dark:border-white/[0.07] rounded-2xl overflow-hidden">
            <!-- Cabeçalho da tabela -->
            <div class="grid grid-cols-[2fr_2fr_2fr_auto] gap-4 px-5 py-3 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/30">Mesa</span>
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/30">Cliente</span>
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/30">Garçom</span>
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/30">Ação</span>
            </div>

            <!-- Linhas -->
            <div class="divide-y divide-gray-100 dark:divide-white/[0.04]">
              <button
                v-for="mesa in mesas"
                :key="mesa.id"
                @click="abrirMesa(mesa)"
                class="w-full grid grid-cols-[2fr_2fr_2fr_auto] gap-4 items-center px-5 py-4 text-left transition-all"
                :class="mesaSelecionada?.id === mesa.id
                  ? 'bg-orange-500/10 border-l-2 border-l-orange-500'
                  : 'hover:bg-gray-50 dark:hover:bg-white/[0.04] border-l-2 border-l-transparent'"
              >
                <!-- Mesa -->
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all"
                    :class="mesaSelecionada?.id === mesa.id
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/50 border border-gray-200 dark:border-white/[0.08]'"
                  >
                    {{ mesa.cliente ? mesa.cliente.charAt(0).toUpperCase() : '?' }}
                  </div>
                  <span class="font-black text-sm truncate"
                    :class="mesaSelecionada?.id === mesa.id ? 'text-orange-300' : 'text-gray-900 dark:text-white/90'">
                    {{ mesa.nome_mesa || `Mesa ${mesa.id}` }}
                  </span>
                </div>

                <!-- Cliente -->
                <span class="text-sm truncate"
                  :class="mesa.cliente
                    ? (mesaSelecionada?.id === mesa.id ? 'text-white/80 font-bold' : 'text-gray-500 dark:text-white/60')
                    : 'text-gray-300 dark:text-white/20 italic'">
                  {{ mesa.cliente || 'Sem cliente' }}
                </span>

                <!-- Garçom -->
                <span class="text-sm truncate text-gray-400 dark:text-white/40">
                  {{ mesa.garcom || '—' }}
                </span>

                <!-- Ação -->
                <div class="flex items-center justify-end">
                  <span class="text-[11px] font-black px-3 py-1.5 rounded-xl transition-all"
                    :class="mesaSelecionada?.id === mesa.id
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/40'">
                    Abrir
                  </span>
                </div>
              </button>
            </div>
          </div>

        </div>

        <!-- PAINEL DE PRODUTOS -->
        <PainelProdutos
          v-else
          ref="painelRef"
          :mesa="mesaSelecionada"
          @voltar="modoProdutos = false"
          @produto-adicionado="produtoSelecionado"
        />

      </main>
    </div>

    <!-- SIDEBAR -->
    <SidebarMesa
      ref="sidebarRef"
      v-model="sidebarMesa"
      :mesa="mesaSelecionada"
      @abrir-produtos="abrirProdutos"
      @estoque-atualizado="painelRef?.recarregar()"
      @mesa-fechada="onMesaFechada"
    />

    <!-- MODAL ABRIR MESA -->
    <ModalAbrirMesa
      v-model="modalAbrirMesa"
      @mesa-aberta="() => carregarMesas()"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Plus, LayoutGrid, List } from 'lucide-vue-next'

import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import SidebarMesa from '~/components/sidebar/SidebarMesa.vue'
import ModalAbrirMesa from '~/components/modals/ModalAbrirMesa.vue'
import PainelProdutos from '~/components/produtos/PainelProdutos.vue'

import { useApi } from '~/services/api'
import { useCaixaStore } from '~/stores/caixa'
import { useToastStore } from '~/stores/toast'

definePageMeta({ layout: false })

interface Mesa {
  id: number
  numero?: number
  nome_mesa?: string
  cliente?: string
  garcom?: string
  status: string
}

const api         = useApi()
const caixaStore  = useCaixaStore()
const toastStore  = useToastStore()
const caixaAberto = computed(() => caixaStore.aberto)
const sidebarRef  = ref()
const painelRef   = ref()

const loading         = ref(true)
const mesas           = ref<Mesa[]>([])
const modalAbrirMesa  = ref(false)
const sidebarMesa     = ref(false)
const modoProdutos    = ref(false)
const mesaSelecionada = ref<Mesa>()

const savedView = typeof localStorage !== 'undefined' ? localStorage.getItem('mesas-view') : null
const viewMode  = ref<'grade' | 'lista'>((savedView === 'lista' ? 'lista' : 'grade'))

watch(viewMode, v => { if (typeof localStorage !== 'undefined') localStorage.setItem('mesas-view', v) })

const abrirProdutos = () => { modoProdutos.value = true }

const produtoSelecionado = async () => {
  if (sidebarMesa.value) sidebarRef.value?.recarregar()
  else sidebarMesa.value = true
}

const carregarMesas = async (mostrarLoading = false) => {
  try {
    if (mostrarLoading) loading.value = true
    const response = await api.mesas.listar<Mesa>()
    mesas.value = response.filter(m => m.status === 'aberta')
  } catch (error) {
    console.error(error)
  } finally {
    if (mostrarLoading) loading.value = false
  }
}

const abrirMesa = (mesa: Mesa) => {
  mesaSelecionada.value = mesa
  sidebarMesa.value     = true
}

const onMesaFechada = () => {
  sidebarMesa.value     = false
  mesaSelecionada.value = undefined
  modoProdutos.value    = false
  carregarMesas()
}

let pollingTimer: ReturnType<typeof setInterval> | null = null

function onVisibilityChange() {
  if (!document.hidden) carregarMesas()
}

onMounted(() => {
  carregarMesas(true)
  pollingTimer = setInterval(() => { if (!document.hidden) carregarMesas() }, 20000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.pagina-mesas {
  transition: padding-right 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: padding-right;
}
@media (min-width: 1024px) {
  .pagina-mesas.sidebar-open {
    padding-right: 420px;
  }
}
</style>
