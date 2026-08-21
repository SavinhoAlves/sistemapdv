<template>
  <!-- POS DE VENDA DIRETA (balcão, sem mesa) -->
  <div class="flex-1 flex overflow-hidden">

    <!-- PRODUTOS -->
    <div class="flex-1 flex flex-col overflow-hidden">

      <!-- BUSCA + CATEGORIAS -->
      <div class="px-4 pt-3 pb-2 space-y-2 shrink-0">
        <div class="relative">
          <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
          <input
            id="busca-produto" name="busca-produto"
            v-model="busca" type="text" placeholder="Buscar produto…"
            class="w-full h-9 pl-9 pr-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 outline-none focus:border-orange-400/70 transition-all"
          />
        </div>
        <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            v-for="cat in ['Todos', ...categorias]" :key="cat"
            @click="categoriaAtiva = cat"
            class="h-7 px-3 rounded-lg text-[11px] font-black whitespace-nowrap shrink-0 transition-all"
            :class="categoriaAtiva === cat
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:border-orange-400/40'"
          >{{ cat }}</button>
        </div>
      </div>

      <!-- GRID DE PRODUTOS -->
      <div class="flex-1 overflow-y-auto px-4 pb-4">
        <div v-if="!produtosFiltrados.length" class="flex flex-col items-center justify-center h-48 gap-2 text-gray-400 dark:text-white/40">
          <Package :size="28" class="text-gray-300 dark:text-white/20" />
          <p class="text-sm">Nenhum produto encontrado</p>
        </div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          <button
            v-for="p in produtosFiltrados" :key="p.id"
            @click="adicionarAoCarrinho(p)"
            class="group relative bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/[0.08] rounded-2xl p-3.5 flex flex-col items-center text-center hover:border-orange-400/60 hover:bg-orange-50 dark:hover:bg-white/[0.08] active:scale-95 transition-all"
            :class="p.gerenciar_estoque && p.estoque_atual <= 0 ? 'opacity-50 cursor-not-allowed hover:border-gray-200 dark:hover:border-white/[0.08] hover:bg-white dark:hover:bg-white/5' : ''"
          >
            <!-- BADGE ESTOQUE -->
            <span
              v-if="p.gerenciar_estoque && p.estoque_atual <= 0"
              class="absolute top-1.5 right-1.5 text-[9px] font-black bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-md leading-none"
            >Esgotado</span>
            <span
              v-else-if="p.gerenciar_estoque && p.estoque_atual <= p.estoque_minimo"
              class="absolute top-1.5 right-1.5 text-[9px] font-black bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-md leading-none"
            >{{ p.estoque_atual }} un.</span>
            <span
              v-else-if="p.gerenciar_estoque"
              class="absolute top-1.5 right-1.5 text-[9px] font-black bg-white/10 text-gray-400 dark:text-white/30 px-1.5 py-0.5 rounded-md leading-none"
            >{{ p.estoque_atual }} un.</span>

            <div class="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2.5">
              <UtensilsCrossed :size="14" class="text-orange-500" />
            </div>
            <p class="text-xs font-black text-gray-900 dark:text-white leading-snug line-clamp-2">{{ p.nome }}</p>
            <p v-if="p.categoria" class="text-[10px] text-gray-500 dark:text-white/40 mt-0.5 truncate w-full">{{ p.categoria }}</p>
            <p class="text-sm font-black text-orange-400 mt-1.5">R$ {{ fmt(p.preco) }}</p>
          </button>
        </div>
      </div>
    </div>

    <!-- BACKDROP CARRINHO (mobile) -->
    <div
      v-if="carrinhoAberto"
      @click="carrinhoAberto = false"
      class="fixed inset-0 bg-black/40 z-10 lg:hidden"
    />

    <!-- CARRINHO -->
    <div
      class="fixed right-0 top-0 w-full sm:w-96 lg:w-72 xl:w-80 h-screen bg-white dark:bg-neutral-900/95 backdrop-blur-2xl border-l border-gray-200 dark:border-white/[0.08] shadow-2xl shadow-black/60 flex flex-col z-20 transition-transform duration-300 lg:translate-x-0"
      :class="carrinhoAberto ? 'translate-x-0' : 'translate-x-full'"
    >
      <!-- accent top -->
      <div class="h-0.5 bg-gradient-to-r from-orange-400 to-amber-500 shrink-0"></div>

      <!-- HEADER CARRINHO -->
      <div class="p-5 border-b border-gray-100 dark:border-white/[0.06] shrink-0">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-0.5">
              Venda Direta
            </p>
            <h2 class="text-2xl font-black text-gray-900 dark:text-white">
              Carrinho
            </h2>
            <p class="text-xs text-gray-500 dark:text-white/40 mt-1 leading-relaxed">
              {{ carrinho.length ? `${carrinho.length} ${carrinho.length === 1 ? 'item' : 'itens'} selecionado${carrinho.length === 1 ? '' : 's'}` : 'Nenhum item adicionado' }}
            </p>
          </div>

          <div class="flex items-center gap-1.5 shrink-0 mt-0.5">
            <button v-if="carrinho.length" @click="limparCarrinho"
              class="h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-wide text-red-400 hover:bg-red-500/10 transition-all">
              Limpar
            </button>
            <button @click="carrinhoAberto = false"
              class="lg:hidden w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-red-500/10 hover:text-red-400 text-gray-500 dark:text-white/50 transition-all flex items-center justify-center">
              <X :size="18" />
            </button>
          </div>
        </div>
      </div>

      <!-- ITENS -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="!carrinho.length" class="flex flex-col items-center justify-center h-full gap-2 text-gray-400 dark:text-white/40 p-6 text-center">
          <ShoppingCart :size="24" class="text-gray-300 dark:text-white/20" />
          <p class="text-xs">Toque em um produto para adicionar</p>
        </div>

        <div v-else class="divide-y divide-gray-100 dark:divide-white/[0.05]">
          <div v-for="(item, idx) in carrinho" :key="item.produto_id" class="flex items-center gap-2 px-3 py-2.5">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-black text-gray-900 dark:text-white truncate">{{ item.nome_produto }}</p>
              <p class="text-[11px] text-orange-400 font-bold">R$ {{ fmt(item.preco_unit) }}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button @click="decrementar(idx)"
                class="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-gray-500 dark:text-white/60">
                <Minus :size="10" />
              </button>
              <span class="w-6 text-center text-xs font-black text-gray-900 dark:text-white">{{ item.quantidade }}</span>
              <button @click="incrementar(idx)"
                class="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-gray-500 dark:text-white/60">
                <Plus :size="10" />
              </button>
            </div>
            <span class="text-xs font-black text-gray-500 dark:text-white/60 w-14 text-right shrink-0">
              R$ {{ fmt(item.preco_unit * item.quantidade) }}
            </span>
          </div>
        </div>
      </div>

      <!-- FOOTER: TOTAIS + PAGAMENTO -->
      <div class="border-t border-gray-100 dark:border-white/[0.06] p-3 space-y-3 shrink-0">

        <!-- TOTAIS -->
        <div class="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5 space-y-1">
          <div class="flex justify-between text-[11px] text-gray-500 dark:text-white/40">
            <span>Subtotal</span><span>R$ {{ fmt(subtotal) }}</span>
          </div>
          <div v-if="descontoNum > 0" class="flex justify-between text-[11px] text-green-400">
            <span>Desconto</span><span>− R$ {{ fmt(descontoNum) }}</span>
          </div>
          <div class="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-white/[0.06]">
            <span>Total</span><span>R$ {{ fmt(total) }}</span>
          </div>
        </div>

        <!-- DESCONTO -->
        <div class="flex items-center gap-2">
          <label for="desconto-venda" class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 shrink-0">Desconto R$</label>
          <input
            id="desconto-venda" name="desconto-venda"
            v-model="desconto" type="number" min="0" step="0.01" placeholder="0,00"
            class="flex-1 h-8 px-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 outline-none focus:border-orange-400/70 transition-all text-right"
          />
        </div>

        <!-- MÉTODO DE PAGAMENTO -->
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-1.5">Pagamento</p>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="m in metodos" :key="m.id"
              @click="metodoSelecionado = m; valorRecebido = ''"
              class="h-9 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center gap-1.5"
              :class="metodoSelecionado?.id === m.id
                ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50 hover:border-orange-400/40'"
            >
              <component :is="iconeMetodo(m.nome)" :size="12" />
              {{ m.nome }}
            </button>
          </div>
        </div>

        <!-- TROCO (só dinheiro) -->
        <Transition name="slide-down">
          <div v-if="metodoSelecionado?.nome === 'Dinheiro'" class="space-y-1.5">
            <label for="valor-recebido" class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Valor recebido</label>
            <input
              id="valor-recebido" name="valor-recebido"
              v-model="valorRecebido" type="number" min="0" step="0.01" placeholder="0,00"
              class="w-full h-9 px-3 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-black text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 outline-none focus:border-orange-400/70 transition-all"
            />
            <div v-if="trocoVal > 0" class="flex justify-between items-center bg-green-500/10 rounded-xl px-3 py-2">
              <span class="text-xs font-bold text-green-400">Troco</span>
              <span class="text-sm font-black text-green-400">R$ {{ fmt(trocoVal) }}</span>
            </div>
            <p v-if="valorRecebidoNum > 0 && valorRecebidoNum < total" class="text-[11px] text-red-500 font-bold text-center">
              Valor insuficiente — faltam R$ {{ fmt(total - valorRecebidoNum) }}
            </p>
          </div>
        </Transition>

        <!-- CONFIRMAR -->
        <button
          @click="confirmarVenda"
          :disabled="!podePagar || processando"
          class="w-full h-11 rounded-2xl text-white text-sm font-black transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
          :class="podePagar ? 'bg-green-500 hover:bg-green-400' : 'bg-gray-200 dark:bg-white/10'"
        >
          <Loader2 v-if="processando" :size="16" class="animate-spin" />
          <CheckCircle2 v-else :size="16" />
          {{ processando ? 'Processando…' : 'Confirmar Venda' }}
        </button>
      </div>
    </div>
  </div>

  <!-- FAB CARRINHO (mobile) -->
  <button
    v-if="!carrinhoAberto"
    @click="carrinhoAberto = true"
    class="fixed bottom-6 right-6 z-30 lg:hidden w-14 h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-500/40 flex items-center justify-center transition-all active:scale-95"
  >
    <ShoppingCart :size="22" class="text-white" />
    <span v-if="carrinho.length" class="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-black flex items-center justify-center">
      {{ carrinho.length }}
    </span>
  </button>

  <ModalRfidAuth
    v-model="rfidModal"
    :mensagem="rfidMensagem"
    :erro="erroModal"
    @auth-success="onRfidSuccess"
    @cancelar="onRfidCancelar"
  />

  <!-- ══ MODAL FICHA ══ -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="fichaAtual" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-neutral-900/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden">

          <!-- CABEÇALHO CUPOM -->
          <div class="px-6 pt-6 pb-4 text-center border-b border-dashed border-gray-200 dark:border-white/20">
            <img
              v-if="configStore.logo_base64"
              :src="configStore.logo_base64"
              class="h-12 mx-auto mb-3 object-contain"
              alt="Logo"
            />
            <div v-else class="w-11 h-11 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-3">
              <UtensilsCrossed :size="18" class="text-white" />
            </div>
            <p class="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest leading-tight">
              {{ configStore.nome_restaurante }}
            </p>
            <p class="text-[10px] text-gray-400 dark:text-white/40 mt-1">
              {{ fichaAtual.numero }} · {{ fmtFichaDateTime(fichaAtual.created_at) }}
            </p>
            <p class="text-[10px] text-gray-400 dark:text-neutral-400">Operador: {{ fichaAtual.operador }}</p>
          </div>

          <!-- ITENS -->
          <div class="px-5 py-3 border-b border-dashed border-gray-200 dark:border-white/20 max-h-48 overflow-y-auto space-y-1.5">
            <div v-for="item in fichaAtual.itens" :key="item.produto_id"
              class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-[11px] font-black text-orange-400 shrink-0">{{ item.quantidade }}×</span>
                <span class="text-xs font-bold text-gray-700 dark:text-white/80 truncate">{{ item.nome_produto }}</span>
              </div>
              <span class="text-xs font-black text-gray-900 dark:text-white shrink-0">
                R$ {{ fmt(item.preco_unit * item.quantidade) }}
              </span>
            </div>
          </div>

          <!-- TOTAIS -->
          <div class="px-5 py-3 border-b border-dashed border-gray-200 dark:border-white/20 space-y-1.5">
            <div class="flex justify-between text-[11px] text-gray-500 dark:text-white/40">
              <span>Subtotal</span><span>R$ {{ fmt(fichaAtual.total) }}</span>
            </div>
            <div v-if="fichaAtual.desconto > 0" class="flex justify-between text-[11px] text-green-400 font-bold">
              <span>Desconto</span><span>− R$ {{ fmt(fichaAtual.desconto) }}</span>
            </div>
            <div class="flex justify-between text-sm font-black text-gray-900 dark:text-white">
              <span>TOTAL</span><span>R$ {{ fmt(fichaAtual.total_liquido) }}</span>
            </div>
            <div class="flex justify-between text-[11px] text-gray-500 dark:text-white/40 pt-0.5">
              <span>{{ fichaAtual.metodo }}</span>
              <span>Pago R$ {{ fmt(fichaAtual.valor_pago) }}</span>
            </div>
            <div v-if="fichaAtual.troco > 0" class="flex justify-between text-[11px] font-black text-green-400">
              <span>Troco</span><span>R$ {{ fmt(fichaAtual.troco) }}</span>
            </div>
          </div>

          <!-- MENSAGEM -->
          <p class="text-center text-[10px] text-gray-400 dark:text-white/40 py-3 px-5 italic">
            {{ configStore.mensagem_ficha }}
          </p>

          <!-- AÇÕES -->
          <div class="flex gap-2 px-4 pb-4">
            <button @click="imprimirFicha"
              class="flex-1 h-11 rounded-2xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5">
              <Printer :size="13" /> Imprimir
            </button>
            <button @click="fecharFicha"
              class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5">
              <Plus :size="13" /> Nova Venda
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Package, ShoppingCart, Plus, Minus, CheckCircle2, Loader2,
  Printer, Search, X, UtensilsCrossed
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useCaixaStore }        from '~/stores/caixa'
import { useToastStore }        from '~/stores/toast'
import { useConfigStore }       from '~/stores/configuracoes'
import { useImpressorasStore }  from '~/stores/impressoras'
import { useCarrinhoVendaStore } from '~/stores/carrinhoVenda'
import { useProdutosStore, type Produto } from '~/stores/produtos'
import { iconeMetodo } from '~/composables/useIconeMetodo'
import { useRfidIdentify } from '~/composables/useRfidIdentify'
import ModalRfidAuth from '~/components/modals/ModalRfidAuth.vue'

