<template>
  <Transition name="fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        class="w-full max-w-md bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-[32px] shadow-2xl animate-pop-in overflow-hidden"
      >

        <!-- ─── FASE 1: AGUARDANDO CARTÃO ───────────────────────── -->
        <Transition name="fase" mode="out-in">
          <div v-if="!identificado" key="aguardando" class="p-8 text-center">

            <!-- ÍCONE -->
            <div v-if="!modoPin" class="w-20 h-20 rounded-full bg-orange-950/30 border border-orange-500/20 flex items-center justify-center mx-auto mb-5">
              <CreditCard class="text-orange-500" :size="36" />
            </div>

            <!-- TÍTULO -->
            <h2 class="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {{ modoPin ? 'Seu PIN' : 'Leitura RFID' }}
            </h2>

            <!-- MENSAGEM -->
            <p class="text-sm text-gray-500 dark:text-white/50 mt-3 leading-relaxed">
              {{ mensagemExibida }}
            </p>

            <!-- PIN (celular, sem leitor de cartão) -->
            <div v-if="modoPin" class="mt-5">
              <div class="flex justify-center gap-2.5" :aria-label="`${pin.length} de ${PIN_MAX} dígitos`">
                <span
                  v-for="i in PIN_MAX" :key="i"
                  class="size-3.5 rounded-full border-2 transition-colors"
                  :class="i <= pin.length ? 'bg-orange-500 border-orange-500' : i <= PIN_MIN ? 'border-gray-300 dark:border-white/25' : 'border-dashed border-gray-200 dark:border-white/15'"
                />
              </div>
              <div class="grid grid-cols-3 gap-2 mt-5 max-w-[16rem] mx-auto">
                <button
                  v-for="t in TECLAS" :key="t"
                  type="button"
                  class="h-14 rounded-2xl text-xl font-black transition-colors active:scale-95 disabled:opacity-30"
                  :class="t === 'ok'
                    ? 'bg-orange-500 text-white text-sm uppercase tracking-wider'
                    : t === 'apagar' ? 'text-gray-500 dark:text-white/50 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                    : 'bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10'"
                  :disabled="carregandoRfid || (t === 'ok' && pin.length < PIN_MIN)"
                  :aria-label="t === 'apagar' ? 'Apagar' : t === 'ok' ? 'Confirmar PIN' : t"
                  @click="tecla(t)"
                >
                  <Delete v-if="t === 'apagar'" :size="22" />
                  <template v-else>{{ t === 'ok' ? 'OK' : t }}</template>
                </button>
              </div>
            </div>

            <!-- CARREGANDO -->
            <div v-if="carregandoRfid" class="mt-6 flex items-center justify-center gap-3">
              <span class="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
              <span class="text-xs uppercase tracking-[0.25em] font-black text-blue-400">Identificando...</span>
            </div>

            <!-- ERRO -->
            <div v-else-if="erro" class="mt-5 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <p class="text-sm font-bold text-red-400">{{ erro }}</p>
            </div>

            <!-- STATUS PADRÃO -->
            <div v-else-if="!modoPin" class="mt-6 flex items-center justify-center gap-3">
              <span class="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></span>
              <span class="text-xs uppercase tracking-[0.25em] font-black text-orange-500">Aguardando cartão</span>
            </div>

            <!-- Sem Cancelar: o cartão é a trava. Só o portão de uma tela oferece
                 "Sair", que leva para fora dela (fechar não libera a tela). -->
            <button
              v-if="obrigatorio"
              @click="sair"
              class="mt-6 text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors font-bold uppercase tracking-widest"
            >
              {{ rotuloSair || 'Sair' }}
            </button>

          </div>

          <!-- ─── FASE 2: IDENTIFICADO — CONFIRMAR ──────────────── -->
          <div v-else key="confirmando" class="overflow-hidden">

            <!-- Header do usuário -->
            <div class="px-8 pt-8 pb-5 text-center">
              <!-- Avatar com iniciais -->
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-black text-xl"
                :style="{ background: avatarGradient }">
                {{ iniciais }}
              </div>

              <h2 class="text-xl font-black text-gray-900 dark:text-white">
                {{ identificado.usuario.nome }}
              </h2>

              <span class="inline-block mt-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider"
                :class="cargoBadgeClass">
                {{ identificado.usuario.cargo }}
              </span>
            </div>

            <!-- Divider -->
            <div class="mx-6 h-px bg-gray-100 dark:bg-white/[0.06]"></div>

            <!-- Vendas vinculadas -->
            <div class="px-6 py-4">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-white/30 mb-3">
                Vendas em aberto
              </p>

              <!-- Lista de mesas -->
              <div v-if="identificado.mesas.length > 0" class="space-y-2 max-h-48 overflow-y-auto pr-1">
                <div
                  v-for="mesa in identificado.mesas"
                  :key="mesa.id"
                  class="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06]"
                >
                  <div class="min-w-0">
                    <p class="text-sm font-black text-gray-900 dark:text-white truncate">
                      {{ mesa.nome_mesa || `Mesa ${mesa.numero}` }}
                    </p>
                    <p v-if="mesa.cliente" class="text-[11px] text-gray-400 dark:text-white/30 truncate">
                      {{ mesa.cliente }}
                    </p>
                    <p v-else class="text-[11px] text-gray-400 dark:text-white/30">
                      {{ mesa.n_itens }} {{ mesa.n_itens === 1 ? 'item' : 'itens' }}
                    </p>
                  </div>
                  <span class="text-sm font-black text-orange-400 shrink-0 ml-3">
                    {{ reais(Number(mesa.total)) }}
                  </span>
                </div>
              </div>

              <!-- Sem mesas -->
              <div v-else class="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                <span class="text-green-500">
                  <CheckCircle2 :size="16" />
                </span>
                <p class="text-sm text-gray-500 dark:text-white/40 font-bold">Sem vendas em aberto</p>
              </div>
            </div>

            <!-- Ações -->
            <div class="px-6 pb-7 pt-1 flex gap-3">
              <button
                @click="cancelar"
                class="flex-1 h-12 rounded-xl border border-gray-200 dark:border-white/10 font-black text-sm text-gray-500 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                @click="confirmar"
                class="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-sm transition-all active:scale-95 shadow-md shadow-orange-900/20 flex items-center justify-center gap-2"
              >
                Confirmar
                <ArrowRight :size="15" />
              </button>
            </div>

          </div>
        </Transition>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { reais } from '~/lib/moeda'
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { CreditCard, CheckCircle2, ArrowRight, Delete } from 'lucide-vue-next'
import type { RfidIdentificado } from '~/composables/useRfidIdentify'
import { semLeitorDeCartao, PREFIXO_PIN } from '~/lib/identificacao'

