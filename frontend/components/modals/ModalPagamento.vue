<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="aberto"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        @click.self="fecharSePermitido"
      >
        <Transition name="slide-up-modal" appear>
          <div class="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">

            <!-- ══ ESTADO NORMAL: seleção de método ══ -->
            <template v-if="estado === 'selecao'">

              <!-- HEADER -->
              <div class="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
                <h2 class="text-2xl font-black text-neutral-900 dark:text-white">Pagamento</h2>
                <button
                  @click="$emit('fechar')"
                  class="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 text-neutral-600 dark:text-neutral-400 flex items-center justify-center transition-all"
                >
                  <X :size="18" />
                </button>
              </div>

              <div class="overflow-y-auto flex-1 p-6 space-y-6">

                <!-- RESUMO -->
                <div class="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-5">
                  <p class="text-xs font-black uppercase tracking-widest text-neutral-400 mb-1">
                    Mesa #{{ mesa?.nome_mesa || mesa?.numero || mesa?.id }}
                  </p>
                  <div class="flex items-end justify-between">
                    <span class="text-sm text-neutral-500 dark:text-neutral-400">Total a pagar</span>
                    <span class="text-4xl font-black text-neutral-900 dark:text-white">
                      R$ {{ total.toFixed(2) }}
                    </span>
                  </div>
                </div>

                <!-- BADGE MAQUININHA ATIVA -->
                <div
                  v-if="mpStore.mpAtivo"
                  class="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-4 py-3"
                >
                  <Wifi :size="14" />
                  Maquininha Mercado Pago conectada — selecione o método abaixo
                </div>

                <!-- MÉTODOS -->
                <div>
                  <p class="text-xs font-black uppercase tracking-widest text-neutral-400 mb-3">
                    Método de pagamento
                  </p>

                  <div v-if="carregandoMetodos" class="grid grid-cols-2 gap-3">
                    <div v-for="n in 4" :key="n" class="h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                  </div>

                  <div v-else class="grid grid-cols-2 gap-3">
                    <button
                      v-for="metodo in metodos"
                      :key="metodo.id"
                      @click="metodoSelecionado = metodo"
                      class="h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 font-bold text-sm"
                      :class="metodoSelecionado?.id === metodo.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-orange-300 dark:hover:border-orange-600 text-neutral-600 dark:text-neutral-400'"
                    >
                      <component :is="iconeMetodo(metodo.nome)" :size="22" stroke-width="1.5" />
                      {{ metodo.nome }}
                    </button>
                  </div>
                </div>

                <!-- TROCO (só para Dinheiro) -->
                <Transition name="slide-down">
                  <div v-if="metodoSelecionado?.nome === 'Dinheiro'" class="space-y-3">
                    <label for="pagamento-valor-recebido" class="block text-xs font-black uppercase tracking-widest text-neutral-400">
                      Valor recebido
                    </label>
                    <div class="relative">
                      <span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-neutral-400">R$</span>
                      <input
                        id="pagamento-valor-recebido"
                        name="pagamento-valor-recebido"
                        v-model="valorRecebido"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        class="w-full h-14 pl-10 pr-4 border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:border-orange-400 dark:focus:border-orange-500 rounded-2xl text-xl font-black outline-none"
                      />
                    </div>
                    <div
                      v-if="troco >= 0 && valorRecebidoNum > 0"
                      class="flex justify-between items-center bg-green-50 dark:bg-green-950/30 rounded-2xl p-4"
                    >
                      <span class="text-sm font-bold text-green-700 dark:text-green-400">Troco</span>
                      <span class="text-2xl font-black text-green-700 dark:text-green-400">R$ {{ troco.toFixed(2) }}</span>
                    </div>
                    <div
                      v-if="valorRecebidoNum > 0 && valorRecebidoNum < total"
                      class="bg-red-50 dark:bg-red-950/30 rounded-2xl p-3 text-center text-sm font-bold text-red-600 dark:text-red-400"
                    >
                      Valor insuficiente — faltam R$ {{ (total - valorRecebidoNum).toFixed(2) }}
                    </div>
                  </div>
                </Transition>

              </div>

              <!-- FOOTER -->
              <div class="p-6 border-t border-neutral-200 dark:border-neutral-800 shrink-0 space-y-3">

                <!-- botão maquininha (quando MP ativo e método compatível) -->
                <button
                  v-if="mpStore.mpAtivo && metodoSelecionado && metodoSelecionado.nome !== 'Dinheiro'"
                  @click="enviarParaMaquininha"
                  :disabled="salvando"
                  class="w-full h-14 rounded-2xl bg-[#009EE3] hover:bg-[#0089C7] disabled:opacity-40 text-white font-black text-base transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Smartphone :size="20" />
                  Enviar para maquininha
                </button>

                <!-- botão confirmar manual -->
                <button
                  @click="confirmar"
                  :disabled="!podePagar || salvando"
                  class="w-full h-14 rounded-2xl disabled:opacity-40 text-white font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3"
                  :class="mpStore.mpAtivo && metodoSelecionado && metodoSelecionado.nome !== 'Dinheiro'
                    ? 'bg-neutral-400 hover:bg-neutral-500 text-sm'
                    : 'bg-green-500 hover:bg-green-600'"
                >
                  <CheckCircle2 v-if="!salvando" :size="22" />
                  <Loader2 v-else :size="22" class="animate-spin" />
                  {{
                    salvando ? 'Processando...'
                    : (mpStore.mpAtivo && metodoSelecionado && metodoSelecionado.nome !== 'Dinheiro')
                      ? 'Confirmar manualmente'
                      : 'Confirmar Pagamento'
                  }}
                </button>

              </div>

            </template>

            <!-- ══ ESTADO: AGUARDANDO MAQUININHA ══ -->
            <template v-if="estado === 'aguardando'">
              <div class="p-8 flex flex-col items-center justify-center gap-6 min-h-[360px]">

                <div class="relative">
                  <div class="w-24 h-24 rounded-3xl bg-[#009EE3]/10 flex items-center justify-center">
                    <Smartphone :size="40" class="text-[#009EE3]" />
                  </div>
                  <div class="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#009EE3] flex items-center justify-center">
                    <Loader2 :size="14" class="text-white animate-spin" />
                  </div>
                </div>

                <div class="text-center space-y-2">
                  <p class="text-xl font-black text-neutral-900 dark:text-white">Aguardando pagamento</p>
                  <p class="text-sm text-neutral-500">
                    <span class="font-bold">R$ {{ total.toFixed(2) }}</span> via
                    <span class="font-bold">{{ metodoSelecionado?.nome }}</span>
                  </p>
                  <p class="text-xs text-neutral-400">O cliente deve pagar na maquininha</p>
                </div>

                <div class="flex gap-2 items-center text-xs text-neutral-400">
                  <span
                    v-for="n in 3" :key="n"
                    class="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-pulse"
                    :style="{ animationDelay: `${n * 0.2}s` }"
                  />
                </div>

                <button
                  @click="cancelarMaquininha"
                  :disabled="cancelando"
                  class="h-10 px-6 rounded-xl border border-red-200 dark:border-red-900 text-red-500 text-sm font-black hover:bg-red-50 dark:hover:bg-red-950/30 transition-all disabled:opacity-50"
                >
                  <Loader2 v-if="cancelando" :size="13" class="animate-spin inline mr-1" />
                  Cancelar
                </button>

              </div>
            </template>

            <!-- ══ ESTADO: ERRO NA MAQUININHA ══ -->
            <template v-if="estado === 'erro'">
              <div class="p-8 flex flex-col items-center justify-center gap-5 min-h-[300px]">
                <div class="w-20 h-20 rounded-3xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                  <XCircle :size="36" class="text-red-500" />
                </div>
                <div class="text-center space-y-1">
                  <p class="text-lg font-black text-neutral-900 dark:text-white">Pagamento não concluído</p>
                  <p class="text-sm text-neutral-500">{{ erroMaquininha }}</p>
                </div>
                <div class="flex gap-3">
                  <button
                    @click="estado = 'selecao'"
                    class="h-11 px-6 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 font-black text-sm transition-all"
                  >
                    Tentar novamente
                  </button>
                  <button
                    @click="confirmar"
                    class="h-11 px-6 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black text-sm transition-all"
                  >
                    Confirmar manualmente
                  </button>
                </div>
              </div>
            </template>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  X, CheckCircle2, Loader2, XCircle, Wifi, Smartphone,
  Banknote, QrCode, CreditCard, UtensilsCrossed, ArrowLeftRight, Wallet
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useToastStore }       from '~/stores/toast'
import { useCaixaStore }       from '~/stores/caixa'
import { useIntegracoesStore } from '~/stores/integracoes'

