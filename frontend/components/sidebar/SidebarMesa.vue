<template>
  <Transition name="slide">

    <aside
      v-if="modelValue"
      class="fixed right-0 top-0 w-full lg:w-[420px] h-screen bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden z-30"
    >

      <!-- HEADER -->
      <div class="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-orange-400 dark:text-orange-500 mb-0.5">
              {{ mesa?.nome_mesa || `Mesa ${mesa?.id}` }}
            </p>
            <h2 class="text-2xl font-black text-neutral-900 dark:text-white">
              {{ mesa?.cliente || 'Sem cliente' }}
            </h2>
            <p class="text-xs text-neutral-400 mt-1 leading-relaxed">
              <template v-if="modoSelecao">
                {{ selecionados.size }} item(s) selecionado(s)
              </template>
              <template v-else>
                Segure para opções · Deslize ← para remover
              </template>
            </p>
          </div>

          <button
            @click="fechar"
            class="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all flex items-center justify-center shrink-0 mt-0.5"
          >
            <X :size="18" />
          </button>
        </div>
      </div>

      <!-- LISTA -->
      <div
        ref="listaRef"
        class="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2"
        @pointerdown.passive="onListaPointerDown"
      >

        <!-- LOADING -->
        <div v-if="loading" class="space-y-2">
          <div
            v-for="n in 5"
            :key="n"
            class="h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse"
          />
        </div>

        <!-- VAZIO -->
        <div
          v-else-if="produtos.length === 0"
          class="h-full flex items-center justify-center py-20"
        >
          <div class="text-center">
            <h3 class="text-lg font-black text-neutral-600 dark:text-neutral-300">Nenhum produto</h3>
            <p class="text-sm text-neutral-400 mt-1">Esta mesa não possui itens lançados</p>
          </div>
        </div>

        <!-- CARDS -->
        <template v-else>

          <div
            v-for="produto in produtos"
            :key="produto.id"
            class="relative"
            style="height: 64px"
          >

            <!-- REVEAL: aparece por baixo do card no deslize -->
            <div class="absolute inset-y-0 right-0 flex rounded-r-3xl overflow-hidden" style="width: 160px">
              <button
                @pointerdown.stop
                @click.stop="ativarSelecao(produto.id)"
                class="w-20 flex flex-col items-center justify-center gap-1 bg-neutral-700 hover:bg-neutral-800 active:brightness-90 text-white transition-colors"
              >
                <CheckSquare :size="15" />
                <span class="text-[9px] font-black uppercase tracking-wide leading-none">Selecionar</span>
              </button>
              <button
                @pointerdown.stop
                @click.stop="excluirItem(produto.id)"
                class="w-20 flex flex-col items-center justify-center gap-1 bg-red-500 hover:bg-red-600 active:brightness-90 text-white transition-colors"
              >
                <Trash2 :size="15" />
                <span class="text-[9px] font-black uppercase tracking-wide leading-none">Remover</span>
              </button>
            </div>

            <!-- CARD (deslizável) -->
            <div
              class="absolute inset-0 bg-white dark:bg-neutral-900 border rounded-2xl overflow-hidden will-change-transform select-none"
              :class="[
                modoSelecao && selecionados.has(produto.id)
                  ? 'border-orange-400 ring-2 ring-orange-300/40'
                  : 'border-neutral-200 dark:border-neutral-800',
                modoSelecao ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
              ]"
              :style="{
                transform: getTransform(produto.id),
                transition: swipingId === produto.id ? 'none' : 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
                zIndex: 1
              }"
              @pointerdown="(e) => onPointerDown(e, produto.id)"
              @contextmenu.prevent="(e) => onContextMenu(e, produto.id)"
              @click="onCardClick(produto)"
            >
              <div class="flex items-stretch h-full">

                <!-- CHECKBOX (modo seleção) -->
                <div
                  v-if="modoSelecao"
                  class="w-12 flex items-center justify-center border-r border-neutral-100 dark:border-neutral-800 shrink-0"
                >
                  <CheckSquare v-if="selecionados.has(produto.id)" :size="17" class="text-orange-500" />
                  <Square      v-else                               :size="17" class="text-neutral-300" />
                </div>

                <!-- NOME + QTD -->
                <div class="flex-1 min-w-0 px-4 py-3">
                  <h3 class="text-sm font-black text-neutral-900 dark:text-white truncate">{{ produto.nome }}</h3>
                  <span class="text-xs text-neutral-400 font-semibold block mt-0.5">
                    × {{ produto.quantidade }}
                  </span>
                </div>

                <!-- TOTAL -->
                <div class="w-20 flex items-center justify-center border-l border-neutral-100 dark:border-neutral-800 shrink-0">
                  <span class="text-xs font-black text-orange-500">
                    R$ {{ Number(produto.total).toFixed(2) }}
                  </span>
                </div>

              </div>
            </div>

          </div>

          <!-- CARDS DE ABATIMENTO (sem gestos, sem remoção) -->
          <div
            v-for="abat in abatimentos"
            :key="'abat-' + abat.id"
            class="relative"
            style="height: 64px"
          >
            <div class="absolute inset-0 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-2xl overflow-hidden">
              <div class="flex items-stretch h-full">

                <div class="flex-1 min-w-0 px-4 py-3 flex items-center gap-2">
                  <BadgePercent :size="14" class="text-purple-500 shrink-0" />
                  <h3 class="text-sm font-black text-purple-700 dark:text-purple-400">{{ abat.motivo || 'Abatimento' }}</h3>
                </div>

                <div class="w-20 flex items-center justify-center border-l border-purple-100 dark:border-purple-900 shrink-0">
                  <span class="text-xs font-black text-purple-600 dark:text-purple-400">
                    − R$ {{ Number(abat.valor).toFixed(2) }}
                  </span>
                </div>

              </div>
            </div>
          </div>

        </template>
      </div>

      <!-- FOOTER -->
      <div class="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">

        <!-- MODO SELEÇÃO -->
        <Transition name="slide-up">
          <div v-if="modoSelecao" class="p-4 flex items-center gap-3">
            <button
              @click="cancelarSelecao"
              class="flex-1 h-12 rounded-xl border border-neutral-200 dark:border-neutral-700 font-black text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              @click="excluirSelecionados"
              :disabled="selecionados.size === 0"
              class="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Trash2 :size="14" />
              Excluir{{ selecionados.size > 0 ? ` (${selecionados.size})` : '' }}
            </button>
          </div>
        </Transition>

        <!-- MODO NORMAL -->
        <div v-if="!modoSelecao" class="p-5">
          <div v-if="desconto > 0" class="flex items-center justify-between mb-1">
            <span class="text-xs text-green-600 font-bold">Abatimento</span>
            <span class="text-sm text-green-600 font-bold">− R$ {{ desconto.toFixed(2) }}</span>
          </div>

          <!-- TAXA DE SERVIÇO -->
          <div class="flex items-center justify-between mb-1">
            <button
              @click="alternarTaxa"
              :disabled="alternandoTaxa || !pedidoId"
              class="flex items-center gap-1.5 text-xs font-bold transition-colors disabled:opacity-40"
              :class="taxaPct > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-400 hover:text-blue-500'"
            >
              <span
                class="w-8 h-4.5 rounded-full relative transition-all shrink-0"
                :class="taxaPct > 0 ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-700'"
                style="height: 18px"
              >
                <span class="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all"
                  :class="taxaPct > 0 ? 'left-[16px]' : 'left-0.5'" />
              </span>
              Taxa de serviço{{ taxaPct > 0 ? ` (${taxaPct}%)` : '' }}
            </button>
            <span v-if="taxaPct > 0" class="text-sm font-bold text-blue-600 dark:text-blue-400">
              + R$ {{ taxaValor.toFixed(2) }}
            </span>
          </div>

          <div v-if="valorPago > 0" class="flex items-center justify-between mb-1">
            <span class="text-xs text-orange-500 font-bold">Já pago</span>
            <span class="text-sm text-orange-500 font-bold">− R$ {{ valorPago.toFixed(2) }}</span>
          </div>

          <div class="flex items-center justify-between mb-4 mt-1">
            <span class="text-xs font-black uppercase tracking-widest text-neutral-400">
              {{ valorPago > 0 ? 'Restante' : 'Total' }}
            </span>
            <span class="text-3xl font-black text-neutral-900 dark:text-white">R$ {{ restante.toFixed(2) }}</span>
          </div>

          <div class="grid grid-cols-2 gap-2 mb-2">
            <button
              @click="imprimir"
              class="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center gap-1.5 text-neutral-600 dark:text-neutral-300 font-black text-xs uppercase tracking-wide transition-all active:scale-95"
            >
              <PrinterIcon :size="13" />
              Imprimir
            </button>
            <button
              @click="caixaAberto ? (modalDesconto = true) : exigirCaixa()"
              class="h-12 rounded-xl flex items-center justify-center gap-1.5 text-white font-black text-xs uppercase tracking-wide transition-all"
              :class="caixaAberto ? 'bg-amber-500 hover:bg-amber-600 active:scale-95' : 'bg-neutral-300 opacity-50 cursor-not-allowed'"
            >
              <Divide :size="13" />
              Desconto
            </button>
            <button
              @click="caixaAberto ? (modalAbater = true) : exigirCaixa()"
              class="h-12 rounded-xl flex items-center justify-center gap-1.5 text-white font-black text-xs uppercase tracking-wide transition-all"
              :class="caixaAberto ? 'bg-purple-500 hover:bg-purple-600 active:scale-95' : 'bg-neutral-300 opacity-50 cursor-not-allowed'"
            >
              <BadgePercent :size="13" />
              Abater
            </button>
            <button
              @click="caixaAberto ? (modalPagamento = true) : exigirCaixa()"
              class="h-12 rounded-xl flex items-center justify-center gap-1.5 text-white font-black text-xs uppercase tracking-wide transition-all"
              :class="caixaAberto ? 'bg-green-500 hover:bg-green-600 active:scale-95' : 'bg-neutral-300 opacity-50 cursor-not-allowed'"
            >
              <CreditCard :size="13" />
              Pagar
            </button>
          </div>

          <button
            @click="caixaAberto ? $emit('abrir-produtos') : exigirCaixa()"
            class="w-full h-12 rounded-xl text-white font-black text-sm uppercase tracking-wider transition-all"
            :class="caixaAberto ? 'bg-orange-500 hover:bg-orange-600 active:scale-95' : 'bg-neutral-300 opacity-50 cursor-not-allowed'"
          >
            + Adicionar Produtos
          </button>
        </div>

      </div>

      <!-- MODAL ABATER -->
      <Transition name="pop">
        <div
          v-if="modalAbater"
          class="absolute inset-0 bg-black/40 flex items-end z-10"
          @click.self="fecharModalAbater"
        >
          <div class="w-full bg-white dark:bg-neutral-900 rounded-t-3xl p-6 space-y-5">

            <h3 class="text-lg font-black dark:text-white">Abater valor</h3>

            <div class="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-4 flex justify-between items-center">
              <span class="text-sm text-neutral-500 dark:text-neutral-400 font-bold">Total atual</span>
              <span class="text-xl font-black dark:text-white">R$ {{ totalLiquido.toFixed(2) }}</span>
            </div>

            <div>
              <label for="valor-abater" class="text-xs font-black text-neutral-500 uppercase tracking-widest">Valor a abater</label>
              <div class="relative mt-2">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-neutral-400">R$</span>
                <input
                  id="valor-abater"
                  name="valor-abater"
                  ref="inputAbaterRef"
                  v-model="valorAbater"
                  type="number"
                  min="0.01"
                  :max="totalLiquido"
                  step="0.01"
                  placeholder="0,00"
                  class="w-full h-14 pl-10 pr-4 border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white focus:border-purple-400 rounded-2xl text-xl font-black outline-none"
                />
              </div>
            </div>

            <div
              v-if="valorAbaterNum > 0"
              class="bg-green-50 dark:bg-green-950/30 rounded-2xl p-4 flex justify-between items-center"
            >
              <span class="text-sm text-green-700 dark:text-green-400 font-bold">Total após abatimento</span>
              <span class="text-xl font-black text-green-700 dark:text-green-400">
                R$ {{ Math.max(0, totalLiquido - valorAbaterNum).toFixed(2) }}
              </span>
            </div>

            <div class="flex gap-3">
              <button
                @click="fecharModalAbater"
                class="flex-1 h-12 rounded-xl border border-neutral-200 dark:border-neutral-700 font-black text-sm text-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                @click="confirmarAbater"
                :disabled="valorAbaterNum <= 0 || valorAbaterNum > totalLiquido || salvandoAbater"
                class="flex-1 h-12 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-black text-sm transition-all active:scale-95"
              >
                {{ salvandoAbater ? 'Salvando...' : 'Confirmar' }}
              </button>
            </div>

          </div>
        </div>
      </Transition>

      <!-- MODAL DESCONTO -->
      <Transition name="pop">
        <div
          v-if="modalDesconto"
          class="absolute inset-0 bg-black/40 flex items-end z-10"
          @click.self="fecharModalDesconto"
        >
          <div class="w-full bg-white dark:bg-neutral-900 rounded-t-3xl p-6 space-y-5">

            <h3 class="text-lg font-black dark:text-white">Aplicar desconto</h3>

            <!-- toggle % / R$ -->
            <div class="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 gap-1">
              <button
                @click="modoDesconto = 'pct'; valorDesconto = ''"
                class="flex-1 h-9 rounded-lg text-sm font-black transition-all"
                :class="modoDesconto === 'pct' ? 'bg-white dark:bg-neutral-700 shadow text-amber-600' : 'text-neutral-400'"
              >
                Porcentagem %
              </button>
              <button
                @click="modoDesconto = 'val'; valorDesconto = ''"
                class="flex-1 h-9 rounded-lg text-sm font-black transition-all"
                :class="modoDesconto === 'val' ? 'bg-white dark:bg-neutral-700 shadow text-amber-600' : 'text-neutral-400'"
              >
                Valor R$
              </button>
            </div>

            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-neutral-400">
                {{ modoDesconto === 'pct' ? '%' : 'R$' }}
              </span>
              <input
                id="valor-desconto"
                name="valor-desconto"
                ref="inputDescontoRef"
                v-model="valorDesconto"
                aria-label="Valor do desconto"
                type="number"
                min="0.01"
                :max="modoDesconto === 'pct' ? 100 : totalLiquido"
                step="0.01"
                placeholder="0"
                class="w-full h-14 pl-10 pr-4 border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white focus:border-amber-400 rounded-2xl text-xl font-black outline-none"
              />
            </div>

            <div v-if="valorDescontoCalc > 0" class="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 flex justify-between items-center">
              <span class="text-sm text-amber-700 dark:text-amber-400 font-bold">Total após desconto</span>
              <span class="text-xl font-black text-amber-700 dark:text-amber-400">
                R$ {{ Math.max(0, totalLiquido - valorDescontoCalc).toFixed(2) }}
              </span>
            </div>

            <div class="flex gap-3">
              <button @click="fecharModalDesconto" class="flex-1 h-12 rounded-xl border border-neutral-200 dark:border-neutral-700 font-black text-sm text-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-800">
                Cancelar
              </button>
              <button
                @click="confirmarDesconto"
                :disabled="valorDescontoCalc <= 0 || salvandoDesconto"
                class="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-black text-sm transition-all active:scale-95"
              >
                {{ salvandoDesconto ? 'Salvando...' : 'Aplicar' }}
              </button>
            </div>

          </div>
        </div>
      </Transition>

    </aside>
  </Transition>

  <!-- MODAL PAGAMENTO -->
  <ModalPagamento
    :aberto="modalPagamento"
    :mesa="mesa"
    :pedido-id="pedidoId"
    :total="restante"
    @fechar="modalPagamento = false"
    @pago="onPago"
    @parcial="onParcial"
  />

  <!-- RADIAL (acionado por long press) -->
  <MenuFlutuanteProduto
    :aberto="menuAberto !== null"
    :quantidade="produtoSelecionado?.quantidade || 0"
    :posicao-manual="radialPos"
    @adicionar="handleAdicionar"
    @remover="handleRemover"
    @reimprimir="handleReimprimir"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useCaixaStore } from '~/stores/caixa'
