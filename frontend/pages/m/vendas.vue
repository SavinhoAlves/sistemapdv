<template>
  <div class="flex flex-col min-h-full">

    <!-- LOADING INICIAL -->
    <div v-if="iniciando" class="flex-1 flex items-center justify-center">
      <Loader2 :size="28" class="animate-spin text-orange-400" />
    </div>

    <!-- CAIXA FECHADO -->
    <div v-else-if="!caixaStore.aberto" class="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8">
      <div class="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
        <LockKeyhole :size="28" class="text-white/20" />
      </div>
      <div>
        <h3 class="text-lg font-black text-white/60">Caixa fechado</h3>
        <p class="text-sm text-white/30 mt-1.5 max-w-xs leading-relaxed">
          O administrador precisa abrir o caixa para iniciar as vendas.
        </p>
      </div>
    </div>

    <!-- POS MOBILE -->
    <template v-else>

      <!-- HEADER + BUSCA -->
      <div class="px-4 pt-4 pb-2 space-y-3 shrink-0">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-black text-white">Venda Direta</h1>
            <p v-if="carrinho.length" class="text-[11px] font-bold text-orange-400 mt-0.5">
              {{ totalItens }} item{{ totalItens !== 1 ? 's' : '' }} no carrinho
            </p>
            <p v-else class="text-[11px] text-white/35 mt-0.5">Selecione os produtos</p>
          </div>
        </div>

        <div class="relative">
          <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            v-model="busca"
            type="text"
            placeholder="Buscar produto..."
            class="w-full h-10 pl-9 pr-4 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/50 transition-all"
          />
        </div>

        <!-- Chips de categoria -->
        <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            v-for="cat in ['Todos', ...categorias]"
            :key="cat"
            @click="categoriaAtiva = cat"
            class="h-7 px-3 rounded-xl text-[11px] font-black whitespace-nowrap shrink-0 transition-all active:scale-95"
            :class="categoriaAtiva === cat
              ? 'bg-orange-500 text-white'
              : 'bg-white/[0.06] border border-white/[0.08] text-white/40'"
          >{{ cat }}</button>
        </div>
      </div>

      <!-- GRID PRODUTOS -->
      <div class="flex-1 overflow-y-auto px-4 pb-28">
        <div v-if="!produtosFiltrados.length" class="flex flex-col items-center justify-center h-48 gap-2 text-white/30">
          <Package :size="24" />
          <p class="text-sm">Nenhum produto</p>
        </div>
        <div v-else class="grid grid-cols-2 gap-2.5 pt-1">
          <button
            v-for="p in produtosFiltrados"
            :key="p.id"
            @click="adicionarAoCarrinho(p)"
            class="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3.5 flex flex-col items-center text-center active:scale-95 transition-all"
            :class="p.gerenciar_estoque && p.estoque_atual <= 0
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-orange-500/40 hover:bg-white/[0.07]'"
          >
            <span
              v-if="p.gerenciar_estoque && p.estoque_atual <= 0"
              class="text-[9px] font-black bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-md mb-2"
            >Esgotado</span>
            <div class="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2">
              <UtensilsCrossed :size="14" class="text-orange-400" />
            </div>
            <p class="text-xs font-black text-white leading-snug line-clamp-2">{{ p.nome }}</p>
            <p v-if="p.categoria" class="text-[10px] text-white/30 mt-0.5 truncate w-full">{{ p.categoria }}</p>
            <p class="text-sm font-black text-orange-400 mt-1.5">R$ {{ fmt(p.preco) }}</p>
          </button>
        </div>
      </div>

      <!-- BARRA DO CARRINHO (FIXA) -->
      <div
        v-if="carrinho.length"
        class="fixed bottom-16 left-0 right-0 px-4 z-20"
      >
        <button
          @click="carrinhoAberto = true"
          class="w-full h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-500/30 flex items-center justify-between px-5 active:scale-95 transition-all"
        >
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-white/20 text-white text-xs font-black flex items-center justify-center">
              {{ totalItens }}
            </span>
            <span class="text-sm font-black text-white">Ver Carrinho</span>
          </div>
          <span class="text-base font-black text-white">R$ {{ fmt(total) }}</span>
        </button>
      </div>

    </template>

    <!-- BOTTOM SHEET CARRINHO -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="carrinhoAberto" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/60" @click="carrinhoAberto = false"></div>
          <div class="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/[0.08] rounded-t-3xl max-h-[92vh] flex flex-col">

            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-1 shrink-0">
              <div class="w-10 h-1 rounded-full bg-white/20"></div>
            </div>

            <!-- Header -->
            <div class="px-5 pb-3 flex items-center justify-between shrink-0">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.12em] text-orange-400">Venda Direta</p>
                <h3 class="text-lg font-black text-white">Carrinho</h3>
              </div>
              <div class="flex items-center gap-2">
                <button v-if="carrinho.length" @click="limparCarrinho" class="text-xs font-black text-red-400 hover:text-red-300">
                  Limpar
                </button>
                <button @click="carrinhoAberto = false" class="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/40">
                  <X :size="16" />
                </button>
              </div>
            </div>

            <div class="h-px bg-white/[0.06] mx-5 shrink-0"></div>

            <!-- Itens -->
            <div class="flex-1 overflow-y-auto">
              <div v-if="!carrinho.length" class="flex flex-col items-center justify-center py-12 text-white/30 gap-2">
                <ShoppingCart :size="24" />
                <p class="text-xs">Nenhum item</p>
              </div>
              <div v-else class="divide-y divide-white/[0.05]">
                <div
                  v-for="(item, idx) in carrinho"
                  :key="item.produto_id"
                  class="flex items-center gap-3 px-5 py-3"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-black text-white truncate">{{ item.nome_produto }}</p>
                    <p class="text-[11px] text-orange-400">R$ {{ fmt(item.preco_unit) }}</p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button @click="decrementar(idx)"
                      class="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/60 active:scale-95">
                      <Minus :size="12" />
                    </button>
                    <span class="w-6 text-center text-sm font-black text-white">{{ item.quantidade }}</span>
                    <button @click="incrementar(idx)"
                      class="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/60 active:scale-95">
                      <Plus :size="12" />
                    </button>
                  </div>
                  <span class="text-xs font-black text-white/60 w-16 text-right shrink-0">
                    R$ {{ fmt(item.preco_unit * item.quantidade) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- FOOTER -->
            <div class="border-t border-white/[0.06] px-5 py-4 space-y-3 shrink-0">

              <!-- Totais -->
              <div class="bg-white/[0.04] rounded-xl p-3 space-y-1.5">
                <div class="flex justify-between text-xs text-white/40">
                  <span>Subtotal</span><span>R$ {{ fmt(subtotal) }}</span>
                </div>
                <div v-if="descontoNum > 0" class="flex justify-between text-xs text-green-400">
                  <span>Desconto</span><span>− R$ {{ fmt(descontoNum) }}</span>
                </div>
                <div class="flex justify-between text-sm font-black text-white pt-1.5 border-t border-white/[0.06]">
                  <span>Total</span><span>R$ {{ fmt(total) }}</span>
                </div>
              </div>

              <!-- Desconto -->
              <div class="flex items-center gap-2">
                <label class="text-[10px] font-black uppercase tracking-[0.12em] text-white/40 shrink-0">Desconto R$</label>
                <input
                  v-model="desconto"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  class="flex-1 h-9 px-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-xs font-bold text-white placeholder:text-white/20 outline-none focus:border-orange-500/50 text-right"
                />
              </div>

              <!-- Métodos de pagamento -->
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.12em] text-white/40 mb-2">Pagamento</p>
                <div class="grid grid-cols-2 gap-1.5">
                  <button
                    v-for="m in metodos"
                    :key="m.id"
                    @click="metodoSelecionado = m; valorRecebido = ''"
                    class="h-10 rounded-xl border text-[11px] font-black transition-all"
                    :class="metodoSelecionado?.id === m.id
                      ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                      : 'border-white/[0.08] text-white/50'"
                  >{{ m.nome }}</button>
                </div>
              </div>

              <!-- Troco (Dinheiro) -->
              <div v-if="metodoSelecionado?.nome === 'Dinheiro'" class="space-y-2">
                <input
                  v-model="valorRecebido"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Valor recebido"
                  class="w-full h-10 px-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm font-black text-white placeholder:text-white/20 outline-none focus:border-orange-500/50"
                />
                <div v-if="trocoVal > 0" class="flex justify-between items-center bg-green-500/10 rounded-xl px-3 py-2">
                  <span class="text-xs font-bold text-green-400">Troco</span>
                  <span class="text-sm font-black text-green-400">R$ {{ fmt(trocoVal) }}</span>
                </div>
                <p v-if="valorRecebidoNum > 0 && valorRecebidoNum < total" class="text-xs text-red-400 font-bold text-center">
                  Valor insuficiente — faltam R$ {{ fmt(total - valorRecebidoNum) }}
                </p>
              </div>

              <!-- Botão confirmar -->
              <button
                @click="confirmarVenda"
                :disabled="!podePagar || processando"
                class="w-full h-12 rounded-2xl text-white text-sm font-black transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
                :class="podePagar ? 'bg-green-500 hover:bg-green-400' : 'bg-white/10'"
              >
                <Loader2 v-if="processando" :size="16" class="animate-spin" />
                <CheckCircle2 v-else :size="16" />
                {{ processando ? 'Processando...' : 'Confirmar Venda' }}
              </button>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- FICHA (VENDA CONFIRMADA) -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="fichaAtual" class="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div class="bg-neutral-900 border border-white/[0.08] rounded-3xl w-full max-w-xs overflow-hidden">
            <div class="px-5 pt-6 pb-4 text-center border-b border-dashed border-white/20">
              <div class="w-11 h-11 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 :size="20" class="text-green-400" />
              </div>
              <p class="font-black text-white text-sm">Venda Confirmada!</p>
              <p class="text-[10px] text-white/40 mt-1">{{ fichaAtual.numero }}</p>
            </div>

            <div class="px-5 py-3 border-b border-dashed border-white/20 space-y-1.5">
              <div v-for="item in fichaAtual.itens" :key="item.produto_id" class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-[11px] font-black text-orange-400">{{ item.quantidade }}×</span>
                  <span class="text-xs text-white/80 truncate">{{ item.nome_produto }}</span>
                </div>
                <span class="text-xs font-black text-white shrink-0">R$ {{ fmt(item.preco_unit * item.quantidade) }}</span>
              </div>
            </div>

            <div class="px-5 py-3 space-y-1">
              <div class="flex justify-between text-xs text-white/40">
                <span>Total</span><span class="text-white font-black">R$ {{ fmt(fichaAtual.totalLiquido) }}</span>
              </div>
              <div v-if="fichaAtual.troco > 0" class="flex justify-between text-xs font-black text-green-400">
                <span>Troco</span><span>R$ {{ fmt(fichaAtual.troco) }}</span>
              </div>
            </div>

            <div class="px-4 pb-5 pt-2">
              <button @click="fichaAtual = null"
                class="w-full h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-black active:scale-95 transition-all">
                Nova Venda
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Search, Package, UtensilsCrossed, ShoppingCart, Plus, Minus, X,
  CheckCircle2, Loader2, LockKeyhole
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useCaixaStore } from '~/stores/caixa'
import { useToastStore } from '~/stores/toast'
import { useCarrinhoVendaStore } from '~/stores/carrinhoVenda'
import { useProdutosStore } from '~/stores/produtos'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'mobile' })

