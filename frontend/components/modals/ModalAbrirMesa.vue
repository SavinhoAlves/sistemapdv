<template>
  <Transition name="fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden animate-pop-in"
      >

        <!-- HEADER -->
        <div class="px-8 pt-8 pb-6 border-b border-neutral-100 dark:border-neutral-800">
          <div class="flex items-center justify-between">

            <div>
              <h2 class="text-2xl font-black text-neutral-900 dark:text-white">
                Novo Atendimento
              </h2>

              <p class="text-sm text-neutral-400 mt-1">
                Abrir nova comanda
              </p>
            </div>

            <button
              @click="fechar"
              class="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all flex items-center justify-center"
            >
              <X :size="20" />
            </button>

          </div>
        </div>

        <!-- BODY -->
        <div class="p-8 space-y-6">

          <!-- CLIENTE -->
          <div>
            <label class="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-2">
              Nome do Cliente
            </label>

            <input
              v-model="form.cliente"
              type="text"
              placeholder="Opcional"
              class="w-full h-14 px-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

        </div>

        <!-- FOOTER -->
        <div class="px-8 pb-8 flex gap-4">

          <button
            @click="fechar"
            class="flex-1 h-14 rounded-2xl border border-neutral-200 dark:border-neutral-700 font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
          >
            Cancelar
          </button>

          <button
            @click="abrirMesa"
            :disabled="loading"
            class="flex-1 h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase tracking-wider transition-all"
          >
            {{ loading ? 'Abrindo...' : 'Abrir Atendimento' }}
          </button>

        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import {
  reactive,
  ref
} from 'vue'

import { X } from 'lucide-vue-next'

import { useToastStore } from '~/stores/toast'
import { useAuthStore } from '~/stores/auth'
import { useCaixaStore } from '~/stores/caixa'
import { useApi } from '~/services/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:modelValue',
  'mesa-aberta'
])

const toastStore = useToastStore()
const authStore = useAuthStore()
const caixaStore = useCaixaStore()

const loading = ref(false)

const form = reactive({
  cliente: ''
})

// ======================
// FECHAR
// ======================
const fechar = () => {
  emit('update:modelValue', false)
}

// ======================
// RESETAR
// ======================
const resetar = () => {
  form.cliente = ''
}

// ======================
// ABRIR ATENDIMENTO
// ======================
const abrirMesa = async () => {
  try {

    loading.value = true

    const api = useApi()

    const resposta = await api.mesas.abrirMesa({
      cliente:    form.cliente,
      garcom_id:  authStore.usuario?.id ?? null,
      caixa_id:   caixaStore.caixaAtual?.id ?? null
    })

    toastStore.success(
      'Atendimento aberto com sucesso'
    )

    emit('mesa-aberta', resposta)

    resetar()

    fechar()

  } catch (error: any) {

    console.error(error)

    toastStore.error(
      error?.data?.error ||
      'Erro ao abrir atendimento'
    )

  } finally {

    loading.value = false
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all .2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.animate-pop-in {
  animation: pop .2s ease;
}

@keyframes pop {

  from {
    transform: scale(.95);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>