<template>
  <div class="min-h-screen bg-neutral-100 dark:bg-neutral-950 transition-colors duration-200">

    <!-- HEADER DA PÁGINA -->
    <div class="pt-6 sm:pt-8 pb-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Dashboard</h1>
          <p class="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
            {{ saudacao }}, <span class="font-bold text-neutral-600 dark:text-neutral-300">{{ usuarioNome }}</span> ·
            {{ dataHoje }}
          </p>
        </div>
        <button
          @click="carregar"
          class="flex items-center gap-2 h-9 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
          :class="carregando ? 'opacity-50 pointer-events-none' : ''"
        >
          <RefreshCw :size="13" :class="carregando ? 'animate-spin' : ''" />
          Atualizar
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8">

      <!-- CARDS DE STATS -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div class="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div class="flex items-start justify-between mb-4">
            <span class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Faturamento Hoje</span>
            <div class="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-950/50 flex items-center justify-center">
              <TrendingUp :size="15" class="text-green-600 dark:text-green-500" />
            </div>
          </div>
          <p class="text-xl sm:text-3xl font-black text-neutral-900 dark:text-white leading-none">
            <span v-if="carregando" class="inline-block w-32 h-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-lg"></span>
            <span v-else>R$ {{ fmtMoeda(stats.faturamentoHoje) }}</span>
          </p>
          <p class="text-xs text-neutral-400 dark:text-neutral-600 mt-2 font-medium">
            {{ stats.pagamentosHoje }} pagamento{{ stats.pagamentosHoje !== 1 ? 's' : '' }} confirmado{{ stats.pagamentosHoje !== 1 ? 's' : '' }}
          </p>
        </div>

        <div class="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div class="flex items-start justify-between mb-4">
            <span class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Mesas Abertas</span>
            <div class="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
              <LayoutGrid :size="15" class="text-orange-500" />
            </div>
          </div>
          <p class="text-xl sm:text-3xl font-black text-neutral-900 dark:text-white leading-none">
            <span v-if="carregando" class="inline-block w-16 h-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-lg"></span>
            <span v-else>{{ stats.mesasAbertas }}</span>
          </p>
          <p class="text-xs text-neutral-400 dark:text-neutral-600 mt-2 font-medium">em atendimento agora</p>
        </div>

        <div class="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div class="flex items-start justify-between mb-4">
            <span class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Pedidos Hoje</span>
            <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
              <ClipboardList :size="15" class="text-blue-500" />
            </div>
          </div>
          <p class="text-xl sm:text-3xl font-black text-neutral-900 dark:text-white leading-none">
            <span v-if="carregando" class="inline-block w-16 h-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-lg"></span>
            <span v-else>{{ stats.pedidosHoje }}</span>
          </p>
          <p class="text-xs text-neutral-400 dark:text-neutral-600 mt-2 font-medium">comandas abertas no dia</p>
        </div>

        <div class="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div class="flex items-start justify-between mb-4">
            <span class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Ticket Médio</span>
            <div class="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center">
              <Receipt :size="15" class="text-purple-500" />
            </div>
          </div>
          <p class="text-xl sm:text-3xl font-black text-neutral-900 dark:text-white leading-none">
            <span v-if="carregando" class="inline-block w-28 h-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-lg"></span>
            <span v-else>R$ {{ fmtMoeda(stats.ticketMedio) }}</span>
          </p>
          <p class="text-xs text-neutral-400 dark:text-neutral-600 mt-2 font-medium">por pagamento hoje</p>
        </div>

      </div>

      <!-- LINHA INFERIOR: PAGAMENTOS RECENTES + MÉTODOS -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- PAGAMENTOS RECENTES -->
        <div class="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div class="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <h2 class="text-sm font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Últimos Pagamentos</h2>
            <span class="text-xs text-neutral-400 dark:text-neutral-600 font-medium">8 mais recentes</span>
          </div>

          <div v-if="carregando" class="p-6 space-y-3">
            <div v-for="n in 5" :key="n" class="h-12 bg-neutral-50 dark:bg-neutral-800 animate-pulse rounded-xl"></div>
          </div>

          <div v-else-if="!stats.pagamentosRecentes?.length" class="flex flex-col items-center justify-center py-16 text-center px-6">
            <div class="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
              <Receipt :size="20" class="text-neutral-300 dark:text-neutral-600" />
            </div>
            <p class="text-sm font-bold text-neutral-400 dark:text-neutral-600">Nenhum pagamento registrado hoje</p>
          </div>

          <div v-else class="divide-y divide-neutral-50 dark:divide-neutral-800">
            <div
              v-for="pag in stats.pagamentosRecentes"
              :key="pag.id"
              class="flex items-center gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                :class="corMetodo(pag.metodo).bg">
                <component :is="iconeMetodo(pag.metodo)" :size="16"
                  :class="corMetodo(pag.metodo).icon" stroke-width="1.8" />
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">
                  Mesa {{ pag.nome_mesa || '#' + pag.id }}
                </p>
                <p class="text-xs text-neutral-400 dark:text-neutral-600">{{ pag.metodo }} · {{ fmtHora(pag.created_at) }}</p>
              </div>

              <div class="text-right shrink-0">
                <p class="text-sm font-black text-neutral-900 dark:text-white">R$ {{ fmtMoeda(pag.valor) }}</p>
                <p v-if="pag.troco > 0" class="text-xs text-green-500 font-medium">
                  Troco R$ {{ fmtMoeda(pag.troco) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- COLUNA DIREITA -->
        <div class="space-y-4">

          <!-- STATUS DO CAIXA -->
          <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-6">
            <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-4">Status do Caixa</h2>
            <div v-if="caixaStore.caixaAtual" class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-400 animate-pulse"></div>
                <span class="text-sm font-black text-green-600 dark:text-green-500">Caixa Aberto</span>
              </div>
              <div class="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div class="flex justify-between text-xs">
                  <span class="text-neutral-400 dark:text-neutral-600 font-medium">Abertura</span>
                  <span class="font-bold text-neutral-700 dark:text-neutral-300">{{ fmtDataHora(caixaStore.caixaAtual.data_abertura) }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-neutral-400 dark:text-neutral-600 font-medium">Valor inicial</span>
                  <span class="font-bold text-neutral-700 dark:text-neutral-300">R$ {{ fmtMoeda(caixaStore.caixaAtual.valor_inicial) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="flex items-center gap-3">
              <div class="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <span class="text-sm font-black text-red-500">Caixa Fechado</span>
            </div>
          </div>

          <!-- MÉTODOS DE PAGAMENTO HOJE -->
          <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-6">
            <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-4">Métodos Hoje</h2>

            <div v-if="carregando" class="space-y-3">
              <div v-for="n in 3" :key="n" class="h-8 bg-neutral-50 dark:bg-neutral-800 animate-pulse rounded-lg"></div>
            </div>

            <div v-else-if="!stats.metodosPie?.length" class="text-xs text-neutral-400 dark:text-neutral-600 font-medium py-2">
              Sem dados para hoje
            </div>

            <div v-else class="space-y-3">
              <div v-for="m in stats.metodosPie" :key="m.metodo" class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="font-bold text-neutral-700 dark:text-neutral-300">{{ m.metodo }}</span>
                  <span class="text-neutral-400 dark:text-neutral-500 font-medium">R$ {{ fmtMoeda(m.total) }}</span>
                </div>
                <div class="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-orange-400 rounded-full transition-all duration-700"
                    :style="{ width: pctMetodo(m.total) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  TrendingUp, LayoutGrid, ClipboardList, Receipt,
  RefreshCw, Banknote, QrCode, CreditCard, UtensilsCrossed, Wallet
} from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useCaixaStore } from '~/stores/caixa'
import { useApi } from '~/services/api'

const router     = useRouter()
const authStore  = useAuthStore()
const caixaStore = useCaixaStore()
const api        = useApi()

const carregando = ref(true)
const stats = ref({
  faturamentoHoje:    0,
  pagamentosHoje:     0,
  mesasAbertas:       0,
  pedidosHoje:        0,
  ticketMedio:        0,
  pagamentosRecentes: [] as any[],
  metodosPie:         [] as any[]
})

const usuarioNome = computed(() => authStore.usuario?.nome?.split(' ')[0] || 'Operador')

const saudacao = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
})

const dataHoje = computed(() =>
  new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
)

const totalMetodos = computed(() =>
  stats.value.metodosPie.reduce((s: number, m: any) => s + Number(m.total), 0)
)

function pctMetodo(val: number) {
  return totalMetodos.value > 0 ? Math.round((Number(val) / totalMetodos.value) * 100) : 0
}

function fmtMoeda(v: number) {
  return Number(v || 0).toFixed(2).replace('.', ',')
}

function fmtHora(dt: string) {
  return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDataHora(dt: string) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function iconeMetodo(nome: string) {
  const n = (nome || '').toLowerCase()
  if (n.includes('dinheiro'))  return Banknote
  if (n.includes('pix'))       return QrCode
  if (n.includes('crédito') || n.includes('credito')) return CreditCard
  if (n.includes('débito') || n.includes('debito'))   return CreditCard
  if (n.includes('vale'))      return UtensilsCrossed
  return Wallet
}

function corMetodo(nome: string) {
  const n = (nome || '').toLowerCase()
  if (n.includes('dinheiro'))  return { bg: 'bg-green-50',  icon: 'text-green-600' }
  if (n.includes('pix'))       return { bg: 'bg-blue-50',   icon: 'text-blue-500' }
  if (n.includes('crédito') || n.includes('credito')) return { bg: 'bg-purple-50', icon: 'text-purple-500' }
  if (n.includes('débito') || n.includes('debito'))   return { bg: 'bg-indigo-50', icon: 'text-indigo-500' }
  if (n.includes('vale'))      return { bg: 'bg-orange-50', icon: 'text-orange-500' }
  return { bg: 'bg-neutral-100', icon: 'text-neutral-500' }
}

// mostrarLoading só deve ser true na carga inicial (ou no clique manual em
// "Atualizar") — do contrário, o polling em segundo plano troca os dados
// reais pelos skeletons a cada atualização
async function carregar(mostrarLoading = true) {
  if (mostrarLoading) carregando.value = true
  try {
    const data = await api.get<typeof stats.value>('/dashboard/stats')
    stats.value = data
  } catch (e) {
    console.error('Erro ao carregar dashboard:', e)
  } finally {
    if (mostrarLoading) carregando.value = false
  }
}

let pollingTimer: ReturnType<typeof setInterval> | null = null

function onVisibilityChange() {
  if (!document.hidden) carregar(false)
}

onMounted(() => {
  if (!authStore.isAuthenticated) return router.push('/login')
  carregar()
  pollingTimer = setInterval(() => { if (!document.hidden) carregar(false) }, 30000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>
