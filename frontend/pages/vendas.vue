<template>
  <div
    class="h-screen flex flex-col overflow-hidden transition-colors duration-200 com-sidebar"
    :class="caixaAberto ? 'lg:pr-72 xl:pr-80' : ''"
  >
    <Sidebar />
    <Navbar />

    <!-- CAIXA FECHADO -->
    <div v-if="!caixaAberto" class="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8">
      <div class="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] flex items-center justify-center">
        <LockKeyhole :size="32" class="text-gray-300 dark:text-white/20" />
      </div>
      <div>
        <h3 class="text-xl font-black text-gray-400 dark:text-white/60">Caixa fechado</h3>
        <p class="text-sm text-gray-500 dark:text-white/40 mt-1.5 max-w-xs">
          {{ isAdmin
            ? 'Use o botão "Abrir Caixa" na barra superior para iniciar as vendas.'
            : 'O administrador precisa abrir o caixa para iniciar as vendas.' }}
        </p>
      </div>
    </div>

    <!-- POS DE VENDA DIRETA -->
    <VendaDireta v-else />

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { LockKeyhole } from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import VendaDireta from '~/components/venda/VendaDireta.vue'
import { useApi } from '~/services/api'
import { useCaixaStore } from '~/stores/caixa'
import { useAuthStore }  from '~/stores/auth'
import { useSocket } from '~/services/socket'

definePageMeta({ layout: false })

const api         = useApi()
const caixaStore  = useCaixaStore()
const authStore   = useAuthStore()
const socket      = useSocket()

const isAdmin     = computed(() => authStore.usuario?.cargo === 'administrador')
const caixaAberto = computed(() => caixaStore.aberto)

async function atualizarStatusCaixa() {
  try {
    const statusCaixa = await api.get<any>('/caixa/atual')
    caixaStore.aberto     = statusCaixa?.aberto || false
    caixaStore.caixaAtual = statusCaixa?.caixa  || null
  } catch {}
}

let pararDeEscutar: (() => void) | null = null

onMounted(async () => {
  await atualizarStatusCaixa()

  // Conexão do socket é gerenciada globalmente em plugins/socket.client.ts
  pararDeEscutar = socket.on('caixa:atualizado', atualizarStatusCaixa)
})

onUnmounted(() => {
  pararDeEscutar?.()
})
</script>
