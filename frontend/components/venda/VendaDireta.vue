<template>
  <!-- POS DE VENDA DIRETA (balcão, sem mesa) -->
  <div class="vd flex-1 flex overflow-hidden bg-[var(--vd-bg)] text-[var(--vd-tx)]">

    <!-- PRODUTOS -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden px-4 sm:px-6 pt-5">

      <!-- BUSCA (F2) -->
      <label class="vd-busca flex items-center gap-2.5 h-12 px-3.5 rounded-[14px] shrink-0">
        <Search :size="18" class="text-[var(--vd-mu)] shrink-0" />
        <input
          id="busca-produto" ref="buscaEl" name="busca-produto"
          v-model="busca" type="text" placeholder="Buscar produto ou código…" autocomplete="off"
          class="flex-1 min-w-0 h-full bg-transparent outline-none text-sm font-semibold placeholder:text-[var(--vd-mu)]"
        />
        <kbd class="hidden sm:inline text-[11px] font-semibold text-[var(--vd-mu)] border border-[var(--vd-bd)] rounded-md px-1.5 py-0.5">F2</kbd>
      </label>

      <!-- CATEGORIAS -->
      <div class="flex gap-2 overflow-x-auto pt-3.5 pb-3.5 scrollbar-none shrink-0">
        <button
          v-for="cat in ['Todos', ...categorias]" :key="cat" type="button"
          @click="categoriaAtiva = cat"
          class="px-4 py-2 rounded-full border text-sm font-bold whitespace-nowrap shrink-0 transition-colors"
          :class="categoriaAtiva === cat
            ? 'bg-[var(--vd-or)] border-[var(--vd-or)] text-white'
            : 'bg-[var(--vd-pn)] border-[var(--vd-bd)] text-[var(--vd-mu)] hover:text-[var(--vd-tx)]'"
        >{{ cat }}</button>
      </div>

      <!-- GRADE DE PRODUTOS -->
      <div class="flex-1 overflow-y-auto -mx-0.5 px-0.5 pb-6 pt-0.5">
        <div v-if="!produtosFiltrados.length" class="text-center text-[var(--vd-mu)] py-16 text-sm font-semibold">
          Nenhum produto encontrado.
        </div>
        <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3 content-start">
          <button
            v-for="p in produtosFiltrados" :key="p.id" type="button"
            @click="adicionarAoCarrinho(p)"
            class="vd-card relative text-left rounded-2xl p-3.5 flex flex-col gap-1 transition active:scale-[.97]"
            :class="semEstoque(p) ? 'opacity-45 pointer-events-none' : ''"
            :aria-label="`Adicionar ${p.nome}`"
          >
            <span v-if="qtdNoCarrinho(p.id)" class="absolute top-3 right-3 min-w-6 h-6 px-[7px] rounded-full bg-[var(--vd-or)] text-white text-xs font-extrabold grid place-items-center">
              {{ qtdNoCarrinho(p.id) }}
            </span>
            <!-- Foto, ou o ícone da categoria quando não há foto -->
            <ProdutoFoto :imagem="p.imagemUrl" :categoria="p.categoria" classe="size-[52px] rounded-[14px] mb-2 vd-thumb" :tamanho-icone="26" />
            <b class="text-[15px] font-bold leading-snug line-clamp-2">{{ p.nome }}</b>
            <small class="text-[var(--vd-mu)] font-semibold text-xs truncate">
              {{ p.categoria || 'Sem categoria' }}<template v-if="p.gerenciarEstoque"> ·
                <span :class="estoqueBaixo(p) ? 'text-[var(--vd-rd)]' : ''">{{ semEstoque(p) ? 'Sem estoque' : `${p.estoqueAtual} un.` }}</span>
              </template>
            </small>
            <span class="mt-2 text-[17px] font-extrabold text-[var(--vd-or)] tabular-nums">R$ {{ fmt(p.preco) }}</span>
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
    <aside
      class="fixed right-0 top-0 w-full sm:w-[400px] lg:w-[360px] xl:w-[400px] h-screen bg-[var(--vd-pn)] border-l border-[var(--vd-bd)] flex flex-col z-20 transition-transform duration-300 lg:translate-x-0"
      :class="carrinhoAberto ? 'translate-x-0' : 'translate-x-full'"
      aria-label="Carrinho"
    >
      <!-- CABEÇALHO -->
      <div class="px-[18px] pt-4 pb-2 flex items-start justify-between gap-2.5 shrink-0">
        <div>
          <h2 class="text-[22px] font-extrabold tracking-[-.02em]">Venda direta</h2>
          <p class="text-[var(--vd-mu)] font-semibold text-sm mt-0.5">
            {{ qtdItens ? `${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'} no carrinho` : 'Nenhum item adicionado' }}
          </p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" :disabled="!carrinho.length" @click="limparCarrinho"
            class="flex items-center gap-1.5 px-2.5 py-2 rounded-[10px] bg-[var(--vd-el)] text-[var(--vd-mu)] text-xs font-bold enabled:hover:text-[var(--vd-rd)] disabled:opacity-40 disabled:cursor-default">
            <Trash2 :size="15" /> Limpar carrinho
          </button>
          <button type="button" @click="carrinhoAberto = false" aria-label="Fechar carrinho"
            class="lg:hidden size-9 rounded-[10px] bg-[var(--vd-el)] text-[var(--vd-mu)] flex items-center justify-center">
            <X :size="18" />
          </button>
        </div>
      </div>

      <!-- ITENS -->
      <div class="flex-1 overflow-y-auto px-3.5 min-h-20">
        <div v-if="!carrinho.length" class="h-full grid place-content-center text-center text-[var(--vd-mu)] gap-1.5 p-5">
          <ShoppingCart :size="36" :stroke-width="1.5" class="mx-auto" />
          <b class="text-[var(--vd-tx)]">Carrinho vazio</b>
          <span class="text-sm">Toque em um produto para adicionar</span>
        </div>
        <template v-else>
        <div v-for="(item, idx) in carrinho" :key="item.produto_id"
          class="grid grid-cols-[1fr_auto] gap-x-2.5 gap-y-0.5 items-center px-2 py-[9px] border-b border-[var(--vd-bd)]">
          <b class="font-bold truncate">{{ item.nome_produto }}</b>
          <span class="font-extrabold text-right tabular-nums">R$ {{ fmt(item.preco_unit * item.quantidade) }}</span>
          <span class="text-[var(--vd-mu)] text-xs font-semibold tabular-nums">R$ {{ fmt(item.preco_unit) }} cada</span>
          <div class="flex items-center justify-self-end bg-[var(--vd-el)] rounded-[10px]">
            <button type="button" @click="decrementar(idx)" class="size-8 rounded-[10px] grid place-items-center" aria-label="Remover um"><Minus :size="15" :stroke-width="2.5" /></button>
            <span class="min-w-[22px] text-center font-extrabold tabular-nums">{{ item.quantidade }}</span>
            <button type="button" @click="incrementar(idx)" class="size-8 rounded-[10px] grid place-items-center" aria-label="Adicionar um"><Plus :size="15" :stroke-width="2.5" /></button>
          </div>
        </div>
        </template>
      </div>

      <!-- RODAPÉ: TOTAIS + PAGAMENTO -->
      <div class="px-4 pt-3 pb-4 border-t border-[var(--vd-bd)] grid gap-2.5 shrink-0">
        <div class="flex justify-between items-center font-semibold text-[var(--vd-mu)]">
          <span>Subtotal <b class="text-[var(--vd-tx)] tabular-nums">R$ {{ fmt(subtotal) }}</b></span>
          <label class="flex items-center gap-2">
            <span>Desconto</span>
            <input id="desconto-venda" v-model="desconto" name="desconto-venda" inputmode="decimal" placeholder="R$ 0,00" aria-label="Desconto em reais"
              class="vd-campo w-28 h-9 text-right rounded-xl px-3 font-bold" />
          </label>
        </div>
        <div class="flex justify-between items-center font-semibold text-[var(--vd-mu)]">
          <span>Total</span>
          <span class="text-[26px] font-extrabold tracking-[-.02em] text-[var(--vd-tx)] tabular-nums">R$ {{ fmt(total) }}</span>
        </div>

        <!-- MÉTODO DE PAGAMENTO -->
        <div class="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Forma de pagamento">
          <button
            v-for="m in metodos" :key="m.id" type="button" role="radio" :aria-checked="metodoSelecionado?.id === m.id"
            @click="metodoSelecionado = m; valorRecebido = ''"
            class="h-[54px] px-0.5 rounded-xl border-[1.5px] text-xs font-bold flex flex-col items-center justify-center gap-[3px] transition-colors"
            :class="metodoSelecionado?.id === m.id ? 'vd-pag-on' : 'bg-[var(--vd-el)] border-transparent'"
          >
            <component :is="iconeMetodo(m.nome)" :size="18" />
            <span class="truncate max-w-full" :title="m.nome">{{ rotuloMetodo(m.nome) }}</span>
          </button>
        </div>

        <!-- DINHEIRO: atalhos, valor recebido e troco -->
        <div v-if="ehDinheiro" class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 items-center">
          <div class="col-span-2 flex gap-1.5 overflow-x-auto scrollbar-none">
            <button v-for="a in atalhosDinheiro" :key="a.rotulo" type="button" @click="valorRecebido = String(a.valor)"
              class="shrink-0 whitespace-nowrap px-[11px] py-1.5 rounded-full bg-[var(--vd-el)] text-xs font-bold">{{ a.rotulo }}</button>
          </div>
          <input id="valor-recebido" v-model="valorRecebido" name="valor-recebido" inputmode="decimal" placeholder="Valor recebido" aria-label="Valor recebido"
            class="vd-campo min-w-0 h-10 text-right rounded-xl px-3 font-bold" />
          <div class="flex items-center gap-2.5 whitespace-nowrap font-bold text-[15px]">
            <span>{{ valorRecebidoNum && valorRecebidoNum < total ? 'Faltam' : 'Troco' }}</span>
            <b class="text-lg tabular-nums" :class="!valorRecebidoNum ? '' : valorRecebidoNum < total ? 'text-[var(--vd-rd)]' : 'text-[var(--vd-gr)]'">
              R$ {{ fmt(valorRecebidoNum ? Math.abs(valorRecebidoNum - total) : 0) }}
            </b>
          </div>
        </div>

        <!-- PIX: QR Code com o valor para o cliente pagar (chave em Admin › Métodos) -->
        <button v-if="ehPix && pix && total > 0" type="button" @click="qrPixAberto = true"
          class="h-11 rounded-xl border border-[var(--vd-or)] text-[var(--vd-or)] text-sm font-bold flex items-center justify-center gap-2">
          <QrCode :size="18" /> Mostrar QR Code Pix
        </button>

        <!-- CONFIRMAR (Enter) -->
        <button type="button"
          @click="confirmarVenda"
          :disabled="!podePagar || processando"
          class="h-[52px] rounded-[14px] text-base font-extrabold flex items-center justify-center gap-2 transition active:scale-[.98] enabled:bg-[var(--vd-or)] enabled:text-white disabled:bg-[var(--vd-el)] disabled:text-[var(--vd-mu)] disabled:cursor-not-allowed"
        >
          <Loader2 v-if="processando" :size="18" class="animate-spin" />
          {{ processando ? 'Processando…' : 'Confirmar venda' }}
        </button>
      </div>
    </aside>
  </div>

  <!-- FAB CARRINHO (mobile) -->
  <button
    v-if="!carrinhoAberto"
    @click="carrinhoAberto = true"
    class="fixed bottom-6 right-6 z-30 lg:hidden w-14 h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-500/40 flex items-center justify-center transition-all active:scale-95"
    aria-label="Abrir carrinho"
  >
    <ShoppingCart :size="22" class="text-white" />
    <span v-if="qtdItens" class="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-black flex items-center justify-center">
      {{ qtdItens }}
    </span>
  </button>

  <ModalRfidAuth
    v-model="rfidModal"
    :mensagem="rfidMensagem"
    :erro="erroModal"
    @auth-success="onRfidSuccess"
    @cancelar="onRfidCancelar"
  />

  <!-- ══ MODAL QR CODE PIX ══ -->
  <Teleport to="body">
    <div v-if="qrPixAberto && pix" class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" @click.self="qrPixAberto = false">
      <div class="w-full max-w-xs rounded-3xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] p-6 grid gap-4 text-gray-900 dark:text-white" role="dialog" aria-label="QR Code Pix">
        <div class="flex items-center justify-between">
          <p class="font-extrabold">Pague com Pix</p>
          <button type="button" class="size-9 rounded-xl bg-gray-100 dark:bg-white/[0.06] grid place-items-center" aria-label="Fechar" @click="qrPixAberto = false"><X :size="18" /></button>
        </div>
        <PixQrCode :chave="pix.chave" :nome="pix.nome" :cidade="pix.cidade" :valor="total" classe-botao="border-gray-200 dark:border-white/10" />
        <p class="text-xs text-center text-gray-500 dark:text-white/50">Confira o recebimento no app do banco antes de confirmar a venda.</p>
        <button type="button" class="h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold" @click="qrPixAberto = false">Voltar à venda</button>
      </div>
    </div>
  </Teleport>

  <!-- ══ MODAL FICHA ══ -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="fichaAtual" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-neutral-900/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden">

          <!-- CONFIRMAÇÃO -->
          <div class="px-6 pt-6 text-center">
            <div class="size-14 rounded-full bg-green-500 text-white grid place-items-center mx-auto"><Check :size="30" :stroke-width="3" /></div>
            <p class="mt-3 text-xl font-extrabold text-gray-900 dark:text-white">Venda concluída</p>
            <p class="mt-1 text-sm font-semibold text-gray-500 dark:text-white/50">{{ configStore.impressora_auto_imprimir ? 'Ficha enviada para impressão.' : 'Venda registrada.' }}</p>
          </div>

          <!-- CABEÇALHO CUPOM -->
          <div class="px-6 pt-4 pb-4 text-center border-b border-dashed border-gray-200 dark:border-white/20">
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
import { numeroBR } from '~/lib/moeda'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Package, ShoppingCart, Plus, Minus, CheckCircle2, Loader2,
  Printer, Search, X, UtensilsCrossed, Trash2, Check, QrCode
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import ProdutoFoto from '~/components/ProdutoFoto.vue'
import PixQrCode from '~/components/PixQrCode.vue'
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
const buscaEl         = ref<HTMLInputElement | null>(null)

