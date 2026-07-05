<template>
  <div class="h-screen flex flex-col bg-neutral-100 dark:bg-neutral-950 transition-colors duration-200">

    <!-- HEADER -->
    <div class="px-6 pt-6 pb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-neutral-900 dark:text-white">Produtos</h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Controle de cardápio e estoque</p>
      </div>

      <div class="flex gap-3 items-center">
        <div class="relative">
          <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <input
            id="busca-produto-pagina"
            name="busca-produto-pagina"
            v-model="busca"
            placeholder="Buscar produto..."
            aria-label="Buscar produto"
            class="h-10 w-72 pl-9 pr-4 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:border-orange-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600"
          />
        </div>
        <button
          @click="abrirModal(null)"
          class="h-10 px-5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-sm rounded-xl transition-all flex items-center gap-2"
        >
          <Plus :size="16" />
          Novo Produto
        </button>
      </div>
    </div>

    <!-- LISTA -->
    <div class="flex-1 overflow-auto p-6 pt-1">

      <!-- LOADING -->
      <div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="n in 8"
          :key="n"
          class="h-48 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 animate-pulse"
        />
      </div>

      <!-- VAZIO -->
      <div v-else-if="!produtosFiltrados.length" class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="w-20 h-20 mx-auto rounded-full bg-orange-50 flex items-center justify-center mb-4">
            <Package :size="36" class="text-orange-300" />
          </div>
          <h3 class="text-xl font-black text-neutral-700 dark:text-neutral-300">
            {{ busca ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado' }}
          </h3>
          <p class="text-neutral-400 mt-2 text-sm">
            {{ busca ? 'Tente outro termo de busca' : 'Clique em "Novo Produto" para começar' }}
          </p>
        </div>
      </div>

      <!-- GRID -->
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div
          v-for="p in produtosFiltrados"
          :key="p.id"
          class="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition-all flex flex-col"
        >
          <!-- TOPO -->
          <div class="flex justify-between items-start mb-3">
            <span
              class="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide"
              :class="p.ativo ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500'"
            >
              {{ p.ativo ? 'Ativo' : 'Inativo' }}
            </span>
            <span
              v-if="(p.gerenciar_estoque || p.estoque_atual > 0) && p.estoque_minimo > 0 && p.estoque_atual <= p.estoque_minimo"
              class="text-[10px] font-black text-orange-500 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400 px-2.5 py-1 rounded-full"
            >
              Baixo estoque
            </span>
          </div>

          <!-- NOME -->
          <h2 class="font-black text-neutral-900 dark:text-white leading-tight flex-1">{{ p.nome }}</h2>

          <!-- CATEGORIA -->
          <p class="text-xs text-neutral-400 dark:text-neutral-600 mt-1 font-medium">{{ p.categoria || '—' }}</p>

          <!-- ESTOQUE -->
          <div v-if="p.gerenciar_estoque || p.estoque_atual > 0" class="mt-3 text-xs text-neutral-500 dark:text-neutral-500">
            Estoque: <b class="text-neutral-700 dark:text-neutral-300">{{ p.estoque_atual }}</b>
            <span v-if="p.estoque_minimo > 0" class="text-neutral-300 dark:text-neutral-700"> / mín. {{ p.estoque_minimo }}</span>
          </div>

          <!-- RODAPÉ -->
          <div class="mt-4 flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <span class="text-lg font-black text-orange-500">
              R$ {{ Number(p.preco).toFixed(2) }}
            </span>
            <button
              @click="abrirModal(p)"
              class="h-8 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-600 dark:hover:text-orange-400 text-neutral-600 dark:text-neutral-400 rounded-xl text-xs font-bold transition-all"
            >
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL -->
    <ModalProduto
      v-if="showModal"
      v-model="showModal"
      :produto="produtoSelecionado"
      @salvar="salvarProduto"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search, Plus, Package } from 'lucide-vue-next'
import ModalProduto from '@/components/modals/ModalProduto.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

definePageMeta({ layout: 'default' })

const api = useApi()
const toastStore = useToastStore()

const produtos = ref<any[]>([])
const loading = ref(false)
const busca = ref('')
const showModal = ref(false)
const produtoSelecionado = ref<any>(null)

function abrirModal(produto: any) {
  produtoSelecionado.value = produto
  showModal.value = true
}

async function listarProdutos() {
  loading.value = true
  try {
    const data = await api.get<any[]>('/produtos')
    produtos.value = Array.isArray(data) ? data : []
  } catch (err) {
    toastStore.error('Erro ao carregar produtos')
  } finally {
    loading.value = false
  }
}

async function salvarProduto(produto: any) {
  try {
    if (produto.id) {
      await api.put(`/produtos/${produto.id}`, produto)
      toastStore.success('Produto atualizado')
    } else {
      await api.post('/produtos', produto)
      toastStore.success('Produto criado')
    }
    await listarProdutos()
  } catch (err) {
    toastStore.error('Erro ao salvar produto')
  }
}

const produtosFiltrados = computed(() =>
  produtos.value.filter(p =>
    p.nome.toLowerCase().includes(busca.value.toLowerCase())
  )
)

let pollingTimer: ReturnType<typeof setInterval> | null = null

function onVisibilityChange() {
  if (!document.hidden) listarProdutos()
}

onMounted(() => {
  listarProdutos()
  pollingTimer = setInterval(() => { if (!document.hidden) listarProdutos() }, 20000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>
