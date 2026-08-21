<template>
  <div class="min-h-screen bg-neutral-950">

    <!-- ══ TOPBAR ══ -->
    <header class="sticky top-0 z-30 border-b border-white/[0.06] bg-neutral-950/80 backdrop-blur-xl">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-500/30 shrink-0">
            <Globe :size="14" class="text-white" />
          </div>
          <div>
            <p class="text-white font-black text-sm leading-none tracking-tight">Plataforma Central</p>
            <p class="text-white/30 text-[10px] font-bold uppercase tracking-widest">PDV · Super Admin</p>
          </div>
        </div>
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
          <button @click="handleLogout"
            class="h-8 px-3 rounded-xl text-xs font-black text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all flex items-center gap-1.5">
            <LogOut :size="13" /><span class="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ══ CONTEÚDO ══ -->
    <main class="max-w-6xl mx-auto px-6 py-8">

      <!-- Título + ações -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-black text-white tracking-tight">Restaurantes</h1>
          <p class="text-white/40 text-sm mt-0.5">{{ tenants.length }} tenant(s) cadastrado(s)</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
            <input v-model="busca" type="text" placeholder="Buscar..."
              class="h-9 pl-9 pr-4 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 transition-all w-48" />
          </div>
          <button @click="abrirModal(null)"
            class="h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20">
            <Plus :size="13" /> Novo Restaurante
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div v-for="stat in stats" :key="stat.label" class="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
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
        <button @click="carregar" class="text-violet-400 text-sm font-bold hover:text-violet-300 transition-colors">Tentar novamente</button>
      </div>

      <!-- Lista -->
      <div v-else class="space-y-3">
        <div v-if="!tenantsFiltrados.length" class="text-center py-16 text-white/30 text-sm font-bold">
          Nenhum restaurante encontrado
        </div>

        <div v-for="tenant in tenantsFiltrados" :key="tenant.id"
          class="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden transition-all hover:border-violet-500/20 group">
          <div class="flex flex-col sm:flex-row sm:items-center">

            <!-- Área clicável → página de detalhes -->
            <NuxtLink :to="`/platform/tenants/${tenant.id}`"
              class="flex items-start gap-4 p-5 flex-1 min-w-0 transition-all hover:bg-violet-500/[0.04] cursor-pointer">
              <div class="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center shrink-0 group-hover:border-violet-500/20 transition-colors">
                <Building2 :size="18" class="text-white/40 group-hover:text-violet-400 transition-colors" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <p class="text-white font-black truncate">{{ tenant.nome }}</p>
                  <span class="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0" :class="statusBadge(tenant.status)">
                    {{ tenant.status }}
                  </span>
                  <span v-if="tenant.licencas?.[0]"
                    class="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                    :class="licencaBadge(tenant.licencas[0].status)">
                    {{ licencaLabel(tenant.licencas[0]) }}
                  </span>
                  <span v-if="tenant.contratos?.[0]"
                    class="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 shrink-0">
                    {{ tenant.contratos[0].plano }}
                  </span>
                </div>
                <p class="text-white/30 text-xs font-mono">{{ tenant.slug }}</p>
                <div class="flex items-center gap-3 mt-1 flex-wrap">
                  <span v-if="tenant.responsavel" class="text-white/25 text-[11px]">{{ tenant.responsavel }}</span>
                  <span v-if="tenant.telefone" class="text-white/25 text-[11px]">{{ tenant.telefone }}</span>
                  <span v-if="tenant.cnpj" class="text-white/20 text-[11px] font-mono">{{ tenant.cnpj }}</span>
                </div>
              </div>
              <ChevronRight :size="16" class="text-white/10 group-hover:text-violet-400/60 transition-colors shrink-0 self-center" />
            </NuxtLink>

            <!-- Ações rápidas -->
            <div class="flex items-center gap-2 px-4 pb-4 sm:pb-0 sm:pr-4 pl-[72px] sm:pl-0 shrink-0">
              <button @click="toggleRfid(tenant)" :disabled="togglingId === tenant.id"
                class="w-8 h-8 rounded-xl flex items-center justify-center border transition-all"
                :class="tenant.rfid_disponivel ? 'bg-violet-500/15 border-violet-500/30 hover:bg-violet-500/25' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'"
                :title="tenant.rfid_disponivel ? 'Desabilitar RFID' : 'Habilitar RFID'">
                <Loader2 v-if="togglingId === tenant.id" :size="13" class="animate-spin text-violet-400" />
                <CreditCard v-else :size="13" :class="tenant.rfid_disponivel ? 'text-violet-400' : 'text-white/20'" />
              </button>

              <button @click="toggleStatus(tenant)"
                class="w-8 h-8 rounded-xl flex items-center justify-center border transition-all group/st"
                :class="tenant.status === 'ativo'
                  ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-red-500/10 hover:border-red-500/20'
                  : 'bg-amber-500/10 border-amber-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/20'"
                :title="tenant.status === 'ativo' ? 'Suspender' : 'Reativar'">
                <ToggleRight v-if="tenant.status === 'ativo'" :size="13" class="text-emerald-400 group-hover/st:text-red-400 transition-colors" />
                <ToggleLeft  v-else :size="13" class="text-amber-400 group-hover/st:text-emerald-400 transition-colors" />
              </button>

              <button @click="abrirModal(tenant)"
                class="h-8 px-3 rounded-xl text-[11px] font-black text-white/40 hover:text-white hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/10 transition-all flex items-center gap-1.5">
                <Pencil :size="12" /> Editar
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ══ MODAL CRIAR / EDITAR ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalAberto" class="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto"
          @click.self="fecharModal">
          <div class="bg-neutral-900 border border-white/[0.09] rounded-3xl w-full max-w-2xl shadow-2xl">
            <div class="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Building2 :size="16" class="text-violet-400" />
                </div>
                <div>
                  <h2 class="text-base font-black text-white">{{ form.id ? 'Editar Restaurante' : 'Novo Restaurante' }}</h2>
                  <p v-if="form.id" class="text-white/30 text-xs font-mono">{{ form.slug }}</p>
                </div>
              </div>
              <button @click="fecharModal" class="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-red-500/15 hover:text-red-400 text-white/40 flex items-center justify-center transition-all">
                <X :size="15" />
              </button>
            </div>

            <div class="flex gap-1 px-6 pt-4">
              <button v-for="aba in abas" :key="aba.id" @click="abaAtiva = aba.id"
                class="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-black transition-all"
                :class="abaAtiva === aba.id ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'">
                <component :is="aba.icon" :size="11" />{{ aba.label }}
              </button>
            </div>

            <!-- ABA DADOS -->
            <div v-if="abaAtiva === 'dados'" class="p-6 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="sm:col-span-2">
                  <label class="label-field">Nome do restaurante *</label>
                  <input v-model="form.nome" @input="autoSlug" type="text" placeholder="Ex: Restaurante Tarantela" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Slug (URL) *</label>
                  <input v-model="form.slug" type="text" placeholder="ex: tarantela" class="input-field font-mono" />
                  <p class="text-[10px] text-white/25 mt-1">Identificador único · só letras, números e hífens</p>
                </div>
                <div>
                  <label class="label-field">CNPJ</label>
                  <input v-model="form.cnpj" type="text" placeholder="00.000.000/0001-00" class="input-field font-mono" />
                </div>
                <div>
                  <label class="label-field">Responsável</label>
                  <input v-model="form.responsavel" type="text" placeholder="Nome do responsável" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Contato (e-mail)</label>
                  <input v-model="form.contato" type="email" placeholder="contato@restaurante.com" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Telefone</label>
                  <input v-model="form.telefone" type="text" placeholder="(62) 9 9999-9999" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Endereço</label>
                  <input v-model="form.endereco" type="text" placeholder="Rua, número, bairro" class="input-field" />
                </div>
                <div class="sm:col-span-2">
                  <label class="label-field">Observações</label>
                  <textarea v-model="form.observacoes" rows="2" placeholder="Anotações internas..." class="input-field resize-none"></textarea>
                </div>
              </div>
              <div class="border-t border-white/[0.07] pt-4 space-y-3">
                <p class="text-[10px] font-black uppercase tracking-widest text-white/30">Features</p>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-bold text-white">Venda Mobile</p>
                    <p class="text-[11px] text-white/30">Permite acesso via QR Code e dispositivo móvel</p>
                  </div>
                  <button @click="form.vendaMobilePermitida = !form.vendaMobilePermitida"
                    class="w-11 h-6 rounded-full transition-all relative shrink-0" :class="form.vendaMobilePermitida ? 'bg-blue-500' : 'bg-white/10'">
                    <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" :class="form.vendaMobilePermitida ? 'left-5' : 'left-0.5'" />
                  </button>
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-bold text-white">RFID Disponível</p>
                    <p class="text-[11px] text-white/30">Habilita autenticação por cartão RFID (feature paga)</p>
                  </div>
                  <button @click="form.rfidDisponivel = !form.rfidDisponivel"
                    class="w-11 h-6 rounded-full transition-all relative shrink-0" :class="form.rfidDisponivel ? 'bg-violet-500' : 'bg-white/10'">
                    <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" :class="form.rfidDisponivel ? 'left-5' : 'left-0.5'" />
                  </button>
                </div>
              </div>
            </div>

            <!-- ABA LICENÇA -->
            <div v-else-if="abaAtiva === 'licenca'" class="p-6">
              <div v-if="!form.id" class="text-center py-8 text-white/30 text-sm">
                Salve o restaurante primeiro para gerenciar a licença.
              </div>
              <div v-else class="space-y-4">
                <div class="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                  <p class="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Status</p>
                  <div class="flex gap-2">
                    <button v-for="s in licencaStatuses" :key="s.value" @click="licencaForm.status = s.value"
                      class="flex-1 h-10 rounded-xl text-xs font-black border transition-all"
                      :class="licencaForm.status === s.value ? s.activeClass : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:bg-white/[0.06]'">
                      {{ s.label }}
                    </button>
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="label-field">Data de ativação</label>
                    <input v-model="licencaForm.dataAtivacao" type="date" class="input-field" />
                  </div>
                  <div>
                    <label class="label-field">Vencimento</label>
                    <input v-model="licencaForm.dataVencimento" type="date" class="input-field" />
                  </div>
                </div>
                <div v-if="licencaAtual" class="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 text-[11px] text-white/30">
                  Licença criada em: <span class="text-white/50">{{ formatDate(licencaAtual.createdAt) }}</span>
                </div>
              </div>
            </div>

            <div v-if="erroModal" class="mx-6 mb-2 text-xs text-red-400 font-bold">{{ erroModal }}</div>

            <div class="flex gap-3 p-6 pt-2 border-t border-white/[0.07] mt-2">
              <button @click="fecharModal"
                class="flex-1 h-11 rounded-2xl border border-white/10 text-white/50 text-sm font-black hover:bg-white/[0.05] transition-all">
                Cancelar
              </button>
              <button @click="salvar" :disabled="salvando"
                class="flex-1 h-11 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 active:scale-95 text-white text-sm font-black transition-all flex items-center justify-center gap-2">
                <Loader2 v-if="salvando" :size="14" class="animate-spin" />
                {{ salvando ? 'Salvando...' : (form.id ? 'Salvar alterações' : 'Criar restaurante') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.text"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl"
        :class="toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'">
        <CheckCircle2 v-if="toast.type === 'success'" :size="15" />
        <AlertCircle  v-else :size="15" />
        {{ toast.text }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import {
  Globe, Shield, LogOut, Search, Plus, Building2, CreditCard,
  Loader2, AlertCircle, CheckCircle2, Pencil, X, Store,
  ToggleRight, ToggleLeft, FileText, ChevronRight,
} from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

interface Licenca { id: string; status: string; dataAtivacao: string | null; dataVencimento: string | null; createdAt: string }
interface Contrato { id: string; plano: string; valor: string | null; ciclo: string; status: string; dataInicio: string | null; dataFim: string | null }
interface Tenant {
  id: string; nome: string; slug: string; cnpj: string | null; contato: string | null
  responsavel: string | null; telefone: string | null; endereco: string | null; observacoes: string | null
  status: string; rfid_disponivel: boolean; venda_mobile_permitida: boolean; created_at: string
  licencas: Licenca[]; contratos: Contrato[]
}

const platformAuth  = usePlatformAuthStore()
const runtimeConfig = useRuntimeConfig()

const tenants    = ref<Tenant[]>([])
const loading    = ref(false)
const erro       = ref('')
const busca      = ref('')
const togglingId = ref<string | null>(null)
const toast      = reactive({ text: '', type: 'success' as 'success' | 'error' })

const modalAberto  = ref(false)
const abaAtiva     = ref<'dados' | 'licenca'>('dados')
const salvando     = ref(false)
const erroModal    = ref('')
const licencaAtual = ref<Licenca | null>(null)

const abas = [
  { id: 'dados',   label: 'Dados',   icon: Building2 },
  { id: 'licenca', label: 'Licença', icon: FileText   },
]
const licencaStatuses = [
  { value: 'ativado',   label: 'Ativada',   activeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
  { value: 'pendente',  label: 'Pendente',  activeClass: 'bg-amber-500/15  border-amber-500/30  text-amber-400'  },
  { value: 'bloqueado', label: 'Bloqueada', activeClass: 'bg-red-500/15    border-red-500/30    text-red-400'    },
]
const form = reactive({ id: null as string | null, nome: '', slug: '', cnpj: '', responsavel: '', contato: '', telefone: '', endereco: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
const licencaForm = reactive({ status: 'pendente', dataAtivacao: '', dataVencimento: '' })

const baseUrl = computed(() => (runtimeConfig.public as any).apiUrl as string)

const tenantsFiltrados = computed(() => {
  const q = busca.value.toLowerCase().trim()
  if (!q) return tenants.value
  return tenants.value.filter(t => t.nome.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || (t.responsavel || '').toLowerCase().includes(q))
})
const stats = computed(() => [
  { label: 'Total',     value: tenants.value.length,                                     icon: Store,        iconBg: 'bg-white/[0.06]',   iconColor: 'text-white/40'    },
  { label: 'Ativos',    value: tenants.value.filter(t => t.status === 'ativo').length,   icon: CheckCircle2, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
  { label: 'RFID on',   value: tenants.value.filter(t => t.rfid_disponivel).length,      icon: CreditCard,   iconBg: 'bg-violet-500/10',  iconColor: 'text-violet-400'  },
  { label: 'Suspensos', value: tenants.value.filter(t => t.status === 'suspenso').length, icon: AlertCircle,  iconBg: 'bg-amber-500/10',   iconColor: 'text-amber-400'   },
])

function statusBadge(s: string) { return s === 'ativo' ? 'bg-emerald-500/15 text-emerald-400' : s === 'suspenso' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400' }
function licencaBadge(s: string) { return s === 'ativado' ? 'bg-sky-500/15 text-sky-400' : s === 'pendente' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400' }
function licencaLabel(lic: Licenca) {
  if (lic.status === 'ativado' && lic.dataVencimento) {
    const d = Math.ceil((new Date(lic.dataVencimento).getTime() - Date.now()) / 86400000)
    if (d < 0) return 'Expirada'
    if (d <= 7) return `Vence em ${d}d`
    return `Lic. até ${formatDate(lic.dataVencimento)}`
  }
  return lic.status === 'ativado' ? 'Licenciado' : lic.status === 'pendente' ? 'Pendente' : 'Bloqueado'
}
function formatDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function slugify(s: string) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
function autoSlug() { if (!form.id) form.slug = slugify(form.nome) }
function showToast(type: 'success' | 'error', text: string) { toast.type = type; toast.text = text; setTimeout(() => { toast.text = '' }, 3000) }

async function platformFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${baseUrl.value}/api${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${platformAuth.token}`, ...((options.headers as any) || {}) },
  })
  if (resp.status === 401) { platformAuth.logout(); navigateTo('/platform/login'); throw new Error('Sessão expirada') }
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`)
  return data as T
}

async function carregar() {
  loading.value = true; erro.value = ''
  try { tenants.value = await platformFetch<Tenant[]>('/platform/tenants') }
  catch (e: any) { erro.value = e?.message || 'Erro ao carregar' }
  finally { loading.value = false }
}

function abrirModal(tenant: Tenant | null) {
  erroModal.value = ''; abaAtiva.value = 'dados'; licencaAtual.value = null
  if (tenant) {
    Object.assign(form, { id: tenant.id, nome: tenant.nome, slug: tenant.slug, cnpj: tenant.cnpj || '', responsavel: tenant.responsavel || '', contato: tenant.contato || '', telefone: tenant.telefone || '', endereco: tenant.endereco || '', observacoes: tenant.observacoes || '', vendaMobilePermitida: tenant.venda_mobile_permitida, rfidDisponivel: tenant.rfid_disponivel })
    const lic = tenant.licencas?.[0]
    if (lic) { licencaAtual.value = lic; licencaForm.status = lic.status; licencaForm.dataAtivacao = lic.dataAtivacao?.substring(0, 10) || ''; licencaForm.dataVencimento = lic.dataVencimento?.substring(0, 10) || '' }
    else { licencaForm.status = 'pendente'; licencaForm.dataAtivacao = ''; licencaForm.dataVencimento = '' }
  } else {
    Object.assign(form, { id: null, nome: '', slug: '', cnpj: '', responsavel: '', contato: '', telefone: '', endereco: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
    licencaForm.status = 'pendente'; licencaForm.dataAtivacao = ''; licencaForm.dataVencimento = ''
  }
  modalAberto.value = true
}
function fecharModal() { modalAberto.value = false }

async function salvar() {
  erroModal.value = ''
  if (!form.nome.trim()) { erroModal.value = 'Nome é obrigatório'; return }
  if (!form.slug.trim()) { erroModal.value = 'Slug é obrigatório'; return }
  salvando.value = true
  try {
    const payload = { nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null, endereco: form.endereco || null, observacoes: form.observacoes || null, vendaMobilePermitida: form.vendaMobilePermitida, rfidDisponivel: form.rfidDisponivel }
    let tenantId = form.id
    if (abaAtiva.value === 'dados' || !form.id) {
      if (form.id) { await platformFetch(`/platform/tenants/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) }) }
      else { const c = await platformFetch<any>('/platform/tenants', { method: 'POST', body: JSON.stringify(payload) }); tenantId = c.id; form.id = c.id }
    }
    if (abaAtiva.value === 'licenca' && tenantId) {
      await platformFetch(`/platform/tenants/${tenantId}/licenca`, { method: 'PUT', body: JSON.stringify({ status: licencaForm.status, dataAtivacao: licencaForm.dataAtivacao || null, dataVencimento: licencaForm.dataVencimento || null }) })
    }
    showToast('success', abaAtiva.value === 'licenca' ? 'Licença atualizada!' : form.id ? 'Restaurante atualizado!' : 'Restaurante criado!')
    fecharModal(); await carregar()
  } catch (e: any) { erroModal.value = e?.message || 'Erro ao salvar' }
  finally { salvando.value = false }
}

async function toggleRfid(tenant: Tenant) {
  if (togglingId.value) return
  togglingId.value = tenant.id
  const novo = !tenant.rfid_disponivel
  try {
    await platformFetch(`/platform/tenants/${tenant.id}/rfid`, { method: 'PATCH', body: JSON.stringify({ disponivel: novo }) })
    tenant.rfid_disponivel = novo
    showToast('success', novo ? `RFID habilitado para ${tenant.nome}` : `RFID desabilitado para ${tenant.nome}`)
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
  finally { togglingId.value = null }
}

async function toggleStatus(tenant: Tenant) {
  const novoStatus = tenant.status === 'ativo' ? 'suspenso' : 'ativo'
  if (!confirm(novoStatus === 'suspenso' ? `Suspender "${tenant.nome}"?` : `Reativar "${tenant.nome}"?`)) return
  try {
    await platformFetch(`/platform/tenants/${tenant.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: novoStatus }) })
    tenant.status = novoStatus
    showToast('success', novoStatus === 'suspenso' ? `${tenant.nome} suspenso` : `${tenant.nome} reativado`)
  } catch (e: any) { showToast('error', e?.message || 'Erro ao alterar status') }
}

async function handleLogout() {
  const rt = localStorage.getItem('platform_refresh_token')
  if (rt) { try { await platformFetch('/platform/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) }) } catch {} }
  platformAuth.logout(); navigateTo('/platform/login')
}

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) { navigateTo('/platform/login'); return }
  carregar()
})
</script>

<style scoped>
.label-field { @apply block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5; }
.input-field  { @apply w-full h-11 px-4 bg-white/[0.05] border border-white/[0.09] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all; }
textarea.input-field { @apply h-auto py-3; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }
</style>
