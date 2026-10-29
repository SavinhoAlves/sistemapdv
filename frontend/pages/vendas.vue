<template>
  <div
    class="h-screen flex flex-col overflow-hidden transition-colors duration-200 com-sidebar"
    :class="caixaAberto ? 'lg:pr-[360px] xl:pr-[400px]' : ''"
  >
    <!-- Sem trava de entrada: com RFID ligado, a venda pede o cartão ao confirmar (VendaDireta) -->
    <Sidebar />
    <Navbar />

    <!-- CAIXA FECHADO -->
    <div v-if="!caixaAberto" class="flex-1 relative">
      <CaixaFechado acao="iniciar as vendas" />
    </div>

    <!-- POS DE VENDA DIRETA -->
    <VendaDireta v-else />

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import VendaDireta from '~/components/venda/VendaDireta.vue'
import { useApi } from '~/services/api'
import { useCaixaStore }   from '~/stores/caixa'
import { useAuthStore }    from '~/stores/auth'
import { useSocket } from '~/services/socket'
import { aoMudarCaixa } from '~/lib/eventosCaixa'

definePageMeta({ layout: false })

const router       = useRouter()
const api          = useApi()
const caixaStore   = useCaixaStore()
const authStore    = useAuthStore()
const socket       = useSocket()

const caixaAberto = computed(() => caixaStore.aberto)

// ── Caixa ──────────────────────────────────────────────────
async function atualizarStatusCaixa() {
  try {
    const statusCaixa = await api.get<any>('/caixa/atual')
    caixaStore.aberto     = statusCaixa?.aberto || false
    caixaStore.caixaAtual = statusCaixa?.caixa  || null
  } catch {}
}

let pararDeEscutar: (() => void) | null = null

onMounted(async () => {
  // Sem permissão de caixa (ex.: garçom), a venda direta não passaria no servidor
  if (!authStore.temPermissao('gerenciarCaixa')) return router.replace('/mesas')

  await atualizarStatusCaixa()

  // Conexão do socket é gerenciada globalmente em plugins/socket.client.ts
  pararDeEscutar = aoMudarCaixa(socket, atualizarStatusCaixa)
})

onUnmounted(() => {
  pararDeEscutar?.()
})
</script>