const api          = useApi()
const caixaStore   = useCaixaStore()
const toastStore   = useToastStore()
const authStore    = useAuthStore()
const carrinhoStore = useCarrinhoVendaStore()
const produtosStore = useProdutosStore()

const { itens: carrinho, desconto, metodoSelecionado, valorRecebido } = storeToRefs(carrinhoStore)
const { lista: todosProdutos } = storeToRefs(produtosStore)

const iniciando      = ref(true)
const busca          = ref('')
const categoriaAtiva = ref('Todos')
const carrinhoAberto = ref(false)
const metodos        = ref<any[]>([])
const processando    = ref(false)
const fichaAtual     = ref<any>(null)

function fmt(v: number) {
  return Number(v || 0).toFixed(2).replace('.', ',')
}

const categorias = computed(() => {
  const cats = [...new Set(todosProdutos.value.filter(p => p.ativo && p.categoria).map(p => p.categoria))]
  return cats as string[]
})

const produtosFiltrados = computed(() => {
  let lista = todosProdutos.value.filter(p => p.ativo)
  if (categoriaAtiva.value !== 'Todos') lista = lista.filter(p => p.categoria === categoriaAtiva.value)
  const q = busca.value.toLowerCase().trim()
  if (q) lista = lista.filter(p => p.nome.toLowerCase().includes(q))
  return lista
})

