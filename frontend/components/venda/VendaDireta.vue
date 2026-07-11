<template>
  <!-- POS DE VENDA DIRETA (balcão, sem mesa) -->
  <div class="flex-1 flex overflow-hidden">

    <!-- PRODUTOS -->
    <div class="flex-1 flex flex-col overflow-hidden">

      <!-- BUSCA + CATEGORIAS -->
      <div class="px-4 pt-3 pb-2 space-y-2 shrink-0">
        <div class="relative">
          <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            id="busca-produto" name="busca-produto"
            v-model="busca" type="text" placeholder="Buscar produto…"
            class="w-full h-9 pl-9 pr-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 outline-none focus:border-orange-400 transition-all"
          />
        </div>
        <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            v-for="cat in ['Todos', ...categorias]" :key="cat"
            @click="categoriaAtiva = cat"
            class="h-7 px-3 rounded-lg text-[11px] font-black whitespace-nowrap shrink-0 transition-all"
            :class="categoriaAtiva === cat
              ? 'bg-orange-500 text-white'
              : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-orange-300'"
          >{{ cat }}</button>
        </div>
      </div>

      <!-- GRID DE PRODUTOS -->
      <div class="flex-1 overflow-y-auto px-4 pb-4">
        <div v-if="!produtosFiltrados.length" class="flex flex-col items-center justify-center h-48 gap-2 text-neutral-400">
          <Package :size="28" class="text-neutral-300 dark:text-neutral-700" />
          <p class="text-sm">Nenhum produto encontrado</p>
        </div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          <button
            v-for="p in produtosFiltrados" :key="p.id"
            @click="adicionarAoCarrinho(p)"
            class="group relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 flex flex-col items-center text-center hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-md active:scale-95 transition-all"
            :class="p.gerenciar_estoque && p.estoque_atual <= 0 ? 'opacity-50 cursor-not-allowed hover:border-neutral-200 dark:hover:border-neutral-800 hover:shadow-none' : ''"
          >
            <!-- BADGE ESTOQUE -->
            <span
              v-if="p.gerenciar_estoque && p.estoque_atual <= 0"
              class="absolute top-1.5 right-1.5 text-[9px] font-black bg-red-100 dark:bg-red-950/50 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded-md leading-none"
            >Esgotado</span>
            <span
              v-else-if="p.gerenciar_estoque && p.estoque_minimo > 0 && p.estoque_atual <= p.estoque_minimo"
              class="absolute top-1.5 right-1.5 text-[9px] font-black bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md leading-none"
            >{{ p.estoque_atual }} un.</span>

            <div class="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center mb-2.5">
              <UtensilsCrossed :size="14" class="text-orange-500" />
            </div>
            <p class="text-xs font-black text-neutral-900 dark:text-white leading-snug line-clamp-2">{{ p.nome }}</p>
            <p v-if="p.categoria" class="text-[10px] text-neutral-400 mt-0.5 truncate w-full">{{ p.categoria }}</p>
            <p class="text-sm font-black text-orange-500 mt-1.5">R$ {{ fmt(p.preco) }}</p>
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
      class="fixed right-0 top-0 w-full sm:w-96 lg:w-72 xl:w-80 h-screen bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl dark:shadow-black/60 flex flex-col z-20 transition-transform duration-300 lg:translate-x-0"
      :class="carrinhoAberto ? 'translate-x-0' : 'translate-x-full'"
    >

      <!-- HEADER CARRINHO -->
      <div class="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2">
          <ShoppingCart :size="14" class="text-orange-500" />
          <span class="text-xs font-black text-neutral-900 dark:text-white">Carrinho</span>
          <span v-if="carrinho.length" class="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
            {{ carrinho.length }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="carrinho.length" @click="carrinho = []"
            class="text-[10px] font-black text-red-400 hover:text-red-500 transition-colors">
            Limpar
          </button>
          <button @click="carrinhoAberto = false"
            class="lg:hidden w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-colors">
            <X :size="14" />
          </button>
        </div>
      </div>

      <!-- ITENS -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="!carrinho.length" class="flex flex-col items-center justify-center h-full gap-2 text-neutral-400 p-6 text-center">
          <ShoppingCart :size="24" class="text-neutral-300 dark:text-neutral-700" />
          <p class="text-xs">Toque em um produto para adicionar</p>
        </div>

        <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800">
          <div v-for="(item, idx) in carrinho" :key="item.produto_id" class="flex items-center gap-2 px-3 py-2.5">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-black text-neutral-800 dark:text-neutral-200 truncate">{{ item.nome_produto }}</p>
              <p class="text-[11px] text-orange-500 font-bold">R$ {{ fmt(item.preco_unit) }}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button @click="decrementar(idx)"
                class="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors">
                <Minus :size="10" />
              </button>
              <span class="w-6 text-center text-xs font-black text-neutral-900 dark:text-white">{{ item.quantidade }}</span>
              <button @click="incrementar(idx)"
                class="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors">
                <Plus :size="10" />
              </button>
            </div>
            <span class="text-xs font-black text-neutral-700 dark:text-neutral-300 w-14 text-right shrink-0">
              R$ {{ fmt(item.preco_unit * item.quantidade) }}
            </span>
          </div>
        </div>
      </div>

      <!-- FOOTER: TOTAIS + PAGAMENTO -->
      <div class="border-t border-neutral-100 dark:border-neutral-800 p-3 space-y-3 shrink-0">

        <!-- DESCONTO -->
        <div class="flex items-center gap-2">
          <label for="desconto-venda" class="text-[10px] font-black uppercase tracking-widest text-neutral-400 shrink-0">Desconto R$</label>
          <input
            id="desconto-venda" name="desconto-venda"
            v-model="desconto" type="number" min="0" step="0.01" placeholder="0,00"
            class="flex-1 h-8 px-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none focus:border-orange-400 transition-all text-right"
          />
        </div>

        <!-- TOTAIS -->
        <div class="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-2.5 space-y-1">
          <div class="flex justify-between text-[11px] text-neutral-500">
            <span>Subtotal</span><span>R$ {{ fmt(subtotal) }}</span>
          </div>
          <div v-if="descontoNum > 0" class="flex justify-between text-[11px] text-green-500">
            <span>Desconto</span><span>− R$ {{ fmt(descontoNum) }}</span>
          </div>
          <div class="flex justify-between text-sm font-black text-neutral-900 dark:text-white pt-1 border-t border-neutral-200 dark:border-neutral-700">
            <span>Total</span><span>R$ {{ fmt(total) }}</span>
          </div>
        </div>

        <!-- MÉTODO DE PAGAMENTO -->
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5">Pagamento</p>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="m in metodos" :key="m.id"
              @click="metodoSelecionado = m; valorRecebido = ''"
              class="h-9 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center gap-1.5"
              :class="metodoSelecionado?.id === m.id
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-orange-300'"
            >
              <component :is="iconeMetodo(m.nome)" :size="12" />
              {{ m.nome }}
            </button>
          </div>
        </div>

        <!-- TROCO (só dinheiro) -->
        <Transition name="slide-down">
          <div v-if="metodoSelecionado?.nome === 'Dinheiro'" class="space-y-1.5">
            <label for="valor-recebido" class="text-[10px] font-black uppercase tracking-widest text-neutral-400">Valor recebido</label>
            <input
              id="valor-recebido" name="valor-recebido"
              v-model="valorRecebido" type="number" min="0" step="0.01" placeholder="0,00"
              class="w-full h-9 px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-black text-neutral-900 dark:text-white outline-none focus:border-orange-400 transition-all"
            />
            <div v-if="trocoVal > 0" class="flex justify-between items-center bg-green-50 dark:bg-green-950/30 rounded-xl px-3 py-2">
              <span class="text-xs font-bold text-green-700 dark:text-green-400">Troco</span>
              <span class="text-sm font-black text-green-700 dark:text-green-400">R$ {{ fmt(trocoVal) }}</span>
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
          :class="podePagar ? 'bg-green-500 hover:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'"
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
    @click="carrinhoAberto = true"
    class="fixed bottom-6 right-6 z-30 lg:hidden w-14 h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-500/40 flex items-center justify-center transition-all active:scale-95"
  >
    <ShoppingCart :size="22" class="text-white" />
    <span v-if="carrinho.length" class="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-black flex items-center justify-center">
      {{ carrinho.length }}
    </span>
  </button>

  <!-- ══ MODAL FICHA ══ -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="fichaAtual" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden">

          <!-- CABEÇALHO CUPOM -->
          <div class="px-6 pt-6 pb-4 text-center border-b border-dashed border-neutral-200 dark:border-neutral-700">
            <img
              v-if="configStore.logo_base64"
              :src="configStore.logo_base64"
              class="h-12 mx-auto mb-3 object-contain"
              alt="Logo"
            />
            <div v-else class="w-11 h-11 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-3">
              <UtensilsCrossed :size="18" class="text-white" />
            </div>
            <p class="font-black text-neutral-900 dark:text-white text-sm uppercase tracking-widest leading-tight">
              {{ configStore.nome_restaurante }}
            </p>
            <p class="text-[10px] text-neutral-400 mt-1">
              {{ fichaAtual.numero }} · {{ fmtFichaDateTime(fichaAtual.createdAt) }}
            </p>
            <p class="text-[10px] text-neutral-400">Operador: {{ fichaAtual.operador }}</p>
          </div>

          <!-- ITENS -->
          <div class="px-5 py-3 border-b border-dashed border-neutral-200 dark:border-neutral-700 max-h-48 overflow-y-auto space-y-1.5">
            <div v-for="item in fichaAtual.itens" :key="item.produto_id"
              class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-[11px] font-black text-orange-500 shrink-0">{{ item.quantidade }}×</span>
                <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{{ item.nome_produto }}</span>
              </div>
              <span class="text-xs font-black text-neutral-900 dark:text-white shrink-0">
                R$ {{ fmt(item.preco_unit * item.quantidade) }}
              </span>
            </div>
          </div>

          <!-- TOTAIS -->
          <div class="px-5 py-3 border-b border-dashed border-neutral-200 dark:border-neutral-700 space-y-1.5">
            <div class="flex justify-between text-[11px] text-neutral-400">
              <span>Subtotal</span><span>R$ {{ fmt(fichaAtual.total) }}</span>
            </div>
            <div v-if="fichaAtual.desconto > 0" class="flex justify-between text-[11px] text-green-500 font-bold">
              <span>Desconto</span><span>− R$ {{ fmt(fichaAtual.desconto) }}</span>
            </div>
            <div class="flex justify-between text-sm font-black text-neutral-900 dark:text-white">
              <span>TOTAL</span><span>R$ {{ fmt(fichaAtual.totalLiquido) }}</span>
            </div>
            <div class="flex justify-between text-[11px] text-neutral-400 pt-0.5">
              <span>{{ fichaAtual.metodo }}</span>
              <span>Pago R$ {{ fmt(fichaAtual.valorPago) }}</span>
            </div>
            <div v-if="fichaAtual.troco > 0" class="flex justify-between text-[11px] font-black text-green-600 dark:text-green-400">
              <span>Troco</span><span>R$ {{ fmt(fichaAtual.troco) }}</span>
            </div>
          </div>

          <!-- MENSAGEM -->
          <p class="text-center text-[10px] text-neutral-400 py-3 px-5 italic">
            {{ configStore.mensagem_ficha }}
          </p>

          <!-- AÇÕES -->
          <div class="flex gap-2 px-4 pb-4">
            <button @click="imprimirFicha"
              class="flex-1 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5">
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
import {
  Package, ShoppingCart, Plus, Minus, CheckCircle2, Loader2,
  Printer, Search, X, UtensilsCrossed
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useCaixaStore }  from '~/stores/caixa'
import { useToastStore }  from '~/stores/toast'
import { useConfigStore } from '~/stores/configuracoes'
import { iconeMetodo } from '~/composables/useIconeMetodo'

const emit = defineEmits(['venda-registrada'])

const api         = useApi()
const caixaStore  = useCaixaStore()
const toastStore  = useToastStore()
const configStore = useConfigStore()

const carrinhoAberto = ref(false)

// ══ PRODUTOS ══
interface Produto {
  id: number
  nome: string
  preco: number
  categoria: string | null
  categoria_id: number | null
  ativo: number
  gerenciar_estoque: number
  estoque_atual: number
  estoque_minimo: number
}
const todosProdutos   = ref<Produto[]>([])
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
const carrinho = ref<CartItem[]>([])

function adicionarAoCarrinho(p: Produto) {
  const idx = carrinho.value.findIndex(i => i.produto_id === p.id)
  const qtdNoCarrinho = idx >= 0 ? carrinho.value[idx].quantidade : 0

  if (p.gerenciar_estoque) {
    if (p.estoque_atual <= 0) {
      toastStore.warning(`${p.nome} está sem estoque`)
      return
    }
    if (qtdNoCarrinho >= p.estoque_atual) {
      toastStore.warning(`Estoque insuficiente — disponível: ${p.estoque_atual}`)
      return
    }
  }

  if (idx >= 0) {
    carrinho.value[idx].quantidade++
  } else {
    carrinho.value.push({ produto_id: p.id, nome_produto: p.nome, preco_unit: Number(p.preco), quantidade: 1 })
  }
}
function incrementar(idx: number) { carrinho.value[idx].quantidade++ }
function decrementar(idx: number) {
  if (carrinho.value[idx].quantidade <= 1) carrinho.value.splice(idx, 1)
  else carrinho.value[idx].quantidade--
}

// ══ PAGAMENTO ══
const desconto          = ref('')
const metodoSelecionado = ref<any>(null)
const valorRecebido     = ref('')
const metodos           = ref<any[]>([])
const processando       = ref(false)

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
  processando.value = true
  try {
    const resp = await api.post<any>('/vendas', {
      itens: carrinho.value,
      metodo_id: metodoSelecionado.value.id,
      desconto:  descontoNum.value,
      valor_pago: metodoSelecionado.value.nome === 'Dinheiro' ? valorRecebidoNum.value : total.value
    })
    fichaAtual.value = resp.ficha
    carrinho.value = []
    desconto.value = ''
    metodoSelecionado.value = null
    valorRecebido.value = ''
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

  // Impressão direta na térmica via backend — sem diálogo do navegador
  if (configStore.impressaoDireta) {
    try {
      await api.post('/impressao/ficha', {
        itens:  ficha.itens.map((i: any) => ({ nome: i.nome_produto, quantidade: i.quantidade })),
        info:   `${fmtFichaDateTime(ficha.createdAt)} · ${ficha.operador || '—'}`,
        codigo: ficha.numero
      })
    } catch (e: any) {
      toastStore.error('Falha na impressão', e?.message)
    }
    return
  }

  const nomeRest = configStore.nome_restaurante || 'Restaurante PDV'
  const logo     = configStore.logo_base64
  const mensagem = configStore.mensagem_ficha || 'Obrigado pela preferência!'
  const dataStr  = fmtFichaDateTime(ficha.createdAt)
  const logoHtml = logo
    ? `<img src="${logo}" style="height:40px;object-fit:contain;margin-bottom:6px;" />`
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

  // onload definido ANTES de escrever o documento
  iframe.onload = () => {
    // delay para o browser processar @page size antes de abrir o diálogo
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

// ══ FORMATAÇÃO ══
const fmt = (v: any) => Number(v || 0).toFixed(2)
function fmtFichaDateTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ══ BUSCA DE DADOS ══
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
    todosProdutos.value = Array.isArray(rows) ? rows.filter(p => p.ativo) : []
    const cats = [...new Set(todosProdutos.value.map(p => p.categoria).filter(Boolean))] as string[]
    categorias.value = cats.sort()
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
