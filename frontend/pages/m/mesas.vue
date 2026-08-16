<template>
  <div class="flex flex-col min-h-full">

    <!-- HEADER -->
    <div class="px-4 pt-5 pb-3 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-black text-white">Mesas</h1>
        <p class="text-[11px] text-white/40 mt-0.5">{{ mesasAbertas.length }} mesa(s) abertas</p>
      </div>
      <button
        v-if="authStore.temPermissao('abrirMesa')"
        @click="modalNovaMesa = true"
        class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5"
      >
        <Plus :size="14" />
        Nova Mesa
      </button>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <Loader2 :size="28" class="animate-spin text-orange-400" />
    </div>

    <!-- EMPTY -->
    <div v-else-if="!mesasAbertas.length" class="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div class="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
        <LayoutGrid :size="24" class="text-white/20" />
      </div>
      <div>
        <p class="text-sm font-black text-white/60">Nenhuma mesa aberta</p>
        <p class="text-xs text-white/30 mt-1">Toque em "Nova Mesa" para começar</p>
      </div>
    </div>

    <!-- GRID DE MESAS -->
    <div v-else class="px-4 pb-4">
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="mesa in mesasAbertas"
          :key="mesa.id"
          @click="abrirDetalhesMesa(mesa)"
          class="bg-white/[0.04] border border-orange-500/30 rounded-2xl p-4 text-left active:scale-95 transition-all hover:border-orange-500/60 hover:bg-white/[0.07]"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
              <UtensilsCrossed :size="16" class="text-orange-400" />
            </div>
            <div class="w-2 h-2 rounded-full bg-green-400 mt-1"></div>
          </div>
          <p class="text-sm font-black text-white truncate">{{ mesa.nome_mesa }}</p>
          <p v-if="mesa.garcom_nome" class="text-[10px] text-white/40 mt-0.5 truncate">{{ mesa.garcom_nome }}</p>
          <p class="text-[10px] text-orange-400/60 mt-1.5">{{ formatarTempo(mesa.data_abertura) }}</p>
        </button>
      </div>
    </div>

    <!-- BOTTOM SHEET: DETALHES DA MESA -->
    <Teleport to="body">
      <Transition name="sheet">
        <div
          v-if="mesaSelecionada"
          class="fixed inset-0 z-50"
          @click.self="mesaSelecionada = null"
        >
          <div class="absolute inset-0 bg-black/60" @click="mesaSelecionada = null"></div>
          <div class="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/[0.08] rounded-t-3xl max-h-[85vh] flex flex-col">
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-1 shrink-0">
              <div class="w-10 h-1 rounded-full bg-white/20"></div>
            </div>

            <!-- Header -->
            <div class="px-5 pb-3 flex items-center justify-between shrink-0">
              <div>
                <h3 class="text-base font-black text-white">{{ mesaSelecionada.nome_mesa }}</h3>
                <p v-if="mesaSelecionada.garcom_nome" class="text-xs text-white/40">{{ mesaSelecionada.garcom_nome }}</p>
              </div>
              <button
                @click="mesaSelecionada = null"
                class="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <X :size="16" />
              </button>
            </div>

            <div class="h-px bg-white/[0.06] mx-5 shrink-0"></div>

            <!-- ITENS DA MESA -->
            <div class="flex-1 overflow-y-auto px-5 py-3">
              <div v-if="loadingItens" class="flex justify-center py-8">
                <Loader2 :size="22" class="animate-spin text-orange-400" />
              </div>
              <div v-else-if="!itensMesa.length" class="text-center py-8">
                <ShoppingBag :size="24" class="text-white/20 mx-auto mb-2" />
                <p class="text-xs text-white/30">Nenhum item ainda</p>
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="item in itensMesa"
                  :key="item.id"
                  class="flex items-center gap-3 bg-white/[0.04] rounded-xl px-3 py-2.5"
                >
                  <span class="text-xs font-black text-orange-400 w-6 shrink-0">{{ item.quantidade }}×</span>
                  <span class="flex-1 text-xs font-bold text-white truncate">{{ item.produto_nome || item.nome }}</span>
                  <span class="text-xs text-white/40 shrink-0">
                    R$ {{ fmt((item.preco_unit || item.preco || 0) * item.quantidade) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- BOTÃO ADICIONAR ITEM -->
            <div class="px-5 py-4 border-t border-white/[0.06] shrink-0">
              <button
                v-if="authStore.temPermissao('adicionarPedido')"
                @click="abrirProdutos"
                class="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-black text-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus :size="16" />
                Adicionar Item
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- BOTTOM SHEET: SELETOR DE PRODUTOS -->
    <Teleport to="body">
      <Transition name="sheet">
        <div
          v-if="modalProdutos"
          class="fixed inset-0 z-[60]"
        >
          <div class="absolute inset-0 bg-black/70" @click="modalProdutos = false"></div>
          <div class="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/[0.08] rounded-t-3xl max-h-[90vh] flex flex-col">
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-1 shrink-0">
              <div class="w-10 h-1 rounded-full bg-white/20"></div>
            </div>

            <!-- Header -->
            <div class="px-5 pb-3 flex items-center justify-between shrink-0">
              <h3 class="text-base font-black text-white">Adicionar Item</h3>
              <button @click="modalProdutos = false" class="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/40">
                <X :size="16" />
              </button>
            </div>

            <!-- Search -->
            <div class="px-5 pb-3 shrink-0">
              <div class="relative">
                <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  v-model="buscaProduto"
                  type="text"
                  placeholder="Buscar produto..."
                  class="w-full h-10 pl-9 pr-4 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:border-orange-400/60 transition-all"
                />
              </div>
            </div>

            <div class="h-px bg-white/[0.06] mx-5 shrink-0"></div>

            <!-- Lista de produtos -->
            <div class="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              <div v-if="!produtosFiltrados.length" class="text-center py-8">
                <p class="text-xs text-white/30">Nenhum produto encontrado</p>
              </div>
              <button
                v-for="p in produtosFiltrados"
                :key="p.id"
                @click="adicionarItemMesa(p)"
                :disabled="adicionando === p.id"
                class="w-full flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl px-4 py-3 text-left active:scale-95 transition-all disabled:opacity-50"
              >
                <div class="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Loader2 v-if="adicionando === p.id" :size="14" class="animate-spin text-orange-400" />
                  <UtensilsCrossed v-else :size="14" class="text-orange-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-black text-white truncate">{{ p.nome }}</p>
                  <p v-if="p.categoria" class="text-[10px] text-white/30">{{ p.categoria }}</p>
                </div>
                <span class="text-sm font-black text-orange-400 shrink-0">R$ {{ fmt(p.preco) }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL NOVA MESA -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalNovaMesa" class="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div class="bg-neutral-900 border border-white/[0.08] rounded-3xl w-full max-w-sm p-6">
            <h3 class="text-base font-black text-white mb-4">Nova Mesa</h3>
            <input
              v-model="novaMesaNome"
              type="text"
              placeholder="Nome da mesa (opcional)"
              class="w-full h-11 px-4 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:border-orange-400/60 transition-all mb-4"
            />
            <div class="flex gap-3">
              <button
                @click="modalNovaMesa = false; novaMesaNome = ''"
                class="flex-1 h-11 rounded-2xl border border-white/10 text-white/60 text-sm font-black"
              >
                Cancelar
              </button>
              <button
                @click="abrirMesa"
                :disabled="abrindoMesa"
                class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 active:scale-95 text-white text-sm font-black transition-all"
              >
                {{ abrindoMesa ? 'Abrindo...' : 'Abrir' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Plus, X, Loader2, LayoutGrid, UtensilsCrossed, ShoppingBag, Search } from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useToastStore } from '~/stores/toast'

definePageMeta({ layout: 'mobile' })

const api        = useApi()
const authStore  = useAuthStore()
const toastStore = useToastStore()

// Mesas
const mesasAbertas    = ref<any[]>([])
const loading         = ref(false)
const mesaSelecionada = ref<any>(null)
const itensMesa       = ref<any[]>([])
const loadingItens    = ref(false)

// Produtos
const modalProdutos  = ref(false)
const buscaProduto   = ref('')
const produtos       = ref<any[]>([])
const adicionando    = ref<number | null>(null)

// Nova mesa
const modalNovaMesa = ref(false)
const novaMesaNome  = ref('')
const abrindoMesa   = ref(false)

let intervalo: ReturnType<typeof setInterval> | null = null

function fmt(v: number) {
  return Number(v || 0).toFixed(2).replace('.', ',')
}

function formatarTempo(data: string) {
  if (!data) return ''
  const dt = new Date(data)
  const agora = new Date()
  const diff = Math.floor((agora.getTime() - dt.getTime()) / 60000)
  if (diff < 60) return `${diff}min`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

async function carregarMesas() {
  loading.value = true
  try {
    const rows = await api.get<any[]>('/mesas')
    mesasAbertas.value = (rows || []).filter((m: any) => m.status === 'aberta' || m.aberta)
  } catch (e: any) {
    console.error('Erro ao carregar mesas:', e)
  } finally {
    loading.value = false
  }
}

async function carregarProdutos() {
  try {
    const rows = await api.get<any[]>('/produtos')
    produtos.value = (rows || []).filter((p: any) => p.ativo)
  } catch {}
}

const produtosFiltrados = computed(() => {
  const q = buscaProduto.value.toLowerCase().trim()
  if (!q) return produtos.value
  return produtos.value.filter(p => p.nome.toLowerCase().includes(q))
})

async function abrirDetalhesMesa(mesa: any) {
  mesaSelecionada.value = mesa
  itensMesa.value = []
  loadingItens.value = true
  try {
    const resp = await api.get<any>(`/mesas/${mesa.id}/pedidos`)
    // pedidos é um array de pedidos; cada pedido tem itens
    const itens: any[] = []
    const data = Array.isArray(resp) ? resp : (resp?.pedidos || [])
    for (const pedido of data) {
      const pedidoItens = pedido.itens || []
      for (const item of pedidoItens) {
        itens.push(item)
      }
    }
    itensMesa.value = itens
  } catch {
    itensMesa.value = []
  } finally {
    loadingItens.value = false
  }
}

function abrirProdutos() {
  buscaProduto.value = ''
  modalProdutos.value = true
}

async function adicionarItemMesa(produto: any) {
  if (!mesaSelecionada.value) return
  adicionando.value = produto.id
  try {
    await api.post('/pedidos/adicionar', {
      mesa_id:    mesaSelecionada.value.id,
      produto_id: produto.id,
      quantidade: 1
    })
    toastStore.success(`${produto.nome} adicionado!`)
    // Recarrega itens
    await abrirDetalhesMesa(mesaSelecionada.value)
  } catch (e: any) {
    toastStore.error('Erro ao adicionar item', e?.message)
  } finally {
    adicionando.value = null
  }
}

async function abrirMesa() {
  abrindoMesa.value = true
  try {
    const nome = novaMesaNome.value.trim() || undefined
    await api.post('/mesas/abrir', { nome_mesa: nome })
    toastStore.success('Mesa aberta!')
    modalNovaMesa.value = false
    novaMesaNome.value = ''
    await carregarMesas()
  } catch (e: any) {
    toastStore.error('Erro ao abrir mesa', e?.message)
  } finally {
    abrindoMesa.value = false
  }
}

onMounted(async () => {
  await Promise.all([carregarMesas(), carregarProdutos()])
  intervalo = setInterval(carregarMesas, 30000)
})

onUnmounted(() => {
  if (intervalo) clearInterval(intervalo)
})
</script>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s;
}
.sheet-enter-active .absolute.bottom-0,
.sheet-leave-active .absolute.bottom-0 {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .absolute.bottom-0,
.sheet-leave-to .absolute.bottom-0 {
  transform: translateY(100%);
}

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
