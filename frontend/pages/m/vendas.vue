<template>
  <div class="flex flex-col min-h-full">

    <!-- LOADING -->
    <div v-if="iniciando" class="flex-1 flex items-center justify-center">
      <Loader2 :size="24" class="animate-spin text-orange-500/60" />
    </div>

    <!-- CAIXA FECHADO -->
    <div v-else-if="!caixaStore.aberto" class="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8 pb-24">
      <div
        class="w-20 h-20 rounded-[24px] flex items-center justify-center"
        style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);"
      >
        <LockKeyhole :size="28" class="text-white/15" />
      </div>
      <div>
        <h3 class="text-[17px] font-black text-white/50">Caixa fechado</h3>
        <p class="text-[13px] font-medium text-white/25 mt-2 max-w-xs leading-relaxed">
          O administrador precisa abrir o caixa para iniciar as vendas.
        </p>
      </div>
    </div>

    <template v-else>

      <!-- PAGE HEADER -->
      <div class="relative px-5 pt-6 pb-4 overflow-hidden shrink-0">
        <div
          class="absolute inset-0 pointer-events-none"
          style="background: radial-gradient(ellipse 60% 80% at 100% 0%, rgba(249,115,22,0.07) 0%, transparent 65%);"
        ></div>
        <div class="relative">
          <h1 class="text-[30px] font-black text-white tracking-tight leading-none">Venda Direta</h1>
          <p class="text-[12px] font-medium mt-2" :class="carrinho.length ? 'text-orange-400/70' : 'text-white/25'">
            <template v-if="carrinho.length">{{ totalItens }} item{{ totalItens !== 1 ? 's' : '' }} no carrinho · R$ {{ fmt(total) }}</template>
            <template v-else>Selecione os produtos abaixo</template>
          </p>
        </div>
      </div>

      <!-- BUSCA -->
      <div class="px-5 pb-3 shrink-0">
        <div class="relative">
          <Search :size="13" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            v-model="busca"
            type="text"
            placeholder="Buscar produto..."
            class="w-full h-10 pl-9 pr-4 rounded-[12px] text-[13px] text-white placeholder:text-white/20 outline-none transition-all"
            style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);"
            @focus="($event.target as HTMLInputElement).style.borderColor='rgba(249,115,22,0.35)'"
            @blur="($event.target as HTMLInputElement).style.borderColor='rgba(255,255,255,0.07)'"
          />
        </div>
      </div>

      <!-- CHIPS DE CATEGORIA -->
      <div class="flex gap-2 overflow-x-auto px-5 pb-3 shrink-0 scrollbar-none">
        <button
          v-for="cat in ['Todos', ...categorias]"
          :key="cat"
          @click="categoriaAtiva = cat"
          class="h-[30px] px-3.5 rounded-[10px] text-[11px] font-black whitespace-nowrap shrink-0 transition-all active:scale-95"
          :class="categoriaAtiva === cat ? 'text-white' : 'text-white/30'"
          :style="categoriaAtiva === cat
            ? 'background: #f97316; box-shadow: 0 3px 10px rgba(249,115,22,0.3);'
            : 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);'"
        >{{ cat }}</button>
      </div>

      <div class="h-px mx-5 shrink-0 bg-white/[0.05]"></div>

      <!-- GRID DE PRODUTOS -->
      <div class="flex-1 overflow-y-auto px-4 pt-3 pb-32">
        <div v-if="!produtosFiltrados.length" class="flex flex-col items-center justify-center h-48 gap-3 text-white/20">
          <Package :size="28" class="text-white/[0.08]" />
          <p class="text-[13px] font-semibold">Nenhum produto</p>
        </div>
        <div v-else class="grid grid-cols-2 gap-2.5">
          <button
            v-for="p in produtosFiltrados"
            :key="p.id"
            @click="adicionarAoCarrinho(p)"
            class="rounded-[18px] p-4 flex flex-col items-center text-center transition-all"
            :style="p.gerenciar_estoque && p.estoque_atual <= 0
              ? 'background:#161619; border:1px solid rgba(255,255,255,0.05); opacity:0.45; cursor:not-allowed;'
              : 'background:#161619; border:1px solid rgba(255,255,255,0.06);'"
            :disabled="p.gerenciar_estoque && p.estoque_atual <= 0"
            @mousedown="!(p.gerenciar_estoque && p.estoque_atual <= 0) ? $event.currentTarget.style.background='#1c1c1f' : null"
            @mouseup="$event.currentTarget.style.background='#161619'"
            @touchstart="!(p.gerenciar_estoque && p.estoque_atual <= 0) ? $event.currentTarget.style.background='#1c1c1f' : null"
            @touchend="$event.currentTarget.style.background='#161619'"
          >
            <span
              v-if="p.gerenciar_estoque && p.estoque_atual <= 0"
              class="text-[9px] font-black px-2 py-0.5 rounded-[6px] mb-2"
              style="background: rgba(239,68,68,0.12); color: rgb(248,113,113);"
            >Esgotado</span>
            <div
              class="w-10 h-10 rounded-[14px] flex items-center justify-center mb-3 shrink-0"
              style="background: rgba(249,115,22,0.1);"
            >
              <UtensilsCrossed :size="15" class="text-orange-400/60" />
            </div>
            <p class="text-[12px] font-black text-white leading-snug line-clamp-2">{{ p.nome }}</p>
            <p v-if="p.categoria" class="text-[10px] font-medium text-white/20 mt-0.5 truncate w-full">{{ p.categoria }}</p>
            <p class="text-[15px] font-black text-orange-400 mt-2">R$ {{ fmt(p.preco) }}</p>
          </button>
        </div>
      </div>

      <!-- FAB CARRINHO -->
      <Transition name="fab">
        <button
          v-if="carrinho.length"
          @click="carrinhoAberto = true"
          class="fixed bottom-[100px] right-4 z-20 active:scale-90 transition-transform duration-150"
          style="filter: drop-shadow(0 8px 22px rgba(249,115,22,0.55));"
        >
          <!-- Círculo principal -->
          <div
            class="w-[58px] h-[58px] rounded-full flex items-center justify-center"
            style="background: linear-gradient(145deg, #fb923c, #ea6c0a);"
          >
            <ShoppingCart :size="23" class="text-white" />
          </div>
          <!-- Badge counter -->
          <div
            :key="totalItens"
            class="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-black badge-pop"
            style="background: #fff; color: #ea580c; border: 2.5px solid #0d0d10;"
          >
            {{ totalItens > 99 ? '99+' : totalItens }}
          </div>
        </button>
      </Transition>

    </template>

    <!-- BOTTOM SHEET: CARRINHO -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="carrinhoAberto" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/65" @click="carrinhoAberto = false"></div>
          <div
            class="absolute bottom-0 left-0 right-0 rounded-t-[28px] max-h-[92vh] flex flex-col"
            style="background: #141417; border-top: 1px solid rgba(255,255,255,0.07);"
          >
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-1 shrink-0">
              <div class="w-10 h-1 rounded-full bg-white/[0.09]"></div>
            </div>

            <!-- Header -->
            <div class="px-5 pb-3.5 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-2.5">
                <h3 class="text-[22px] font-black text-white">Carrinho</h3>
                <span
                  v-if="carrinho.length"
                  class="text-[11px] font-black px-2 py-0.5 rounded-full tabular-nums"
                  style="background: rgba(249,115,22,0.12); color: rgb(251,146,60); border: 1px solid rgba(249,115,22,0.2);"
                >
                  {{ totalItens }} {{ totalItens !== 1 ? 'itens' : 'item' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="carrinho.length"
                  @click="limparCarrinho"
                  class="flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[11px] font-black transition-all active:scale-95"
                  style="background: rgba(239,68,68,0.08); color: rgba(248,113,113,0.65); border: 1px solid rgba(239,68,68,0.12);"
                >
                  <Trash2 :size="11" />
                  Limpar
                </button>
                <button
                  @click="carrinhoAberto = false"
                  class="w-8 h-8 rounded-full flex items-center justify-center"
                  style="background: rgba(255,255,255,0.06);"
                >
                  <X :size="15" class="text-white/40" />
                </button>
              </div>
            </div>

            <div class="h-px mx-5 shrink-0 bg-white/[0.05]"></div>

            <!-- ITENS -->
            <div class="flex-1 overflow-y-auto">
              <div v-if="!carrinho.length" class="flex flex-col items-center justify-center py-14 gap-3">
                <div
                  class="w-14 h-14 rounded-[18px] flex items-center justify-center"
                  style="background: rgba(255,255,255,0.04);"
                >
                  <ShoppingCart :size="22" class="text-white/15" />
                </div>
                <p class="text-[13px] font-semibold text-white/25">Nenhum item no carrinho</p>
              </div>
              <div v-else>
                <div
                  v-for="(item, idx) in carrinho"
                  :key="item.produto_id"
                  class="flex items-center gap-3 px-5 py-3.5"
                  style="border-bottom: 1px solid rgba(255,255,255,0.04);"
                >
                  <!-- Accent bar -->
                  <div
                    class="w-1 self-stretch rounded-full shrink-0 min-h-[38px]"
                    style="background: linear-gradient(to bottom, rgba(249,115,22,0.5), rgba(249,115,22,0.04));"
                  ></div>
                  <!-- Info + stepper -->
                  <div class="flex-1 min-w-0">
                    <p class="text-[13px] font-black text-white leading-snug truncate">{{ item.nome_produto }}</p>
                    <div class="flex items-center gap-2 mt-2">
                      <button
                        @click="decrementar(idx)"
                        class="w-7 h-7 rounded-[8px] flex items-center justify-center active:scale-90 transition-transform"
                        style="background: rgba(255,255,255,0.07);"
                      >
                        <Minus :size="11" class="text-white/45" />
                      </button>
                      <span class="w-6 text-center text-[14px] font-black text-white tabular-nums">{{ item.quantidade }}</span>
                      <button
                        @click="incrementar(idx)"
                        class="w-7 h-7 rounded-[8px] flex items-center justify-center active:scale-90 transition-transform"
                        style="background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.18);"
                      >
                        <Plus :size="11" class="text-orange-400" />
                      </button>
                      <span class="text-[11px] text-white/20 ml-0.5 tabular-nums">× R$ {{ fmt(item.preco_unit) }}</span>
                    </div>
                  </div>
                  <!-- Total -->
                  <span class="text-[15px] font-black text-white tabular-nums shrink-0">
                    R$ {{ fmt(item.preco_unit * item.quantidade) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- FOOTER -->
            <div
              class="px-5 pt-4 pb-5 space-y-3 shrink-0"
              style="border-top: 1px solid rgba(255,255,255,0.05); padding-bottom: max(20px, env(safe-area-inset-bottom));"
            >

              <!-- Totais -->
              <div
                class="rounded-[14px] px-4 py-3 space-y-2"
                style="background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.05);"
              >
                <div class="flex justify-between items-center">
                  <span class="text-[12px] font-medium text-white/35">Subtotal</span>
                  <span class="text-[13px] font-bold text-white/50 tabular-nums">R$ {{ fmt(subtotal) }}</span>
                </div>
                <div v-if="descontoNum > 0" class="flex justify-between items-center">
                  <span class="text-[12px] font-bold text-emerald-400/80">Desconto</span>
                  <span class="text-[13px] font-bold text-emerald-400 tabular-nums">− R$ {{ fmt(descontoNum) }}</span>
                </div>
                <div
                  class="flex justify-between items-center pt-2.5"
                  style="border-top: 1px solid rgba(255,255,255,0.06);"
                >
                  <span class="text-[15px] font-black text-white">Total</span>
                  <span class="text-[22px] font-black text-white tabular-nums leading-none">R$ {{ fmt(total) }}</span>
                </div>
              </div>

              <!-- Desconto -->
              <div
                class="flex items-center gap-2.5 rounded-[12px] px-3.5 h-11"
                style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);"
              >
                <span class="text-[10px] font-black uppercase tracking-[0.14em] text-white/20 shrink-0">Desconto</span>
                <span class="text-white/15 text-[12px] shrink-0">R$</span>
                <input
                  v-model="desconto"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  class="flex-1 bg-transparent text-[13px] font-bold text-white placeholder:text-white/15 outline-none text-right tabular-nums"
                />
              </div>

              <!-- Pagamento -->
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/20 mb-2">Forma de Pagamento</p>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="m in metodos"
                    :key="m.id"
                    @click="metodoSelecionado = m; valorRecebido = ''"
                    class="h-[52px] rounded-[14px] flex items-center justify-center gap-2 text-[12px] font-black transition-all active:scale-[0.97]"
                    :style="metodoSelecionado?.id === m.id
                      ? 'background: rgba(249,115,22,0.12); border: 1.5px solid rgba(249,115,22,0.4); color: rgb(251,146,60);'
                      : 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); color: rgba(255,255,255,0.35);'"
                  >
                    <component :is="getMetodoIcon(m)" :size="15" />
                    {{ m.nome }}
                  </button>
                </div>
              </div>

              <!-- Troco (Dinheiro) -->
              <div v-if="metodoSelecionado?.nome === 'Dinheiro'" class="space-y-2">
                <div
                  class="flex items-center gap-2.5 rounded-[12px] px-3.5 h-11"
                  style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);"
                >
                  <span class="text-[10px] font-black uppercase tracking-[0.14em] text-white/20 shrink-0">Recebido</span>
                  <span class="text-white/15 text-[12px] shrink-0">R$</span>
                  <input
                    v-model="valorRecebido"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    class="flex-1 bg-transparent text-[13px] font-bold text-white placeholder:text-white/15 outline-none text-right tabular-nums"
                  />
                </div>
                <div
                  v-if="trocoVal > 0"
                  class="flex justify-between items-center rounded-[12px] px-4 py-3"
                  style="background: rgba(52,211,153,0.07); border: 1px solid rgba(52,211,153,0.14);"
                >
                  <span class="text-[12px] font-bold text-emerald-400">Troco</span>
                  <span class="text-[17px] font-black text-emerald-400 tabular-nums">R$ {{ fmt(trocoVal) }}</span>
                </div>
                <p
                  v-if="valorRecebidoNum > 0 && valorRecebidoNum < total"
                  class="text-center text-[11px] font-bold"
                  style="color: rgba(248,113,113,0.75);"
                >
                  Faltam R$ {{ fmt(total - valorRecebidoNum) }}
                </p>
              </div>

              <!-- Confirmar -->
              <button
                @click="confirmarVenda"
                :disabled="!podePagar || processando"
                class="w-full h-[56px] rounded-[18px] text-white text-[15px] font-black transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-2.5"
                :style="podePagar
                  ? 'background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 6px 24px rgba(34,197,94,0.28);'
                  : 'background: rgba(255,255,255,0.06);'"
              >
                <Loader2 v-if="processando" :size="18" class="animate-spin" />
                <CheckCircle2 v-else :size="18" />
                {{ processando ? 'Processando...' : 'Confirmar Venda' }}
              </button>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- FICHA -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="fichaAtual" class="fixed inset-0 z-[60] flex items-center justify-center p-5" style="background: rgba(0,0,0,0.75);">
          <div
            class="w-full max-w-xs overflow-hidden rounded-[24px]"
            style="background: #141417; border: 1px solid rgba(255,255,255,0.07);"
          >
            <div class="px-5 pt-7 pb-4 text-center" style="border-bottom: 1px dashed rgba(255,255,255,0.08);">
              <div
                class="w-12 h-12 rounded-[16px] flex items-center justify-center mx-auto mb-4"
                style="background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.2);"
              >
                <CheckCircle2 :size="22" class="text-emerald-400" />
              </div>
              <p class="font-black text-white text-[15px]">Venda Confirmada!</p>
              <p class="text-[11px] text-white/30 font-medium mt-1">{{ fichaAtual.numero }}</p>
            </div>

            <div class="px-5 py-3.5 space-y-2" style="border-bottom: 1px dashed rgba(255,255,255,0.08);">
              <div v-for="item in fichaAtual.itens" :key="item.produto_id" class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-[11px] font-black text-orange-400 shrink-0">{{ item.quantidade }}×</span>
                  <span class="text-[12px] text-white/70 truncate">{{ item.nome_produto }}</span>
                </div>
                <span class="text-[12px] font-black text-white shrink-0 tabular-nums">R$ {{ fmt(item.preco_unit * item.quantidade) }}</span>
              </div>
            </div>

            <div class="px-5 py-3 space-y-1.5">
              <div class="flex justify-between">
                <span class="text-[12px] text-white/30 font-medium">Total</span>
                <span class="text-[14px] font-black text-white tabular-nums">R$ {{ fmt(fichaAtual.totalLiquido) }}</span>
              </div>
              <div v-if="fichaAtual.troco > 0" class="flex justify-between">
                <span class="text-[12px] font-bold text-emerald-400">Troco</span>
                <span class="text-[13px] font-black text-emerald-400 tabular-nums">R$ {{ fmt(fichaAtual.troco) }}</span>
              </div>
            </div>

            <div class="px-5 pb-6 pt-1">
              <button
                @click="fichaAtual = null"
                class="w-full h-[48px] rounded-[14px] text-white text-[13px] font-black active:scale-[0.98] transition-all"
                style="background: #f97316; box-shadow: 0 4px 16px rgba(249,115,22,0.3);"
              >
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
  CheckCircle2, Loader2, LockKeyhole, Banknote, CreditCard, QrCode, Wallet, Trash2
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useCaixaStore } from '~/stores/caixa'
import { useToastStore } from '~/stores/toast'
import { useCarrinhoVendaStore } from '~/stores/carrinhoVenda'
import { useProdutosStore } from '~/stores/produtos'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'mobile' })