const props = defineProps<{
  modelValue: boolean
  mensagem?: string
  erro?: string
  identificado?: RfidIdentificado | null
  carregandoRfid?: boolean
  /** Portão de uma tela: mostra "Sair" (emite 'sair') enquanto espera o cartão */
  obrigatorio?: boolean
  rotuloSair?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  'auth-success': [string]
  'confirmar': []
  'cancelar': []
  'sair': []
}>()

// ─── Avatar ──────────────────────────────────────────────────
const iniciais = computed(() => {
  if (!props.identificado) return ''
  return props.identificado.usuario.nome
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()
})

const cargoColors: Record<string, string> = {
  administrador: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
  garcom:        'linear-gradient(135deg,#f97316,#ef4444)',
  caixa:         'linear-gradient(135deg,#059669,#10b981)',
  cozinha:       'linear-gradient(135deg,#d97706,#f59e0b)',
}

const avatarGradient = computed(() => {
  const cargo = props.identificado?.usuario.cargo ?? ''
  return cargoColors[cargo] ?? 'linear-gradient(135deg,#6b7280,#9ca3af)'
})

const cargoBadgeClass = computed(() => {
  const cargo = props.identificado?.usuario.cargo ?? ''
  const map: Record<string, string> = {
    administrador: 'bg-violet-500/15 text-violet-400',
    garcom:        'bg-orange-500/15 text-orange-400',
    caixa:         'bg-emerald-500/15 text-emerald-400',
    cozinha:       'bg-amber-500/15 text-amber-400',
  }
  return map[cargo] ?? 'bg-gray-500/15 text-gray-400'
})