const emit = defineEmits(['venda-registrada'])

const api              = useApi()
const caixaStore       = useCaixaStore()
const toastStore       = useToastStore()
const configStore       = useConfigStore()
const impressorasStore  = useImpressorasStore()
const carrinhoStore     = useCarrinhoVendaStore()
const produtosStore = useProdutosStore()

const { itens: carrinho, desconto, metodoSelecionado, valorRecebido } = storeToRefs(carrinhoStore)
const { lista: todosProdutos } = storeToRefs(produtosStore)

const carrinhoAberto = ref(false)
const { modalAberto: rfidModal, mensagemModal: rfidMensagem, erroModal, identificarViaRfid, onRfidSuccess, onRfidCancelar } = useRfidIdentify()

// ══ PRODUTOS ══
const categorias      = ref<string[]>([])
const categoriaAtiva  = ref('Todos')
const busca           = ref('')

const produtosFiltrados = computed(() => {
  let lista = todosProdutos.value.filter(p => p.ativo)
  if (categoriaAtiva.value !== 'Todos') lista = lista.filter(p => p.categoria === categoriaAtiva.value)
  if (busca.value.trim()) {
    const q = busca.value.toLowerCase()
    lista = lista.filter(p => p.nome.toLowerCase().includes(q))
  }
  return lista
})

