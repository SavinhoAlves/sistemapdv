<template>
  <PlatformShell ativo="tickets" titulo="Tickets" :contagens="{ tickets: stats.abertos }">

    <div class="pf-crumb">Operação</div>
    <div class="pf-head">
      <div>
        <h1>Tickets</h1>
        <p>Chamados de suporte abertos pelos restaurantes.</p>
      </div>
      <button class="pf-btn p" @click="openCreate"><Plus :size="18" /> Novo ticket</button>
    </div>

    <div v-if="loading" class="pf-loading"><span class="pf-spin" /></div>

    <template v-else>
      <div class="pf-strip">
        <div class="pf-st"><small>Abertos</small><strong>{{ stats.abertos }}</strong><em>aguardando atendimento</em></div>
        <div class="pf-st"><small>Em andamento</small><strong>{{ stats.emAndamento }}</strong><em>em atendimento</em></div>
        <div class="pf-st"><small>Resolvidos</small><strong>{{ stats.resolvidos }}</strong><em>concluídos</em></div>
        <div class="pf-st" :class="{ hot: stats.urgentes > 0 }"><small>Urgentes</small><strong>{{ stats.urgentes }}</strong><em>{{ stats.urgentes ? 'precisam de resposta já' : 'sem urgência' }}</em></div>
      </div>

      <div class="pf-card">
        <div class="pf-tool">
          <div class="pf-chips" role="group" aria-label="Filtrar por situação">
            <button v-for="f in statusFiltros" :key="f.value" class="pf-fc" :aria-pressed="filtroStatus === f.value" @click="filtroStatus = f.value">
              {{ f.label }}<em>{{ contar(f.value) }}</em>
            </button>
          </div>
          <input v-model="busca" class="pf-inp pf-search" type="search" placeholder="Buscar por título ou restaurante" aria-label="Buscar ticket">
        </div>

        <div v-if="!ticketsFiltrados.length" class="pf-empty" style="padding:56px 22px">
          <b>{{ tickets.length ? 'Nenhum ticket neste filtro' : 'Tudo tranquilo por aqui' }}</b>
          {{ tickets.length ? 'Tente outro filtro ou outra busca.' : 'Quando um restaurante abrir um chamado, ele aparece nesta lista.' }}
        </div>

        <div v-else class="pf-scroll">
          <table class="pf-table">
            <thead>
              <tr><th>Chamado</th><th>Restaurante</th><th>Prioridade</th><th>Situação</th><th>Aberto em</th><th /></tr>
            </thead>
            <tbody>
              <tr v-for="t in ticketsFiltrados" :key="t.id" class="clicavel" tabindex="0" @click="openEdit(t)" @keydown.enter="openEdit(t)">
                <td style="max-width:360px">
                  <b style="display:block">{{ t.titulo }}</b>
                  <small style="color:var(--pf-muted)">
                    <span class="pf-tag">{{ tipoLabel(t.tipo) }}</span>
                    <template v-if="t.descricao"> {{ t.descricao.length > 70 ? t.descricao.slice(0, 70) + '…' : t.descricao }}</template>
                  </small>
                </td>
                <td>{{ t.tenant?.nome ?? '—' }}</td>
                <td><span class="pf-pill" :class="prioridadeTom(t.prioridade)"><i />{{ prioridadeLabel(t.prioridade) }}</span></td>
                <td><span class="pf-pill" :class="statusTom(t.status)"><i />{{ statusLabel(t.status) }}</span></td>
                <td style="white-space:nowrap">{{ formatDate(t.createdAt) }}</td>
                <td class="act" @click.stop>
                  <button class="pf-ib perigo" style="display:inline-grid" :aria-label="`Excluir ticket ${t.titulo}`" @click="pedirExclusao(t)">
                    <Trash2 :size="16" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ NOVO TICKET ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalCriar" class="pf-portal pf-veu" @click.self="modalCriar = false">
          <form class="pf-modal" role="dialog" aria-modal="true" aria-labelledby="tk-novo" @submit.prevent="criarTicket">
            <div class="pf-modal-h">
              <div><h2 id="tk-novo">Novo ticket</h2><small style="color:var(--pf-muted)">Registre um chamado de suporte</small></div>
              <button type="button" class="pf-ib" aria-label="Fechar" @click="modalCriar = false"><X :size="18" /></button>
            </div>
            <div class="pf-modal-b">
              <div class="pf-boxm">
                <div class="pf-form">
                  <div class="pf-fld full">
                    <label class="pf-lab" for="tk-rest">Restaurante *</label>
                    <select id="tk-rest" v-model="form.tenantId" class="pf-inp" required>
                      <option value="" disabled>Selecione…</option>
                      <option v-for="o in tenantOpts" :key="o.value" :value="o.value">{{ o.label }}</option>
                    </select>
                  </div>
                  <div class="pf-fld">
                    <label class="pf-lab" for="tk-tipo">Tipo</label>
                    <select id="tk-tipo" v-model="form.tipo" class="pf-inp"><option v-for="o in tipoOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select>
                  </div>
                  <div class="pf-fld">
                    <label class="pf-lab" for="tk-prio">Prioridade</label>
                    <select id="tk-prio" v-model="form.prioridade" class="pf-inp"><option v-for="o in prioridadeOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select>
                  </div>
                  <div class="pf-fld full">
                    <label class="pf-lab" for="tk-tit">Título *</label>
                    <input id="tk-tit" v-model="form.titulo" class="pf-inp" type="text" placeholder="Descreva o problema em poucas palavras" required>
                  </div>
                  <div class="pf-fld full">
                    <label class="pf-lab" for="tk-desc">Descrição</label>
                    <textarea id="tk-desc" v-model="form.descricao" class="pf-inp" rows="3" placeholder="Detalhes que ajudam no atendimento" />
                  </div>
                </div>
              </div>
            </div>
            <div class="pf-modal-f">
              <button type="button" class="pf-btn" @click="modalCriar = false">Cancelar</button>
              <button type="submit" class="pf-btn p" :disabled="saving || !form.tenantId || !form.titulo.trim()">
                <Loader2 v-if="saving" :size="16" class="animate-spin" /> Criar ticket
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ ATUALIZAR TICKET ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalEditar && ticketAtual" class="pf-portal pf-veu" @click.self="modalEditar = false">
          <form class="pf-modal" role="dialog" aria-modal="true" aria-labelledby="tk-edit" @submit.prevent="salvarTicket">
            <div class="pf-modal-h">
              <div><h2 id="tk-edit">Atualizar ticket</h2><small style="color:var(--pf-muted)">{{ ticketAtual.tenant?.nome }} · aberto em {{ formatDate(ticketAtual.createdAt) }}</small></div>
              <button type="button" class="pf-ib" aria-label="Fechar" @click="modalEditar = false"><X :size="18" /></button>
            </div>
            <div class="pf-modal-b">
              <div class="pf-boxm">
                <div class="pf-fld">
                  <span class="pf-lab">Situação</span>
                  <div class="pf-seg">
                    <button v-for="o in statusOpts" :key="o.value" type="button" :class="[statusTom(o.value), { sel: formEdit.status === o.value }]" @click="formEdit.status = o.value">{{ o.label }}</button>
                  </div>
                </div>
                <div class="pf-form">
                  <div class="pf-fld full"><label class="pf-lab" for="te-tit">Título</label><input id="te-tit" v-model="formEdit.titulo" class="pf-inp" type="text"></div>
                  <div class="pf-fld">
                    <label class="pf-lab" for="te-prio">Prioridade</label>
                    <select id="te-prio" v-model="formEdit.prioridade" class="pf-inp"><option v-for="o in prioridadeOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select>
                  </div>
                  <div class="pf-fld">
                    <label class="pf-lab" for="te-tipo">Tipo</label>
                    <select id="te-tipo" v-model="formEdit.tipo" class="pf-inp"><option v-for="o in tipoOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select>
                  </div>
                  <div class="pf-fld full"><label class="pf-lab" for="te-desc">Descrição</label><textarea id="te-desc" v-model="formEdit.descricao" class="pf-inp" rows="3" /></div>
                  <div class="pf-fld full"><label class="pf-lab" for="te-res">Resolução</label><textarea id="te-res" v-model="formEdit.resolucao" class="pf-inp" rows="3" placeholder="O que foi feito para resolver" /></div>
                </div>
              </div>
            </div>
            <div class="pf-modal-f">
              <button type="button" class="pf-btn" @click="modalEditar = false">Cancelar</button>
              <button type="submit" class="pf-btn p" :disabled="saving"><Loader2 v-if="saving" :size="16" class="animate-spin" /> Salvar</button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ EXCLUIR ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="excluindo" class="pf-portal pf-veu" style="align-items:center" @click.self="excluindo = null">
          <div class="pf-modal sm" role="alertdialog" aria-modal="true" aria-labelledby="tk-del">
            <div class="pf-confirm">
              <span class="pf-ico bad" style="width:52px;height:52px;border-radius:16px"><Trash2 :size="22" /></span>
              <h2 id="tk-del" style="font-size:20px">Excluir este ticket?</h2>
              <p>“{{ excluindo.titulo }}” some da lista. Isso não pode ser desfeito.</p>
            </div>
            <div class="pf-modal-f">
              <button class="pf-btn" @click="excluindo = null">Cancelar</button>
              <button class="pf-btn d" :disabled="saving" @click="confirmarExclusao">Excluir</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { Plus, X, Trash2, Loader2 } from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