const produtosFiltrados = computed(() => {
  let lista = todosProdutos.value.filter(p => p.ativo)
  if (categoriaAtiva.value !== 'Todos') lista = lista.filter(p => p.categoria === categoriaAtiva.value)
  if (busca.value.trim()) {
    const q = busca.value.toLowerCase()
    lista = lista.filter(p => `${p.nome} ${(p as any).codigo ?? ''}`.toLowerCase().includes(q))
  }
  return lista
})

// ══ CARRINHO ══
interface CartItem { produto_id: number; nome_produto: string; preco_unit: number; quantidade: number }

const qtdItens      = computed(() => carrinho.value.reduce((s, i) => s + i.quantidade, 0))
const qtdNoCarrinho = (id: number) => carrinho.value.find(i => i.produto_id === id)?.quantidade ?? 0
const semEstoque    = (p: Produto) => p.gerenciarEstoque && p.estoqueAtual <= 0
// Mesma regra do Estoque: baixo quando chega no mínimo definido
const estoqueBaixo  = (p: Produto) => p.gerenciarEstoque && (p.estoqueAtual <= 0 || (p.estoqueMinimo > 0 && p.estoqueAtual <= p.estoqueMinimo))

function adicionarAoCarrinho(p: Produto) {
  if (p.gerenciarEstoque && p.estoqueAtual <= 0) {
    toastStore.warning(`${p.nome} está sem estoque`)
    return
  }

  const idx = carrinho.value.findIndex(i => i.produto_id === p.id)
  if (idx >= 0) {
    carrinho.value[idx].quantidade++
  } else {
    carrinho.value.push({ produto_id: p.id, nome_produto: p.nome, preco_unit: Number(p.preco), quantidade: 1 })
  }

  if (p.gerenciarEstoque) p.estoqueAtual--
}

