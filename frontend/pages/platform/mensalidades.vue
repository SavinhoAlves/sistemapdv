<template>
  <PlatformShell ativo="cobranca" titulo="Mensalidades" :contagens="{ cobranca: dados?.totais.qtd.atrasado || 0 }">

    <div class="pf-crumb">Clientes</div>
    <div class="pf-head">
      <div>
        <h1>Mensalidades</h1>
        <p>Quanto cada restaurante paga por mês, quando vence e quem já pagou.</p>
      </div>
      <div class="pf-mes" role="group" aria-label="Mês de referência">
        <button class="pf-ib" aria-label="Mês anterior" @click="mudarMes(-1)"><ChevronLeft :size="18" /></button>
        <span class="pf-mes-nome">{{ nomeMes }}</span>
        <button class="pf-ib" aria-label="Próximo mês" @click="mudarMes(1)"><ChevronRight :size="18" /></button>
        <button v-if="competencia !== hoje" class="pf-btn s" @click="competencia = hoje">Mês atual</button>
      </div>
    </div>

    <div v-if="loading && !dados" class="pf-loading"><span class="pf-spin" /></div>

    <div v-else-if="erro" class="pf-card">
      <div class="pf-empty"><b>Não deu para carregar as mensalidades</b><p>{{ erro }}</p><button class="pf-btn" @click="carregar">Tentar novamente</button></div>
    </div>

    <template v-else-if="dados">
      <div class="pf-strip">
        <div class="pf-st">
          <small>Previsto</small>
          <strong>{{ moeda(dados.totais.previsto) }}</strong>
          <em>{{ dados.restaurantes.length - dados.totais.qtd.isento }} a cobrar no mês</em>
        </div>
        <div class="pf-st">
          <small>Recebido</small>
          <strong>{{ moeda(dados.totais.recebido) }}</strong>
          <em>{{ dados.totais.previsto ? Math.round(dados.totais.recebido / dados.totais.previsto * 100) : 0 }}% do previsto</em>
        </div>
        <div class="pf-st">
          <small>A receber</small>
          <strong>{{ moeda(dados.totais.pendente) }}</strong>
          <em>{{ dados.totais.qtd.pendente }} ainda no prazo</em>
        </div>
        <div class="pf-st" :class="{ hot: dados.totais.qtd.atrasado > 0 }">
          <small>Em atraso</small>
          <strong>{{ moeda(dados.totais.atrasado) }}</strong>
          <em>{{ dados.totais.qtd.atrasado ? `${dados.totais.qtd.atrasado} ${dados.totais.qtd.atrasado === 1 ? 'restaurante' : 'restaurantes'}` : 'ninguém atrasado' }}</em>
        </div>
      </div>

      <div v-if="dados.totais.qtd.sem_valor" class="pf-note warn" style="margin-bottom:18px">
        <AlertTriangle :size="18" style="flex:none;margin-top:1px" />
        <span>
          {{ dados.totais.qtd.sem_valor === 1 ? '1 restaurante está' : `${dados.totais.qtd.sem_valor} restaurantes estão` }}
          sem valor de mensalidade. Defina um plano, um contrato com valor ou um valor combinado em "Configurar".
        </span>
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
          <b>{{ dados.restaurantes.length ? 'Nada neste filtro' : 'Nenhum restaurante neste mês' }}</b>
          {{ dados.restaurantes.length ? 'Tente outra situação ou outra busca.' : 'Os restaurantes aparecem a partir do mês em que foram cadastrados.' }}
        </div>

        <div v-else class="pf-scroll">
          <table class="pf-table">
            <thead>
              <tr><th>Restaurante</th><th>Mensalidade</th><th>Vence</th><th>Situação</th><th>Pagamento</th><th /></tr>
            </thead>
            <tbody>
              <tr v-for="r in lista" :key="r.tenantId">
                <td>
                  <div class="pf-who">
                    <span class="pf-av">{{ iniciais(r.nome) }}</span>
                    <div style="min-width:0">
                      <b>{{ r.nome }}</b>
                      <small>{{ r.plano ? `Plano ${r.plano}` : 'Sem plano' }}<template v-if="r.observacao"> · {{ r.observacao }}</template></small>
                    </div>
                  </div>
                </td>
                <td>
                  <span v-if="r.isento" style="color:var(--pf-muted)">—</span>
                  <template v-else>
                    <b class="pf-num" style="white-space:nowrap">{{ moeda(r.valor) }}</b>
                    <small style="display:block;color:var(--pf-muted)">{{ ORIGEM[r.origemValor] }}</small>
                  </template>
                </td>
                <td class="pf-num" style="white-space:nowrap">{{ r.isento ? '—' : `Dia ${String(r.diaVencimento).padStart(2, '0')}` }}</td>
                <td><span class="pf-pill" :class="SITUACAO[r.situacao][1]"><i />{{ SITUACAO[r.situacao][0] }}</span></td>
                <td>
                  <template v-if="r.pagamento">
                    <span class="pf-num">{{ diaBR(r.pagamento.pagoEm) }}</span>
                    <small style="display:block;color:var(--pf-muted)">{{ FORMAS.find(f => f.valor === r.pagamento!.forma)?.rotulo ?? 'Forma não informada' }}</small>
                  </template>
                  <span v-else style="color:var(--pf-muted)">—</span>
                </td>
                <td class="act">
                  <div style="display:inline-flex;gap:6px">
                    <button v-if="r.situacao === 'atrasado' || r.situacao === 'pendente'" class="pf-btn s k" @click="abrirPagamento(r)">
                      <Check :size="16" /> Registrar pagamento
                    </button>
                    <button v-else-if="r.pagamento" class="pf-btn s" @click="desfazendo = r">Desfazer</button>
                    <button class="pf-btn s" @click="abrirConfig(r)">Configurar</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ REGISTRAR PAGAMENTO ══ -->
    <PlatformModal v-model="modalPagamento" titulo="Registrar pagamento" :subtitulo="atual ? `${atual.nome} · ${nomeMes}` : ''" pequena>
      <template #icone><Wallet :size="18" /></template>
      <form class="pf-boxm" @submit.prevent="salvarPagamento">
        <div class="pf-form">
          <div class="pf-fld">
            <label class="pf-lab" for="pg-valor">Valor recebido (R$) *</label>
            <input id="pg-valor" v-model="pag.valor" class="pf-inp pf-num" type="number" min="0.01" step="0.01">
          </div>
          <div class="pf-fld">
            <label class="pf-lab" for="pg-data">Pago em *</label>
            <input id="pg-data" v-model="pag.pagoEm" class="pf-inp" type="date">
          </div>
          <div class="pf-fld full">
            <span class="pf-lab">Forma de pagamento</span>
            <div class="pf-chips">
              <button v-for="f in FORMAS" :key="f.valor" type="button" class="pf-fc" :aria-pressed="pag.forma === f.valor" @click="pag.forma = pag.forma === f.valor ? null : f.valor">{{ f.rotulo }}</button>
            </div>
          </div>
          <div class="pf-fld full">
            <label class="pf-lab" for="pg-obs">Observação <small>(opcional)</small></label>
            <input id="pg-obs" v-model="pag.observacao" class="pf-inp" type="text" maxlength="300" placeholder="Ex.: pagou junto com o mês anterior">
          </div>
        </div>
        <button type="submit" hidden />
      </form>
      <p v-if="msgErro" class="pf-err" role="alert">{{ msgErro }}</p>
      <template #rodape>
        <button class="pf-btn" @click="modalPagamento = false">Cancelar</button>
        <button class="pf-btn p" :disabled="salvando" @click="salvarPagamento"><Loader2 v-if="salvando" :size="16" class="animate-spin" /> Registrar</button>
      </template>
    </PlatformModal>

    <!-- ══ CONFIGURAR COBRANÇA ══ -->
    <PlatformModal v-model="modalConfig" titulo="Cobrança do restaurante" :subtitulo="atual?.nome" pequena>
      <template #icone><Settings2 :size="18" /></template>
      <form class="pf-boxm" @submit.prevent="salvarConfig">
        <div class="pf-feat" style="padding-top:0">
          <div><b>Isento de mensalidade</b><small>Não entra no previsto nem nos atrasos</small></div>
          <button type="button" class="pf-sw" role="switch" :aria-checked="cfg.isento" aria-label="Isento de mensalidade" @click="cfg.isento = !cfg.isento" />
        </div>
        <div class="pf-form">
          <div class="pf-fld">
            <label class="pf-lab" for="cf-dia">Dia do vencimento *</label>
            <input id="cf-dia" v-model="cfg.dia" class="pf-inp pf-num" type="number" min="1" max="28" :disabled="cfg.isento">
            <small style="color:var(--pf-muted)">De 1 a 28</small>
          </div>
          <div class="pf-fld">
            <label class="pf-lab" for="cf-valor">Valor combinado (R$)</label>
            <input id="cf-valor" v-model="cfg.valor" class="pf-inp pf-num" type="number" min="0" step="0.01" :placeholder="atual && atual.origemValor !== 'combinado' && atual.valor ? String(atual.valor) : '0,00'" :disabled="cfg.isento">
            <small style="color:var(--pf-muted)">Em branco usa o {{ atual?.origemValor === 'plano' ? 'plano' : 'contrato ou o plano' }}</small>
          </div>
          <div class="pf-fld full">
            <label class="pf-lab" for="cf-obs">Observação <small>(aparece na lista)</small></label>
            <input id="cf-obs" v-model="cfg.observacao" class="pf-inp" type="text" maxlength="300" placeholder="Ex.: paga sempre por Pix no dia 5">
          </div>
        </div>
        <button type="submit" hidden />
      </form>
      <p v-if="msgErro" class="pf-err" role="alert">{{ msgErro }}</p>
      <template #rodape>
        <button class="pf-btn" @click="modalConfig = false">Cancelar</button>
        <button class="pf-btn p" :disabled="salvando" @click="salvarConfig"><Loader2 v-if="salvando" :size="16" class="animate-spin" /> Salvar</button>
      </template>
    </PlatformModal>

    <PlatformConfirmDialog
      :model-value="!!desfazendo"
      :title="`Desfazer o pagamento de ${desfazendo?.nome ?? ''}?`"
      :message="`O mês de ${nomeMes} volta a ficar em aberto para este restaurante.`"
      type="danger"
      @update:model-value="v => { if (!v) desfazendo = null }"
      @resolved="v => v && desfazerPagamento()"
    />
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ChevronLeft, ChevronRight, Check, Wallet, Settings2, Loader2, AlertTriangle } from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { moeda, iniciais } from '~/composables/usePlatformTenants'