interface Tenant   { id: string; nome: string; slug: string }
interface Ticket   { id: string; tenantId: string; tipo: string; prioridade: string; status: string; titulo: string; descricao: string | null; resolucao: string | null; createdAt: string; tenant?: { nome: string; slug: string } }
interface Stats    { abertos: number; emAndamento: number; resolvidos: number; urgentes: number }

const platformAuth  = usePlatformAuthStore()
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
const excluindo    = ref<Ticket | null>(null)

const form = reactive({ tenantId: '', tipo: 'bug', prioridade: 'media', titulo: '', descricao: '' })
const formEdit = reactive({ titulo: '', tipo: '', prioridade: '', status: '', descricao: '', resolucao: '' })

const statusFiltros = [
  { value: 'todos',        label: 'Todos' },
  { value: 'aberto',       label: 'Abertos' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'resolvido',    label: 'Resolvidos' },
  { value: 'fechado',      label: 'Fechados' },
]

const tipoOpts       = ['bug', 'instalacao', 'sync', 'cobranca', 'outro'].map(v => ({ label: tipoLabel(v), value: v }))
const prioridadeOpts = ['baixa', 'media', 'alta', 'urgente'].map(v => ({ label: prioridadeLabel(v), value: v }))
const statusOpts     = ['aberto', 'em_andamento', 'resolvido', 'fechado'].map(v => ({ label: statusLabel(v), value: v }))

