<template>
  <div class="min-h-dvh bg-[#0b0b12] flex">

    <!-- ══ SIDEBAR ══ -->
    <aside class="hidden lg:flex flex-col w-60 shrink-0 border-r border-white/[0.06] sticky top-0 h-screen" style="background:#0e0d18">
      <div class="h-16 px-5 flex items-center gap-3 border-b border-white/[0.06] shrink-0">
        <div class="size-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shadow-lg shadow-violet-900/60 shrink-0">
          <UIcon name="i-lucide-globe" class="text-white size-4" />
        </div>
        <div>
          <p class="text-sm font-bold text-white leading-none tracking-tight">Plataforma</p>
          <p class="text-[9px] font-semibold uppercase tracking-widest text-white/30 mt-0.5">PDV Central</p>
        </div>
      </div>

      <nav class="flex-1 px-3 py-5 space-y-1">
        <p class="text-[9px] font-bold uppercase tracking-widest text-white/20 px-3 mb-3">Menu</p>
        <NuxtLink to="/platform" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
          <div class="size-8 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-store" class="text-white/40 size-3.5" />
          </div>
          <span class="text-sm font-medium text-white/50 flex-1 truncate">Restaurantes</span>
        </NuxtLink>
        <div class="nav-active flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div class="size-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shrink-0 shadow-md shadow-violet-900/50">
            <UIcon name="i-lucide-ticket" class="text-white size-3.5" />
          </div>
          <span class="text-sm font-semibold text-white flex-1 truncate">Tickets</span>
          <span v-if="stats.abertos" class="text-[11px] font-bold text-violet-300 tabular-nums bg-violet-500/20 px-1.5 py-0.5 rounded-lg shrink-0">{{ stats.abertos }}</span>
        </div>
      </nav>

      <div class="px-3 py-4 border-t border-white/[0.06] shrink-0">
        <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group">
          <div class="size-8 rounded-xl bg-gradient-to-br from-violet-700 to-violet-900 flex items-center justify-center shrink-0">
            <span class="text-[11px] font-black text-white">{{ (platformAuth.user?.nome || 'SA')[0] }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-white/80 truncate">{{ platformAuth.user?.nome }}</p>
            <p class="text-[10px] text-white/30 truncate">Super Admin</p>
          </div>
          <button @click="modalSenha = true" title="Alterar minha senha"
            class="size-7 rounded-lg flex items-center justify-center text-white/20 hover:text-violet-300 hover:bg-violet-500/10 transition-colors opacity-0 group-hover:opacity-100">
            <UIcon name="i-lucide-key-round" class="size-3.5" />
          </button>
          <button @click="handleLogout" title="Sair"
            class="size-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
            <UIcon name="i-lucide-log-out" class="size-3.5" />
          </button>
        </div>
      </div>
    </aside>

    <PlatformChangePasswordModal v-model="modalSenha" />

    <!-- ══ ÁREA PRINCIPAL ══ -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- Topbar mobile -->
      <header class="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0 bg-[#0b0b12]/90 backdrop-blur-xl">
        <div class="flex items-center gap-2.5">
          <div class="size-7 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center">
            <UIcon name="i-lucide-globe" class="text-white size-3.5" />
          </div>
          <span class="text-sm font-bold text-white">Tickets</span>
        </div>
        <button @click="modalSenha = true" title="Alterar minha senha" class="size-8 flex items-center justify-center rounded-xl text-white/30 hover:text-violet-300 hover:bg-violet-500/10 transition-colors ml-auto mr-1">
          <UIcon name="i-lucide-key-round" class="size-4" />
        </button>
        <button @click="handleLogout" class="size-8 flex items-center justify-center rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <UIcon name="i-lucide-log-out" class="size-4" />
        </button>
      </header>

      <main class="flex-1 px-6 lg:px-10 py-8 space-y-8 w-full">

        <!-- LOADING -->
        <div v-if="loading" class="flex items-center justify-center py-48">
          <div class="flex flex-col items-center gap-4">
            <div class="size-12 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shadow-xl shadow-violet-900/40">
              <UIcon name="i-lucide-loader-2" class="animate-spin text-white size-5" />
            </div>
            <p class="text-[11px] font-semibold uppercase tracking-widest text-white/25">Carregando tickets</p>
          </div>
        </div>

        <template v-else>

          <!-- HEADER -->
          <div class="flex items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl font-black text-white tracking-tight">Tickets de Suporte</h1>
              <p class="text-sm text-white/30 mt-0.5">Chamados de todos os restaurantes</p>
            </div>
            <UButton
              color="violet" icon="i-lucide-plus" size="sm"
              :ui="{ rounded: 'rounded-xl', font: 'font-bold' }"
              @click="openCreate"
            >
              Novo ticket
            </UButton>
          </div>

          <!-- STATS -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div v-for="s in statCards" :key="s.label" class="rounded-2xl border p-4 space-y-2" :class="s.bg">
              <div class="flex items-center justify-between">
                <p class="text-[11px] font-bold uppercase tracking-widest" :class="s.label_color">{{ s.label }}</p>
                <div class="size-7 rounded-xl flex items-center justify-center" :class="s.icon_bg">
                  <UIcon :name="s.icon" class="size-3.5" :class="s.icon_color" />
                </div>
              </div>
              <p class="text-3xl font-black" :class="s.value_color">{{ s.value }}</p>
            </div>
          </div>

          <!-- FILTROS -->
          <div class="flex flex-wrap gap-3 items-center">
            <div class="flex bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 gap-1">
              <button v-for="f in statusFiltros" :key="f.value"
                @click="filtroStatus = f.value"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                :class="filtroStatus === f.value
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-900/50'
                  : 'text-white/40 hover:text-white/60'"
              >{{ f.label }}</button>
            </div>

            <UInput
              v-model="busca"
              placeholder="Buscar por título ou restaurante..."
              icon="i-lucide-search"
              size="sm"
              :ui="{ rounded: 'rounded-xl', base: 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/20' }"
              class="flex-1 min-w-[200px] max-w-xs"
            />

            <span class="text-[11px] text-white/25 ml-auto tabular-nums">{{ ticketsFiltrados.length }} resultado(s)</span>
          </div>

          <!-- LISTA DE TICKETS -->
          <div v-if="ticketsFiltrados.length === 0" class="text-center py-20">
            <div class="size-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <UIcon name="i-lucide-ticket" class="size-6 text-white/15" />
            </div>
            <p class="text-white/20 text-sm font-medium">Nenhum ticket encontrado</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="t in ticketsFiltrados" :key="t.id"
              class="group flex items-start gap-4 p-4 rounded-2xl border border-white/[0.06] hover:border-white/[0.10] hover:bg-white/[0.02] transition-all cursor-pointer"
              @click="openEdit(t)"
            >
              <!-- Prioridade -->
              <div class="mt-0.5 size-2.5 rounded-full shrink-0 mt-2" :class="prioridadeColor(t.prioridade)" />

              <!-- Conteúdo -->
              <div class="flex-1 min-w-0 space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-semibold text-white truncate">{{ t.titulo }}</p>
                  <UBadge :color="tipoCor(t.tipo)" variant="soft" size="xs">{{ tipoLabel(t.tipo) }}</UBadge>
                </div>
                <p class="text-[11px] text-white/30">
                  <span class="font-semibold text-white/50">{{ t.tenant?.nome ?? '—' }}</span>
                  · {{ formatDate(t.createdAt) }}
                </p>
                <p v-if="t.descricao" class="text-xs text-white/25 line-clamp-1">{{ t.descricao }}</p>
              </div>

              <!-- Status + ações -->
              <div class="flex items-center gap-2 shrink-0">
                <UBadge :color="statusCor(t.status)" variant="soft" size="sm" class="capitalize">
                  {{ statusLabel(t.status) }}
                </UBadge>
                <button
                  class="size-7 rounded-lg flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  @click.stop="deletarTicket(t.id)"
                  title="Excluir"
                >
                  <UIcon name="i-lucide-trash-2" class="size-3.5" />
                </button>
              </div>
            </div>
          </div>

        </template>
      </main>
    </div>

    <!-- ══ MODAL CRIAR ══ -->
    <UModal v-model="modalCriar" :ui="{ base: 'bg-[#13121e] border border-white/[0.08]', rounded: 'rounded-2xl' }">
      <UCard :ui="{ base: 'bg-transparent', ring: '', divide: 'divide-white/[0.06]', header: { padding: 'px-6 pt-6 pb-4' }, body: { padding: 'px-6 pb-6' } }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-black text-white">Novo Ticket</h3>
            <UButton icon="i-lucide-x" color="gray" variant="ghost" size="xs" :ui="{ rounded: 'rounded-xl' }" @click="modalCriar = false" />
          </div>
        </template>

        <form @submit.prevent="criarTicket" class="space-y-4">
          <UFormGroup label="Restaurante" required>
            <USelect
              v-model="form.tenantId"
              :options="tenantOpts"
              value-attribute="value"
              option-attribute="label"
              placeholder="Selecione..."
              size="sm"
              :ui="{ base: 'bg-white/[0.05] border-white/[0.08] text-white', rounded: 'rounded-xl' }"
              required
            />
          </UFormGroup>
          <div class="grid grid-cols-2 gap-3">
            <UFormGroup label="Tipo" required>
              <USelect v-model="form.tipo" :options="tipoOpts" size="sm" :ui="{ base: 'bg-white/[0.05] border-white/[0.08] text-white', rounded: 'rounded-xl' }" />
            </UFormGroup>
            <UFormGroup label="Prioridade" required>
              <USelect v-model="form.prioridade" :options="prioridadeOpts" size="sm" :ui="{ base: 'bg-white/[0.05] border-white/[0.08] text-white', rounded: 'rounded-xl' }" />
            </UFormGroup>
          </div>
          <UFormGroup label="Título" required>
            <UInput v-model="form.titulo" placeholder="Descreva o problema brevemente..." size="sm" :ui="{ base: 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/20', rounded: 'rounded-xl' }" required />
          </UFormGroup>
          <UFormGroup label="Descrição">
            <UTextarea v-model="form.descricao" placeholder="Detalhes adicionais..." :rows="3" size="sm" :ui="{ base: 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/20', rounded: 'rounded-xl' }" />
          </UFormGroup>

          <div class="flex justify-end gap-2 pt-2">
            <UButton type="button" color="gray" variant="ghost" size="sm" :ui="{ rounded: 'rounded-xl' }" @click="modalCriar = false">Cancelar</UButton>
            <UButton type="submit" color="violet" size="sm" :loading="saving" :ui="{ rounded: 'rounded-xl', font: 'font-bold' }">Criar ticket</UButton>
          </div>
        </form>
      </UCard>
    </UModal>

    <!-- ══ MODAL EDITAR ══ -->
    <UModal v-model="modalEditar" :ui="{ base: 'bg-[#13121e] border border-white/[0.08]', rounded: 'rounded-2xl' }">
      <UCard :ui="{ base: 'bg-transparent', ring: '', divide: 'divide-white/[0.06]', header: { padding: 'px-6 pt-6 pb-4' }, body: { padding: 'px-6 pb-6' } }">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-black text-white">Atualizar Ticket</h3>
              <p v-if="ticketAtual" class="text-[11px] text-white/30 mt-0.5 truncate max-w-[280px]">{{ ticketAtual.tenant?.nome }}</p>
            </div>
            <UButton icon="i-lucide-x" color="gray" variant="ghost" size="xs" :ui="{ rounded: 'rounded-xl' }" @click="modalEditar = false" />
          </div>
        </template>

        <form v-if="ticketAtual" @submit.prevent="salvarTicket" class="space-y-4">
          <UFormGroup label="Título">
            <UInput v-model="formEdit.titulo" size="sm" :ui="{ base: 'bg-white/[0.05] border-white/[0.08] text-white', rounded: 'rounded-xl' }" />
          </UFormGroup>
          <div class="grid grid-cols-3 gap-3">
            <UFormGroup label="Status">
              <USelect v-model="formEdit.status" :options="statusOpts" size="sm" :ui="{ base: 'bg-white/[0.05] border-white/[0.08] text-white', rounded: 'rounded-xl' }" />
            </UFormGroup>
            <UFormGroup label="Prioridade">
              <USelect v-model="formEdit.prioridade" :options="prioridadeOpts" size="sm" :ui="{ base: 'bg-white/[0.05] border-white/[0.08] text-white', rounded: 'rounded-xl' }" />
            </UFormGroup>
            <UFormGroup label="Tipo">
              <USelect v-model="formEdit.tipo" :options="tipoOpts" size="sm" :ui="{ base: 'bg-white/[0.05] border-white/[0.08] text-white', rounded: 'rounded-xl' }" />
            </UFormGroup>
          </div>
          <UFormGroup label="Descrição">
            <UTextarea v-model="formEdit.descricao" :rows="3" size="sm" :ui="{ base: 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/20', rounded: 'rounded-xl' }" />
          </UFormGroup>
          <UFormGroup label="Resolução">
            <UTextarea v-model="formEdit.resolucao" placeholder="Descreva a solução aplicada..." :rows="3" size="sm" :ui="{ base: 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/20', rounded: 'rounded-xl' }" />
          </UFormGroup>

          <div class="flex justify-end gap-2 pt-2">
            <UButton type="button" color="gray" variant="ghost" size="sm" :ui="{ rounded: 'rounded-xl' }" @click="modalEditar = false">Cancelar</UButton>
            <UButton type="submit" color="violet" size="sm" :loading="saving" :ui="{ rounded: 'rounded-xl', font: 'font-bold' }">Salvar</UButton>
          </div>
        </form>
      </UCard>
    </UModal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

interface Tenant   { id: string; nome: string; slug: string }
interface Ticket   { id: string; tenantId: string; tipo: string; prioridade: string; status: string; titulo: string; descricao: string | null; resolucao: string | null; createdAt: string; tenant?: { nome: string; slug: string } }
interface Stats    { abertos: number; emAndamento: number; resolvidos: number; urgentes: number }

const platformAuth  = usePlatformAuthStore()
const modalSenha        = ref(false)
const runtimeConfig = useRuntimeConfig()
const baseUrl       = computed(() => (runtimeConfig.public as any).apiUrl as string)

const loading     = ref(true)
const saving      = ref(false)
const tickets     = ref<Ticket[]>([])
const tenants     = ref<Tenant[]>([])
const stats       = ref<Stats>({ abertos: 0, emAndamento: 0, resolvidos: 0, urgentes: 0 })
const filtroStatus = ref('todos')
const busca        = ref('')
const modalCriar   = ref(false)
const modalEditar  = ref(false)
const ticketAtual  = ref<Ticket | null>(null)

const form = reactive({ tenantId: '', tipo: 'bug', prioridade: 'media', titulo: '', descricao: '' })
const formEdit = reactive({ titulo: '', tipo: '', prioridade: '', status: '', descricao: '', resolucao: '' })

const statusFiltros = [
  { value: 'todos',       label: 'Todos' },
  { value: 'aberto',      label: 'Abertos' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'resolvido',   label: 'Resolvidos' },
  { value: 'fechado',     label: 'Fechados' },
]

const tipoOpts      = ['bug', 'instalacao', 'sync', 'cobranca', 'outro'].map(v => ({ label: tipoLabel(v), value: v }))
const prioridadeOpts = ['baixa', 'media', 'alta', 'urgente'].map(v => ({ label: v.charAt(0).toUpperCase() + v.slice(1), value: v }))
const statusOpts    = ['aberto', 'em_andamento', 'resolvido', 'fechado'].map(v => ({ label: statusLabel(v), value: v }))

const tenantOpts = computed(() => tenants.value.map(t => ({ label: t.nome, value: t.id })))

const ticketsFiltrados = computed(() => {
  let list = tickets.value
  if (filtroStatus.value !== 'todos') list = list.filter(t => t.status === filtroStatus.value)
  if (busca.value.trim()) {
    const q = busca.value.toLowerCase()
    list = list.filter(t => t.titulo.toLowerCase().includes(q) || t.tenant?.nome.toLowerCase().includes(q))
  }
  return list
})

const statCards = computed(() => [
  { label: 'Abertos',      value: stats.value.abertos,      icon: 'i-lucide-inbox',      bg: 'bg-blue-500/[0.05] border-blue-500/20',    label_color: 'text-blue-400/60',   icon_bg: 'bg-blue-500/10',   icon_color: 'text-blue-400',   value_color: 'text-blue-300' },
  { label: 'Em andamento', value: stats.value.emAndamento,  icon: 'i-lucide-loader-2',   bg: 'bg-amber-500/[0.05] border-amber-500/20',  label_color: 'text-amber-400/60',  icon_bg: 'bg-amber-500/10',  icon_color: 'text-amber-400',  value_color: 'text-amber-300' },
  { label: 'Resolvidos',   value: stats.value.resolvidos,   icon: 'i-lucide-check-circle', bg: 'bg-emerald-500/[0.05] border-emerald-500/20', label_color: 'text-emerald-400/60', icon_bg: 'bg-emerald-500/10', icon_color: 'text-emerald-400', value_color: 'text-emerald-300' },
  { label: 'Urgentes',     value: stats.value.urgentes,     icon: 'i-lucide-alert-triangle', bg: 'bg-red-500/[0.05] border-red-500/20',   label_color: 'text-red-400/60',   icon_bg: 'bg-red-500/10',   icon_color: 'text-red-400',   value_color: 'text-red-300' },
])

function authHeaders() {
  return { Authorization: `Bearer ${platformAuth.token}`, 'Content-Type': 'application/json' }
}

async function fetchAll() {
  loading.value = true
  const [tRes, sRes, teRes] = await Promise.all([
    fetch(`${baseUrl.value}/api/platform/tickets`, { headers: authHeaders() }),
    fetch(`${baseUrl.value}/api/platform/tickets/stats`, { headers: authHeaders() }),
    fetch(`${baseUrl.value}/api/platform/tenants`, { headers: authHeaders() }),
  ])
  if (tRes.ok) tickets.value = await tRes.json()
  if (sRes.ok) stats.value   = await sRes.json()
  if (teRes.ok) tenants.value = await teRes.json()
  loading.value = false
}

function openCreate() {
  Object.assign(form, { tenantId: '', tipo: 'bug', prioridade: 'media', titulo: '', descricao: '' })
  modalCriar.value = true
}

function openEdit(t: Ticket) {
  ticketAtual.value = t
  Object.assign(formEdit, { titulo: t.titulo, tipo: t.tipo, prioridade: t.prioridade, status: t.status, descricao: t.descricao ?? '', resolucao: t.resolucao ?? '' })
  modalEditar.value = true
}

async function criarTicket() {
  if (!form.tenantId || !form.titulo.trim()) return
  saving.value = true
  try {
    const res = await fetch(`${baseUrl.value}/api/platform/tickets`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ tenantId: form.tenantId, tipo: form.tipo, prioridade: form.prioridade, titulo: form.titulo.trim(), descricao: form.descricao.trim() || null }),
    })
    if (res.ok) { modalCriar.value = false; await fetchAll() }
  } finally { saving.value = false }
}

