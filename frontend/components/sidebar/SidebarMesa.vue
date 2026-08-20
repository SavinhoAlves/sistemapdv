<template>
  <Transition name="slide">

    <aside
      v-if="modelValue"
      class="fixed right-0 top-0 w-full lg:w-[420px] h-screen bg-white dark:bg-neutral-900/95 backdrop-blur-2xl border-l border-gray-200 dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden z-30"
    >

      <!-- HEADER -->
      <div class="shrink-0">
        <!-- accent top -->
        <div class="h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
        <div class="p-5 border-b border-gray-100 dark:border-white/[0.06]">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">
                {{ mesa?.nome_mesa || `Mesa ${mesa?.numero}` }}
              </p>
              <h2 class="text-xl font-black text-gray-900 dark:text-white truncate">
                {{ mesa?.cliente || 'Sem cliente' }}
              </h2>
              <p v-if="rfidAtivo && garcomRfid" class="text-[11px] font-bold text-orange-400 mt-0.5">
                Garçom: {{ garcomRfid.nome }}
              </p>
              <p class="text-xs text-gray-500 dark:text-white/40 mt-1">Segure para reimprimir · Toque no lixo para remover</p>
            </div>

            <button
              @click="fechar"
              class="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-red-500/10 hover:text-red-400 text-gray-500 dark:text-white/50 transition-all flex items-center justify-center shrink-0"
            >
              <X :size="16" />
            </button>
          </div>
        </div>
      </div>

      <!-- LISTA -->
      <div
        ref="listaRef"
        class="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2"
      >

        <!-- LOADING -->
        <div v-if="loading" class="space-y-2">
          <div
            v-for="n in 5"
            :key="n"
            class="h-16 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse"
          />
        </div>

        <!-- VAZIO -->
        <div
          v-else-if="produtos.length === 0"
          class="h-full flex items-center justify-center py-20"
        >
          <div class="text-center">
            <h3 class="text-lg font-black text-gray-500 dark:text-white/60">Nenhum produto</h3>
            <p class="text-sm text-gray-400 dark:text-white/40 mt-1">Esta mesa não possui itens lançados</p>
          </div>
        </div>

        <!-- CARDS -->
        <template v-else>

          <div
            v-for="produto in produtos"
            :key="produto.id"
            class="relative rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/[0.08] overflow-hidden select-none"
            @contextmenu.prevent="(e) => onContextMenu(e, produto.id)"
            @pointerdown="(e) => onPointerDown(e, produto.id)"
          >
            <!-- shimmer top -->
            <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent"></div>

            <div class="flex items-center px-4 py-3.5 gap-3 min-h-[68px]">

              <!-- NOME + PREÇO UNIT -->
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-black text-gray-900 dark:text-white truncate">{{ produto.nome }}</h3>
                <span class="text-[11px] text-gray-400 dark:text-white/30">R$ {{ Number(produto.preco_unitario).toFixed(2) }} / un</span>
              </div>

              <!-- QUANTIDADE -->
              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  @click.stop="removerItem(produto)"
                  class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-red-500/15 text-gray-400 dark:text-white/30 hover:text-red-400 flex items-center justify-center transition-all active:scale-90"
                >
                  <Minus :size="11" />
                </button>
                <span class="text-sm font-black text-gray-900 dark:text-white tabular-nums w-5 text-center">{{ produto.quantidade }}</span>
                <button
                  @click.stop="adicionarItem(produto)"
                  class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-green-500/15 text-gray-400 dark:text-white/30 hover:text-green-400 flex items-center justify-center transition-all active:scale-90"
                >
                  <Plus :size="11" />
                </button>
              </div>

              <!-- TOTAL -->
              <span class="text-sm font-black text-orange-400 tabular-nums shrink-0">R$ {{ Number(produto.total).toFixed(2) }}</span>

              <!-- EXCLUIR -->
              <button
                @click.stop="excluirItem(produto.id)"
                class="w-7 h-7 rounded-xl bg-gray-50 dark:bg-white/[0.04] hover:bg-red-500/15 text-gray-300 dark:text-white/20 hover:text-red-400 flex items-center justify-center transition-all active:scale-90 shrink-0"
              >
                <Trash2 :size="12" />
              </button>

            </div>
          </div>

          <!-- CARDS DE ABATIMENTO (sem gestos, sem remoção) -->
          <div
            v-for="abat in abatimentos"
            :key="'abat-' + abat.id"
            class="rounded-2xl bg-purple-500/10 border border-purple-500/20 overflow-hidden"
          >
            <div class="flex items-center px-4 py-3.5 gap-3 min-h-[68px]">
              <BadgePercent :size="14" class="text-purple-400 shrink-0" />
              <h3 class="text-sm font-black text-purple-400 flex-1 truncate">{{ abat.motivo || 'Abatimento' }}</h3>
              <span class="text-sm font-black text-purple-400 shrink-0">− R$ {{ Number(abat.valor).toFixed(2) }}</span>
            </div>
          </div>

        </template>
      </div>

      <!-- FOOTER -->
      <div class="border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/80 dark:bg-black/20 shrink-0">

        <!-- FOOTER NORMAL -->
        <div class="p-5">
          <div v-if="desconto > 0" class="flex items-center justify-between mb-1">
            <span class="text-xs text-green-600 font-bold">Abatimento</span>
            <span class="text-sm text-green-600 font-bold">− R$ {{ desconto.toFixed(2) }}</span>
          </div>

          <!-- TAXA DE SERVIÇO (somente admin/caixa) -->
          <div v-if="podeTaxa" class="flex items-center justify-between mb-1">
            <button
              @click="alternarTaxa"
              :disabled="alternandoTaxa || !pedidoId"
              class="flex items-center gap-1.5 text-xs font-bold transition-colors disabled:opacity-40"
              :class="taxaPct > 0 ? 'text-blue-400' : 'text-gray-500 dark:text-white/40 hover:text-blue-400'"
            >
              <span
                class="w-8 h-4.5 rounded-full relative transition-all shrink-0"
                :class="taxaPct > 0 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-white/10'"
                style="height: 18px"
              >
                <span class="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all"
                  :class="taxaPct > 0 ? 'left-[16px]' : 'left-0.5'" />
              </span>
              Taxa de serviço{{ taxaPct > 0 ? ` (${taxaPct}%)` : '' }}
            </button>
            <span v-if="taxaPct > 0" class="text-sm font-bold text-blue-400">
              + R$ {{ taxaValor.toFixed(2) }}
            </span>
          </div>

          <div v-if="valorPago > 0" class="flex items-center justify-between mb-1">
            <span class="text-xs text-orange-500 font-bold">Já pago</span>
            <span class="text-sm text-orange-500 font-bold">− R$ {{ valorPago.toFixed(2) }}</span>
          </div>

          <div class="flex items-center justify-between mb-4 mt-2 p-3 bg-gray-100 dark:bg-white/5 rounded-2xl">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/30">
              {{ valorPago > 0 ? 'Restante' : 'Total' }}
            </span>
            <span class="text-3xl font-black text-gray-900 dark:text-white">R$ {{ restante.toFixed(2) }}</span>
          </div>

          <div class="grid grid-cols-3 gap-2 mb-2">
            <button
              @click="imprimir"
              class="h-12 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.08] flex flex-col items-center justify-center gap-1 text-gray-500 dark:text-white/40 font-black text-[10px] uppercase tracking-wide transition-all active:scale-95"
            >
              <PrinterIcon :size="14" />
              Imprimir
            </button>
            <button
              @click="caixaAberto ? (modalDesconto = true) : exigirCaixa()"
              :disabled="!caixaAberto"
              class="h-12 rounded-xl border flex flex-col items-center justify-center gap-1 font-black text-[10px] uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              :class="caixaAberto
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 active:scale-95'
                : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-white/30'"
            >
              <Divide :size="14" />
              Desconto
            </button>
            <button
              @click="caixaAberto ? (modalAbater = true) : exigirCaixa()"
              :disabled="!caixaAberto"
              class="h-12 rounded-xl border flex flex-col items-center justify-center gap-1 font-black text-[10px] uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              :class="caixaAberto
                ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/15 active:scale-95'
                : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-white/30'"
            >
              <BadgePercent :size="14" />
              Abater
            </button>
          </div>

          <div :class="podeFecharMesa ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 gap-2'">
            <button
              @click="emitirAbrirProdutosComRfid"
              class="h-12 rounded-xl border text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              :class="caixaAberto
                ? 'border-orange-500 text-orange-400 hover:bg-orange-500/10 active:scale-95'
                : 'border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/30 opacity-50 cursor-not-allowed'"
            >
              <Plus :size="15" />
              Produtos
            </button>
            <button
              v-if="podeFecharMesa"
              @click="caixaAberto ? (modalPagamento = true) : exigirCaixa()"
              class="h-12 rounded-xl text-white text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
              :class="caixaAberto
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-md shadow-green-500/20'
                : 'bg-gray-200 dark:bg-white/10 opacity-50 cursor-not-allowed'"
            >
              <CreditCard :size="15" />
              Pagar
            </button>
          </div>
        </div>

      </div>

      <!-- MODAL ABATER -->
      <Transition name="pop">
        <div
          v-if="modalAbater"
          class="absolute inset-0 bg-black/40 flex items-end z-10"
          @click.self="fecharModalAbater"
        >
          <div class="w-full bg-white dark:bg-neutral-900/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-t-3xl p-6 space-y-5">

            <div class="flex items-center justify-between">
              <h3 class="text-lg font-black text-gray-900 dark:text-white">Abater valor</h3>
              <button @click="fecharModalAbater" class="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-red-950/40 hover:text-red-500 text-gray-500 dark:text-white/60 flex items-center justify-center transition-all">
                <X :size="15" />
              </button>
            </div>

            <div class="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 flex justify-between items-center">
              <span class="text-sm text-gray-500 dark:text-white/40 font-bold">Total atual</span>
              <span class="text-xl font-black text-gray-900 dark:text-white">R$ {{ totalLiquido.toFixed(2) }}</span>
            </div>

            <div>
              <label for="valor-abater" class="text-xs font-black text-gray-500 dark:text-white/40 uppercase tracking-widest">Valor a abater</label>
              <div class="relative mt-2">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 dark:text-white/40">R$</span>
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
                  class="w-full h-14 pl-10 pr-4 border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white focus:border-purple-400/70 rounded-2xl text-xl font-black outline-none placeholder:text-gray-400 dark:placeholder:text-white/25"
                />
              </div>
            </div>

            <div
              v-if="valorAbaterNum > 0"
              class="bg-green-500/10 rounded-2xl p-4 flex justify-between items-center"
            >
              <span class="text-sm text-green-400 font-bold">Total após abatimento</span>
              <span class="text-xl font-black text-green-400">
                R$ {{ Math.max(0, totalLiquido - valorAbaterNum).toFixed(2) }}
              </span>
            </div>

            <div class="flex gap-3">
              <button
                @click="fecharModalAbater"
                class="flex-1 h-12 rounded-xl border border-gray-200 dark:border-white/10 font-black text-sm text-gray-500 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
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
          <div class="w-full bg-white dark:bg-neutral-900/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-t-3xl p-6 space-y-5">

            <div class="flex items-center justify-between">
              <h3 class="text-lg font-black text-gray-900 dark:text-white">Aplicar desconto</h3>
              <button @click="fecharModalDesconto" class="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-red-950/40 hover:text-red-500 text-gray-500 dark:text-white/60 flex items-center justify-center transition-all">
                <X :size="15" />
              </button>
            </div>

            <!-- toggle % / R$ -->
            <div class="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 gap-1">
              <button
                @click="modoDesconto = 'pct'; valorDesconto = ''"
                class="flex-1 h-9 rounded-lg text-sm font-black transition-all"
                :class="modoDesconto === 'pct' ? 'bg-gray-200 dark:bg-white/10 shadow text-amber-400' : 'text-gray-500 dark:text-white/40'"
              >
                Porcentagem %
              </button>
              <button
                @click="modoDesconto = 'val'; valorDesconto = ''"
                class="flex-1 h-9 rounded-lg text-sm font-black transition-all"
                :class="modoDesconto === 'val' ? 'bg-gray-200 dark:bg-white/10 shadow text-amber-400' : 'text-gray-500 dark:text-white/40'"
              >
                Valor R$
              </button>
            </div>

            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 dark:text-white/40">
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
                class="w-full h-14 pl-10 pr-4 border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white focus:border-amber-400/70 rounded-2xl text-xl font-black outline-none placeholder:text-gray-400 dark:placeholder:text-white/25"
              />
            </div>

            <div v-if="valorDescontoCalc > 0" class="bg-amber-500/10 rounded-2xl p-4 flex justify-between items-center">
              <span class="text-sm text-amber-400 font-bold">Total após desconto</span>
              <span class="text-xl font-black text-amber-400">
                R$ {{ Math.max(0, totalLiquido - valorDescontoCalc).toFixed(2) }}
              </span>
            </div>

            <div class="flex gap-3">
              <button @click="fecharModalDesconto" class="flex-1 h-12 rounded-xl border border-gray-200 dark:border-white/10 font-black text-sm text-gray-500 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
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

  <!-- RFID: identificação do garçom antes de lançar produto -->
  <ModalRfidAuth
    v-model="rfidModal"
    :mensagem="rfidMensagem"
    :erro="erroModal"
    @auth-success="onRfidSuccess"
    @cancelar="onRfidCancelar"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useCaixaStore } from '~/stores/caixa'