const api             = useApi()
const toastStore      = useToastStore()
const caixaStore      = useCaixaStore()
const mpStore         = useIntegracoesStore()

const props = defineProps<{
  aberto: boolean
  mesa: any
  pedidoId: number | null
  total: number
}>()

const emit = defineEmits(['fechar', 'pago'])

interface Metodo { id: number; nome: string }

type Estado = 'selecao' | 'aguardando' | 'erro'

const metodos             = ref<Metodo[]>([])
const carregandoMetodos   = ref(false)
const metodoSelecionado   = ref<Metodo | null>(null)
const valorRecebido       = ref('')
const salvando            = ref(false)
const estado              = ref<Estado>('selecao')
const erroMaquininha      = ref('')
const cancelando          = ref(false)
const intentIdAtual       = ref<string | null>(null)
let   pollingInterval: ReturnType<typeof setInterval> | null = null

const valorRecebidoNum = computed(() => parseFloat(valorRecebido.value) || 0)
const troco = computed(() => Math.max(0, valorRecebidoNum.value - props.total))

const podePagar = computed(() => {
  if (!metodoSelecionado.value) return false
  if (metodoSelecionado.value.nome === 'Dinheiro') {
    return valorRecebidoNum.value >= props.total
  }
  return true
})

function fecharSePermitido() {
  if (estado.value === 'aguardando') return
  emit('fechar')
}

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