async function salvarTicket() {
  if (!ticketAtual.value) return
  saving.value = true
  try {
    const res = await fetch(`${baseUrl.value}/api/platform/tickets/${ticketAtual.value.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ titulo: formEdit.titulo, tipo: formEdit.tipo, prioridade: formEdit.prioridade, status: formEdit.status, descricao: formEdit.descricao || null, resolucao: formEdit.resolucao || null }),
    })
    if (res.ok) { modalEditar.value = false; await fetchAll() }
  } finally { saving.value = false }
}

async function deletarTicket(id: string) {
  if (!confirm('Excluir este ticket?')) return
  await fetch(`${baseUrl.value}/api/platform/tickets/${id}`, { method: 'DELETE', headers: authHeaders() })
  await fetchAll()
}

async function handleLogout() {
  try {
    await fetch(`${baseUrl.value}/api/platform/auth/logout`, { method: 'POST', headers: authHeaders() })
  } finally {
    platformAuth.clear()
    navigateTo('/platform/login')
  }
}

function prioridadeColor(p: string) {
  return { urgente: 'bg-red-500', alta: 'bg-amber-500', media: 'bg-blue-500', baixa: 'bg-white/20' }[p] ?? 'bg-white/20'
}

function statusCor(s: string): string {
  return { aberto: 'blue', em_andamento: 'amber', resolvido: 'green', fechado: 'gray' }[s] ?? 'gray'
}

function statusLabel(s: string) {
  return { aberto: 'Aberto', em_andamento: 'Em andamento', resolvido: 'Resolvido', fechado: 'Fechado' }[s] ?? s
}

function tipoCor(t: string): string {
  return { bug: 'red', instalacao: 'violet', sync: 'cyan', cobranca: 'amber', outro: 'gray' }[t] ?? 'gray'
}

function tipoLabel(t: string) {
  return { bug: 'Bug', instalacao: 'Instalação', sync: 'Sync', cobranca: 'Cobrança', outro: 'Outro' }[t] ?? t
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) return navigateTo('/platform/login')
  fetchAll()
})
</script>

<style scoped>
.nav-active { background: rgba(124, 58, 237, 0.12); }
</style>
