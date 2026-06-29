<template>
  <Transition name="fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        class="w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8 text-center animate-pop-in"
      >
        <!-- ÍCONE -->
        <div
          class="w-20 h-20 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto mb-5"
        >
          <CreditCard class="text-orange-500" :size="36" />
        </div>

        <!-- TÍTULO -->
        <h2
          class="text-2xl font-black text-neutral-900 uppercase tracking-tight"
        >
          Leitura RFID
        </h2>

        <!-- MENSAGEM -->
        <p
          class="text-sm text-neutral-500 mt-3 leading-relaxed"
        >
          {{ mensagem }}
        </p>

        <!-- STATUS -->
        <div
          class="mt-8 flex items-center justify-center gap-3"
        >
          <span
            class="w-3 h-3 rounded-full bg-orange-500 animate-pulse"
          ></span>

          <span
            class="text-xs uppercase tracking-[0.25em] font-black text-orange-500"
          >
            Aguardando cartão
          </span>
        </div>

        <!-- BOTÃO -->
        <button
          @click="cancelar"
          class="mt-8 w-full h-14 rounded-2xl bg-neutral-100 hover:bg-neutral-200 transition-all text-sm font-black uppercase tracking-wider text-neutral-600 active:scale-95"
        >
          Cancelar
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { CreditCard } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },

  mensagem: {
    type: String,
    default: 'Aproxime o cartão RFID'
  }
})

const emit = defineEmits([
  'update:modelValue',
  'auth-success',
  'cancelar'
])

let rfidBuffer = ''
let timeout: any = null

watch(
  () => props.modelValue,
  (aberto) => {
    if (aberto) {
      iniciarLeitura()
    } else {
      pararLeitura()
    }
  }
)

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.modelValue) return

  /*
  |--------------------------------------------------------------------------
  | ENTER FINALIZA LEITURA
  |--------------------------------------------------------------------------
  */

  if (event.key === 'Enter') {
    const codigo = rfidBuffer.trim()

    if (codigo.length > 0) {
      emit('auth-success', codigo)
    }

    rfidBuffer = ''
    return
  }

  /*
  |--------------------------------------------------------------------------
  | IGNORA TECLAS ESPECIAIS
  |--------------------------------------------------------------------------
  */

  if (event.key.length > 1) return

  rfidBuffer += event.key

  /*
  |--------------------------------------------------------------------------
  | RESET SE DEMORAR MUITO
  |--------------------------------------------------------------------------
  */

  clearTimeout(timeout)

  timeout = setTimeout(() => {
    rfidBuffer = ''
  }, 1000)
}

const iniciarLeitura = () => {
  rfidBuffer = ''

  window.addEventListener('keydown', handleKeydown)
}

const pararLeitura = () => {
  window.removeEventListener('keydown', handleKeydown)

  clearTimeout(timeout)

  rfidBuffer = ''
}

const cancelar = () => {
  pararLeitura()

  emit('update:modelValue', false)
  emit('cancelar')
}

onBeforeUnmount(() => {
  pararLeitura()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.animate-pop-in {
  animation: popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes popIn {
  from {
    transform: scale(0.92);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>