function incrementar(idx: number) {
  const item = carrinho.value[idx]
  const prod = todosProdutos.value.find(p => p.id === item.produto_id)
  if (prod?.gerenciarEstoque) {
    if (prod.estoqueAtual <= 0) {
      toastStore.warning(`Estoque insuficiente`)
      return
    }
    prod.estoqueAtual--
  }
  item.quantidade++
}

function decrementar(idx: number) {
  const item = carrinho.value[idx]
  const prod = todosProdutos.value.find(p => p.id === item.produto_id)
  if (prod?.gerenciarEstoque) prod.estoqueAtual++
  if (item.quantidade <= 1) carrinho.value.splice(idx, 1)
  else item.quantidade--
}

function limparCarrinho() {
  for (const item of carrinho.value) {
    const prod = todosProdutos.value.find(p => p.id === item.produto_id)
    if (prod?.gerenciarEstoque) prod.estoqueAtual += item.quantidade
  }
  carrinho.value = []
  // Limpar começa do zero: sem valor recebido e troco de uma venda que não houve
  valorRecebido.value = ''
  desconto.value = ''
}

// ══ PAGAMENTO ══
const metodos     = ref<any[]>([])
const processando = ref(false)

const subtotal       = computed(() => carrinho.value.reduce((s, i) => s + i.preco_unit * i.quantidade, 0))
// Aceita vírgula: "2,50"
function numeroDigitado(v: unknown) {
  const t = String(v ?? '').replace(/[^\d,.]/g, '')
  return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t) || 0
}
const descontoNum    = computed(() => Math.min(Math.max(numeroDigitado(desconto.value), 0), subtotal.value))
const total          = computed(() => subtotal.value - descontoNum.value)
const valorRecebidoNum = computed(() => numeroDigitado(valorRecebido.value))
const rotuloMetodo     = (nome: string) => nome.replace(/^cart[aã]o de /i, '').replace(/^./, c => c.toUpperCase())
const ehDinheiro       = computed(() => metodoSelecionado.value?.nome === 'Dinheiro')
const ehPix            = computed(() => /pix/i.test(metodoSelecionado.value?.nome ?? ''))
// Chave Pix do restaurante (Admin › Métodos); sem chave, não há QR
const pix              = ref<{ chave: string; nome: string; cidade: string } | null>(null)
const qrPixAberto      = ref(false)
// Atalhos do dinheiro: valor exato e as próximas notas acima do total
const atalhosDinheiro  = computed(() => [
  { rotulo: 'Valor exato', valor: Number(total.value.toFixed(2)) },
  ...[5, 10, 20, 50, 100, 200].filter(v => v > total.value).slice(0, 3).map(v => ({ rotulo: `R$ ${v}`, valor: v })),
])
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
  let operador: { nome?: string } | null = null
  try {
    operador = await identificarViaRfid('Passe o cartão para confirmar a venda')
  } catch {
    return // cancelado
  }
  processando.value = true
  try {
    const resp = await api.post<any>('/vendas', {
      idempotencyKey: carrinhoStore.idempotencyKey,
      itens: carrinho.value.map(i => ({
        produtoId:  i.produto_id,
        quantidade: i.quantidade,
        ...(i.observacao ? { observacao: i.observacao } : {}),
      })),
      metodoId:      metodoSelecionado.value.id,
      valorRecebido: metodoSelecionado.value.nome === 'Dinheiro' ? valorRecebidoNum.value : undefined,
      desconto:      descontoNum.value > 0 ? descontoNum.value : undefined,
    })
    // A API devolve só o código da ficha e a conta; o cupom é montado com o carrinho
    fichaAtual.value = {
      numero:        resp.ficha,
      created_at:    new Date().toISOString(),
      operador:      operador?.nome ?? '',
      itens:         carrinho.value.map(i => ({ ...i })),
      total:         resp.conta?.bruto ?? subtotal.value,
      desconto:      resp.conta?.desconto ?? 0,
      total_liquido: resp.total,
      metodo:        metodoSelecionado.value.nome,
      valor_pago:    metodoSelecionado.value.nome === 'Dinheiro' ? valorRecebidoNum.value : resp.total,
      troco:         resp.troco,
    }
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

  if (configStore.impressora_auto_imprimir && impressorasStore.impressaoDiretaPara('caixa')) {
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

const fmt = (v: any) => numeroBR(v)
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
      if (prod?.gerenciarEstoque) prod.estoqueAtual = Math.max(0, prod.estoqueAtual - item.quantidade)
    }
  } catch {}
}