// ─── PIN (celular) ───────────────────────────────────────────
// Sem leitor de cartão, cada um confirma com o próprio PIN (o da conta logada)
const modoPin = semLeitorDeCartao()
const PIN_MIN = 4
const PIN_MAX = 6
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'apagar', '0', 'ok'] as const
const pin = ref('')

// "Passe o cartão para X" vira "Digite seu PIN para X"
const mensagemExibida = computed(() => {
  const m = props.mensagem ?? ''
  if (!modoPin) return m
  const trocada = m.replace(/^(passe|aproxime) o cart[ãa]o.*?(?= para )/i, 'Digite seu PIN')
  return trocada === m ? 'Digite seu PIN para continuar' : trocada
})

function tecla(t: typeof TECLAS[number]) {
  if (props.carregandoRfid) return
  if (t === 'apagar') { pin.value = pin.value.slice(0, -1); return }
  if (t === 'ok') { enviarPin(); return }
  if (pin.value.length < PIN_MAX) pin.value += t
}

function enviarPin() {
  if (pin.value.length < PIN_MIN) return
  emit('auth-success', PREFIXO_PIN + pin.value)
}

// PIN errado: limpa para digitar de novo
watch(() => props.erro, (e) => { if (e) pin.value = '' })

// ─── Leitura RFID ────────────────────────────────────────────
let rfidBuffer = ''
let timeout: ReturnType<typeof setTimeout> | null = null

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.modelValue) return

  // O leitor "digita" como teclado: com o modal aberto nada disso chega à página.
  // Sem isso, o Enter do leitor clicava de novo o botão que abriu o modal
  // (ex.: Abrir caixa reabria o RFID por cima do saldo inicial) e os dígitos
  // caíam no campo focado (valor do desconto/abatimento).
  if (event.key === 'Enter' || event.key.length === 1) {
    event.preventDefault()
    event.stopPropagation()
  }

  // Ignore input while confirmed data is shown (waiting for button click)
  if (props.identificado) return

  // Celular com teclado físico ou numérico: as teclas vão para o PIN
  if (modoPin) {
    if (event.key === 'Backspace') { event.preventDefault(); tecla('apagar') }
    else if (event.key === 'Enter') enviarPin()
    else if (/^\d$/.test(event.key)) tecla(event.key as typeof TECLAS[number])
    return
  }

  if (event.key === 'Enter') {
    const codigo = rfidBuffer.trim()
    if (codigo.length > 0) emit('auth-success', codigo)
    rfidBuffer = ''
    return
  }

  if (event.key.length > 1) return

  rfidBuffer += event.key

  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(() => { rfidBuffer = '' }, 1000)
}

let lendo = false

const iniciarLeitura = () => {
  rfidBuffer = ''
  pin.value = ''
  // Tira o foco do botão/campo da tela de trás (o Enter não o aciona de novo)
  ;(document.activeElement as HTMLElement | null)?.blur?.()
  if (lendo) return
  lendo = true
  window.addEventListener('keydown', handleKeydown, true)
}

const pararLeitura = () => {
  lendo = false
  window.removeEventListener('keydown', handleKeydown, true)
  if (timeout) clearTimeout(timeout)
  rfidBuffer = ''
}

const cancelar = () => {
  pararLeitura()
  emit('update:modelValue', false)
  emit('cancelar')
}

// Portão obrigatório: o modal continua aberto; quem usa decide para onde ir
const sair = () => {
  pararLeitura()
  emit('sair')
}

const confirmar = () => {
  pararLeitura()
  emit('confirmar')
}

watch(
  () => props.modelValue,
  (aberto) => { aberto ? iniciarLeitura() : pararLeitura() },
  { immediate: true }
)

onBeforeUnmount(pararLeitura)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }

.animate-pop-in {
  animation: popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes popIn {
  from { transform: scale(0.92); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

.fase-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fase-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.fase-enter-from   { opacity: 0; transform: translateY(8px); }
.fase-leave-to     { opacity: 0; transform: translateY(-8px); }
</style>