const api           = useApi()
const caixaStore    = useCaixaStore()
const toastStore    = useToastStore()
const authStore     = useAuthStore()
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

function getMetodoIcon(m: any) {
  const n = (m.nome || '').toLowerCase()
  if (n.includes('dinheiro')) return Banknote
  if (n.includes('pix'))      return QrCode
  if (n.includes('créd') || n.includes('cred')) return CreditCard
  if (n.includes('déb')  || n.includes('deb'))  return CreditCard
  return Wallet
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

const totalItens       = computed(() => carrinho.value.reduce((s, i) => s + i.quantidade, 0))
const subtotal         = computed(() => carrinho.value.reduce((s, i) => s + i.preco_unit * i.quantidade, 0))
const descontoNum      = computed(() => Math.min(Math.max(Number(desconto.value) || 0, 0), subtotal.value))
const total            = computed(() => subtotal.value - descontoNum.value)
const valorRecebidoNum = computed(() => Number(valorRecebido.value) || 0)
const trocoVal         = computed(() => metodoSelecionado.value?.nome === 'Dinheiro' ? Math.max(0, valorRecebidoNum.value - total.value) : 0)
const podePagar        = computed(() => {
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
  if (idx >= 0) carrinho.value[idx].quantidade++
  else carrinho.value.push({ produto_id: p.id, nome_produto: p.nome, preco_unit: Number(p.preco), quantidade: 1 })
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
  // Guard: só perfis com modo_venda 'direta' ou 'ambos' acessam esta página
  const modo = authStore.usuario?.cargo === 'administrador'
    ? 'ambos'
    : (authStore.usuario?.permissoes?.modo_venda as string) || 'ambos'
  if (!authStore.temPermissao('adicionarPedido') || (modo !== 'direta' && modo !== 'ambos')) {
    navigateTo('/m/mesas')
    return
  }

  await Promise.all([caixaStore.carregarStatus(), carregarProdutos(), carregarMetodos()])
  iniciando.value = false
})
</script>

<style scoped>
.sheet-enter-active,
.sheet-leave-active { transition: opacity 0.2s; }
.sheet-enter-active .absolute.bottom-0,
.sheet-leave-active .absolute.bottom-0 {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .absolute.bottom-0,
.sheet-leave-to .absolute.bottom-0 { transform: translateY(100%); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* FAB aparecer/sumir */
.fab-enter-active { transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.18s ease; }
.fab-leave-active { transition: transform 0.18s ease-in, opacity 0.18s ease; }
.fab-enter-from, .fab-leave-to { transform: scale(0); opacity: 0; }

/* Pop do badge quando o contador muda */
@keyframes badge-pop {
  0%   { transform: scale(1); }
  45%  { transform: scale(1.45); }
  100% { transform: scale(1); }
}
.badge-pop { animation: badge-pop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }

.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