import { useConfigStore } from '~/stores/configuracoes'
import {
  X,
  PrinterIcon,
  Divide,
  CreditCard,
  Trash2,
  CheckSquare,
  Square,
  BadgePercent,
} from 'lucide-vue-next'
import MenuFlutuanteProduto from '../modals/MenuFlutuanteProduto.vue'
import ModalPagamento from '../modals/ModalPagamento.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

const props = defineProps({
  modelValue: Boolean,
  mesa: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'abrir-produtos', 'estoque-atualizado', 'mesa-fechada'])

const api         = useApi()
const toastStore  = useToastStore()
const caixaStore  = useCaixaStore()
const configStore = useConfigStore()
const caixaAberto = computed(() => caixaStore.aberto)

function exigirCaixa() {
  toastStore.warning('Abra o caixa para realizar esta ação')
}

interface ProdutoMesa {
  id: number
  produto_id: number
  pedido_id: number
  nome: string
  quantidade: number
  total: number
  preco_unitario: number
}

// ─── Produtos ─────────────────────────────────────────────
const loading  = ref(false)
const produtos = ref<ProdutoMesa[]>([])
const listaRef = ref<HTMLElement | null>(null)

const pedidoId = computed(() => produtos.value[0]?.pedido_id ?? null)

const totalGeral = computed(() =>
  produtos.value.reduce((acc, p) => acc + Number(p.total || 0), 0)
)

