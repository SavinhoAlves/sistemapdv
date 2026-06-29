<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="aberto"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        @click.self="$emit('fechar')"
      >
        <Transition name="slide-up-modal" appear>
          <div class="bg-white w-full max-w-lg rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">

            <!-- HEADER -->
            <div class="p-6 border-b flex items-center justify-between shrink-0">
              <h2 class="text-2xl font-black">Pagamento</h2>
              <button
                @click="$emit('fechar')"
                class="w-10 h-10 rounded-xl bg-neutral-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all"
              >
                <X :size="18" />
              </button>
            </div>

            <div class="overflow-y-auto flex-1 p-6 space-y-6">

              <!-- RESUMO -->
              <div class="bg-neutral-50 rounded-2xl p-5">
                <p class="text-xs font-black uppercase tracking-widest text-neutral-400 mb-1">
                  Mesa #{{ mesa?.nome_mesa || mesa?.numero || mesa?.id }}
                </p>
                <div class="flex items-end justify-between">
                  <span class="text-sm text-neutral-500">Total a pagar</span>
                  <span class="text-4xl font-black text-neutral-900">
                    R$ {{ total.toFixed(2) }}
                  </span>
                </div>
              </div>

              <!-- MÉTODOS -->
              <div>
                <p class="text-xs font-black uppercase tracking-widest text-neutral-400 mb-3">
                  Método de pagamento
                </p>

                <div v-if="carregandoMetodos" class="grid grid-cols-2 gap-3">
                  <div v-for="n in 4" :key="n" class="h-20 rounded-2xl bg-neutral-100 animate-pulse" />
                </div>

                <div v-else class="grid grid-cols-2 gap-3">
                  <button
                    v-for="metodo in metodos"
                    :key="metodo.id"
                    @click="metodoSelecionado = metodo"
                    class="h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 font-bold text-sm"
                    :class="metodoSelecionado?.id === metodo.id
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-neutral-200 hover:border-orange-300 text-neutral-600'"
                  >
                    <component :is="iconeMetodo(metodo.nome)" :size="22" stroke-width="1.5" />
                    {{ metodo.nome }}
                  </button>
                </div>
              </div>

              <!-- TROCO (só para Dinheiro) -->
              <Transition name="slide-down">
                <div v-if="metodoSelecionado?.nome === 'Dinheiro'" class="space-y-3">
                  <p class="text-xs font-black uppercase tracking-widest text-neutral-400">
                    Valor recebido
                  </p>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-neutral-400">R$</span>
                    <input
                      v-model="valorRecebido"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      class="w-full h-14 pl-10 pr-4 border-2 border-neutral-200 focus:border-orange-400 rounded-2xl text-xl font-black outline-none"
                    />
                  </div>
                  <div
                    v-if="troco >= 0 && valorRecebidoNum > 0"
                    class="flex justify-between items-center bg-green-50 rounded-2xl p-4"
                  >
                    <span class="text-sm font-bold text-green-700">Troco</span>
                    <span class="text-2xl font-black text-green-700">R$ {{ troco.toFixed(2) }}</span>
                  </div>
                  <div
                    v-if="valorRecebidoNum > 0 && valorRecebidoNum < total"
                    class="bg-red-50 rounded-2xl p-3 text-center text-sm font-bold text-red-600"
                  >
                    Valor insuficiente — faltam R$ {{ (total - valorRecebidoNum).toFixed(2) }}
                  </div>
                </div>
              </Transition>

            </div>

            <!-- FOOTER -->
            <div class="p-6 border-t shrink-0">
              <button
                @click="confirmar"
                :disabled="!podePagar || salvando"
                class="w-full h-14 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <CheckCircle2 v-if="!salvando" :size="22" />
                <Loader2 v-else :size="22" class="animate-spin" />
                {{ salvando ? 'Processando...' : 'Confirmar Pagamento' }}
              </button>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  X, CheckCircle2, Loader2,
  Banknote, QrCode, CreditCard, UtensilsCrossed, ArrowLeftRight, Wallet
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { useCaixaStore } from '~/stores/caixa'

const api         = useApi()
const toastStore  = useToastStore()
const caixaStore  = useCaixaStore()

const props = defineProps<{
  aberto: boolean
  mesa: any
  pedidoId: number | null
  total: number
}>()

const emit = defineEmits(['fechar', 'pago'])

interface Metodo { id: number; nome: string }

const metodos           = ref<Metodo[]>([])
const carregandoMetodos = ref(false)
const metodoSelecionado = ref<Metodo | null>(null)
const valorRecebido     = ref('')
const salvando          = ref(false)

const valorRecebidoNum = computed(() => parseFloat(valorRecebido.value) || 0)
const troco = computed(() => Math.max(0, valorRecebidoNum.value - props.total))

const podePagar = computed(() => {
  if (!metodoSelecionado.value) return false
  if (metodoSelecionado.value.nome === 'Dinheiro') {
    return valorRecebidoNum.value >= props.total
  }
  return true
})

function iconeMetodo(nome: string) {
  const n = nome.toLowerCase()
  if (n.includes('dinheiro'))  return Banknote
  if (n.includes('pix'))       return QrCode
  if (n.includes('crédito') || n.includes('credito')) return CreditCard
  if (n.includes('débito') || n.includes('debito'))   return CreditCard
  if (n.includes('vale'))      return UtensilsCrossed
  if (n.includes('transfer'))  return ArrowLeftRight
  return Wallet
}

async function carregarMetodos() {
  carregandoMetodos.value = true
  try {
    const rows = await api.get<Metodo[]>('/pagamentos/metodos')
    metodos.value = Array.isArray(rows) ? rows : []
  } catch {
    metodos.value = []
  } finally {
    carregandoMetodos.value = false
  }
}

async function confirmar() {
  if (!podePagar.value || salvando.value || !props.mesa?.id) return
  salvando.value = true
  try {
    await api.post('/pagamentos', {
      mesa_id:    props.mesa.id,
      pedido_id:  props.pedidoId,
      metodo_id:  metodoSelecionado.value!.id,
      caixa_id:   caixaStore.caixaAtual?.id ?? null,
      valor_pago: metodoSelecionado.value!.nome === 'Dinheiro'
        ? valorRecebidoNum.value
        : props.total
    })
    toastStore.success('Pagamento confirmado!')
    emit('pago')
  } catch (err: any) {
    toastStore.error(err?.message || 'Erro ao registrar pagamento')
  } finally {
    salvando.value = false
  }
}

watch(() => props.aberto, (v) => {
  if (v) {
    metodoSelecionado.value = null
    valorRecebido.value = ''
    carregarMetodos()
  }
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease }
.fade-enter-from, .fade-leave-to { opacity: 0 }

.slide-up-modal-enter-active { transition: transform 0.28s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease }
.slide-up-modal-leave-active { transition: transform 0.18s ease, opacity 0.15s ease }
.slide-up-modal-enter-from, .slide-up-modal-leave-to { transform: translateY(24px); opacity: 0 }

.slide-down-enter-active, .slide-down-leave-active { transition: all 0.2s ease }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px) }
</style>