const totalItens    = computed(() => carrinho.value.reduce((s, i) => s + i.quantidade, 0))
const subtotal      = computed(() => carrinho.value.reduce((s, i) => s + i.preco_unit * i.quantidade, 0))
const descontoNum   = computed(() => Math.min(Math.max(Number(desconto.value) || 0, 0), subtotal.value))
const total         = computed(() => subtotal.value - descontoNum.value)
const valorRecebidoNum = computed(() => Number(valorRecebido.value) || 0)
const trocoVal      = computed(() => metodoSelecionado.value?.nome === 'Dinheiro' ? Math.max(0, valorRecebidoNum.value - total.value) : 0)
const podePagar     = computed(() => {
  if (!carrinho.value.length || !metodoSelecionado.value || total.value <= 0) return false
  if (metodoSelecionado.value.nome === 'Dinheiro') return valorRecebidoNum.value >= total.value
  return true
})

function adicionarAoCarrinho(p: any) {
  if (p.gerenciar_estoque && p.estoque_atual <= 0) {
    toastStore.warning(`${p.nome} está sem estoque`)
    return
  }
  const idx = carrinho.value.findIndex(i => i.produto_id === p.id)
  if (idx >= 0) {
    carrinho.value[idx].quantidade++
  } else {
    carrinho.value.push({ produto_id: p.id, nome_produto: p.nome, preco_unit: Number(p.preco), quantidade: 1 })
  }
  if (p.gerenciar_estoque) p.estoque_atual--
}