definePageMeta({ layout: false })

type Situacao = 'isento' | 'em_dia' | 'sem_valor' | 'atrasado' | 'pendente'
interface Linha {
  tenantId: string; nome: string; slug: string; status: string; plano: string | null
  diaVencimento: number; isento: boolean; observacao: string | null
  valor: number; valorCombinado: number | null; origemValor: 'combinado' | 'contrato' | 'plano' | 'nenhum'
  situacao: Situacao
  pagamento: { id: string; valor: number; pagoEm: string; forma: string | null; observacao: string | null } | null
}
interface Resposta {
  competencia: string
  totais: { previsto: number; recebido: number; pendente: number; atrasado: number; qtd: Record<Situacao, number> }
  restaurantes: Linha[]
}

const SITUACAO: Record<Situacao, [string, string]> = {
  atrasado:  ['Atrasado', 'bad'],
  pendente:  ['No prazo', 'warn'],
  em_dia:    ['Pago', 'ok'],
  isento:    ['Isento', 'mute'],
  sem_valor: ['Sem valor', 'mute'],
}
const ORIGEM: Record<Linha['origemValor'], string> = {
  combinado: 'valor combinado', contrato: 'do contrato', plano: 'do plano', nenhum: 'sem valor definido',
}
const FORMAS = [
  { valor: 'pix', rotulo: 'Pix' }, { valor: 'dinheiro', rotulo: 'Dinheiro' }, { valor: 'cartao', rotulo: 'Cartão' },
  { valor: 'boleto', rotulo: 'Boleto' }, { valor: 'transferencia', rotulo: 'Transferência' },
]
const FILTROS: { chave: 'todos' | Situacao; rotulo: string }[] = [
  { chave: 'todos', rotulo: 'Todos' }, { chave: 'atrasado', rotulo: 'Atrasados' }, { chave: 'pendente', rotulo: 'No prazo' },
  { chave: 'em_dia', rotulo: 'Pagos' }, { chave: 'isento', rotulo: 'Isentos' }, { chave: 'sem_valor', rotulo: 'Sem valor' },
]

