<template>
  <PlatformShell ativo="delivery" titulo="Delivery" :contagens="{ delivery: dados?.resumo.emAndamento || 0 }">

    <div class="pf-crumb">Clientes</div>
    <div class="pf-head">
      <div>
        <h1>Delivery</h1>
        <p>Restaurantes com cardápio online: quem está recebendo pedidos, quanto vendem e quantos entregadores estão na rua.</p>
      </div>
      <button class="pf-btn" :disabled="loading" @click="carregar"><RefreshCw :size="16" :class="{ 'animate-spin': loading }" /> Atualizar</button>
    </div>

    <div v-if="loading && !dados" class="pf-loading"><span class="pf-spin" /></div>

    <div v-else-if="erro" class="pf-card">
      <div class="pf-empty"><b>Não deu para carregar o delivery</b><p>{{ erro }}</p><button class="pf-btn" @click="carregar">Tentar novamente</button></div>
    </div>

    <template v-else-if="dados">
      <div class="pf-strip">
        <div class="pf-st">
          <small>Restaurantes</small>
          <strong>{{ dados.resumo.restaurantes }}</strong>
          <em>{{ dados.resumo.recebendo }} recebendo pedidos agora</em>
        </div>
        <div class="pf-st">
          <small>Entregues hoje</small>
          <strong>{{ dados.resumo.pedidosHoje }}</strong>
          <em>{{ moeda(dados.resumo.valorHoje) }}</em>
        </div>
        <div class="pf-st">
          <small>Entregues no mês</small>
          <strong>{{ dados.resumo.pedidosMes }}</strong>
          <em>{{ moeda(dados.resumo.valorMes) }}</em>
        </div>
        <div class="pf-st" :class="{ hot: dados.resumo.emAndamento > 0 }">
          <small>Em andamento</small>
          <strong>{{ dados.resumo.emAndamento }}</strong>
          <em>{{ dados.resumo.entregadoresAtivos }} {{ dados.resumo.entregadoresAtivos === 1 ? 'entregador' : 'entregadores' }} na rua</em>
        </div>
      </div>

      <div class="pf-card">
        <div class="pf-tool">
          <div class="pf-chips" role="group" aria-label="Filtrar por situação">
            <button v-for="f in FILTROS" :key="f.chave" class="pf-fc" :aria-pressed="filtro === f.chave" @click="filtro = f.chave">
              {{ f.rotulo }}<em>{{ contar(f.chave) }}</em>
            </button>
          </div>
          <input v-model="busca" class="pf-inp pf-search" type="search" placeholder="Buscar restaurante" aria-label="Buscar restaurante">
        </div>

        <div v-if="!lista.length" class="pf-empty">
          <b>{{ dados.restaurantes.length ? 'Nada neste filtro' : 'Nenhum restaurante com delivery' }}</b>
          {{ dados.restaurantes.length ? 'Tente outra situação ou outra busca.' : 'Inclua o delivery num plano (Configuração › Planos) para os restaurantes começarem.' }}
        </div>

        <div v-else class="pf-scroll">
          <table class="pf-table">
            <thead>
              <tr><th>Restaurante</th><th>Cardápio</th><th>Hoje</th><th>No mês</th><th>Agora</th><th>Último pedido</th><th /></tr>
            </thead>
            <tbody>
              <tr v-for="r in lista" :key="r.id">
                <td>
                  <NuxtLink :to="`/platform/tenants/${r.id}`" class="pf-who" style="color:inherit;text-decoration:none">
                    <span class="pf-av">{{ iniciais(r.nome) }}</span>
                    <div style="min-width:12rem">
                      <b>{{ r.nome }}</b>
                      <small>{{ [r.cidade && `${r.cidade}${r.uf ? '/' + r.uf : ''}`, r.plano ? `Plano ${r.plano}` : 'Sem plano'].filter(Boolean).join(' · ') }}</small>
                    </div>
                  </NuxtLink>
                </td>
                <td>
                  <span class="pf-pill" :class="situacao(r)[1]"><i />{{ situacao(r)[0] }}</span>
                  <small v-if="r.disponivel && !r.localDefinido" style="display:block;color:var(--pf-warn);margin-top:4px">sem local no mapa</small>
                </td>
                <td class="pf-num" style="white-space:nowrap">
                  <b>{{ r.pedidosHoje }}</b> <small style="color:var(--pf-muted)">{{ r.pedidosHoje === 1 ? 'pedido' : 'pedidos' }}</small>
                  <small style="display:block;color:var(--pf-muted)">{{ moeda(r.valorHoje) }}</small>
                </td>
                <td class="pf-num" style="white-space:nowrap">
                  <b>{{ moeda(r.valorMes) }}</b>
                  <small style="display:block;color:var(--pf-muted)">{{ r.pedidosMes }} {{ r.pedidosMes === 1 ? 'pedido' : 'pedidos' }}<template v-if="r.pedidosMes"> · ticket {{ moeda(r.ticketMedio) }}</template></small>
                  <small v-if="r.recusadosMes" style="display:block;color:var(--pf-muted)">{{ r.recusadosMes }} recusado{{ r.recusadosMes === 1 ? '' : 's' }}</small>
                </td>
                <td style="white-space:nowrap">
                  <b class="pf-num">{{ r.emAndamento }}</b> <small style="color:var(--pf-muted)">em andamento</small>
                  <small style="display:block;color:var(--pf-muted)" :title="`${r.entregadoresCadastrados} cadastrados`">{{ r.entregadoresAtivos }}/{{ r.entregadoresCadastrados }} entregadores na rua</small>
                </td>
                <td class="pf-num" style="white-space:nowrap;color:var(--pf-muted)">{{ r.ultimoPedidoEm ? quando(r.ultimoPedidoEm) : '—' }}</td>
                <td class="act">
                  <a class="pf-btn s" :href="linkCardapio(r.slug)" target="_blank" rel="noopener" :aria-label="`Abrir o cardápio de ${r.nome}`"><ExternalLink :size="16" /></a>
                  <button class="pf-btn s" @click="abrirConfig(r)"><Settings2 :size="16" /> Configurar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ CONFIGURAR O DELIVERY DO RESTAURANTE ══ -->
    <PlatformModal v-model="modal" titulo="Delivery do restaurante" :subtitulo="atual?.nome ?? ''">
      <template #icone><Bike :size="18" /></template>
      <div v-if="!cfg" class="pf-loading"><span class="pf-spin" /></div>
      <template v-else>
        <div v-if="!cfg.disponivel" class="pf-note warn">
          O plano {{ cfg.plano ? `“${cfg.plano}”` : 'deste restaurante' }} não inclui delivery. Dá para deixar tudo configurado, mas o cardápio só recebe pedidos depois de trocar o plano.
        </div>

        <div class="pf-boxm">
          <div class="pf-feat">
            <div><b>Receber pedidos pelo cardápio</b><small>Com o caixa fechado o cardápio fica só para consulta</small></div>
            <button type="button" class="pf-sw" role="switch" :aria-checked="f.ativo" aria-label="Receber pedidos pelo cardápio" :disabled="!cfg.disponivel" @click="f.ativo = !f.ativo" />
          </div>
          <div class="pf-feat">
            <div><b>Entrega</b><small>O cliente informa o endereço e paga a taxa</small></div>
            <button type="button" class="pf-sw" role="switch" :aria-checked="f.entrega" aria-label="Entrega" @click="f.entrega = !f.entrega" />
          </div>
          <div class="pf-feat">
            <div><b>Retirada no local</b><small>O cliente busca no restaurante, sem taxa</small></div>
            <button type="button" class="pf-sw" role="switch" :aria-checked="f.retirada" aria-label="Retirada no local" @click="f.retirada = !f.retirada" />
          </div>
        </div>

        <div class="pf-boxm">
          <div class="pf-form dlv-tres">
            <div class="pf-fld">
              <label class="pf-lab" for="dl-taxa">Taxa de entrega (R$)</label>
              <input id="dl-taxa" v-model.number="f.taxaEntrega" class="pf-inp pf-num" type="number" min="0" max="500" step="0.5">
            </div>
            <div class="pf-fld">
              <label class="pf-lab" for="dl-min">Pedido mínimo (R$)</label>
              <input id="dl-min" v-model.number="f.pedidoMinimo" class="pf-inp pf-num" type="number" min="0" max="5000" step="1">
            </div>
            <div class="pf-fld">
              <label class="pf-lab" for="dl-tempo">Preparo (min)</label>
              <input id="dl-tempo" v-model.number="f.tempoMin" class="pf-inp pf-num" type="number" min="5" max="240" step="5">
            </div>
            <div class="pf-fld full">
              <label class="pf-lab" for="dl-msg">Recado no topo do cardápio <small>(opcional)</small></label>
              <input id="dl-msg" v-model="f.mensagem" class="pf-inp" type="text" maxlength="200" placeholder="Ex.: Entregamos só no centro e bairros vizinhos">
            </div>
          </div>
        </div>

        <div class="pf-boxm">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
            <div>
              <b>Local do restaurante</b>
              <small style="display:block;color:var(--pf-muted)">Ponto de partida das rotas. Clique no mapa para ajustar.</small>
            </div>
            <button class="pf-btn s" :disabled="localizando" @click="localizar"><MapPin :size="16" /> {{ localizando ? 'Procurando…' : 'Localizar pelo endereço' }}</button>
          </div>
          <MapaDelivery altura="240px" marcavel :marcadores="f.local ? [{ id: 'r', tipo: 'restaurante', ...f.local, titulo: 'Restaurante' }] : []"
            vazio="Use “Localizar pelo endereço” ou clique no mapa" descricao="Mapa para marcar o local do restaurante" @marcar="p => (f.local = { lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) })" />
        </div>

        <p v-if="msgErro" class="pf-err" role="alert">{{ msgErro }}</p>
      </template>
      <template #rodape>
        <button class="pf-btn" @click="modal = false">Cancelar</button>
        <button class="pf-btn p" :disabled="salvando || !cfg" @click="salvar"><Loader2 v-if="salvando" :size="16" class="animate-spin" /> Salvar</button>
      </template>
    </PlatformModal>
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Bike, ExternalLink, Loader2, MapPin, RefreshCw, Settings2 } from 'lucide-vue-next'
import MapaDelivery from '~/components/MapaDelivery.vue'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { moeda, iniciais } from '~/composables/usePlatformTenants'
import { ehPainel, urlDoHost } from '~/lib/hosts'

