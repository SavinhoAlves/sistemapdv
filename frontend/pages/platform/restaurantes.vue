<template>
  <PlatformShell ativo="restaurantes" titulo="Restaurantes" :contagens="{ restaurantes: tenants.length }">

    <div class="pf-crumb">Clientes</div>
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
                    <small>Cód. {{ t.codigo }} · {{ t.slug }}<template v-if="t.responsavel"> · {{ t.responsavel }}</template></small>
                    <div v-if="t.rfidDisponivel || t.vendaMobilePermitida" class="pf-tags" style="margin-top:4px">
                      <span v-if="t.rfidDisponivel" class="pf-tag">RFID</span>
                      <span v-if="t.vendaMobilePermitida" class="pf-tag">Celular</span>
                    </div>
                  </div>
                </div>
              </td>
              <td>{{ nomePlano(t) || '—' }}</td>
              <td><span class="pf-pill" :class="licencaPill(t)[1]"><i />{{ licencaPill(t)[0] }}</span></td>
              <td><span class="pf-pill" :class="statusPill(t)[1]"><i />{{ statusPill(t)[0] }}</span></td>
              <td class="act" @click.stop>
                <div style="display:inline-flex;gap:6px;align-items:center">
                  <div class="relative">
                    <button
                      class="pf-btn s"
                      :aria-expanded="menuSuporte === t.id"
                      @click.stop="menuSuporte = menuSuporte === t.id ? null : t.id"
                    >
                      <Monitor :size="16" /> Acessar <ChevronDown :size="14" />
                    </button>
                    <div v-if="menuSuporte === t.id" class="pf-menu" @click.stop>
                      <button @click="suporte(t, 'visualizacao')">
                        <Eye :size="16" /><span>Só olhar<small>Vê o sistema do restaurante sem mexer em nada</small></span>
                      </button>
                      <button @click="suporte(t, 'auxiliar')">
                        <MousePointer2 :size="16" /><span>Ajudar<small>Entra e pode fazer alterações por ele</small></span>
                      </button>
                    </div>
                  </div>
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
    <PlatformSupportModal v-model="suporteModal.aberto" :tenant="suporteModal.tenant" :modo="suporteModal.modo" />
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Plus, Monitor, ChevronDown, ChevronUp, ChevronsUpDown, Eye, MousePointer2 } from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'
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
    .filter(t => !q || [t.nome, t.slug, String(t.codigo ?? ''), t.responsavel ?? ''].some(v => v.toLowerCase().includes(q)))
    .sort((a, b) => chave(a).localeCompare(chave(b), 'pt-BR') * ordem.dir)
})

// ── Ações ──
const modalAberto    = ref(false)
const tenantEditando = ref<Tenant | null>(null)
function abrirModal(t: Tenant | null) { tenantEditando.value = t; modalAberto.value = true }
function abrirDetalhe(t: Tenant) { navigateTo(`/platform/tenants/${t.id}`) }

const menuSuporte  = ref<string | null>(null)
const suporteModal = reactive({ aberto: false, tenant: null as Tenant | null, modo: 'auxiliar' as 'visualizacao' | 'auxiliar' })
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
})
onUnmounted(() => document.removeEventListener('click', fecharMenus))
</script>
