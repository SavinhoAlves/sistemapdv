<template>
  <div class="h-screen flex flex-col bg-neutral-100 dark:bg-neutral-950 transition-colors duration-200">

    <!-- HEADER -->
    <div class="px-6 pt-6 pb-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-black text-neutral-900 dark:text-white">Produtos</h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Controle de cardápio e estoque</p>
      </div>

      <div class="flex gap-3 items-center flex-wrap">
        <div class="relative">
          <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <input
            id="busca-produto-pagina"
            name="busca-produto-pagina"
            v-model="busca"
            placeholder="Buscar produto..."
            aria-label="Buscar produto"
            class="h-10 w-64 pl-9 pr-4 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:border-orange-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600"
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

    <!-- FILTROS + VISUALIZAÇÃO -->
    <div class="px-6 pb-3 flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-2 flex-wrap">
        <select
          id="filtro-categoria"
          name="filtro-categoria"
          v-model="filtroCategoria"
          aria-label="Filtrar por categoria"
          class="h-9 px-3 pr-8 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold focus:outline-none focus:border-orange-400"
        >
          <option value="">Todas as categorias</option>
          <option v-for="cat in categoriasDisponiveis" :key="cat" :value="cat">{{ cat }}</option>
        </select>

        <button
          @click="filtroBaixoEstoque = !filtroBaixoEstoque"
          class="h-9 px-3.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all"
          :class="filtroBaixoEstoque
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-orange-300'"
        >
          <TriangleAlert :size="13" />
          Baixo estoque
          <span v-if="baixoEstoqueCount" class="px-1.5 py-0.5 rounded-full text-[10px]"
            :class="filtroBaixoEstoque ? 'bg-orange-500 text-white' : 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400'">
            {{ baixoEstoqueCount }}
          </span>
        </button>

        <button
          @click="filtroInativos = !filtroInativos"
          class="h-9 px-3.5 rounded-xl border text-xs font-black transition-all"
          :class="filtroInativos
            ? 'border-neutral-500 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 hover:border-neutral-300'"
        >
          Mostrar inativos
        </button>
      </div>

      <!-- TOGGLE GRADE / LISTA -->
      <div class="flex rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-1">
        <button
          @click="setVisualizacao('grade')"
          class="h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs font-black transition-all"
          :class="visualizacao === 'grade' ? 'bg-orange-500 text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'"
          title="Visualização em grade"
        >
          <LayoutGrid :size="14" /> Grade
        </button>
        <button
          @click="setVisualizacao('lista')"
          class="h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs font-black transition-all"
          :class="visualizacao === 'lista' ? 'bg-orange-500 text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'"
          title="Visualização em lista"
        >
          <List :size="14" /> Lista
        </button>
      </div>
    </div>

    <!-- CONTEÚDO -->
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
          <div class="w-20 h-20 mx-auto rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-4">
            <Package :size="36" class="text-orange-300" />
          </div>
          <h3 class="text-xl font-black text-neutral-700 dark:text-neutral-300">
            {{ busca || filtroCategoria || filtroBaixoEstoque ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado' }}
          </h3>
          <p class="text-neutral-400 mt-2 text-sm">
            {{ busca || filtroCategoria || filtroBaixoEstoque ? 'Tente outros filtros de busca' : 'Clique em "Novo Produto" para começar' }}
          </p>
        </div>
      </div>

      <!-- GRADE -->
      <div v-else-if="visualizacao === 'grade'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
              v-if="baixoEstoque(p)"
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
          <button
            v-if="controlaEstoque(p)"
            @click="abrirEstoque(p)"
            class="mt-3 text-xs text-left text-neutral-500 dark:text-neutral-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
            title="Ajustar estoque"
          >
            Estoque:
            <b :class="baixoEstoque(p) ? 'text-orange-500' : 'text-neutral-700 dark:text-neutral-300'">{{ p.estoque_atual }}</b>
            <span v-if="p.estoque_minimo > 0" class="text-neutral-300 dark:text-neutral-700"> / mín. {{ p.estoque_minimo }}</span>
          </button>

          <!-- RODAPÉ -->
          <div class="mt-4 flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <span class="text-lg font-black text-orange-500">
              R$ {{ Number(p.preco).toFixed(2) }}
            </span>
            <div class="flex gap-1.5">
              <button
                @click="abrirEstoque(p)"
                class="h-8 w-8 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-600 dark:text-neutral-400 rounded-xl transition-all"
                title="Estoque"
              >
                <Boxes :size="14" />
              </button>
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

      <!-- LISTA -->
      <div v-else class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-neutral-200 dark:border-neutral-800 text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-600">
                <th class="text-left font-black px-5 py-3">Produto</th>
                <th class="text-left font-black px-4 py-3">Categoria</th>
                <th class="text-right font-black px-4 py-3">Preço</th>
                <th class="text-center font-black px-4 py-3">Estoque</th>
                <th class="text-center font-black px-4 py-3">Status</th>
                <th class="text-right font-black px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in produtosFiltrados"
                :key="p.id"
                class="border-b border-neutral-100 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
              >
                <td class="px-5 py-3">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-neutral-900 dark:text-white">{{ p.nome }}</span>
                    <span v-if="baixoEstoque(p)" class="text-[9px] font-black text-orange-500 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400 px-2 py-0.5 rounded-full uppercase">
                      Baixo
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs font-medium">{{ p.categoria || '—' }}</td>
                <td class="px-4 py-3 text-right font-black text-orange-500">R$ {{ Number(p.preco).toFixed(2) }}</td>
                <td class="px-4 py-3 text-center">
                  <button
                    v-if="controlaEstoque(p)"
                    @click="abrirEstoque(p)"
                    class="font-bold hover:text-orange-500 transition-colors"
                    :class="baixoEstoque(p) ? 'text-orange-500' : 'text-neutral-700 dark:text-neutral-300'"
                    title="Ajustar estoque"
                  >
                    {{ p.estoque_atual }}<span v-if="p.estoque_minimo > 0" class="text-neutral-300 dark:text-neutral-700 font-medium"> / {{ p.estoque_minimo }}</span>
                  </button>
                  <span v-else class="text-neutral-300 dark:text-neutral-700">—</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide"
                    :class="p.ativo ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500'"
                  >
                    {{ p.ativo ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td class="px-5 py-3">
                  <div class="flex gap-1.5 justify-end">
                    <button
                      @click="abrirEstoque(p)"
                      class="h-8 w-8 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 text-neutral-600 dark:text-neutral-400 rounded-xl transition-all"
                      title="Estoque"
                    >
                      <Boxes :size="14" />
                    </button>
                    <button
                      @click="abrirModal(p)"
                      class="h-8 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-600 dark:hover:text-orange-400 text-neutral-600 dark:text-neutral-400 rounded-xl text-xs font-bold transition-all"
                    >
                      Editar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAIS -->
    <ModalProduto
      v-if="showModal"
      v-model="showModal"
      :produto="produtoSelecionado"
      @salvar="salvarProduto"
    />

    <ModalEstoque
      v-if="showEstoque"
      v-model="showEstoque"
      :produto="produtoSelecionado"
      @atualizado="listarProdutos"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search, Plus, Package, LayoutGrid, List, Boxes, TriangleAlert } from 'lucide-vue-next'
import ModalProduto from '@/components/modals/ModalProduto.vue'
import ModalEstoque from '@/components/modals/ModalEstoque.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

definePageMeta({ layout: 'default' })

const api = useApi()
const toastStore = useToastStore()

const produtos = ref<any[]>([])
const loading = ref(false)
const busca = ref('')
const showModal = ref(false)
const showEstoque = ref(false)
const produtoSelecionado = ref<any>(null)

// ─── filtros e visualização ──────────────────────────────
const visualizacao = ref<'grade' | 'lista'>('grade')
const filtroCategoria = ref('')
const filtroBaixoEstoque = ref(false)
const filtroInativos = ref(true)

function setVisualizacao(v: 'grade' | 'lista') {
  visualizacao.value = v
  try { localStorage.setItem('produtos_visualizacao', v) } catch {}
}

function controlaEstoque(p: any) {
  return p.gerenciar_estoque || p.estoque_atual > 0
}

function baixoEstoque(p: any) {
  return controlaEstoque(p) && p.estoque_minimo > 0 && p.estoque_atual <= p.estoque_minimo
}

const categoriasDisponiveis = computed(() => {
  const nomes = new Set<string>()
  for (const p of produtos.value) if (p.categoria) nomes.add(p.categoria)
  return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

const baixoEstoqueCount = computed(() => produtos.value.filter(baixoEstoque).length)

const produtosFiltrados = computed(() =>
  produtos.value.filter(p => {
    if (!p.nome.toLowerCase().includes(busca.value.toLowerCase())) return false
    if (filtroCategoria.value && p.categoria !== filtroCategoria.value) return false
    if (filtroBaixoEstoque.value && !baixoEstoque(p)) return false
    if (!filtroInativos.value && !p.ativo) return false
    return true
  })
)

// ─── ações ───────────────────────────────────────────────
function abrirModal(produto: any) {
  produtoSelecionado.value = produto
  showModal.value = true
}

function abrirEstoque(produto: any) {
  produtoSelecionado.value = produto
  showEstoque.value = true
}

async function listarProdutos() {
  loading.value = loading.value || !produtos.value.length
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

// ─── polling ─────────────────────────────────────────────
let pollingTimer: ReturnType<typeof setInterval> | null = null

function onVisibilityChange() {
  if (!document.hidden) listarProdutos()
}

onMounted(() => {
  try {
    const salva = localStorage.getItem('produtos_visualizacao')
    if (salva === 'lista' || salva === 'grade') visualizacao.value = salva
  } catch {}

  loading.value = true
  listarProdutos()
  pollingTimer = setInterval(() => { if (!document.hidden) listarProdutos() }, 20000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>