const tenantOpts = computed(() => tenants.value.map(t => ({ label: t.nome, value: t.id })))

const contar = (s: string) => (s === 'todos' ? tickets.value.length : tickets.value.filter(t => t.status === s).length)

const ticketsFiltrados = computed(() => {
  let list = tickets.value
  if (filtroStatus.value !== 'todos') list = list.filter(t => t.status === filtroStatus.value)
  if (busca.value.trim()) {
    const q = busca.value.toLowerCase()
    list = list.filter(t => t.titulo.toLowerCase().includes(q) || t.tenant?.nome.toLowerCase().includes(q))
  }
  return list
})

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

function pedirExclusao(t: Ticket) { excluindo.value = t }

async function confirmarExclusao() {
  if (!excluindo.value) return
  saving.value = true
  try {
    // Sem Content-Type: o Fastify recusa DELETE com JSON declarado e corpo vazio
    const res = await fetch(`${baseUrl.value}/api/platform/tickets/${excluindo.value.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${platformAuth.token}` },
    })
    if (!res.ok) return
    excluindo.value = null
    await fetchAll()
  } finally { saving.value = false }
}

function prioridadeTom(p: string) {
  return ({ urgente: 'bad', alta: 'warn', media: 'info', baixa: 'mute' } as Record<string, string>)[p] ?? 'mute'
}
function prioridadeLabel(p: string) {
  return ({ urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' } as Record<string, string>)[p] ?? p
}
function statusTom(s: string) {
  return ({ aberto: 'info', em_andamento: 'warn', resolvido: 'ok', fechado: 'mute' } as Record<string, string>)[s] ?? 'mute'
}
function statusLabel(s: string) {
  return ({ aberto: 'Aberto', em_andamento: 'Em andamento', resolvido: 'Resolvido', fechado: 'Fechado' } as Record<string, string>)[s] ?? s
}
function tipoLabel(t: string) {
  return ({ bug: 'Bug', instalacao: 'Instalação', sync: 'Sincronização', cobranca: 'Cobrança', outro: 'Outro' } as Record<string, string>)[t] ?? t
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
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