// ══ CARRINHO ══
interface CartItem { produto_id: number; nome_produto: string; preco_unit: number; quantidade: number }

function adicionarAoCarrinho(p: Produto) {
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
    if (prod.estoque_atual <= 0) {
      toastStore.warning(`Estoque insuficiente`)
      return
    }
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

// ══ PAGAMENTO ══
const metodos     = ref<any[]>([])
const processando = ref(false)

const subtotal       = computed(() => carrinho.value.reduce((s, i) => s + i.preco_unit * i.quantidade, 0))
const descontoNum    = computed(() => Math.min(Math.max(Number(desconto.value) || 0, 0), subtotal.value))
const total          = computed(() => subtotal.value - descontoNum.value)
const valorRecebidoNum = computed(() => Number(valorRecebido.value) || 0)
const trocoVal       = computed(() => metodoSelecionado.value?.nome === 'Dinheiro' ? Math.max(0, valorRecebidoNum.value - total.value) : 0)
const podePagar      = computed(() => {
  if (!carrinho.value.length || !metodoSelecionado.value || total.value <= 0) return false
  if (metodoSelecionado.value.nome === 'Dinheiro') return valorRecebidoNum.value >= total.value
  return true
})

// ══ FICHA ══
const fichaAtual = ref<any>(null)

async function confirmarVenda() {
  if (!podePagar.value || processando.value) return
  try {
    await identificarViaRfid('Passe o cartão para confirmar a venda')
  } catch {
    return // cancelado
  }
  processando.value = true
  try {
    const resp = await api.post<any>('/vendas', {
      itens: carrinho.value,
      metodo_id: metodoSelecionado.value.id,
      desconto:  descontoNum.value,
      valor_pago: metodoSelecionado.value.nome === 'Dinheiro' ? valorRecebidoNum.value : total.value
    })
    fichaAtual.value = resp.ficha
    carrinhoStore.limpar()
    carrinhoAberto.value = false
    await Promise.all([sincronizarCaixa(), carregarProdutos()])
    emit('venda-registrada')
    if (configStore.impressora_auto_imprimir) imprimirFicha()
  } catch (e: any) {
    toastStore.error('Erro ao registrar venda', e?.message)
  } finally {
    processando.value = false
  }
}

function fecharFicha() { fichaAtual.value = null }

async function imprimirFicha() {
  if (!fichaAtual.value) return
  const ficha    = fichaAtual.value

  if (impressorasStore.impressaoDiretaPara('caixa')) {
    try {
      await api.post('/impressao/ficha', {
        itens:   ficha.itens.map((i: any) => ({ nome: i.nome_produto, quantidade: i.quantidade })),
        info:    `${fmtFichaDateTime(ficha.created_at)} · ${ficha.operador || '—'}`,
        codigo:  ficha.numero,
        destino: 'caixa'
      })
    } catch (e: any) {
      toastStore.error('Falha na impressão', e?.message)
    }
    return
  }

  const nomeRest   = configStore.nome_restaurante || 'Restaurante PDV'
  const logo       = configStore.logo_base64
  const mensagem   = configStore.mensagem_ficha || 'Obrigado pela preferência!'
  const dataStr    = fmtFichaDateTime(ficha.created_at)
  const logoAltura = ({ pequena: '24px', media: '40px', grande: '96px' } as Record<string, string>)[configStore.logo_tamanho] ?? '40px'
  const logoHtml   = logo
    ? `<img src="${logo}" style="height:${logoAltura};object-fit:contain;margin-bottom:6px;" />`
    : ''

  const mm     = configStore.impressora_largura === 58 ? 58 : 80
  const copias = Math.max(1, configStore.impressora_copias || 1)

  const fichas: string[] = []
  for (const item of ficha.itens) {
    for (let u = 0; u < item.quantidade; u++) {
      for (let c = 0; c < copias; c++) {
        fichas.push(`
          <div class="ticket">
            ${logoHtml}
            <div class="restaurante">${nomeRest}</div>
            <div class="info">${dataStr} · ${ficha.operador || '—'}</div>
            <div class="sep"></div>
            <div class="produto">${item.nome_produto}</div>
            <div class="sep"></div>
            <div class="codigo">${ficha.numero}</div>
            <div class="mensagem">${mensagem}</div>
          </div>
        `)
      }
    }
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fichas</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: monospace; background: #fff; }
    @page { size: ${mm}mm auto; margin: 0; }
    .ticket {
      width: ${mm}mm;
      margin: 0 auto;
      padding: 4mm 3mm 5mm;
      text-align: center;
      page-break-after: always;
    }
    .ticket:last-child { page-break-after: avoid; }
    .restaurante { font-size: ${mm < 70 ? 7 : 8}pt; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
    .info { font-size: 6pt; color: #666; margin-top: 1mm; }
    .sep { border-top: 1px dashed #000; margin: 3mm 0; }
    .produto {
      font-size: ${mm < 70 ? 16 : 20}pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      padding: 3mm 1mm;
      word-break: break-word;
      line-height: 1.15;
    }
    .codigo { font-size: 6pt; color: #aaa; margin-top: 1mm; }
    .mensagem { font-size: 6pt; color: #888; font-style: italic; margin-top: 2mm; }
  </style></head><body>
  ${fichas.join('')}
  </body></html>`

  imprimirHtml(html)
}

function imprimirHtml(html: string) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;'
  document.body.appendChild(iframe)

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow!.focus()
      iframe.contentWindow!.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 250)
  }

  const doc = iframe.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()
}

const fmt = (v: any) => Number(v || 0).toFixed(2)
function fmtFichaDateTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function sincronizarCaixa() {
  try {
    const statusCaixa = await api.get<any>('/caixa/atual')
    caixaStore.aberto     = statusCaixa?.aberto || false
    caixaStore.caixaAtual = statusCaixa?.caixa  || null
  } catch {}
}

async function carregarProdutos() {
  try {
    const rows = await api.get<Produto[]>('/produtos')
    todosProdutos.value = Array.isArray(rows) ? rows : []
    const cats = [...new Set(todosProdutos.value.filter(p => p.ativo).map(p => p.categoria).filter(Boolean))] as string[]
    categorias.value = cats.sort()
    // Aplica reservas do carrinho persistido sobre o estoque recém-carregado
    for (const item of carrinho.value) {
      const prod = todosProdutos.value.find(p => p.id === item.produto_id)
      if (prod?.gerenciar_estoque) prod.estoque_atual = Math.max(0, prod.estoque_atual - item.quantidade)
    }
  } catch {}
}

async function carregarMetodos() {
  try {
    metodos.value = await api.get<any[]>('/pagamentos/metodos')
  } catch {}
}

let pollingTimer: ReturnType<typeof setInterval> | null = null

function onVisibilityChange() {
  if (!document.hidden) carregarProdutos()
}

onMounted(async () => {
  await Promise.all([carregarProdutos(), carregarMetodos(), configStore.carregar()])
  pollingTimer = setInterval(() => { if (!document.hidden) carregarProdutos() }, 30000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-down-enter-active, .slide-down-leave-active { transition: all .2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