// Data sem hora (coluna DATE): formata o texto direto, sem passar pelo fuso,
// senão meia-noite UTC vira o dia anterior no horário de Brasília
const diaBR = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

const platformAuth = usePlatformAuthStore()
const toast = useToast()
const { platformFetch } = usePlatformFetch()

// ── Mês de referência ──
const mesDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const hoje = mesDe(new Date())
const competencia = ref(hoje)
const nomeMes = computed(() => {
  const [a, m] = competencia.value.split('-').map(Number)
  const n = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return n.charAt(0).toUpperCase() + n.slice(1)
})
function mudarMes(passo: number) {
  const [a, m] = competencia.value.split('-').map(Number)
  competencia.value = mesDe(new Date(a, m - 1 + passo, 1))
}

// ── Dados ──
const dados   = ref<Resposta | null>(null)
const loading = ref(false)
const erro    = ref('')
async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    dados.value = await platformFetch<Resposta>(`/platform/cobranca?competencia=${competencia.value}`)
  } catch (e: any) {
    erro.value = e?.message || 'Erro ao carregar'
  } finally {
    loading.value = false
  }
}
watch(competencia, carregar)

const filtro = ref<'todos' | Situacao>('todos')
const busca  = ref('')
const contar = (f: 'todos' | Situacao) => (dados.value ? (f === 'todos' ? dados.value.restaurantes.length : dados.value.totais.qtd[f] ?? 0) : 0)
const ORDEM: Record<Situacao, number> = { atrasado: 0, pendente: 1, sem_valor: 2, em_dia: 3, isento: 4 }
const lista = computed(() => {
  const q = busca.value.trim().toLowerCase()
  return (dados.value?.restaurantes ?? [])
    .filter(r => filtro.value === 'todos' || r.situacao === filtro.value)
    .filter(r => !q || r.nome.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q))
    .sort((a, b) => ORDEM[a.situacao] - ORDEM[b.situacao] || a.diaVencimento - b.diaVencimento || a.nome.localeCompare(b.nome, 'pt-BR'))
})

