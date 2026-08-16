<template>
  <Transition name="fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-lg bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-[32px] shadow-2xl overflow-hidden animate-pop-in"
      >

        <!-- HEADER -->
        <div class="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-white/[0.08]">
          <div class="flex items-center justify-between">

            <div>
              <h2 class="text-2xl font-black text-gray-900 dark:text-white">
                Novo Atendimento
              </h2>

              <p class="text-sm text-gray-500 dark:text-white/40 mt-1">
                Escolha o tipo de venda
              </p>
            </div>

            <button
              @click="fechar"
              class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.06] hover:bg-red-900/30 hover:text-red-500 transition-all flex items-center justify-center text-gray-500 dark:text-white/60"
            >
              <X :size="20" />
            </button>

          </div>
        </div>

        <!-- BODY -->
        <div class="p-8 space-y-6">

          <!-- TIPO DE ATENDIMENTO -->
          <div class="grid gap-3" :class="isAdmin ? 'grid-cols-2' : 'grid-cols-1'">
            <button
              @click="form.tipo = 'mesa'"
              class="rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all text-center"
              :class="form.tipo === 'mesa'
                ? 'border-orange-500 bg-orange-950/30'
                : 'border-gray-200 dark:border-white/10 hover:border-orange-300'"
            >
              <LayoutGrid :size="22" :class="form.tipo === 'mesa' ? 'text-orange-500' : 'text-gray-400 dark:text-white/40'" />
              <span class="text-sm font-black" :class="form.tipo === 'mesa' ? 'text-orange-400' : 'text-gray-500 dark:text-white/50'">
                Mesa / Comanda
              </span>
              <span class="text-[11px] text-gray-500 dark:text-white/40 leading-tight">
                Abre uma comanda para consumo na mesa
              </span>
            </button>

            <!-- Venda Direta: só o administrador tem acesso à tela de Vendas -->
            <button
              v-if="isAdmin"
              @click="form.tipo = 'balcao'"
              class="rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all text-center"
              :class="form.tipo === 'balcao'
                ? 'border-orange-500 bg-orange-950/30'
                : 'border-gray-200 dark:border-white/10 hover:border-orange-300'"
            >
              <ShoppingCart :size="22" :class="form.tipo === 'balcao' ? 'text-orange-500' : 'text-gray-400 dark:text-white/40'" />
              <span class="text-sm font-black" :class="form.tipo === 'balcao' ? 'text-orange-400' : 'text-gray-500 dark:text-white/50'">
                Venda Direta
              </span>
              <span class="text-[11px] text-gray-500 dark:text-white/40 leading-tight">
                Venda avulsa no balcão, sem abrir mesa
              </span>
            </button>
          </div>

          <!-- CAMPOS DA MESA -->
          <template v-if="form.tipo === 'mesa'">
            <div>
              <label for="mesa-nome" class="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-white/40 block mb-2">
                Nome / Número da Mesa
              </label>

              <input
                id="mesa-nome"
                name="mesa-nome"
                v-model="form.nome_mesa"
                type="text"
                placeholder="Ex: Mesa 5 (opcional — numera automático)"
                class="w-full h-14 px-5 rounded-2xl bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:outline-none focus:border-orange-500/70 transition-colors"
              />
            </div>

            <div>
              <label for="mesa-cliente" class="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-white/40 block mb-2">
                Nome do Cliente
              </label>

              <input
                id="mesa-cliente"
                name="mesa-cliente"
                v-model="form.cliente"
                type="text"
                placeholder="Opcional"
                class="w-full h-14 px-5 rounded-2xl bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:outline-none focus:border-orange-500/70 transition-colors"
              />
            </div>
          </template>

          <!-- INFO VENDA DIRETA -->
          <p v-else class="text-sm text-gray-500 dark:text-white/50 bg-gray-50 dark:bg-white/5 rounded-2xl px-5 py-4 leading-relaxed">
            Você será levado ao painel de <strong class="text-gray-700 dark:text-white/80">Vendas</strong> para
            selecionar os produtos e receber o pagamento na hora.
          </p>

        </div>

        <!-- FOOTER -->
        <div class="px-8 pb-8 flex gap-4">

          <button
            @click="fechar"
            class="flex-1 h-14 rounded-2xl border border-gray-200 dark:border-white/10 font-black uppercase tracking-wider text-gray-500 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>

          <button
            v-if="form.tipo === 'mesa'"
            @click="abrirMesa"
            :disabled="loading"
            class="flex-1 h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase tracking-wider transition-all"
          >
            {{ loading ? 'Abrindo...' : 'Abrir Atendimento' }}
          </button>

          <button
            v-else
            @click="irParaVendas"
            class="flex-1 h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider transition-all"
          >
            Ir para Vendas
          </button>

        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import {
  reactive,
  ref,
  computed
} from 'vue'

import { useRouter } from 'vue-router'
import { X, LayoutGrid, ShoppingCart } from 'lucide-vue-next'

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

const router = useRouter()
const toastStore = useToastStore()
const authStore = useAuthStore()
const caixaStore = useCaixaStore()

const loading = ref(false)
const isAdmin = computed(() => authStore.usuario?.cargo === 'administrador')

const form = reactive({
  tipo: 'mesa' as 'mesa' | 'balcao',
  nome_mesa: '',
  cliente: ''
})

const fechar = () => {
  emit('update:modelValue', false)
}

const resetar = () => {
  form.tipo = 'mesa'
  form.nome_mesa = ''
  form.cliente = ''
}

const irParaVendas = () => {
  fechar()
  resetar()
  router.push('/vendas')
}

const abrirMesa = async () => {
  try {

    loading.value = true

    const api = useApi()

    const resposta = await api.mesas.abrirMesa({
      cliente:    form.cliente,
      nome_mesa:  form.nome_mesa.trim() || null,
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