definePageMeta({ layout: false })

interface Linha {
  id: string; nome: string; slug: string; cidade: string | null; uf: string | null; status: string; plano: string | null
  disponivel: boolean; ativo: boolean; localDefinido: boolean; taxaEntrega: number
  pedidosHoje: number; valorHoje: number; pedidosMes: number; valorMes: number; ticketMedio: number; recusadosMes: number
  emAndamento: number; entregadoresAtivos: number; entregadoresCadastrados: number; ultimoPedidoEm: string | null
}
interface Resposta {
  resumo: { restaurantes: number; recebendo: number; pedidosHoje: number; valorHoje: number; pedidosMes: number; valorMes: number; emAndamento: number; entregadoresAtivos: number }
  restaurantes: Linha[]
}
interface Config {
  disponivel: boolean; plano: string | null; slug: string; ativo: boolean; entrega: boolean; retirada: boolean
  taxaEntrega: number; pedidoMinimo: number; tempoMin: number; mensagem: string; local: { lat: number; lng: number } | null
}

type Filtro = 'todos' | 'recebendo' | 'pausado' | 'fora'
const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: 'todos', rotulo: 'Todos' }, { chave: 'recebendo', rotulo: 'Recebendo' },
  { chave: 'pausado', rotulo: 'Pausados' }, { chave: 'fora', rotulo: 'Fora do plano' },
]