async function carregarPix() {
  try { const r = await api.get<any>('/pagamentos/pix'); pix.value = r?.chave ? r : null } catch {}
}

async function carregarMetodos() {
  try {
    metodos.value = await api.get<any[]>('/pagamentos/metodos')
  } catch {}
}

let pollingTimer: ReturnType<typeof setInterval> | null = null

// F2 vai para a busca; Enter confirma a venda (fora da busca e dos botões)
function onTecla(e: KeyboardEvent) {
  if (e.key === 'F2') { e.preventDefault(); buscaEl.value?.focus(); return }
  if (e.key !== 'Enter' || fichaAtual.value || rfidModal.value || qrPixAberto.value || !podePagar.value) return
  const el = document.activeElement as HTMLElement | null
  if (el === buscaEl.value || el?.tagName === 'BUTTON' || el?.tagName === 'TEXTAREA') return
  e.preventDefault()
  confirmarVenda()
}

function onVisibilityChange() {
  if (!document.hidden) carregarProdutos()
}

onMounted(async () => {
  await Promise.all([carregarProdutos(), carregarMetodos(), carregarPix(), configStore.carregar()])
  pollingTimer = setInterval(() => { if (!document.hidden) carregarProdutos() }, 30000)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('keydown', onTecla)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('keydown', onTecla)
})
</script>