function tipoMp(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('crédito') || n.includes('credito')) return 'credito'
  if (n.includes('débito') || n.includes('debito'))   return 'debito'
  if (n.includes('pix'))                               return 'pix'
  return 'debito'
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

async function enviarParaMaquininha() {
  if (!metodoSelecionado.value || !props.mesa?.id) return
  estado.value = 'aguardando'
  try {
    const intent = await mpStore.criarPagamento({
      valor:     props.total,
      tipo:      tipoMp(metodoSelecionado.value.nome),
      descricao: `Mesa ${props.mesa.nome_mesa || props.mesa.id}`,
      referencia: `mesa-${props.mesa.id}-${Date.now()}`
    })
    intentIdAtual.value = intent.id
    iniciarPolling()
  } catch (e: any) {
    estado.value     = 'erro'
    erroMaquininha.value = e?.message || 'Não foi possível enviar para a maquininha'
  }
}

function iniciarPolling() {
  pararPolling()
  pollingInterval = setInterval(verificarStatus, 3000)
}

function pararPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

async function verificarStatus() {
  if (!intentIdAtual.value) return
  try {
    const data = await mpStore.verificarPagamento(intentIdAtual.value)
    const s = data.state?.toUpperCase() ?? ''

    if (s === 'FINISHED' || (s === 'PROCESSED' && data.payment?.status === 'approved')) {
      pararPolling()
      await confirmarAposMaquininha()
    } else if (s === 'CANCELED' || s === 'ERROR') {
      pararPolling()
      estado.value         = 'erro'
      erroMaquininha.value = s === 'CANCELED' ? 'Pagamento cancelado na maquininha' : 'Erro na maquininha'
    }
  } catch {}
}

async function confirmarAposMaquininha() {
  salvando.value = true
  try {
    await api.post('/pagamentos', {
      mesa_id:    props.mesa.id,
      pedido_id:  props.pedidoId,
      metodo_id:  metodoSelecionado.value!.id,
      caixa_id:   caixaStore.caixaAtual?.id ?? null,
      valor_pago: props.total
    })
    toastStore.success('Pagamento aprovado pela maquininha!')
    emit('pago')
  } catch (err: any) {
    toastStore.error(err?.message || 'Erro ao registrar pagamento')
    estado.value = 'selecao'
  } finally {
    salvando.value = false
  }
}

async function cancelarMaquininha() {
  if (!intentIdAtual.value) return
  cancelando.value = true
  pararPolling()
  try {
    await mpStore.cancelarPagamento(intentIdAtual.value)
  } catch {}
  intentIdAtual.value = null
  cancelando.value    = false
  estado.value        = 'selecao'
}

watch(() => props.aberto, (v) => {
  if (v) {
    metodoSelecionado.value = null
    valorRecebido.value     = ''
    estado.value            = 'selecao'
    erroMaquininha.value    = ''
    intentIdAtual.value     = null
    carregarMetodos()
    mpStore.carregar()
  } else {
    pararPolling()
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
