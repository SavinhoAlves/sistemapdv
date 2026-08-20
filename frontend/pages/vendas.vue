<template>
  <div
    class="h-screen flex flex-col overflow-hidden transition-colors duration-200 com-sidebar"
    :class="caixaAberto ? 'lg:pr-72 xl:pr-80' : ''"
  >
    <!-- Gate RFID: aparece ao entrar na página (inclusive no F5) -->
    <ModalRfidAuth
      v-model="rfidAberto"
      mensagem="Aproxime o cartão RFID para acessar o PDV de Vendas"
      :erro="rfidErro"
      @auth-success="onRfidSuccess"
    />

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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { LockKeyhole } from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import VendaDireta from '~/components/venda/VendaDireta.vue'
import ModalRfidAuth from '~/components/modals/ModalRfidAuth.vue'
import { useApi } from '~/services/api'
import { useCaixaStore }   from '~/stores/caixa'
import { useAuthStore }    from '~/stores/auth'
import { useConfigStore }  from '~/stores/configuracoes'
import { useSocket } from '~/services/socket'

definePageMeta({ layout: false })

const router       = useRouter()
const api          = useApi()
const caixaStore   = useCaixaStore()
const authStore    = useAuthStore()
const configStore  = useConfigStore()
const socket       = useSocket()

const isAdmin     = computed(() => authStore.usuario?.cargo === 'administrador')
const caixaAberto = computed(() => caixaStore.aberto)

// ── Gate RFID ──────────────────────────────────────────────
const rfidAberto = ref(false)
const rfidErro   = ref('')

async function onRfidSuccess(codigo: string) {
  rfidErro.value = ''

  const sessaoAnterior = authStore.token && authStore.usuario
    ? { token: authStore.token, usuario: { ...authStore.usuario } }
    : null

  const ok = await authStore.loginWithRfid(codigo)
  if (!ok) {
    rfidErro.value = 'Cartão não reconhecido. Tente novamente.'
    return
  }

  const cargo     = authStore.usuario?.cargo
  const temAcesso = cargo === 'administrador' ||
                    (cargo !== 'garcom' && authStore.temPermissao('adicionarPedido'))

  if (!temAcesso) {
    rfidErro.value = 'Este cartão não tem permissão para acessar o PDV de Vendas.'
    if (sessaoAnterior) authStore.setAuth(sessaoAnterior.token, sessaoAnterior.usuario)
    return
  }

  rfidAberto.value = false
}

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
  if (authStore.usuario?.cargo === 'garcom') return router.replace('/mesas')

  // Abre o gate RFID se estiver ativo
  if (!configStore.carregado) await configStore.carregar().catch(() => {})
  if (configStore.rfid_ativo) rfidAberto.value = true

  await atualizarStatusCaixa()

  // Conexão do socket é gerenciada globalmente em plugins/socket.client.ts
  pararDeEscutar = socket.on('caixa:atualizado', atualizarStatusCaixa)
})

onUnmounted(() => {
  pararDeEscutar?.()
})
</script>