// ── Ações ──
const atual    = ref<Linha | null>(null)
const salvando = ref(false)
const msgErro  = ref('')

const modalPagamento = ref(false)
const pag = reactive({ valor: '' as string | number, pagoEm: '', forma: 'pix' as string | null, observacao: '' })
function abrirPagamento(r: Linha) {
  atual.value = r
  msgErro.value = ''
  Object.assign(pag, { valor: r.valor || '', pagoEm: new Date().toISOString().slice(0, 10), forma: 'pix', observacao: '' })
  modalPagamento.value = true
}
async function salvarPagamento() {
  if (!atual.value) return
  msgErro.value = ''
  const valor = Number(String(pag.valor).replace(',', '.'))
  if (!valor || valor <= 0) { msgErro.value = 'Informe o valor recebido.'; return }
  if (!pag.pagoEm) { msgErro.value = 'Informe a data do pagamento.'; return }
  salvando.value = true
  try {
    await platformFetch('/platform/cobranca/pagamentos', {
      method: 'POST',
      body: JSON.stringify({ tenantId: atual.value.tenantId, competencia: competencia.value, valor, pagoEm: pag.pagoEm, forma: pag.forma, observacao: pag.observacao.trim() || null }),
    })
    modalPagamento.value = false
    toast.add({ title: `Pagamento de ${atual.value.nome} registrado`, color: 'green', timeout: 3000 })
    await carregar()
  } catch (e: any) {
    msgErro.value = e?.message || 'Não deu para registrar o pagamento.'
  } finally {
    salvando.value = false
  }
}

const modalConfig = ref(false)
const cfg = reactive({ dia: 10 as number | string, valor: '' as string | number, isento: false, observacao: '' })
function abrirConfig(r: Linha) {
  atual.value = r
  msgErro.value = ''
  Object.assign(cfg, { dia: r.diaVencimento, valor: r.valorCombinado ?? '', isento: r.isento, observacao: r.observacao ?? '' })
  modalConfig.value = true
}
async function salvarConfig() {
  if (!atual.value) return
  msgErro.value = ''
  const dia = Number(cfg.dia)
  if (!Number.isInteger(dia) || dia < 1 || dia > 28) { msgErro.value = 'O vencimento precisa ser um dia de 1 a 28.'; return }
  const valor = cfg.valor === '' ? null : Number(String(cfg.valor).replace(',', '.'))
  if (valor !== null && (Number.isNaN(valor) || valor < 0)) { msgErro.value = 'Valor combinado inválido.'; return }
  salvando.value = true
  try {
    await platformFetch(`/platform/cobranca/tenants/${atual.value.tenantId}`, {
      method: 'PUT',
      body: JSON.stringify({ diaVencimento: dia, valor, isento: cfg.isento, observacao: cfg.observacao.trim() || null }),
    })
    modalConfig.value = false
    toast.add({ title: 'Cobrança atualizada', color: 'green', timeout: 3000 })
    await carregar()
  } catch (e: any) {
    msgErro.value = e?.message || 'Não deu para salvar.'
  } finally {
    salvando.value = false
  }
}

const desfazendo = ref<Linha | null>(null)
async function desfazerPagamento() {
  const r = desfazendo.value
  if (!r?.pagamento) return
  try {
    await platformFetch(`/platform/cobranca/pagamentos/${r.pagamento.id}`, { method: 'DELETE' })
    toast.add({ title: 'Pagamento desfeito', color: 'green', timeout: 3000 })
    await carregar()
  } catch (e: any) {
    toast.add({ title: 'Erro', description: e?.message || 'Não deu para desfazer', color: 'red', timeout: 4000 })
  } finally {
    desfazendo.value = null
  }
}

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) { navigateTo('/platform/login'); return }
  carregar()
})
</script>