const platformAuth = usePlatformAuthStore()
const toast = useToast()
const { platformFetch } = usePlatformFetch()

const dados   = ref<Resposta | null>(null)
const loading = ref(false)
const erro    = ref('')
async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    dados.value = await platformFetch<Resposta>('/platform/delivery')
  } catch (e: any) {
    erro.value = e?.message || 'Erro ao carregar'
  } finally {
    loading.value = false
  }
}

const estado = (r: Linha): Exclude<Filtro, 'todos'> => (!r.disponivel ? 'fora' : r.ativo ? 'recebendo' : 'pausado')
const situacao = (r: Linha): [string, string] =>
  ({ recebendo: ['Recebendo', 'ok'], pausado: ['Pausado', 'warn'], fora: ['Fora do plano', 'mute'] } as const)[estado(r)] as [string, string]

const filtro = ref<Filtro>('todos')
const busca  = ref('')
const contar = (f: Filtro) => (dados.value?.restaurantes ?? []).filter(r => f === 'todos' || estado(r) === f).length
// Quem tem pedido em andamento primeiro; depois quem vende mais no mês
const lista = computed(() => {
  const q = busca.value.trim().toLowerCase()
  return (dados.value?.restaurantes ?? [])
    .filter(r => filtro.value === 'todos' || estado(r) === filtro.value)
    .filter(r => !q || r.nome.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q))
    .sort((a, b) => b.emAndamento - a.emAndamento || b.valorMes - a.valorMes || a.nome.localeCompare(b.nome, 'pt-BR'))
})

