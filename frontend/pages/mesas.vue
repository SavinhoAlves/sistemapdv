<template>
  <div class="h-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950 transition-colors duration-200">

    <!-- ÁREA PRINCIPAL -->
    <div
      class="pagina-mesas h-screen flex flex-col"
      :class="{ 'sidebar-open': sidebarMesa }"
    >

      <Navbar />

      <main class="flex-1 overflow-hidden">

        <!-- LISTA DE MESAS -->
        <div v-if="!modoProdutos" class="h-full overflow-auto p-8">

          <!-- HEADER -->
          <div class="flex items-center justify-between mb-8">
            <div>
              <h1 class="text-3xl font-black text-neutral-900 dark:text-white">Mesas</h1>
              <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {{ mesas.length }} mesa{{ mesas.length !== 1 ? 's' : '' }} em atendimento
              </p>
            </div>
            <button
              @click="caixaAberto ? modalAbrirMesa = true : toastStore.warning('Abra o caixa para iniciar atendimentos')"
              class="h-11 px-6 rounded-2xl text-white font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2"
              :class="caixaAberto
                ? 'bg-orange-500 hover:bg-orange-600 active:scale-95'
                : 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed opacity-60'"
            >
              <Plus :size="16" />
              Nova Mesa
            </button>
          </div>

          <!-- SKELETON LOADING -->
          <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            <div
              v-for="n in 10"
              :key="n"
              class="h-48 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 animate-pulse"
            />
          </div>

          <!-- ESTADO VAZIO -->
          <div v-else-if="mesas.length === 0" class="flex-1 flex items-center justify-center h-[60vh]">
            <div class="text-center">
              <div class="w-24 h-24 mx-auto rounded-full bg-orange-50 flex items-center justify-center mb-5">
                <LayoutGrid :size="40" class="text-orange-300" />
              </div>
              <h3 class="text-2xl font-black text-neutral-700 dark:text-neutral-300">Nenhuma mesa aberta</h3>
              <p class="text-neutral-400 dark:text-neutral-600 mt-2 text-sm max-w-xs mx-auto">
                Clique em "Nova Mesa" para iniciar um atendimento
              </p>
              <button
                @click="caixaAberto ? modalAbrirMesa = true : toastStore.warning('Abra o caixa para iniciar atendimentos')"
                class="mt-6 h-11 px-8 rounded-2xl text-white font-black text-sm uppercase tracking-wider transition-all"
                :class="caixaAberto ? 'bg-orange-500 hover:bg-orange-600 active:scale-95' : 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed opacity-60'"
              >
                + Abrir Primeira Mesa
              </button>
            </div>
          </div>

          <!-- GRID DE MESAS -->
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            <button
              v-for="mesa in mesas"
              :key="mesa.id"
              @click="abrirMesa(mesa)"
              class="group relative rounded-3xl border transition-all hover:-translate-y-1 active:scale-95 overflow-hidden text-left"
              :class="mesaSelecionada?.id === mesa.id
                ? 'bg-orange-500 border-orange-500 shadow-xl shadow-orange-200 -translate-y-1'
                : 'bg-white dark:bg-neutral-900 border-orange-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-lg'"
            >
              <!-- indicador ativo -->
              <div
                class="absolute top-4 right-4 w-2.5 h-2.5 rounded-full transition-colors"
                :class="mesaSelecionada?.id === mesa.id ? 'bg-white' : 'bg-orange-400'"
              />

              <div class="p-5 flex flex-col items-center justify-center h-48 gap-1">

                <!-- número da mesa -->
                <span
                  class="text-[10px] font-black uppercase tracking-widest transition-colors"
                  :class="mesaSelecionada?.id === mesa.id ? 'text-white/70' : 'text-orange-400 dark:text-orange-500'"
                >
                  {{ mesa.nome_mesa || `Mesa ${mesa.id}` }}
                </span>

                <!-- ícone / inicial do cliente -->
                <div
                  class="w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl my-2 transition-colors"
                  :class="mesaSelecionada?.id === mesa.id
                    ? 'bg-white/20 text-white'
                    : 'bg-orange-50 dark:bg-orange-950/40 text-orange-500 dark:text-orange-400 group-hover:bg-orange-100 dark:group-hover:bg-orange-950/60'"
                >
                  {{ mesa.cliente ? mesa.cliente.charAt(0).toUpperCase() : '?' }}
                </div>

                <!-- nome do cliente ou garçom -->
                <p
                  class="text-sm font-black text-center truncate w-full px-2 leading-tight transition-colors"
                  :class="mesaSelecionada?.id === mesa.id ? 'text-white' : 'text-neutral-800 dark:text-neutral-200'"
                >
                  {{ mesa.cliente || '—' }}
                </p>
                <p
                  v-if="mesa.garcom"
                  class="text-[10px] text-center transition-colors"
                  :class="mesaSelecionada?.id === mesa.id ? 'text-white/60' : 'text-neutral-400 dark:text-neutral-500'"
                >
                  {{ mesa.garcom }}
                </p>
              </div>
            </button>
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
      @mesa-aberta="carregarMesas"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { Plus, LayoutGrid } from 'lucide-vue-next'

import Navbar from '~/layouts/Navbar.vue'
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
const painelRef  = ref()

const loading         = ref(true)
const mesas           = ref<Mesa[]>([])
const modalAbrirMesa  = ref(false)
const sidebarMesa     = ref(false)
const modoProdutos    = ref(false)
const mesaSelecionada = ref<Mesa>()

const abrirProdutos = () => {
  modoProdutos.value = true
}

// Sidebar já aberto → recarrega direto; fechado → abre (watch dispara o reload)
const produtoSelecionado = async () => {
  if (sidebarMesa.value) {
    sidebarRef.value?.recarregar()
  } else {
    sidebarMesa.value = true
  }
}

const carregarMesas = async () => {
  try {
    loading.value = true
    const response = await api.mesas.listar<Mesa>()
    mesas.value = response.filter(m => m.status === 'aberta')
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
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

onMounted(carregarMesas)
</script>

<style scoped>
.pagina-mesas {
  transition: padding-right 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: padding-right;
}
.pagina-mesas.sidebar-open {
  padding-right: 420px;
}
</style>