// ─── Abatimento ───────────────────────────────────────────
interface Abatimento { id: number; valor: number; motivo?: string | null }

const abatimentos    = ref<Abatimento[]>([])
const modalAbater    = ref(false)
const valorAbater    = ref<string>('')
const salvandoAbater = ref(false)
const inputAbaterRef = ref<HTMLInputElement | null>(null)

const desconto       = computed(() => abatimentos.value.reduce((s, a) => s + Number(a.valor), 0))
const valorAbaterNum = computed(() => parseFloat(valorAbater.value) || 0)
const totalLiquido   = computed(() => Math.max(0, totalGeral.value - desconto.value))

// ─── Taxa de serviço + pagamentos parciais ────────────────
const taxaPct       = ref(0)
const valorPago     = ref(0)
const alternandoTaxa = ref(false)

const taxaValor  = computed(() => Math.round(totalLiquido.value * taxaPct.value) / 100)
const totalConta = computed(() => totalLiquido.value + taxaValor.value)
const restante   = computed(() => Math.max(0, Math.round((totalConta.value - valorPago.value) * 100) / 100))

async function alternarTaxa() {
  if (!pedidoId.value || alternandoTaxa.value) return
  alternandoTaxa.value = true
  try {
    const res = await api.patch<{ taxa_pct: number }>(`/pedidos/${pedidoId.value}/taxa-servico`, {
      aplicar: taxaPct.value === 0
    })
    taxaPct.value = Number(res.taxa_pct)
    toastStore.success(taxaPct.value > 0
      ? `Taxa de serviço de ${taxaPct.value}% aplicada`
      : 'Taxa de serviço removida')
  } catch (err: any) {
    toastStore.error(err?.message || 'Erro ao alterar taxa de serviço')
  } finally {
    alternandoTaxa.value = false
  }
}