<style scoped>
.vd :focus-visible { outline: 2px solid var(--vd-or); outline-offset: 2px; }
.vd-busca { background: var(--vd-pn); border: 1px solid var(--vd-bd); box-shadow: var(--vd-sh); }
.vd-busca:focus-within { border-color: var(--vd-or); }
.vd-card { background: var(--vd-pn); border: 1px solid var(--vd-bd); box-shadow: var(--vd-sh); }
.vd-card:hover { border-color: var(--vd-or); }
.vd-thumb { background-color: var(--vd-el) !important; color: var(--vd-or) !important; }
.vd-campo { background: var(--vd-el); border: 1px solid var(--vd-bd); outline: none; }
.vd-campo:focus { border-color: var(--vd-or); }
.vd-pag-on { border-color: var(--vd-or); background: color-mix(in srgb, var(--vd-or) 14%, var(--vd-el)); }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-down-enter-active, .slide-down-leave-active { transition: all .2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>

<style>
/* Cores da venda direta: vêm dos tokens do PDV (assets/css/tokens.css), então
   seguem o tema claro/escuro do sistema junto com a barra e o menu */
.vd {
  --vd-bg: var(--sup-fundo); --vd-pn: var(--sup-painel); --vd-el: var(--sup-elevado);
  --vd-bd: var(--linha); --vd-tx: var(--txt); --vd-mu: var(--txt-2);
  --vd-or: var(--acao); --vd-gr: var(--st-pronto); --vd-rd: var(--st-atencao); --vd-sh: var(--sombra-cartao);
}
</style>
