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
            <div class="w-20 h-20 rounded-full bg-orange-950/30 border border-orange-500/20 flex items-center justify-center mx-auto mb-5">
              <CreditCard class="text-orange-500" :size="36" />
            </div>

            <!-- TÍTULO -->
            <h2 class="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Leitura RFID
            </h2>

            <!-- MENSAGEM -->
            <p class="text-sm text-gray-500 dark:text-white/50 mt-3 leading-relaxed">
              {{ mensagem }}
            </p>

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
            <div v-else class="mt-6 flex items-center justify-center gap-3">
              <span class="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></span>
              <span class="text-xs uppercase tracking-[0.25em] font-black text-orange-500">Aguardando cartão</span>
            </div>

            <!-- CANCELAR -->
            <button
              @click="cancelar"
              class="mt-6 text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors font-bold uppercase tracking-widest"
            >
              Cancelar
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
                    R$ {{ Number(mesa.total).toFixed(2) }}
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
import { computed, watch, onBeforeUnmount } from 'vue'
import { CreditCard, CheckCircle2, ArrowRight } from 'lucide-vue-next'
import type { RfidIdentificado } from '~/composables/useRfidIdentify'

const props = defineProps<{
  modelValue: boolean
  mensagem?: string
  erro?: string
  identificado?: RfidIdentificado | null
  carregandoRfid?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  'auth-success': [string]
  'confirmar': []
  'cancelar': []
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

// ─── Leitura RFID ────────────────────────────────────────────
let rfidBuffer = ''
let timeout: ReturnType<typeof setTimeout> | null = null

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.modelValue) return

  // Ignore input while confirmed data is shown (waiting for button click)
  if (props.identificado) return

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

const iniciarLeitura = () => {
  rfidBuffer = ''
  window.addEventListener('keydown', handleKeydown)
}

const pararLeitura = () => {
  window.removeEventListener('keydown', handleKeydown)
  if (timeout) clearTimeout(timeout)
  rfidBuffer = ''
}

const cancelar = () => {
  pararLeitura()
  emit('update:modelValue', false)
  emit('cancelar')
}

const confirmar = () => {
  pararLeitura()
  emit('confirmar')
}

watch(
  () => props.modelValue,
  (aberto) => { aberto ? iniciarLeitura() : pararLeitura() }
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