import { useConfigStore }      from '~/stores/configuracoes'
import { useImpressorasStore } from '~/stores/impressoras'
import { useAuthStore } from '~/stores/auth'
import {
  X,
  PrinterIcon,
  Divide,
  CreditCard,
  Trash2,
  BadgePercent,
  Plus,
  Minus,
} from 'lucide-vue-next'
import MenuFlutuanteProduto from '../modals/MenuFlutuanteProduto.vue'
import ModalPagamento from '../modals/ModalPagamento.vue'
import ModalRfidAuth from '../modals/ModalRfidAuth.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { useRfidIdentify } from '~/composables/useRfidIdentify'

const props = defineProps({
  modelValue:   Boolean,
  mesa:         { type: Object, default: null },
  garcomSessao: { type: Object as () => { id: number; nome: string } | null, default: null }
})

const emit = defineEmits(['update:modelValue', 'abrir-produtos', 'estoque-atualizado', 'mesa-fechada', 'garcom-mismatch'])

const api         = useApi()
const toastStore  = useToastStore()
const caixaStore       = useCaixaStore()
const configStore      = useConfigStore()
const impressorasStore = useImpressorasStore()
const authStore        = useAuthStore()
const { rfidAtivo, modalAberto: rfidModal, mensagemModal: rfidMensagem, erroModal, identificarViaRfid, onRfidSuccess, onRfidCancelar } = useRfidIdentify()
const caixaAberto = computed(() => caixaStore.aberto)
const podeFecharMesa = computed(() => authStore.isCaixa || authStore.temPermissao('fecharMesa'))
const podeTaxa       = computed(() => authStore.usuario?.cargo === 'administrador' || authStore.isCaixa)

