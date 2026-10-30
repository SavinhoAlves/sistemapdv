<template>
  <PlatformShell ativo="restaurantes" titulo="Restaurantes" :contagens="{ restaurantes: tenants.length }">

    <div class="pf-head">
      <div>
        <h1>Restaurantes</h1>
        <p>Todos os restaurantes que usam o sistema. Abra um para ver licença, contrato, plano e acesso.</p>
      </div>
      <button class="pf-btn p" @click="abrirModal(null)"><Plus :size="18" /> Novo restaurante</button>
    </div>

    <div class="pf-card">
      <div class="pf-tool">
        <div class="pf-chips" role="group" aria-label="Filtrar por status">
          <button
            v-for="f in FILTROS"
            :key="f.chave"
            class="pf-fc"
            :aria-pressed="filtro === f.chave"
            @click="filtro = f.chave"
          >
            {{ f.rotulo }}<em>{{ contar(f.chave) }}</em>
          </button>
        </div>
        <select v-model="filtroTipo" class="pf-inp" style="width:auto;min-width:11rem" aria-label="Filtrar por tipo de comércio">
          <option value="">Todos os tipos</option>
          <option v-for="t in TIPOS_COMERCIO" :key="t.id" :value="t.id">{{ t.rotulo }} ({{ contarTipo(t.id) }})</option>
          <option value="-">Sem tipo ({{ contarTipo(null) }})</option>
        </select>
        <input
          v-model="busca"
          class="pf-inp pf-search"
          type="search"
          placeholder="Buscar por nome, login ou responsável"
          aria-label="Buscar restaurante"
        >
      </div>

      <div v-if="loading && !tenants.length" class="pf-loading"><span class="pf-spin" /></div>

      <div v-else-if="erro" class="pf-empty">
        <b>Não deu para carregar os restaurantes</b>
        <p>{{ erro }}</p>
        <button class="pf-btn" @click="carregar">Tentar novamente</button>
      </div>

      <div v-else-if="!lista.length" class="pf-empty">
        <b>Nada por aqui</b>
        {{ busca ? `Nenhum restaurante com “${busca}” no nome, login ou responsável.` : 'Nenhum restaurante neste filtro.' }}
      </div>

      <div v-else class="pf-scroll">
        <table class="pf-table">
          <thead>
            <tr>
              <th><button class="pf-th-sort" @click="ordenar('nome')">Restaurante <component :is="iconeOrdem('nome')" :size="14" /></button></th>
              <th><button class="pf-th-sort" @click="ordenar('plano')">Plano <component :is="iconeOrdem('plano')" :size="14" /></button></th>
              <th><button class="pf-th-sort" @click="ordenar('licenca')">Licença <component :is="iconeOrdem('licenca')" :size="14" /></button></th>
              <th>Status</th>
              <th style="text-align:right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="t in lista"
              :key="t.id"
              class="clicavel"
              tabindex="0"
              @click="abrirDetalhe(t)"
              @keydown.enter="abrirDetalhe(t)"
            >
              <td>
                <div class="pf-who">
                  <span class="pf-av">{{ iniciais(t.nome) }}</span>
                  <div style="min-width:0">
                    <b>{{ t.nome }}</b>
                    <small><template v-if="t.tipoComercio">{{ rotuloTipoComercio(t.tipoComercio) }} · </template>Cód. {{ t.codigo }} · {{ t.slug }}<template v-if="t.responsavel"> · {{ t.responsavel }}</template></small>
                    <div v-if="t.rfidDisponivel || t.vendaMobilePermitida || t.deliveryDisponivel" class="pf-tags" style="margin-top:4px">
                      <span v-if="t.rfidDisponivel" class="pf-tag">RFID</span>
                      <span v-if="t.vendaMobilePermitida" class="pf-tag">Celular</span>
                      <span v-if="t.deliveryDisponivel" class="pf-tag">Delivery (entrega)</span>
                    </div>
                  </div>
                </div>
              </td>
              <td>{{ nomePlano(t) || '—' }}</td>
              <td><span class="pf-pill" :class="licencaPill(t)[1]"><i />{{ licencaPill(t)[0] }}</span></td>
              <td><span class="pf-pill" :class="statusPill(t)[1]"><i />{{ statusPill(t)[0] }}</span></td>
              <td class="act" @click.stop>
                <div style="display:inline-flex;gap:6px;align-items:center">
                  <button
                    class="pf-btn s"
                    :aria-expanded="menuSuporte?.tenant.id === t.id"
                    @click.stop="alternarMenu(t, $event)"
                  >
                    <Monitor :size="16" /> Acessar <ChevronDown :size="14" />
                  </button>
                  <button
                    class="pf-btn s"
                    :class="t.status === 'ativo' ? 'd' : 'k'"
                    :disabled="alterandoStatus === t.id"
                    @click="alternarStatus(t)"
                  >
                    {{ t.status === 'ativo' ? 'Suspender' : 'Reativar' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <PlatformTenantModal v-model="modalAberto" :tenant="tenantEditando" @saved="carregar" />
    <PlatformConfirmDialog
      v-model="confirmacao.show"
      :title="confirmacao.title"
      :message="confirmacao.message"
      :type="confirmacao.type"
      @resolved="resolverConfirmacao"
    />
    <!-- Fora da tabela: o card corta o que passa das bordas (overflow) -->
    <Teleport to="body">
      <div
        v-if="menuSuporte"
        class="pf-portal pf-menu"
        :style="menuSuporte.pos"
        @click.stop
      >
        <button @click="suporte(menuSuporte.tenant, 'visualizacao')">
          <Eye :size="16" /><span>Só olhar<small>Vê o sistema do restaurante sem mexer em nada</small></span>
        </button>
        <button @click="suporte(menuSuporte.tenant, 'auxiliar')">
          <MousePointer2 :size="16" /><span>Ajudar<small>Entra e pode fazer alterações por ele</small></span>
        </button>
        <button @click="verAoVivo(menuSuporte.tenant)">
          <MonitorPlay :size="16" /><span>Ver tela ao vivo<small>Acompanha o que o cliente faz (ele aceita antes)</small></span>
        </button>
      </div>
    </Teleport>
    <PlatformSupportModal v-model="suporteModal.aberto" :tenant="suporteModal.tenant" :modo="suporteModal.modo" />
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Plus, Monitor, ChevronDown, ChevronUp, ChevronsUpDown, Eye, MousePointer2, MonitorPlay } from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { TIPOS_COMERCIO, rotuloTipoComercio } from '~/lib/tiposComercio'
import {
  usePlatformTenants, licencaPill, statusPill, iniciais, nomePlano,
  type Tenant, type ChaveStatus,
} from '~/composables/usePlatformTenants'

definePageMeta({ layout: false })

const platformAuth = usePlatformAuthStore()
const toast = useToast()
const { tenants, loading, erro, carregar, platformFetch } = usePlatformTenants()

// ── Filtro, busca e ordenação ──
const FILTROS: { chave: 'todos' | ChaveStatus; rotulo: string }[] = [
  { chave: 'todos',     rotulo: 'Todos' },
  { chave: 'ativo',     rotulo: 'Ativos' },
  { chave: 'suspenso',  rotulo: 'Suspensos' },
  { chave: 'bloqueado', rotulo: 'Bloqueados' },
]
const filtro = ref<'todos' | ChaveStatus>('todos')
const filtroTipo = ref('')
const contarTipo = (id: string | null) => tenants.value.filter(t => (t.tipoComercio ?? null) === id).length
const busca  = ref('')

type Coluna = 'nome' | 'plano' | 'licenca'
const ordem = reactive<{ col: Coluna; dir: 1 | -1 }>({ col: 'nome', dir: 1 })

function ordenar(col: Coluna) {
  if (ordem.col === col) ordem.dir = ordem.dir === 1 ? -1 : 1
  else { ordem.col = col; ordem.dir = 1 }
}
function iconeOrdem(col: Coluna) {
  if (ordem.col !== col) return ChevronsUpDown
  return ordem.dir === 1 ? ChevronUp : ChevronDown
}

const contar = (f: 'todos' | ChaveStatus) =>
  f === 'todos' ? tenants.value.length : tenants.value.filter(t => statusPill(t)[2] === f).length

const lista = computed(() => {
  const q = busca.value.trim().toLowerCase()
  const chave = (t: Tenant) =>
    ordem.col === 'nome' ? t.nome : ordem.col === 'plano' ? nomePlano(t) : licencaPill(t)[0]
  return tenants.value
    .filter(t => filtro.value === 'todos' || statusPill(t)[2] === filtro.value)
    .filter(t => !filtroTipo.value || (filtroTipo.value === '-' ? !t.tipoComercio : t.tipoComercio === filtroTipo.value))
    .filter(t => !q || [t.nome, t.slug, String(t.codigo ?? ''), t.responsavel ?? ''].some(v => v.toLowerCase().includes(q)))
    .sort((a, b) => chave(a).localeCompare(chave(b), 'pt-BR') * ordem.dir)
})

// ── Ações ──
const modalAberto    = ref(false)
const tenantEditando = ref<Tenant | null>(null)
function abrirModal(t: Tenant | null) { tenantEditando.value = t; modalAberto.value = true }
function abrirDetalhe(t: Tenant) { navigateTo(`/platform/tenants/${t.id}`) }

const menuSuporte  = ref<{ tenant: Tenant; pos: Record<string, string> } | null>(null)
const ALTURA_MENU = 200
function alternarMenu(t: Tenant, ev: MouseEvent) {
  if (menuSuporte.value?.tenant.id === t.id) { menuSuporte.value = null; return }
  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  // Sem espaço abaixo do botão (últimas linhas da tela), abre para cima
  const vertical = r.bottom + 6 + ALTURA_MENU > window.innerHeight
    ? { top: 'auto', bottom: `${window.innerHeight - r.top + 6}px` }
    : { top: `${r.bottom + 6}px` }
  menuSuporte.value = { tenant: t, pos: { ...vertical, right: `${window.innerWidth - r.right}px` } }
}
const suporteModal = reactive({ aberto: false, tenant: null as Tenant | null, modo: 'auxiliar' as 'visualizacao' | 'auxiliar' })
function verAoVivo(t: Tenant) {
  menuSuporte.value = null
  navigateTo(`/platform/espelho/${t.id}`)
}
function suporte(t: Tenant, modo: 'visualizacao' | 'auxiliar') {
  menuSuporte.value = null
  Object.assign(suporteModal, { tenant: t, modo, aberto: true })
}

const confirmacao = reactive({ show: false, title: '', message: '', type: 'danger' as 'danger' | 'success' })
let resolver: ((v: boolean) => void) | null = null
function confirmar(title: string, message: string, type: 'danger' | 'success') {
  return new Promise<boolean>(r => { resolver = r; Object.assign(confirmacao, { title, message, type, show: true }) })
}
function resolverConfirmacao(v: boolean) { resolver?.(v); resolver = null }

const alterandoStatus = ref<string | null>(null)
async function alternarStatus(t: Tenant) {
  const novo = t.status === 'ativo' ? 'suspenso' : 'ativo'
  const ok = await confirmar(
    novo === 'suspenso' ? `Suspender ${t.nome}?` : `Reativar ${t.nome}?`,
    novo === 'suspenso' ? 'O restaurante fica sem acesso ao sistema até ser reativado.' : 'O restaurante volta a funcionar normalmente.',
    novo === 'suspenso' ? 'danger' : 'success',
  )
  if (!ok) return
  alterandoStatus.value = t.id
  try {
    await platformFetch(`/platform/tenants/${t.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: novo }) })
    t.status = novo
    toast.add({ title: novo === 'suspenso' ? 'Restaurante suspenso' : 'Restaurante reativado', color: 'green', timeout: 3000 })
  } catch (e: any) {
    toast.add({ title: 'Erro', description: e?.message || 'Não foi possível alterar o status', color: 'red', timeout: 4000 })
  } finally {
    alterandoStatus.value = null
  }
}

function fecharMenus() { menuSuporte.value = null }

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) { navigateTo('/platform/login'); return }
  carregar()
  document.addEventListener('click', fecharMenus)
  // O menu fica fixo na tela: ao rolar ou redimensionar, fecha em vez de descolar do botão
  window.addEventListener('scroll', fecharMenus, true)
  window.addEventListener('resize', fecharMenus)
})
onUnmounted(() => {
  document.removeEventListener('click', fecharMenus)
  window.removeEventListener('scroll', fecharMenus, true)
  window.removeEventListener('resize', fecharMenus)
})
</script>
