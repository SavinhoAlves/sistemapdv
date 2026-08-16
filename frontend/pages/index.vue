<template>
  <div class="min-h-screen com-sidebar">

    <!-- HEADER -->
    <div class="relative">
      <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-orange-500/[0.06] to-transparent pointer-events-none"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 relative flex items-end justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-2.5">
            <div class="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/60 animate-pulse"></div>
            <p class="text-[11px] font-black uppercase tracking-[0.15em] text-orange-500/70">{{ dataHoje }}</p>
          </div>
          <h1 class="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
            {{ saudacao }},
            <span class="text-orange-400">{{ usuarioNome }}</span>
          </h1>
          <p class="text-sm text-gray-400 dark:text-white/30 mt-1.5 font-medium">Resumo de hoje em tempo real</p>
        </div>
        <button
          @click="carregar"
          :class="carregando ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-100 dark:hover:bg-white/[0.08]'"
          class="shrink-0 flex items-center gap-2 h-9 px-4 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.07] text-gray-500 dark:text-white/50 text-xs font-bold transition-all"
        >
          <RefreshCw :size="13" :class="carregando ? 'animate-spin' : ''" />
          Atualizar
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-5">

      <!-- KPI CARDS -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <!-- Faturamento -->
        <div class="relative overflow-hidden rounded-2xl">
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.12] via-transparent to-transparent"></div>
          <div class="relative bg-white dark:bg-white/[0.04] backdrop-blur-xl border border-gray-200 dark:border-white/[0.07] rounded-2xl p-5 h-full flex flex-col">
            <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent"></div>
            <div class="flex items-start justify-between mb-4">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                <TrendingUp :size="15" class="text-emerald-400" />
              </div>
              <span class="text-[9px] font-black uppercase tracking-[0.12em] text-gray-400 dark:text-white/25 mt-0.5">Faturamento</span>
            </div>
            <p class="text-2xl sm:text-[1.75rem] font-black text-gray-900 dark:text-white leading-none tabular-nums mt-auto">
              <span v-if="carregando" class="inline-block w-24 h-7 bg-gray-100 dark:bg-white/[0.06] animate-pulse rounded-lg"></span>
              <span v-else>R$&nbsp;{{ fmtMoeda(stats.faturamentoHoje) }}</span>
            </p>
            <p class="text-xs text-gray-400 dark:text-white/30 mt-2 font-medium tabular-nums">
              {{ stats.pagamentosHoje }} pgto{{ stats.pagamentosHoje !== 1 ? 's' : '' }}
            </p>
          </div>
        </div>

        <!-- Mesas Abertas -->
        <div class="relative overflow-hidden rounded-2xl">
          <div class="absolute inset-0 bg-gradient-to-br from-orange-500/[0.12] via-transparent to-transparent"></div>
          <div class="relative bg-white dark:bg-white/[0.04] backdrop-blur-xl border border-gray-200 dark:border-white/[0.07] rounded-2xl p-5 h-full flex flex-col">
            <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-400/25 to-transparent"></div>
            <div class="flex items-start justify-between mb-4">
              <div class="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center">
                <LayoutGrid :size="15" class="text-orange-400" />
              </div>
              <span class="text-[9px] font-black uppercase tracking-[0.12em] text-gray-400 dark:text-white/25 mt-0.5">Mesas</span>
            </div>
            <p class="text-2xl sm:text-[1.75rem] font-black text-gray-900 dark:text-white leading-none tabular-nums mt-auto">
              <span v-if="carregando" class="inline-block w-12 h-7 bg-gray-100 dark:bg-white/[0.06] animate-pulse rounded-lg"></span>
              <span v-else>{{ stats.mesasAbertas }}</span>
            </p>
            <p class="text-xs text-gray-400 dark:text-white/30 mt-2 font-medium">em atendimento agora</p>
          </div>
        </div>

        <!-- Pedidos -->
        <div class="relative overflow-hidden rounded-2xl">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-500/[0.12] via-transparent to-transparent"></div>
          <div class="relative bg-white dark:bg-white/[0.04] backdrop-blur-xl border border-gray-200 dark:border-white/[0.07] rounded-2xl p-5 h-full flex flex-col">
            <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/25 to-transparent"></div>
            <div class="flex items-start justify-between mb-4">
              <div class="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center">
                <ClipboardList :size="15" class="text-blue-400" />
              </div>
              <span class="text-[9px] font-black uppercase tracking-[0.12em] text-gray-400 dark:text-white/25 mt-0.5">Pedidos</span>
            </div>
            <p class="text-2xl sm:text-[1.75rem] font-black text-gray-900 dark:text-white leading-none tabular-nums mt-auto">
              <span v-if="carregando" class="inline-block w-12 h-7 bg-gray-100 dark:bg-white/[0.06] animate-pulse rounded-lg"></span>
              <span v-else>{{ stats.pedidosHoje }}</span>
            </p>
            <p class="text-xs text-gray-400 dark:text-white/30 mt-2 font-medium">comandas no dia</p>
          </div>
        </div>

        <!-- Ticket Médio -->
        <div class="relative overflow-hidden rounded-2xl">
          <div class="absolute inset-0 bg-gradient-to-br from-violet-500/[0.12] via-transparent to-transparent"></div>
          <div class="relative bg-white dark:bg-white/[0.04] backdrop-blur-xl border border-gray-200 dark:border-white/[0.07] rounded-2xl p-5 h-full flex flex-col">
            <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-400/25 to-transparent"></div>
            <div class="flex items-start justify-between mb-4">
              <div class="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                <Receipt :size="15" class="text-violet-400" />
              </div>
              <span class="text-[9px] font-black uppercase tracking-[0.12em] text-gray-400 dark:text-white/25 mt-0.5">Ticket Médio</span>
            </div>
            <p class="text-2xl sm:text-[1.75rem] font-black text-gray-900 dark:text-white leading-none tabular-nums mt-auto">
              <span v-if="carregando" class="inline-block w-20 h-7 bg-gray-100 dark:bg-white/[0.06] animate-pulse rounded-lg"></span>
              <span v-else>R$&nbsp;{{ fmtMoeda(stats.ticketMedio) }}</span>
            </p>
            <p class="text-xs text-gray-400 dark:text-white/30 mt-2 font-medium">por pagamento hoje</p>
          </div>
        </div>

      </div>

      <!-- LINHA INFERIOR -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- PAGAMENTOS RECENTES -->
        <div class="lg:col-span-2 bg-white dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.07] overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 dark:border-white/[0.05] flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Receipt :size="13" class="text-orange-400" />
              </div>
              <h2 class="text-sm font-black text-gray-900 dark:text-white">Últimos Pagamentos</h2>
            </div>
            <span class="text-[11px] text-gray-400 dark:text-white/25 font-medium">8 mais recentes</span>
          </div>

          <div v-if="carregando" class="p-4 space-y-2">
            <div v-for="n in 5" :key="n" class="h-14 bg-gray-100 dark:bg-white/[0.04] animate-pulse rounded-xl"></div>
          </div>

          <div v-else-if="!stats.pagamentosRecentes?.length" class="flex flex-col items-center justify-center py-16 text-center px-6">
            <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.07] flex items-center justify-center mb-3">
              <Receipt :size="20" class="text-gray-300 dark:text-white/15" />
            </div>
            <p class="text-sm font-bold text-gray-400 dark:text-white/20">Nenhum pagamento registrado hoje</p>
          </div>

          <div v-else class="divide-y divide-gray-100 dark:divide-white/[0.04]">
            <div
              v-for="pag in stats.pagamentosRecentes"
              :key="pag.id"
              class="flex items-center gap-3.5 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
            >
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" :class="corMetodo(pag.metodo).bg">
                <component :is="iconeMetodo(pag.metodo)" :size="15" :class="corMetodo(pag.metodo).icon" :stroke-width="1.8" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-800 dark:text-white/85 truncate">
                  {{ pag.nome_mesa || 'Venda #' + pag.id }}
                </p>
                <p class="text-xs text-gray-400 dark:text-white/30">{{ pag.metodo }} · {{ fmtHora(pag.created_at) }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-black text-gray-900 dark:text-white tabular-nums">R$&nbsp;{{ fmtMoeda(pag.valor) }}</p>
                <p v-if="pag.troco > 0" class="text-[11px] text-emerald-500 dark:text-emerald-400 font-medium tabular-nums">Troco R$&nbsp;{{ fmtMoeda(pag.troco) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- COLUNA DIREITA -->
        <div class="space-y-4">

          <!-- STATUS DO CAIXA -->
          <div class="relative overflow-hidden bg-white dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.07] p-5">
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Landmark :size="13" class="text-orange-400" />
              </div>
              <h2 class="text-sm font-black text-gray-900 dark:text-white">Status do Caixa</h2>
            </div>
            <div v-if="caixaStore.caixaAtual" class="space-y-3">
              <div class="flex items-center gap-2.5">
                <div class="relative w-2 h-2">
                  <div class="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60"></div>
                  <div class="relative w-2 h-2 rounded-full bg-emerald-400"></div>
                </div>
                <span class="text-sm font-black text-emerald-500 dark:text-emerald-400">Aberto</span>
              </div>
              <div class="space-y-2 pt-2 border-t border-gray-100 dark:border-white/[0.05]">
                <div class="flex justify-between text-xs">
                  <span class="text-gray-400 dark:text-white/30 font-medium">Abertura</span>
                  <span class="font-bold text-gray-600 dark:text-white/70">{{ fmtDataHora(caixaStore.caixaAtual.data_abertura) }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-gray-400 dark:text-white/30 font-medium">Valor inicial</span>
                  <span class="font-bold text-gray-600 dark:text-white/70 tabular-nums">R$&nbsp;{{ fmtMoeda(caixaStore.caixaAtual.valor_inicial) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="flex items-center gap-2.5">
              <div class="w-2 h-2 rounded-full bg-gray-200 dark:bg-white/10"></div>
              <span class="text-sm font-bold text-gray-400 dark:text-white/25">Caixa Fechado</span>
            </div>
          </div>

          <!-- MÉTODOS DE PAGAMENTO -->
          <div class="bg-white dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.07] p-5">
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <CreditCard :size="13" class="text-orange-400" />
              </div>
              <h2 class="text-sm font-black text-gray-900 dark:text-white">Métodos Hoje</h2>
            </div>

            <div v-if="carregando" class="space-y-3">
              <div v-for="n in 3" :key="n" class="h-8 bg-gray-100 dark:bg-white/[0.04] animate-pulse rounded-lg"></div>
            </div>

            <p v-else-if="!stats.metodosPie?.length" class="text-xs text-gray-400 dark:text-white/25 font-medium py-2">Sem dados para hoje</p>

            <div v-else class="space-y-4">
              <div v-for="m in stats.metodosPie" :key="m.metodo">
                <div class="flex justify-between text-xs mb-1.5">
                  <span class="font-bold text-gray-600 dark:text-white/70">{{ m.metodo }}</span>
                  <span class="text-gray-400 dark:text-white/40 tabular-nums font-mono">R$&nbsp;{{ fmtMoeda(m.total) }}</span>
                </div>
                <div class="h-1 bg-gray-100 dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-700"
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
  TrendingUp, LayoutGrid, ClipboardList, Receipt, Landmark,
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
  if (n.includes('dinheiro'))  return { bg: 'bg-emerald-500/15', icon: 'text-emerald-400' }
  if (n.includes('pix'))       return { bg: 'bg-blue-500/15',    icon: 'text-blue-400' }
  if (n.includes('crédito') || n.includes('credito')) return { bg: 'bg-purple-500/15', icon: 'text-purple-400' }
  if (n.includes('débito') || n.includes('debito'))   return { bg: 'bg-indigo-500/15', icon: 'text-indigo-400' }
  if (n.includes('vale'))      return { bg: 'bg-orange-500/15',  icon: 'text-orange-400' }
  return { bg: 'bg-gray-100 dark:bg-white/[0.06]', icon: 'text-gray-500 dark:text-white/40' }
}

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