function fecharModalAbater() {
  modalAbater.value = false
  valorAbater.value = ''
}

async function confirmarAbater() {
  if (!pedidoId.value || valorAbaterNum.value <= 0 || salvandoAbater.value) return
  salvandoAbater.value = true
  try {
    const res = await api.patch<{ abatimento: Abatimento }>(`/pedidos/${pedidoId.value}/abater`, { valor: valorAbaterNum.value })
    abatimentos.value.push(res.abatimento)
    toastStore.success(`R$ ${Number(res.abatimento.valor).toFixed(2)} abatido do pedido`)
    fecharModalAbater()
  } catch (err: any) {
    toastStore.error(err?.message || 'Erro ao abater valor')
  } finally {
    salvandoAbater.value = false
  }
}

watch(modalAbater, (aberto) => {
  if (aberto) nextTick(() => inputAbaterRef.value?.focus())
})

// ─── Desconto ─────────────────────────────────────────────
const modalDesconto      = ref(false)
const valorDesconto      = ref('')
const modoDesconto       = ref<'pct' | 'val'>('pct')
const salvandoDesconto   = ref(false)
const inputDescontoRef   = ref<HTMLInputElement | null>(null)

const valorDescontoNum = computed(() => parseFloat(valorDesconto.value) || 0)
const valorDescontoCalc = computed(() => {
  if (modoDesconto.value === 'pct') {
    return Math.min((valorDescontoNum.value / 100) * totalLiquido.value, totalLiquido.value)
  }
  return Math.min(valorDescontoNum.value, totalLiquido.value)
})

