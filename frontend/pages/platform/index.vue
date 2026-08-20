<template>
  <div class="min-h-screen bg-neutral-950">

    <!-- ══ TOPBAR ══ -->
    <header class="sticky top-0 z-30 border-b border-white/[0.06] bg-neutral-950/80 backdrop-blur-xl">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

        <!-- Identidade -->
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-500/30 shrink-0">
            <Globe :size="14" class="text-white" />
          </div>
          <div>
            <p class="text-white font-black text-sm leading-none tracking-tight">Plataforma Central</p>
            <p class="text-white/30 text-[10px] font-bold uppercase tracking-widest">PDV · Super Admin</p>
          </div>
        </div>

        <!-- User + Logout -->
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-1.5">
            <div class="w-5 h-5 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Shield :size="10" class="text-violet-400" />
            </div>
            <span class="text-white/70 text-xs font-bold">{{ platformAuth.user?.nome }}</span>
            <span class="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-400 uppercase tracking-wide">
              {{ platformAuth.user?.role }}
            </span>
          </div>
          <button
            @click="handleLogout"
            class="h-8 px-3 rounded-xl text-xs font-black text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all flex items-center gap-1.5"
          >
            <LogOut :size="13" />
            <span class="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ══ CONTEÚDO ══ -->
    <main class="max-w-6xl mx-auto px-6 py-8">

      <!-- Título + busca -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-black text-white tracking-tight">Restaurantes</h1>
          <p class="text-white/40 text-sm mt-0.5">{{ tenants.length }} tenant(s) cadastrado(s)</p>
        </div>
        <div class="relative">
          <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            v-model="busca"
            type="text"
            placeholder="Buscar restaurante..."
            class="h-9 pl-9 pr-4 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all w-60"
          />
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div v-for="stat in stats" :key="stat.label"
          class="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-6 h-6 rounded-lg flex items-center justify-center" :class="stat.iconBg">
              <component :is="stat.icon" :size="12" :class="stat.iconColor" />
            </div>
            <p class="text-white/40 text-[10px] font-black uppercase tracking-widest">{{ stat.label }}</p>
          </div>
          <p class="text-2xl font-black text-white">{{ stat.value }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <Loader2 :size="28" class="animate-spin text-violet-500" />
      </div>

      <!-- Erro -->
      <div v-else-if="erro" class="text-center py-16">
        <div class="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle :size="24" class="text-red-400" />
        </div>
        <p class="text-white/60 font-bold mb-1">{{ erro }}</p>
        <button @click="carregar" class="text-violet-400 text-sm font-bold hover:text-violet-300 transition-colors">
          Tentar novamente
        </button>
      </div>

      <!-- Lista de tenants -->
      <div v-else class="space-y-3">
        <TransitionGroup name="list">
          <div
            v-for="tenant in tenantsFiltrados"
            :key="tenant.id"
            class="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.07] rounded-2xl p-5 transition-all"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              <!-- Info do tenant -->
              <div class="flex items-start gap-4 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center shrink-0">
                  <Building2 :size="18" class="text-white/40" />
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-white font-black truncate">{{ tenant.nome }}</p>
                    <span
                      class="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                      :class="statusBadge(tenant.status)"
                    >{{ tenant.status }}</span>
                  </div>
                  <p class="text-white/30 text-xs font-mono mt-0.5">{{ tenant.slug }}</p>
                  <div class="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span v-if="tenant.cnpj" class="text-white/25 text-[11px]">CNPJ: {{ tenant.cnpj }}</span>
                    <span v-if="tenant.responsavel" class="text-white/25 text-[11px]">{{ tenant.responsavel }}</span>
                    <span v-if="tenant.telefone" class="text-white/25 text-[11px]">{{ tenant.telefone }}</span>
                  </div>
                </div>
              </div>

              <!-- Toggles de features -->
              <div class="flex items-center gap-4 shrink-0 pl-14 sm:pl-0">

                <!-- Venda Mobile (read-only aqui, gerenciado pelo tenant) -->
                <div class="flex flex-col items-center gap-1.5">
                  <div
                    class="w-8 h-8 rounded-xl flex items-center justify-center border"
                    :class="tenant.venda_mobile_permitida
                      ? 'bg-blue-500/10 border-blue-500/20'
                      : 'bg-white/[0.03] border-white/[0.06]'"
                    :title="tenant.venda_mobile_permitida ? 'Venda mobile permitida' : 'Venda mobile bloqueada'"
                  >
                    <Smartphone
                      :size="14"
                      :class="tenant.venda_mobile_permitida ? 'text-blue-400' : 'text-white/20'"
                    />
                  </div>
                  <p class="text-[9px] font-black uppercase tracking-wide text-white/25">Mobile</p>
                </div>

                <!-- RFID toggle — controlado pelo super admin -->
                <div class="flex flex-col items-center gap-1.5">
                  <button
                    @click="toggleRfid(tenant)"
                    :disabled="togglingId === tenant.id"
                    class="w-8 h-8 rounded-xl flex items-center justify-center border transition-all"
                    :class="tenant.rfid_disponivel
                      ? 'bg-violet-500/15 border-violet-500/30 hover:bg-violet-500/25'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10'"
                    :title="tenant.rfid_disponivel ? 'RFID habilitado — clique para desabilitar' : 'RFID desabilitado — clique para habilitar'"
                  >
                    <Loader2 v-if="togglingId === tenant.id" :size="14" class="animate-spin text-violet-400" />
                    <CreditCard v-else :size="14" :class="tenant.rfid_disponivel ? 'text-violet-400' : 'text-white/20'" />
                  </button>
                  <p class="text-[9px] font-black uppercase tracking-wide"
                    :class="tenant.rfid_disponivel ? 'text-violet-400' : 'text-white/25'">
                    RFID
                  </p>
                </div>

              </div>
            </div>
          </div>
        </TransitionGroup>

        <div v-if="!tenantsFiltrados.length && !loading" class="text-center py-16 text-white/30 text-sm font-bold">
          Nenhum restaurante encontrado
        </div>
      </div>
    </main>

    <!-- Toast inline -->
    <Transition name="toast">
      <div
        v-if="toast.text"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl"
        :class="toast.type === 'success'
          ? 'bg-emerald-500 text-white'
          : 'bg-red-500 text-white'"
      >
        <CheckCircle2 v-if="toast.type === 'success'" :size="15" />
        <AlertCircle  v-else :size="15" />
        {{ toast.text }}
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import {
  Globe, Shield, LogOut, Search, Building2, CreditCard, Smartphone,
  Loader2, AlertCircle, CheckCircle2, ToggleRight, Store,
} from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

interface Tenant {
  id:                    string
  nome:                  string
  slug:                  string
  cnpj:                  string | null
  responsavel:           string | null
  telefone:              string | null
  status:                string
  rfid_disponivel:       boolean
  venda_mobile_permitida: boolean
}

const platformAuth  = usePlatformAuthStore()
const runtimeConfig = useRuntimeConfig()

const tenants    = ref<Tenant[]>([])
const loading    = ref(false)
const erro       = ref('')
const busca      = ref('')
const togglingId = ref<string | null>(null)
const toast      = reactive({ text: '', type: 'success' as 'success' | 'error' })

const baseUrl = computed(() => (runtimeConfig.public as any).apiUrl as string)

const tenantsFiltrados = computed(() => {
  const q = busca.value.toLowerCase().trim()
  if (!q) return tenants.value
  return tenants.value.filter(t =>
    t.nome.toLowerCase().includes(q) ||
    t.slug.toLowerCase().includes(q) ||
    (t.responsavel || '').toLowerCase().includes(q)
  )
})

const stats = computed(() => [
  {
    label: 'Total',
    value: tenants.value.length,
    icon: Store,
    iconBg: 'bg-white/[0.06]',
    iconColor: 'text-white/40',
  },
  {
    label: 'Ativos',
    value: tenants.value.filter(t => t.status === 'ativo').length,
    icon: CheckCircle2,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  {
    label: 'RFID on',
    value: tenants.value.filter(t => t.rfid_disponivel).length,
    icon: CreditCard,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
  },
  {
    label: 'Suspensos',
    value: tenants.value.filter(t => t.status === 'suspenso').length,
    icon: AlertCircle,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
])

function statusBadge(status: string) {
  if (status === 'ativo')     return 'bg-emerald-500/15 text-emerald-400'
  if (status === 'suspenso')  return 'bg-amber-500/15 text-amber-400'
  if (status === 'cancelado') return 'bg-red-500/15 text-red-400'
  return 'bg-white/[0.06] text-white/40'
}

function showToast(type: 'success' | 'error', text: string) {
  toast.type = type
  toast.text = text
  setTimeout(() => { toast.text = '' }, 3000)
}

async function platformFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${baseUrl.value}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${platformAuth.token}`,
      ...(options.headers as Record<string, string> || {}),
    },
  })
  if (resp.status === 401) {
    platformAuth.logout()
    navigateTo('/platform/login')
    throw new Error('Sessão expirada')
  }
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`)
  return data as T
}

async function carregar() {
  loading.value = true
  erro.value    = ''
  try {
    const data = await platformFetch<Tenant[]>('/platform/tenants')
    tenants.value = data
  } catch (e: any) {
    erro.value = e?.message || 'Erro ao carregar tenants'
  } finally {
    loading.value = false
  }
}

async function toggleRfid(tenant: Tenant) {
  if (togglingId.value) return
  togglingId.value = tenant.id
  const novoValor  = !tenant.rfid_disponivel
  try {
    await platformFetch(`/platform/tenants/${tenant.id}/rfid`, {
      method: 'PATCH',
      body:   JSON.stringify({ disponivel: novoValor }),
    })
    tenant.rfid_disponivel = novoValor
    showToast('success', novoValor
      ? `RFID habilitado para ${tenant.nome}`
      : `RFID desabilitado para ${tenant.nome}`)
  } catch (e: any) {
    showToast('error', e?.message || 'Erro ao atualizar RFID')
  } finally {
    togglingId.value = null
  }
}

async function handleLogout() {
  const rt = localStorage.getItem('platform_refresh_token')
  if (rt) {
    try {
      await platformFetch('/platform/auth/logout', {
        method: 'POST',
        body:   JSON.stringify({ refreshToken: rt }),
      })
    } catch {}
  }
  platformAuth.logout()
  navigateTo('/platform/login')
}

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) {
    navigateTo('/platform/login')
    return
  }
  carregar()
})
</script>

<style scoped>
.list-enter-active, .list-leave-active { transition: all 0.2s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-6px); }

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }
</style>
