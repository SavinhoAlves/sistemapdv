<template>
  <div class="h-full flex flex-col bg-[#F5F5F7]">

    <!-- HEADER -->
    <div class="p-6 pb-4 border-b bg-white flex items-center justify-between">

      <div class="flex items-center gap-4">
        <button
          @click="$emit('voltar')"
          class="h-12 px-5 rounded-xl bg-neutral-100 hover:bg-neutral-200 font-black"
        >
          ← Voltar
        </button>

        <div>
          <h1 class="text-2xl font-black">Produtos</h1>
          <p class="text-sm text-neutral-500">
            Mesa #{{ mesa?.nome_mesa || mesa?.id || '-' }}
          </p>
        </div>
      </div>

      <input
        id="painel-busca-produto"
        name="painel-busca-produto"
        v-model="busca"
        type="text"
        placeholder="Buscar produto..."
        aria-label="Buscar produto"
        class="w-[320px] h-12 px-4 rounded-xl border focus:outline-none focus:border-orange-400"
      />

    </div>

    <!-- CONTENT -->
    <div
      ref="scrollRef"
      class="flex-1 overflow-x-auto overflow-y-hidden select-none"
      :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
      @pointerdown="onDragStart"
      @pointermove="onDragMove"
      @pointerup="onDragEnd"
      @pointercancel="onDragEnd"
    >

      <!-- EMPTY -->
      <div
        v-if="!secoes.length"
        class="h-full flex items-center justify-center"
      >
        <div class="text-center">
          <h2 class="text-2xl font-black">Nenhum produto encontrado</h2>
          <p class="text-neutral-500 mt-2">Cadastre produtos ou revise sua busca</p>
        </div>
      </div>

      <!-- CATEGORIAS LADO A LADO -->
      <div v-else class="flex gap-8 p-6 h-full">

      <section
        v-for="secao in secoes"
        :key="secao.categoria"
        class="shrink-0 flex flex-col"
      >

        <!-- TÍTULO DA CATEGORIA -->
        <h2 class="text-sm font-black text-neutral-500 uppercase tracking-widest mb-3">
          {{ secao.categoria }}
        </h2>

        <!-- PRODUTOS: 2 linhas, scroll horizontal dentro da seção -->
        <div
          class="grid gap-3"
          :style="{
            gridTemplateRows: 'repeat(2, auto)',
            gridAutoFlow: 'column',
            gridAutoColumns: '176px'
          }"
        >

          <button
            v-for="produto in secao.produtos"
            :key="produto.id"
            @pointerdown.stop
            @click="selecionarProduto(produto)"
            :disabled="adicionando === produto.id || semEstoque(produto) || !caixaAberto"
            class="w-full bg-white rounded-2xl p-4 border transition text-left disabled:pointer-events-none"
            :class="!caixaAberto || semEstoque(produto)
              ? 'opacity-50 border-neutral-200 cursor-not-allowed'
              : 'hover:border-orange-400 active:scale-95 cursor-pointer'"
          >

            <div class="flex justify-between items-center">
              <span
                class="text-[10px] px-2 py-1 rounded-full font-black"
                :class="produto.ativo ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'"
              >
                {{ produto.ativo ? 'ATIVO' : 'INATIVO' }}
              </span>

              <span
                v-if="produto.gerenciar_estoque && (produto.estoque_atual ?? 0) <= 0"
                class="text-[10px] text-red-500 font-black"
              >
                SEM ESTOQUE
              </span>
              <span
                v-else-if="produto.gerenciar_estoque && (produto.estoque_atual ?? 0) <= (produto.estoque_minimo ?? 0)"
                class="text-[10px] text-orange-500 font-black"
              >
                BAIXO
              </span>
            </div>

            <h3 class="mt-3 font-black text-lg leading-tight">{{ produto.nome }}</h3>

            <p class="text-xs mt-2 text-neutral-500">
              Estoque: {{ produto.estoque_atual ?? 0 }}
            </p>

            <div class="mt-4 flex justify-between items-center">
              <span class="text-lg font-black text-orange-500">
                R$ {{ Number(produto.preco || 0).toFixed(2) }}
              </span>
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white transition-colors"
                :class="adicionando === produto.id ? 'bg-orange-300' : 'bg-orange-500'"
              >
                {{ adicionando === produto.id ? '…' : '+' }}
              </div>
            </div>

          </button>

        </div>

      </section>

      </div><!-- fim flex colunas -->

    </div><!-- fim content -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { useCaixaStore } from '~/stores/caixa'

const api         = useApi()
const toastStore  = useToastStore()
const caixaStore  = useCaixaStore()
const caixaAberto = computed(() => caixaStore.aberto)

interface Produto {
  id: number
  nome: string
  preco: number
  categoria?: string
  categoria_id?: number | null
  ativo?: number
  estoque_atual?: number
  estoque_minimo?: number
  gerenciar_estoque?: number
}

const props = defineProps({ mesa: Object })
const emit  = defineEmits(['produto-adicionado', 'voltar'])

const busca     = ref('')
const loading   = ref(true)
const produtos  = ref<Produto[]>([])
const scrollRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
let dragStartX = 0
let scrollStartX = 0

function onDragStart(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  isDragging.value = true
  dragStartX   = e.clientX
  scrollStartX = scrollRef.value?.scrollLeft ?? 0
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onDragMove(e: PointerEvent) {
  if (!isDragging.value || !scrollRef.value) return
  const dx = e.clientX - dragStartX
  scrollRef.value.scrollLeft = scrollStartX - dx
}

function onDragEnd() {
  isDragging.value = false
}

const carregarProdutos = async () => {
  try {
    loading.value = true
    const response = await api.get<Produto[]>('/produtos')
    produtos.value = Array.isArray(response) ? response : []
  } catch {
    produtos.value = []
  } finally {
    loading.value = false
  }
}

let pollingTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  carregarProdutos()
  pollingTimer = setInterval(carregarProdutos, 20000)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
})

// Agrupa por categoria respeitando a busca
const secoes = computed(() => {
  const termo = busca.value.toLowerCase()
  const lista = termo
    ? produtos.value.filter(p => p.nome?.toLowerCase().includes(termo))
    : produtos.value

  // Preserva a ordem de aparição das categorias
  const mapa = new Map<string, Produto[]>()
  for (const p of lista) {
    const chave = p.categoria || 'Sem categoria'
    if (!mapa.has(chave)) mapa.set(chave, [])
    mapa.get(chave)!.push(p)
  }

  return [...mapa.entries()].map(([categoria, produtos]) => ({ categoria, produtos }))
})

defineExpose({ recarregar: carregarProdutos })

const semEstoque = (p: Produto) =>
  !!p.gerenciar_estoque && (p.estoque_atual ?? 0) <= 0

const adicionando = ref<number | null>(null)

const selecionarProduto = async (produto: Produto) => {
  if (!props.mesa?.id || adicionando.value === produto.id) return
  if (!caixaAberto.value) {
    toastStore.warning('Abra o caixa para adicionar produtos')
    return
  }
  if (semEstoque(produto)) {
    toastStore.warning(`${produto.nome} está sem estoque`)
    return
  }
  adicionando.value = produto.id
  try {
    await api.post('/pedidos/adicionar', {
      mesa_id:    props.mesa.id,
      produto_id: produto.id,
      quantidade: 1
    })
    toastStore.success(`${produto.nome} adicionado!`)
    emit('produto-adicionado', produto)
    await carregarProdutos()
  } catch (error: any) {
    toastStore.error('Erro ao adicionar produto', error?.message)
  } finally {
    adicionando.value = null
  }
}
</script>