// O cardápio é do app.<domínio> (no painel o endereço da página é outro)
const linkCardapio = (slug: string) => (ehPainel() ? urlDoHost('app', `/cardapio/${slug}`) : `${window.location.origin}${useRuntimeConfig().app.baseURL}cardapio/${slug}`)

function quando(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 24 * 60) return `há ${Math.round(min / 60)} h`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ── Configurar ──
const modal = ref(false)
const atual = ref<Linha | null>(null)
const cfg   = ref<Config | null>(null)
const f = reactive({ ativo: false, entrega: true, retirada: true, taxaEntrega: 0, pedidoMinimo: 0, tempoMin: 40, mensagem: '', local: null as Config['local'] })
const salvando   = ref(false)
const localizando = ref(false)
const msgErro    = ref('')

function preencher(c: Config) {
  cfg.value = c
  Object.assign(f, { ativo: c.ativo, entrega: c.entrega, retirada: c.retirada, taxaEntrega: c.taxaEntrega, pedidoMinimo: c.pedidoMinimo, tempoMin: c.tempoMin, mensagem: c.mensagem ?? '', local: c.local })
}
async function abrirConfig(r: Linha) {
  atual.value = r
  cfg.value = null
  msgErro.value = ''
  modal.value = true
  try { preencher(await platformFetch<Config>(`/platform/delivery/${r.id}`)) }
  catch (e: any) { msgErro.value = e?.message || 'Não deu para carregar as configurações.' }
}
async function localizar() {
  if (!atual.value) return
  localizando.value = true
  msgErro.value = ''
  try {
    const c = await platformFetch<Config>(`/platform/delivery/${atual.value.id}/localizar`, { method: 'POST' })
    f.local = c.local
    toast.add({ title: 'Local encontrado', description: 'Confira o pino e clique no mapa se precisar ajustar.', color: 'green', timeout: 3000 })
  } catch (e: any) {
    msgErro.value = e?.message || 'Não achei o endereço.'
  } finally {
    localizando.value = false
  }
}
async function salvar() {
  if (!atual.value || !cfg.value) return
  msgErro.value = ''
  if (!f.entrega && !f.retirada) { msgErro.value = 'Deixe ao menos entrega ou retirada.'; return }
  salvando.value = true
  try {
    const corpo = {
      ...(cfg.value.disponivel ? { ativo: f.ativo } : {}),
      entrega: f.entrega, retirada: f.retirada,
      taxaEntrega: Number(f.taxaEntrega) || 0, pedidoMinimo: Number(f.pedidoMinimo) || 0, tempoMin: Math.round(Number(f.tempoMin) || 40),
      mensagem: f.mensagem.trim() || null, local: f.local,
    }
    await platformFetch(`/platform/delivery/${atual.value.id}`, { method: 'PUT', body: JSON.stringify(corpo) })
    modal.value = false
    toast.add({ title: `Delivery de ${atual.value.nome} atualizado`, color: 'green', timeout: 3000 })
    await carregar()
  } catch (e: any) {
    msgErro.value = e?.message || 'Não deu para salvar.'
  } finally {
    salvando.value = false
  }
}

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) { navigateTo('/platform/login'); return }
  carregar()
})
</script>

<style scoped>
.dlv-tres { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 640px) { .dlv-tres { grid-template-columns: 1fr; } }
</style>