function fecharModalDesconto() {
  modalDesconto.value = false
  valorDesconto.value = ''
}

async function confirmarDesconto() {
  if (!pedidoId.value || valorDescontoCalc.value <= 0 || salvandoDesconto.value) return
  salvandoDesconto.value = true
  const motivo = modoDesconto.value === 'pct'
    ? `Desconto ${valorDescontoNum.value}%`
    : 'Desconto'
  try {
    const res = await api.patch<{ abatimento: Abatimento & { motivo: string } }>(`/pedidos/${pedidoId.value}/abater`, {
      valor: valorDescontoCalc.value,
      motivo
    })
    abatimentos.value.push(res.abatimento)
    toastStore.success(`${motivo} de R$ ${Number(res.abatimento.valor).toFixed(2)} aplicado`)
    fecharModalDesconto()
  } catch (err: any) {
    toastStore.error(err?.message || 'Erro ao aplicar desconto')
  } finally {
    salvandoDesconto.value = false
  }
}

watch(modalDesconto, (v) => { if (v) nextTick(() => inputDescontoRef.value?.focus()) })

// ─── Pagamento ────────────────────────────────────────────
const modalPagamento = ref(false)

function onPago() {
  modalPagamento.value = false
  emit('mesa-fechada')
  fechar()
}

// Pagamento parcial (divisão de conta): recarrega totais e mantém a mesa aberta
function onParcial() {
  carregarProdutos()
}

// ─── Impressão ────────────────────────────────────────────
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

