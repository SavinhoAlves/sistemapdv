<template>
  <PlatformShell ativo="cobranca" titulo="Cobranças" :contagens="{ cobranca: (dados?.totais.qtd.tolerancia || 0) + (dados?.totais.qtd.bloqueado || 0) }">

    <div class="pf-crumb">Clientes</div>
    <div class="pf-head">
      <div>
        <h1>Cobranças</h1>
        <p>Quem está em dia, em teste, atrasado ou bloqueado. Registrar o pagamento empurra o vencimento um ciclo e libera o acesso na hora.</p>
      </div>
    </div>

    <div v-if="loading && !dados" class="pf-loading"><span class="pf-spin" /></div>

    <div v-else-if="erro" class="pf-card">
      <div class="pf-empty"><b>Não deu para carregar as cobranças</b><p>{{ erro }}</p><button class="pf-btn" @click="carregar">Tentar novamente</button></div>
    </div>

    <template v-else-if="dados">
      <div class="pf-strip">
        <div class="pf-st">
          <small>Receita mensal</small>
          <strong>{{ moeda(dados.totais.receitaMensal) }}</strong>
          <em>contratos pagantes, por mês</em>
        </div>
        <div class="pf-st">
          <small>Recebido no mês</small>
          <strong>{{ moeda(dados.totais.recebidoNoMes) }}</strong>
          <em>pagamentos registrados em {{ nomeMes }}</em>
        </div>
        <div class="pf-st">
          <small>A receber em 30 dias</small>
          <strong>{{ moeda(dados.totais.aReceber30d) }}</strong>
          <em>vencimentos de quem está em dia</em>
        </div>
        <div class="pf-st" :class="{ hot: atrasados > 0 }">
          <small>Em atraso</small>
          <strong>{{ moeda(dados.totais.emAtraso) }}</strong>
          <em>{{ atrasados ? `${atrasados} ${atrasados === 1 ? 'restaurante' : 'restaurantes'}` : 'ninguém atrasado' }}</em>
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
          <b>{{ dados.restaurantes.length ? 'Nada neste filtro' : 'Nenhum restaurante cadastrado' }}</b>
          {{ dados.restaurantes.length ? 'Tente outra situação ou outra busca.' : 'Cadastre um restaurante para começar a cobrar.' }}
        </div>

        <div v-else class="pf-scroll">
          <table class="pf-table">
            <thead>
              <tr><th>Restaurante</th><th>Valor</th><th>Vencimento</th><th>Situação</th><th>Último pagamento</th><th /></tr>
            </thead>
            <tbody>
              <tr v-for="r in lista" :key="r.tenantId">
                <td>
                  <NuxtLink :to="`/platform/tenants/${r.tenantId}`" class="pf-who" style="color:inherit;text-decoration:none">
                    <span class="pf-av">{{ iniciais(r.nome) }}</span>
                    <div style="min-width:0">
                      <b>{{ r.nome }}</b>
                      <small>Cód. {{ r.codigo }} · {{ r.plano ? `Plano ${r.plano}` : 'Sem plano' }}</small>
                    </div>
                  </NuxtLink>
                </td>
                <td>
                  <span v-if="r.isento" style="color:var(--pf-muted)">Isento</span>
                  <template v-else-if="r.valor != null">
                    <b class="pf-num" style="white-space:nowrap">{{ moeda(r.valor) }}</b>
                    <small style="display:block;color:var(--pf-muted)">{{ rotuloCiclo(r.ciclo) }}</small>
                  </template>
                  <span v-else style="color:var(--pf-muted)">—</span>
                </td>
                <td class="pf-num" style="white-space:nowrap">
                  <template v-if="r.situacao === 'teste'">fim do teste {{ diaBR(r.testeAte) }}</template>
                  <template v-else-if="r.proximoVencimento && !r.isento">{{ diaBR(r.proximoVencimento) }}</template>
                  <template v-else>—</template>
                </td>
                <td><span class="pf-pill" :class="situacaoPill(r)[1]"><i />{{ situacaoPill(r)[0] }}</span></td>
                <td>
                  <template v-if="r.ultimoPagamento">
                    <span class="pf-num">{{ diaBR(r.ultimoPagamento.pagoEm) }}</span>
                    <small style="display:block;color:var(--pf-muted)">{{ moeda(r.ultimoPagamento.valor) }} · {{ FORMAS.find(f => f.valor === r.ultimoPagamento!.forma)?.rotulo ?? 'forma não informada' }}</small>
                  </template>
                  <span v-else style="color:var(--pf-muted)">—</span>
                </td>
                <td class="act">
                  <button v-if="podeCobrar(r)" class="pf-btn s k" @click="abrirPagamento(r)"><Check :size="16" /> Registrar pagamento</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══ REGISTRAR PAGAMENTO ══ -->
    <PlatformModal v-model="modalPagamento" titulo="Registrar pagamento" :subtitulo="atual ? `${atual.nome} · ${periodo}` : ''" pequena>
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
            <input id="pg-obs" v-model="pag.observacao" class="pf-inp" type="text" maxlength="300" placeholder="Ex.: pagou dois meses juntos">
          </div>
        </div>
        <button type="submit" hidden />
      </form>
      <p class="pf-note info" style="margin:0">O próximo vencimento passa para {{ diaBR(proximoAposPagar) }} e o acesso é liberado na hora.</p>
      <p v-if="msgErro" class="pf-err" role="alert">{{ msgErro }}</p>
      <template #rodape>
        <button class="pf-btn" @click="modalPagamento = false">Cancelar</button>
        <button class="pf-btn p" :disabled="salvando" @click="salvarPagamento"><Loader2 v-if="salvando" :size="16" class="animate-spin" /> Registrar</button>
      </template>
    </PlatformModal>
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Check, Wallet, Loader2 } from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import {
  moeda, iniciais, diaBR, rotuloCiclo, mesesCiclo, situacaoPill,
  type Assinatura, type Situacao,
} from '~/composables/usePlatformTenants'

