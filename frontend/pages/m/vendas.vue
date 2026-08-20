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
        style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);"
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
      <div class="relative px-5 pt-5 pb-4 shrink-0 overflow-hidden">
        <div
          class="absolute inset-0 pointer-events-none"
          style="background: radial-gradient(ellipse 70% 90% at 100% 0%, rgba(249,115,22,0.08) 0%, transparent 65%);"
        ></div>
        <div class="relative flex items-center justify-between gap-3">
          <div class="min-w-0">
            <h1 class="text-[26px] font-black text-white tracking-tight leading-none">Venda Direta</h1>
            <p class="text-[12px] font-medium mt-1.5 truncate" :class="carrinho.length ? 'text-orange-400/80' : 'text-white/25'">
              <template v-if="carrinho.length">{{ totalItens }} item{{ totalItens !== 1 ? 's' : '' }} · R$ {{ fmt(total) }}</template>
              <template v-else>Selecione os produtos abaixo</template>
            </p>
          </div>
          <!-- Limpar carrinho atalho no header -->
          <button
            v-if="carrinho.length"
            @click="limparCarrinho"
            class="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[11px] font-black transition-all active:scale-95"
            style="background: rgba(239,68,68,0.07); color: rgba(248,113,113,0.55); border: 1px solid rgba(239,68,68,0.1);"
          >
            <Trash2 :size="11" />
            Limpar
          </button>
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
          class="h-[28px] px-3.5 rounded-[10px] text-[11px] font-black whitespace-nowrap shrink-0 transition-all active:scale-95"
          :class="categoriaAtiva === cat ? 'text-white' : 'text-white/30'"
          :style="categoriaAtiva === cat
            ? 'background: #f97316; box-shadow: 0 2px 10px rgba(249,115,22,0.3);'
            : 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);'"
        >{{ cat }}</button>
      </div>

      <div class="h-px mx-5 shrink-0 bg-white/[0.05]"></div>

      <!-- GRID DE PRODUTOS -->
      <div class="px-4 pt-3 pb-36">
        <div v-if="!produtosFiltrados.length" class="flex flex-col items-center justify-center h-48 gap-3">
          <Package :size="26" class="text-white/[0.07]" />
          <p class="text-[13px] font-semibold text-white/20">Nenhum produto encontrado</p>
        </div>
        <div v-else class="grid grid-cols-2 gap-2.5">
          <button
            v-for="p in produtosFiltrados"
            :key="p.id"
            @click="adicionarAoCarrinho(p)"
            class="relative rounded-[20px] p-4 flex flex-col items-center text-center transition-all active:scale-[0.95] overflow-visible"
            :style="p.gerenciar_estoque && p.estoque_atual <= 0
              ? 'background:#161619; border:1px solid rgba(255,255,255,0.05); opacity:0.4; cursor:not-allowed;'
              : qtdNoCarrinho(p.id)
                ? 'background:rgba(249,115,22,0.05); border:1px solid rgba(249,115,22,0.22);'
                : 'background:#161619; border:1px solid rgba(255,255,255,0.06);'"
            :disabled="p.gerenciar_estoque && p.estoque_atual <= 0"
          >
            <!-- Badge de quantidade no carrinho -->
            <div
              v-if="qtdNoCarrinho(p.id)"
              :key="qtdNoCarrinho(p.id)"
              class="absolute -top-2 -right-2 min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-black z-10 badge-pop"
              style="background: #f97316; color: white; box-shadow: 0 2px 8px rgba(249,115,22,0.5); border: 2px solid #0d0d10;"
            >
              {{ qtdNoCarrinho(p.id) }}
            </div>

            <!-- Badge esgotado -->
            <span
              v-if="p.gerenciar_estoque && p.estoque_atual <= 0"
              class="text-[9px] font-black px-2 py-0.5 rounded-[6px] mb-2"
              style="background: rgba(239,68,68,0.12); color: rgb(248,113,113);"
            >Esgotado</span>

            <!-- Ícone -->
            <div
              class="w-10 h-10 rounded-[14px] flex items-center justify-center mb-3 shrink-0 transition-all"
              :style="qtdNoCarrinho(p.id)
                ? 'background: rgba(249,115,22,0.15); border: 1px solid rgba(249,115,22,0.2);'
                : 'background: rgba(249,115,22,0.08);'"
            >
              <UtensilsCrossed :size="15" :class="qtdNoCarrinho(p.id) ? 'text-orange-400' : 'text-orange-400/50'" />
            </div>

            <p class="text-[12px] font-black text-white leading-snug line-clamp-2">{{ p.nome }}</p>
            <p v-if="p.categoria" class="text-[10px] font-medium text-white/20 mt-0.5 truncate w-full">{{ p.categoria }}</p>
            <p
              class="text-[15px] font-black mt-2 transition-colors"
              :class="qtdNoCarrinho(p.id) ? 'text-orange-400' : 'text-orange-400/75'"
            >R$ {{ fmt(p.preco) }}</p>
          </button>
        </div>
      </div>

      <!-- FAB CARRINHO -->
      <Transition name="fab">
        <button
          v-if="carrinho.length"
          @click="carrinhoAberto = true"
          class="fixed bottom-[88px] right-4 z-20 w-[54px] h-[54px] rounded-[16px] flex items-center justify-center active:scale-[0.95] transition-transform duration-150"
          style="background: linear-gradient(135deg, #fb923c, #ea580c); box-shadow: 0 8px 28px rgba(249,115,22,0.5);"
        >
          <div class="relative">
            <ShoppingCart :size="22" class="text-white" />
            <div
              :key="totalItens"
              class="absolute -top-3 -right-3 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black badge-pop"
              style="background: white; color: #ea580c;"
            >
              {{ totalItens > 9 ? '9+' : totalItens }}
            </div>
          </div>
        </button>
      </Transition>

    </template>

    <!-- BOTTOM SHEET: CARRINHO -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="carrinhoAberto" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/70 backdrop-blur-[2px]" @click="carrinhoAberto = false"></div>
          <div
            class="absolute bottom-0 left-0 right-0 rounded-t-[28px] max-h-[92vh] flex flex-col"
            style="background: #141417; border-top: 1px solid rgba(255,255,255,0.08);"
          >
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-2 shrink-0">
              <div class="w-9 h-[3px] rounded-full bg-white/[0.1]"></div>
            </div>

            <!-- Header -->
            <div class="px-5 pb-3 flex items-center justify-between shrink-0">
              <div>
                <h3 class="text-[20px] font-black text-white">Carrinho</h3>
                <p class="text-[12px] font-medium text-white/30 mt-0.5" v-if="carrinho.length">
                  {{ totalItens }} item{{ totalItens !== 1 ? 's' : '' }}
                </p>
              </div>
              <button
                @click="carrinhoAberto = false"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                style="background: rgba(255,255,255,0.07);"
              >
                <X :size="16" class="text-white/50" />
              </button>
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
                <p class="text-[13px] font-semibold text-white/25">Carrinho vazio</p>
              </div>
              <div v-else>
                <div
                  v-for="(item, idx) in carrinho"
                  :key="item.produto_id"
                  class="flex items-center justify-between px-5 py-3.5"
                  :style="idx < carrinho.length - 1 ? 'border-bottom: 1px solid rgba(255,255,255,0.04);' : ''"
                >
                  <!-- Esquerda: accent + nome (agrupados como 1 coluna) -->
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      class="w-0.5 self-stretch rounded-full shrink-0 min-h-[36px]"
                      style="background: linear-gradient(to bottom, rgba(249,115,22,0.55), rgba(249,115,22,0.03));"
                    ></div>
                    <p class="min-w-0 text-[13px] font-black text-white truncate">{{ item.nome_produto }}</p>
                  </div>

                  <!-- Centro: stepper -->
                  <div class="flex items-center gap-1.5 shrink-0 mx-3">
                    <button
                      @click="decrementar(idx)"
                      class="w-8 h-8 rounded-[10px] flex items-center justify-center active:scale-90 transition-transform"
                      style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.09);"
                    >
                      <Minus :size="12" class="text-white/50" />
                    </button>
                    <span class="w-5 text-center text-[15px] font-black text-white tabular-nums shrink-0">{{ item.quantidade }}</span>
                    <button
                      @click="incrementar(idx)"
                      class="w-8 h-8 rounded-[10px] flex items-center justify-center active:scale-90 transition-transform"
                      style="background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.18);"
                    >
                      <Plus :size="12" class="text-orange-400" />
                    </button>
                  </div>

                  <!-- Direita: valor + remover -->
                  <div class="flex flex-col items-end shrink-0 gap-1">
                    <span class="text-[14px] font-black text-white tabular-nums whitespace-nowrap">
                      R$ {{ fmt(item.preco_unit * item.quantidade) }}
                    </span>
                    <button
                      @click="removerTudo(idx)"
                      class="flex items-center gap-1 text-[10px] font-bold transition-colors active:scale-90"
                      style="color: rgba(248,113,113,0.35);"
                    >
                      <Trash2 :size="10" />
                      remover
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- FOOTER -->
            <div
              class="px-5 pt-4 space-y-3 shrink-0"
              style="border-top: 1px solid rgba(255,255,255,0.05); padding-bottom: max(20px, env(safe-area-inset-bottom));"
            >

              <!-- Totais -->
              <div
                class="rounded-[14px] px-4 py-3 space-y-2"
                style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);"
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
                  <span class="text-[14px] font-black text-white">Total</span>
                  <span class="text-[22px] font-black text-white tabular-nums leading-none">R$ {{ fmt(total) }}</span>
                </div>
              </div>

              <!-- Desconto (só caixa/admin) -->
              <div
                v-if="authStore.temPermissao('fecharMesa')"
                class="flex items-center gap-2.5 rounded-[12px] px-3.5 h-11"
                style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);"
              >
                <span class="text-[10px] font-black uppercase tracking-[0.14em] text-white/20 shrink-0">Desconto R$</span>
                <input
                  v-model="desconto"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  class="flex-1 bg-transparent text-[13px] font-bold text-white placeholder:text-white/15 outline-none text-right tabular-nums"
                />
              </div>

              <!-- Métodos de Pagamento -->
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/20 mb-2">Forma de Pagamento</p>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="m in metodos"
                    :key="m.id"
                    @click="metodoSelecionado = m; valorRecebido = ''"
                    class="h-[50px] rounded-[14px] flex items-center justify-center gap-2 text-[12px] font-black transition-all active:scale-[0.97]"
                    :style="metodoSelecionado?.id === m.id
                      ? 'background: rgba(249,115,22,0.12); border: 1.5px solid rgba(249,115,22,0.4); color: rgb(251,146,60);'
                      : 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); color: rgba(255,255,255,0.30);'"
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
                  <span class="text-[10px] font-black uppercase tracking-[0.14em] text-white/20 shrink-0">Recebido R$</span>
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
                  style="color: rgba(248,113,113,0.7);"
                >
                  Faltam R$ {{ fmt(total - valorRecebidoNum) }}
                </p>
              </div>

              <!-- Confirmar -->
              <button
                @click="confirmarVenda"
                :disabled="!podePagar || processando"
                class="w-full h-[56px] rounded-[18px] text-white text-[15px] font-black transition-all active:scale-[0.98] disabled:opacity-25 flex items-center justify-center gap-2.5"
                :style="podePagar && !processando
                  ? 'background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 6px 24px rgba(34,197,94,0.28);'
                  : 'background: rgba(255,255,255,0.05);'"
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

    <!-- MODAL SUCESSO -->
    <Teleport to="body">
      <Transition name="pop">
        <div v-if="fichaAtual" class="fixed inset-0 z-[60] flex items-center justify-center p-5" style="background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);">
          <div
            class="w-full max-w-xs overflow-hidden rounded-[28px]"
            style="background: #141417; border: 1px solid rgba(255,255,255,0.08);"
          >
            <!-- Topo verde -->
            <div class="h-1 bg-gradient-to-r from-emerald-500 to-green-500"></div>

            <div class="px-6 pt-7 pb-5 text-center" style="border-bottom: 1px dashed rgba(255,255,255,0.07);">
              <div
                class="w-14 h-14 rounded-[20px] flex items-center justify-center mx-auto mb-4"
                style="background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2);"
              >
                <CheckCircle2 :size="26" class="text-emerald-400" />
              </div>
              <p class="font-black text-white text-[16px]">Venda Confirmada!</p>
              <p class="text-[11px] text-white/30 font-medium mt-1">{{ fichaAtual.numero }}</p>
            </div>

            <div class="px-5 py-4 space-y-2" style="border-bottom: 1px dashed rgba(255,255,255,0.07);">
              <div v-for="item in fichaAtual.itens" :key="item.produto_id" class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="text-[10px] font-black px-1.5 py-0.5 rounded-[5px] shrink-0"
                    style="background: rgba(249,115,22,0.12); color: rgb(251,146,60);"
                  >{{ item.quantidade }}×</span>
                  <span class="text-[12px] text-white/70 truncate">{{ item.nome_produto }}</span>
                </div>
                <span class="text-[12px] font-black text-white shrink-0 tabular-nums">R$ {{ fmt(item.preco_unit * item.quantidade) }}</span>
              </div>
            </div>

            <div class="px-5 py-3.5 space-y-1.5">
              <div class="flex justify-between">
                <span class="text-[12px] text-white/30 font-medium">Total pago</span>
                <span class="text-[14px] font-black text-white tabular-nums">R$ {{ fmt(fichaAtual.totalLiquido) }}</span>
              </div>
              <div v-if="fichaAtual.troco > 0" class="flex justify-between">
                <span class="text-[12px] font-bold text-emerald-400">Troco</span>
                <span class="text-[14px] font-black text-emerald-400 tabular-nums">R$ {{ fmt(fichaAtual.troco) }}</span>
              </div>
            </div>

            <div class="px-5 pb-6 pt-1">
              <button
                @click="fichaAtual = null"
                class="w-full h-[50px] rounded-[16px] text-white text-[14px] font-black active:scale-[0.98] transition-all"
                style="background: #f97316; box-shadow: 0 4px 18px rgba(249,115,22,0.32);"
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