function incrementar(idx: number) {
  const item = carrinho.value[idx]
  const prod = todosProdutos.value.find(p => p.id === item.produto_id)
  if (prod?.gerenciar_estoque) {
    if (prod.estoque_atual <= 0) { toastStore.warning('Estoque insuficiente'); return }
    prod.estoque_atual--
  }
  item.quantidade++
}

function decrementar(idx: number) {
  const item = carrinho.value[idx]
  const prod = todosProdutos.value.find(p => p.id === item.produto_id)
  if (prod?.gerenciar_estoque) prod.estoque_atual++
  if (item.quantidade <= 1) carrinho.value.splice(idx, 1)
  else item.quantidade--
}

function limparCarrinho() {
  for (const item of carrinho.value) {
    const prod = todosProdutos.value.find(p => p.id === item.produto_id)
    if (prod?.gerenciar_estoque) prod.estoque_atual += item.quantidade
  }
  carrinho.value = []
}

async function confirmarVenda() {
  if (!podePagar.value || processando.value) return
  processando.value = true
  try {
    const resp = await api.post<any>('/vendas', {
      itens:      carrinho.value,
      metodo_id:  metodoSelecionado.value.id,
      desconto:   descontoNum.value,
      valor_pago: metodoSelecionado.value.nome === 'Dinheiro' ? valorRecebidoNum.value : total.value
    })
    fichaAtual.value = resp.ficha
    carrinhoStore.limpar()
    carrinhoAberto.value = false
    // Atualiza produtos e caixa em background
    carregarProdutos()
    caixaStore.carregarStatus()
  } catch (e: any) {
    toastStore.error('Erro ao registrar venda', e?.message)
  } finally {
    processando.value = false
  }
}

async function carregarProdutos() {
  try {
    const rows = await api.get<any[]>('/produtos')
    produtosStore.lista = (rows || [])
  } catch {}
}

async function carregarMetodos() {
  try {
    const rows = await api.get<any[]>('/pagamentos/metodos')
    metodos.value = (rows || []).filter((m: any) => m.ativo)
  } catch {}
}

onMounted(async () => {
  await Promise.all([
    caixaStore.carregarStatus(),
    carregarProdutos(),
    carregarMetodos()
  ])
  iniciando.value = false
})
</script>

<style scoped>
.sheet-enter-active,
.sheet-leave-active { transition: opacity 0.22s; }
.sheet-enter-active .absolute.bottom-0,
.sheet-leave-active .absolute.bottom-0 {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .absolute.bottom-0,
.sheet-leave-to .absolute.bottom-0 { transform: translateY(100%); }

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
