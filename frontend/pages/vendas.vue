<template>
  <div
    class="h-screen flex flex-col bg-neutral-100 dark:bg-neutral-950 overflow-hidden transition-colors duration-200 com-sidebar"
    :class="caixaAberto ? 'lg:pr-72 xl:pr-80' : ''"
  >
    <Sidebar />
    <Navbar />

    <!-- CAIXA FECHADO -->
    <div v-if="!caixaAberto" class="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div class="w-16 h-16 rounded-2xl bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center">
        <LockKeyhole :size="28" class="text-neutral-400 dark:text-neutral-700" />
      </div>
      <h3 class="text-lg font-black text-neutral-700 dark:text-neutral-300">Caixa fechado</h3>
      <p class="text-sm text-neutral-400">
        {{ isAdmin
          ? 'Use o botão "Abrir Caixa" na barra superior para iniciar as vendas.'
          : 'O administrador precisa abrir o caixa para iniciar as vendas.' }}
      </p>
    </div>

    <!-- POS DE VENDA DIRETA -->
    <VendaDireta v-else />

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { LockKeyhole } from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import VendaDireta from '~/components/venda/VendaDireta.vue'
import { useApi } from '~/services/api'
import { useCaixaStore } from '~/stores/caixa'
import { useAuthStore }  from '~/stores/auth'

definePageMeta({ layout: false })

const api        = useApi()
const caixaStore = useCaixaStore()
const authStore  = useAuthStore()

const isAdmin     = computed(() => authStore.usuario?.cargo === 'administrador')
const caixaAberto = computed(() => caixaStore.aberto)

onMounted(async () => {
  try {
    const statusCaixa = await api.get<any>('/caixa/atual')
    caixaStore.aberto     = statusCaixa?.aberto || false
    caixaStore.caixaAtual = statusCaixa?.caixa  || null
  } catch {}
})
</script>