// Identificação RFID do garçom para a sessão atual (null = sem RFID identificado)
const garcomRfid       = ref<{ id: number; nome: string } | null>(null)
const abrindoProdutos  = ref(false)

async function emitirAbrirProdutosComRfid() {
  if (!caixaAberto.value) { exigirCaixa(); return }
  if (abrindoProdutos.value) return
  abrindoProdutos.value = true
  try {
    // Usa sessão da página se disponível; senão solicita cartão
    let garcom: { id: number; nome: string } | null = props.garcomSessao || null
    if (!garcom) {
      const lido = await identificarViaRfid('Passe o cartão para identificar o garçom')
      if (lido) garcom = lido
    }

    if (garcom) {
      const donoDaMesa = props.mesa?.garcom_id
      if (donoDaMesa && donoDaMesa !== garcom.id) {
        emit('garcom-mismatch', garcom)
        return
      }
      garcomRfid.value = { id: garcom.id, nome: garcom.nome }
    }
    emit('abrir-produtos')
  } catch {
    // cancelado ou cartão inválido
  } finally {
    abrindoProdutos.value = false
  }
}

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
    await api.patch(`/pedidos/${pedidoId.value}/abater`, { valor: valorAbaterNum.value })
    abatimentos.value.push({ id: Date.now(), valor: valorAbaterNum.value, motivo: 'Abatimento' })
    toastStore.success(`R$ ${valorAbaterNum.value.toFixed(2)} abatido do pedido`)
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
    await api.patch(`/pedidos/${pedidoId.value}/abater`, { valor: valorDescontoCalc.value, motivo })
    abatimentos.value.push({ id: Date.now(), valor: valorDescontoCalc.value, motivo })
    toastStore.success(`${motivo} de R$ ${valorDescontoCalc.value.toFixed(2)} aplicado`)
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

  if (impressorasStore.impressaoDiretaPara('caixa')) {
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

  const logo       = configStore.logo_base64
  const nomeRest   = configStore.nome_restaurante || 'Restaurante PDV'
  const logoAltura = ({ pequena: '24px', media: '36px', grande: '96px' } as Record<string, string>)[configStore.logo_tamanho] ?? '36px'
  const logoHtml   = logo
    ? `<img src="${logo}" style="height:${logoAltura};object-fit:contain;display:block;margin:0 auto 4px;" />`
    : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Conta - Mesa ${mesa?.nome_mesa || mesa?.numero}</title>
  <style>
    body { font-family: monospace; font-size: 13px; padding: 16px; max-width: 320px; margin: 0 auto }
    .cabecalho { text-align: center; margin-bottom: 12px }
    h1 { font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 2px }
    .sub { text-align: center; color: #666; margin-bottom: 12px; font-size: 12px }
    table { width: 100%; border-collapse: collapse }
    th { border-bottom: 1px solid #000; padding: 4px 0; font-size: 11px }
    td { padding: 3px 0 }
    .sep { border-top: 1px dashed #000; margin: 8px 0 }
    .total { font-weight: bold; font-size: 15px }
    .liquido { font-weight: bold; font-size: 17px }
  </style></head><body>
  <div class="cabecalho">
    ${logoHtml}
    <h1>${nomeRest}</h1>
    <div style="font-size:11px;color:#888;margin-top:1px">CONTA DA MESA</div>
  </div>
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

// ─── Long press / Radial ──────────────────────────────────
const LONG_PRESS_MS = 460

let longPressTimer: ReturnType<typeof setTimeout> | null = null
let pointerStartX = 0
let pointerStartY = 0

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

function onPointerDown(e: PointerEvent, id: number) {
  if (e.button !== 0) return
  if (menuAberto.value !== null) {
    fecharRadial()
    return
  }

  pointerStartX = e.clientX
  pointerStartY = e.clientY

  window.addEventListener('pointermove', onGlobalMove, { passive: true })
  window.addEventListener('pointerup',   onGlobalEnd)
  window.addEventListener('pointercancel', onGlobalEnd)

  longPressTimer = setTimeout(() => {
    menuAberto.value = id
    radialPos.value  = { x: pointerStartX, y: pointerStartY }
    navigator.vibrate?.(40)
  }, LONG_PRESS_MS)
}

function onContextMenu(e: MouseEvent, id: number) {
  e.stopPropagation()
  menuAberto.value = id
  radialPos.value  = { x: e.clientX, y: e.clientY }
}

function onGlobalMove(e: PointerEvent) {
  const dx = e.clientX - pointerStartX
  const dy = e.clientY - pointerStartY
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    cancelLongPress()
    detach()
  }
}

function onGlobalEnd() {
  detach()
  cancelLongPress()
}

function cancelLongPress() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function detach() {
  window.removeEventListener('pointermove',   onGlobalMove)
  window.removeEventListener('pointerup',     onGlobalEnd)
  window.removeEventListener('pointercancel', onGlobalEnd)
}

async function adicionarItem(produto: ProdutoMesa) {
  if (!caixaAberto.value) { exigirCaixa(); return }
  const preco = Number(produto.preco_unitario)
  produto.quantidade++
  produto.total = Number(produto.total) + preco

  try {
    await api.post('/pedidos/adicionar', {
      mesa_id:    props.mesa.id,
      produto_id: produto.produto_id,
      quantidade: 1,
      ...(garcomRfid.value ? { garcom_id: garcomRfid.value.id } : {})
    })
  } catch {
    produto.quantidade--
    produto.total = Number(produto.total) - preco
    toastStore.error('Erro ao adicionar item')
  }
}

async function removerItem(produto: ProdutoMesa) {
  if (!caixaAberto.value) { exigirCaixa(); return }
  const preco = Number(produto.preco_unitario)

  if (produto.quantidade <= 1) {
    await excluirItem(produto.id)
    return
  }

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

  produtos.value = produtos.value.filter(p => p.id !== id)

  try {
    await api.delete(`/pedidos/itens/${id}`)
    emit('estoque-atualizado')
    if (!silencioso) toastStore.success('Item excluído com sucesso!')
  } catch (err) {
    if (item !== undefined) {
      const lista = [...produtos.value]
      lista.splice(idx, 0, item)
      produtos.value = lista
    }
    if (!silencioso) toastStore.error('Erro ao excluir item')
    throw err
  }
}

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

  if (impressorasStore.impressaoDiretaPara('cozinha')) {
    try {
      await api.post('/impressao/ficha', {
        itens:   [{ nome: produto.nome, quantidade: produto.quantidade }],
        info:    `${dataStr} · ${mesa?.nome_mesa || `Mesa ${mesa?.numero}`}`,
        codigo:  ref,
        destino: 'cozinha'
      })
    } catch (err: any) {
      toastStore.error('Falha na impressão', err?.message)
    }
    return
  }

  const nomeRest   = configStore.nome_restaurante || 'Restaurante PDV'
  const logo       = configStore.logo_base64
  const mensagem   = configStore.mensagem_ficha || 'Obrigado pela preferência!'
  const mm         = configStore.impressora_largura === 58 ? 58 : 80
  const copias     = Math.max(1, configStore.impressora_copias || 1)
  const logoAltura = ({ pequena: '6mm', media: '10mm', grande: '28mm' } as Record<string, string>)[configStore.logo_tamanho] ?? '10mm'

  const logoHtml = logo
    ? `<img src="${logo}" style="height:${logoAltura};object-fit:contain;margin-bottom:2mm;" />`
    : ''

  const fichas: string[] = []
  for (let u = 0; u < produto.quantidade; u++) {
    for (let c = 0; c < copias; c++) {
      fichas.push(`
        <div class="ticket">
          ${logoHtml}
          <div class="restaurante">${nomeRest}</div>
          <div class="info">${dataStr} · ${mesa?.nome_mesa || `Mesa ${mesa?.numero}`}</div>
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
    garcomRfid.value = null // limpa sempre que muda de mesa ou fecha
    if (aberto && mesaId) {
      fecharRadial()
      carregarProdutos()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  cancelLongPress()
  detach()
  fecharRadial()
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
</style>