function qtdNoCarrinho(produtoId: number): number {
  return carrinho.value.find(i => i.produto_id === produtoId)?.quantidade ?? 0
}

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

function removerTudo(idx: number) {
  const item = carrinho.value[idx]
  const prod = todosProdutos.value.find(p => p.id === item.produto_id)
  if (prod?.gerenciar_estoque) prod.estoque_atual += item.quantidade
  carrinho.value.splice(idx, 1)
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
    metodos.value = rows || []
  } catch {}
}

onMounted(async () => {
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
.sheet-leave-active { transition: opacity 0.22s; }
.sheet-enter-active .absolute.bottom-0,
.sheet-leave-active .absolute.bottom-0 {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .absolute.bottom-0,
.sheet-leave-to .absolute.bottom-0 { transform: translateY(100%); }

.pop-enter-active { transition: opacity 0.18s, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
.pop-leave-active { transition: opacity 0.15s, transform 0.15s ease-in; }
.pop-enter-from   { opacity: 0; transform: scale(0.88); }
.pop-leave-to     { opacity: 0; transform: scale(0.92); }

/* FAB pill aparecer/sumir */
.fab-enter-active { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease; }
.fab-leave-active { transition: transform 0.18s ease-in, opacity 0.18s ease; }
.fab-enter-from, .fab-leave-to { transform: scale(0.4) translateY(10px); opacity: 0; }

@keyframes badge-pop {
  0%   { transform: scale(1); }
  45%  { transform: scale(1.5); }
  100% { transform: scale(1); }
}
.badge-pop { animation: badge-pop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }

.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