async function imprimir() {
  const mesa   = props.mesa
  const itens  = produtos.value
  const abats  = abatimentos.value
  const total  = totalGeral.value
  const liquido = totalLiquido.value
  const data   = new Date().toLocaleString('pt-BR')

  // Impressão direta na térmica via backend — sem diálogo do navegador
  if (configStore.impressaoDireta) {
    try {
      await api.post('/impressao/conta', {
        mesa: `Mesa ${mesa?.nome_mesa || mesa?.numero || mesa?.id}`,
        itens: itens.map(p => ({ nome: p.nome, quantidade: p.quantidade, total: p.total })),
        subtotal: total,
        abatimentos: abats.map(a => ({ motivo: a.motivo, valor: a.valor })),
        taxa_pct: taxaPct.value,
        taxa_valor: taxaValor.value,
        pago: valorPago.value,
        restante: restante.value
      })
    } catch (err: any) {
      toastStore.error('Falha na impressão', err?.message)
    }
    return
  }

  const linhasItens = itens.map(p =>
    `<tr>
      <td>${p.nome}</td>
      <td style="text-align:center">${p.quantidade}</td>
      <td style="text-align:right">R$ ${Number(p.preco_unitario).toFixed(2)}</td>
      <td style="text-align:right">R$ ${Number(p.total).toFixed(2)}</td>
    </tr>`
  ).join('')

  const linhasAbat = abats.map(a =>
    `<tr style="color:#7c3aed">
      <td colspan="3">${a.motivo || 'Abatimento'}</td>
      <td style="text-align:right">− R$ ${Number(a.valor).toFixed(2)}</td>
    </tr>`
  ).join('')

  const linhaTaxa = taxaPct.value > 0
    ? `<tr>
        <td colspan="3">Taxa de serviço (${taxaPct.value}%)</td>
        <td style="text-align:right">+ R$ ${taxaValor.value.toFixed(2)}</td>
      </tr>`
    : ''
  const linhaPago = valorPago.value > 0
    ? `<tr>
        <td colspan="3">Já pago</td>
        <td style="text-align:right">− R$ ${valorPago.value.toFixed(2)}</td>
      </tr>`
    : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Ficha - Mesa ${mesa?.nome_mesa || mesa?.id}</title>
  <style>
    body { font-family: monospace; font-size: 13px; padding: 16px; max-width: 320px; margin: 0 auto }
    h1 { font-size: 16px; text-align: center; margin: 0 0 4px }
    .sub { text-align: center; color: #666; margin-bottom: 12px; font-size: 12px }
    table { width: 100%; border-collapse: collapse }
    th { border-bottom: 1px solid #000; padding: 4px 0; font-size: 11px }
    td { padding: 3px 0 }
    .sep { border-top: 1px dashed #000; margin: 8px 0 }
    .total { font-weight: bold; font-size: 15px }
    .liquido { font-weight: bold; font-size: 17px }
  </style></head><body>
  <h1>Ficha da Mesa</h1>
  <div class="sub">Mesa #${mesa?.nome_mesa || mesa?.numero || mesa?.id} &nbsp;|&nbsp; ${data}</div>
  <table>
    <thead><tr>
      <th style="text-align:left">Item</th>
      <th>Qtd</th>
      <th style="text-align:right">Unit.</th>
      <th style="text-align:right">Total</th>
    </tr></thead>
    <tbody>${linhasItens}</tbody>
  </table>
  <div class="sep"></div>
  <table>
    <tbody>
      <tr class="total">
        <td colspan="3">Subtotal</td>
        <td style="text-align:right">R$ ${total.toFixed(2)}</td>
      </tr>
      ${linhasAbat}
      ${linhaTaxa}
      ${linhaPago}
      ${(abats.length || taxaPct.value > 0 || valorPago.value > 0)
        ? `<tr class="liquido"><td colspan="3">Total a pagar</td><td style="text-align:right">R$ ${restante.value.toFixed(2)}</td></tr>`
        : ''}
    </tbody>
  </table>
  </body></html>`

  imprimirHtml(html)
}

// ─── Swipe ────────────────────────────────────────────────
const REVEAL_WIDTH    = 160
const SWIPE_THRESHOLD = 68

const swipingId   = ref<number | null>(null)
const swipeOffset = ref(0)
const revealedId  = ref<number | null>(null)

let isSwiping    = false
let pointerStartX = 0
let pointerStartY = 0

function getTransform(id: number): string {
  if (swipingId.value === id) return `translateX(${swipeOffset.value}px)`
  if (revealedId.value === id) return `translateX(-${REVEAL_WIDTH}px)`
  return 'translateX(0)'
}

// ─── Long press / Radial ──────────────────────────────────
const LONG_PRESS_MS = 460

let longPressTimer: ReturnType<typeof setTimeout> | null = null

const menuAberto = ref<number | null>(null)
const radialPos  = ref<{ x: number; y: number } | null>(null)

const produtoSelecionado = computed(() =>
  menuAberto.value !== null
    ? (produtos.value.find(p => p.id === menuAberto.value) ?? null)
    : null
)

function fecharRadial() {
  menuAberto.value = null
  radialPos.value  = null
}

// ─── Multi-select ─────────────────────────────────────────
const modoSelecao = ref(false)
const selecionados = ref(new Set<number>())

function ativarSelecao(id: number) {
  revealedId.value  = null
  modoSelecao.value = true
  selecionados.value = new Set(selecionados.value).add(id)
}

function cancelarSelecao() {
  modoSelecao.value  = false
  selecionados.value = new Set()
}

async function excluirSelecionados() {
  const ids   = [...selecionados.value]
  const total = ids.length
  cancelarSelecao()

  const resultados = await Promise.allSettled(
    ids.map(id => excluirItem(id, true))
  )

  const falhas  = resultados.filter(r => r.status === 'rejected').length
  const removidos = total - falhas

  if (falhas === 0) {
    toastStore.success(`${total} ${total === 1 ? 'item removido' : 'itens removidos'}`)
  } else if (removidos > 0) {
    toastStore.warning(`${removidos} de ${total} itens removidos`)
  } else {
    toastStore.error('Erro ao remover os itens selecionados')
  }
}

function onCardClick(produto: ProdutoMesa) {
  if (!modoSelecao.value) return
  const next = new Set(selecionados.value)
  if (next.has(produto.id)) {
    next.delete(produto.id)
    if (next.size === 0) modoSelecao.value = false
  } else {
    next.add(produto.id)
  }
  selecionados.value = next
}

// ─── Pointer handlers (touch + mouse + stylus) ────────────
function onListaPointerDown() {
  // Toque/clique na área vazia da lista fecha radial e reveal
  if (menuAberto.value !== null) fecharRadial()
  if (revealedId.value !== null) revealedId.value = null
}

function onPointerDown(e: PointerEvent, id: number) {
  // Só botão esquerdo do mouse (touch sempre reporta button=0)
  if (e.button !== 0) return
  // Impede que o evento suba para onListaPointerDown
  e.stopPropagation()

  if (modoSelecao.value) return

  if (menuAberto.value !== null) {
    fecharRadial()
    return
  }

  // Fecha reveal de outro card
  if (revealedId.value !== null && revealedId.value !== id) {
    revealedId.value = null
    return
  }

  // Clique no card revelado fecha o reveal
  if (revealedId.value === id) {
    revealedId.value = null
    return
  }

  pointerStartX = e.clientX
  pointerStartY = e.clientY
  isSwiping     = false
  swipingId.value   = id
  swipeOffset.value = 0

  // passive:false permite chamar preventDefault no move (impede scroll horizontal)
  window.addEventListener('pointermove',   onGlobalMove,   { passive: false })
  window.addEventListener('pointerup',     onGlobalEnd)
  window.addEventListener('pointercancel', onGlobalEnd)

  longPressTimer = setTimeout(() => {
    if (!isSwiping) {
      menuAberto.value = id
      radialPos.value  = { x: pointerStartX, y: pointerStartY }
      navigator.vibrate?.(40)
      cancelSwipe()
    }
  }, LONG_PRESS_MS)
}

// Clique direito abre o radial imediatamente (atalho para mouse)
function onContextMenu(e: MouseEvent, id: number) {
  e.stopPropagation()
  if (modoSelecao.value) return
  menuAberto.value = id
  radialPos.value  = { x: e.clientX, y: e.clientY }
}

function onGlobalMove(e: PointerEvent) {
  const dx = e.clientX - pointerStartX
  const dy = e.clientY - pointerStartY

  // Movimento vertical cancela tudo (permite scroll normal)
  if (Math.abs(dy) > 10 && !isSwiping) {
    cancelLongPress()
    cancelSwipe()
    detach()
    return
  }

  // Movimento horizontal ativa swipe e cancela long press
  if (Math.abs(dx) > 8) {
    cancelLongPress()
    isSwiping = true
  }

  if (isSwiping) {
    // Impede scroll horizontal do browser durante o swipe
    e.preventDefault()
    if (dx < 0 && swipingId.value !== null) {
      swipeOffset.value = Math.max(dx, -REVEAL_WIDTH)
    }
  }
}

function onGlobalEnd() {
  detach()
  cancelLongPress()

  if (isSwiping && swipingId.value !== null) {
    revealedId.value = swipeOffset.value < -SWIPE_THRESHOLD
      ? swipingId.value
      : null
  }

  cancelSwipe()
  isSwiping = false
}

function cancelLongPress() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function cancelSwipe() {
  swipingId.value   = null
  swipeOffset.value = 0
}

function detach() {
  window.removeEventListener('pointermove',   onGlobalMove)
  window.removeEventListener('pointerup',     onGlobalEnd)
  window.removeEventListener('pointercancel', onGlobalEnd)
}

// ─── Ações com persistência no banco ─────────────────────
async function adicionarItem(produto: ProdutoMesa) {
  if (!caixaAberto.value) { exigirCaixa(); return }
  const preco = produto.preco_unitario
  // Optimistic
  produto.quantidade++
  produto.total = Number(produto.total) + preco

  try {
    await api.post('/pedidos/adicionar', {
      mesa_id:    props.mesa.id,
      produto_id: produto.produto_id,
      quantidade: 1
    })
  } catch {
    // Rollback
    produto.quantidade--
    produto.total = Number(produto.total) - preco
    toastStore.error('Erro ao adicionar item')
  }
}

async function removerItem(produto: ProdutoMesa) {
  if (!caixaAberto.value) { exigirCaixa(); return }
  const preco = produto.preco_unitario

  if (produto.quantidade <= 1) {
    await excluirItem(produto.id)
    return
  }

  // Optimistic
  produto.quantidade--
  produto.total = Number(produto.total) - preco

  try {
    await api.patch(`/pedidos/itens/${produto.id}/decrementar`)
    emit('estoque-atualizado')
  } catch {
    produto.quantidade++
    produto.total = Number(produto.total) + preco
    toastStore.error('Erro ao remover item')
  }
}

async function excluirItem(id: number, silencioso = false) {
  if (!caixaAberto.value) { if (!silencioso) exigirCaixa(); return }
  const idx  = produtos.value.findIndex(p => p.id === id)
  const item = produtos.value[idx]

  // Optimistic
  produtos.value = produtos.value.filter(p => p.id !== id)
  if (revealedId.value === id) revealedId.value = null

  try {
    await api.delete(`/pedidos/itens/${id}`)
    emit('estoque-atualizado')
    if (!silencioso) toastStore.success('Item excluído com sucesso!')
  } catch (err) {
    // Rollback: reinsere na posição original
    if (item !== undefined) {
      const lista = [...produtos.value]
      lista.splice(idx, 0, item)
      produtos.value = lista
    }
    if (!silencioso) toastStore.error('Erro ao excluir item')
    throw err
  }
}

// ─── Handlers do radial ──────────────────────────────────
function handleAdicionar() {
  if (produtoSelecionado.value) adicionarItem(produtoSelecionado.value)
  fecharRadial()
}

function handleRemover() {
  if (produtoSelecionado.value) removerItem(produtoSelecionado.value)
  fecharRadial()
}

async function handleReimprimir() {
  const produto = produtoSelecionado.value
  fecharRadial()
  if (!produto) return

  await configStore.carregar()

  const mesa    = props.mesa
  const dataStr = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const ref     = `P${String(produto.pedido_id).padStart(6, '0')}`

  // Impressão direta na térmica via backend — sem diálogo do navegador
  if (configStore.impressaoDireta) {
    try {
      await api.post('/impressao/ficha', {
        itens:  [{ nome: produto.nome, quantidade: produto.quantidade }],
        info:   `${dataStr} · ${mesa?.nome_mesa || `Mesa ${mesa?.id}`}`,
        codigo: ref
      })
    } catch (err: any) {
      toastStore.error('Falha na impressão', err?.message)
    }
    return
  }

  const nomeRest = configStore.nome_restaurante || 'Restaurante PDV'
  const logo     = configStore.logo_base64
  const mensagem = configStore.mensagem_ficha || 'Obrigado pela preferência!'
  const mm     = configStore.impressora_largura === 58 ? 58 : 80
  const copias = Math.max(1, configStore.impressora_copias || 1)

  const logoHtml = logo
    ? `<img src="${logo}" style="height:10mm;object-fit:contain;margin-bottom:2mm;" />`
    : ''

  const fichas: string[] = []
  for (let u = 0; u < produto.quantidade; u++) {
    for (let c = 0; c < copias; c++) {
      fichas.push(`
        <div class="ticket">
          ${logoHtml}
          <div class="restaurante">${nomeRest}</div>
          <div class="info">${dataStr} · ${mesa?.nome_mesa || `Mesa ${mesa?.id}`}</div>
          <div class="sep"></div>
          <div class="produto">${produto.nome}</div>
          <div class="sep"></div>
          <div class="codigo">${ref}</div>
          <div class="mensagem">${mensagem}</div>
        </div>
      `)
    }
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reimpressão</title>
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

// ─── API ─────────────────────────────────────────────────
const carregarProdutos = async () => {
  if (!props.mesa?.id) return
  try {
    loading.value  = true
    produtos.value = []
    const [itens, pedido] = await Promise.all([
      api.get<ProdutoMesa[]>(`/mesas/${props.mesa.id}/produtos`),
      api.get<{ abatimentos: Abatimento[]; taxa_pct: number; pago: number } | null>(`/pedidos/mesa/${props.mesa.id}`)
    ])
    produtos.value    = Array.isArray(itens) ? itens : []
    abatimentos.value = pedido?.abatimentos ?? []
    taxaPct.value     = Number(pedido?.taxa_pct ?? 0)
    valorPago.value   = Number(pedido?.pago ?? 0)
  } catch (error) {
    console.error(error)
    produtos.value = []
  } finally {
    loading.value = false
  }
}

const fechar = () => emit('update:modelValue', false)

watch(
  [() => props.modelValue, () => props.mesa?.id],
  ([aberto, mesaId]) => {
    if (aberto && mesaId) {
      fecharRadial()
      cancelarSelecao()
      revealedId.value = null
      carregarProdutos()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  cancelLongPress()
  detach()
})

defineExpose({ recarregar: carregarProdutos })
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.16,1,0.3,1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