definePageMeta({ layout: false })

interface Linha extends Assinatura {
  tenantId: string; codigo: number; nome: string; slug: string; plano: string | null; observacao: string | null
  ultimoPagamento: { id: string; valor: number; pagoEm: string; forma: string | null; periodoInicio: string | null; periodoFim: string | null } | null
}
interface Resposta {
  hoje: string
  totais: { receitaMensal: number; recebidoNoMes: number; aReceber30d: number; emAtraso: number; qtd: Record<Situacao, number> }
  restaurantes: Linha[]
}

const FORMAS = [
  { valor: 'pix', rotulo: 'Pix' }, { valor: 'dinheiro', rotulo: 'Dinheiro' }, { valor: 'cartao', rotulo: 'Cartão' },
  { valor: 'boleto', rotulo: 'Boleto' }, { valor: 'transferencia', rotulo: 'Transferência' },
]
type Filtro = 'todos' | 'atrasados' | Situacao
const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: 'todos', rotulo: 'Todos' }, { chave: 'atrasados', rotulo: 'Atrasados' }, { chave: 'em_dia', rotulo: 'Em dia' },
  { chave: 'teste', rotulo: 'Em teste' }, { chave: 'isento', rotulo: 'Isentos' }, { chave: 'suspenso', rotulo: 'Suspensos' },
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
    dados.value = await platformFetch<Resposta>('/platform/cobranca')
  } catch (e: any) {
    erro.value = e?.message || 'Erro ao carregar'
  } finally {
    loading.value = false
  }
}

const nomeMes = computed(() => {
  const [a, m] = (dados.value?.hoje ?? new Date().toISOString()).slice(0, 7).split('-').map(Number)
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
})
const atrasados = computed(() => (dados.value?.totais.qtd.tolerancia ?? 0) + (dados.value?.totais.qtd.bloqueado ?? 0))

const filtro = ref<Filtro>('todos')
const busca  = ref('')
const casa = (r: Linha, f: Filtro) =>
  f === 'todos' || (f === 'atrasados' ? r.situacao === 'tolerancia' || r.situacao === 'bloqueado' : r.situacao === f)
const contar = (f: Filtro) => (dados.value?.restaurantes ?? []).filter(r => casa(r, f)).length
// Primeiro quem pede ação: bloqueado, atrasado, vencendo; depois teste, em dia, isento
const ORDEM: Record<Situacao, number> = { bloqueado: 0, tolerancia: 1, pendente: 2, em_dia: 3, teste: 4, suspenso: 5, isento: 6, cancelado: 7 }
const lista = computed(() => {
  const q = busca.value.trim().toLowerCase()
  return (dados.value?.restaurantes ?? [])
    .filter(r => casa(r, filtro.value))
    .filter(r => !q || r.nome.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || String(r.codigo).includes(q))
    .sort((a, b) => ORDEM[a.situacao] - ORDEM[b.situacao] || (a.proximoVencimento ?? '9').localeCompare(b.proximoVencimento ?? '9') || a.nome.localeCompare(b.nome, 'pt-BR'))
})

const podeCobrar = (r: Linha) => !r.isento && !['suspenso', 'cancelado'].includes(r.situacao)

// ── Registrar pagamento ──
const atual    = ref<Linha | null>(null)
const salvando = ref(false)
const msgErro  = ref('')
const modalPagamento = ref(false)
const pag = reactive({ valor: '' as string | number, pagoEm: '', forma: 'pix' as string | null, observacao: '' })
const hojeBR = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10)

/** Mesma conta do backend: soma meses mantendo o dia de vencimento. */
function somarMeses(iso: string, meses: number, dia: number) {
  const [a, m] = iso.split('-').map(Number)
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1))
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
  alvo.setUTCDate(Math.min(dia, ultimo))
  return alvo.toISOString().slice(0, 10)
}
const inicio = computed(() => atual.value?.proximoVencimento ?? hojeBR())
const proximoAposPagar = computed(() => atual.value ? somarMeses(inicio.value, mesesCiclo(atual.value.ciclo), atual.value.diaVencimento) : '')
const periodo = computed(() => `${diaBR(inicio.value)} a ${diaBR(proximoAposPagar.value)}`)

function abrirPagamento(r: Linha) {
  atual.value = r
  msgErro.value = ''
  Object.assign(pag, { valor: r.valor ?? '', pagoEm: hojeBR(), forma: 'pix', observacao: '' })
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
      body: JSON.stringify({ tenantId: atual.value.tenantId, valor, pagoEm: pag.pagoEm, forma: pag.forma, observacao: pag.observacao.trim() || null }),
    })
    modalPagamento.value = false
    toast.add({ title: `Pagamento de ${atual.value.nome} registrado`, description: `Próximo vencimento: ${diaBR(proximoAposPagar.value)}`, color: 'green', timeout: 3000 })
    await carregar()
  } catch (e: any) {
    msgErro.value = e?.message || 'Não deu para registrar o pagamento.'
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
