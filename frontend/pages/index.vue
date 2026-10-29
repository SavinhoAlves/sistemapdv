<template>
  <div class="min-h-screen com-sidebar">
    <div class="db">

      <!-- CABEÇALHO -->
      <header class="db-topo">
        <div>
          <p class="db-data">{{ dataHoje }}</p>
          <h1>{{ saudacao }}, <span>{{ usuarioNome }}</span></h1>
        </div>
        <div class="db-acoes">
          <span class="db-atual"><i />{{ atualizadoRotulo }}</span>
          <button class="db-btn" :disabled="carregando" @click="() => carregar()">
            <RefreshCw :size="15" :class="carregando ? 'animate-spin' : ''" />Atualizar
          </button>
          <NuxtLink v-if="podeVender" to="/vendas" class="db-btn pri"><Plus :size="15" :stroke-width="2.4" />Nova venda</NuxtLink>
        </div>
      </header>

      <!-- INDICADORES -->
      <div class="db-kpis">
        <div v-for="k in kpis" :key="k.rotulo" class="db-card db-kpi">
          <div class="db-kpi-top">
            <span>{{ k.rotulo }}</span>
            <span v-if="k.delta" class="db-delta" :class="k.delta.cls" :title="`Comparado com ${atual.antes}`">{{ k.delta.txt }}</span>
          </div>
          <div class="db-kpi-base">
            <div class="min-w-0">
              <b v-if="!carregando">{{ k.valor }}</b>
              <b v-else class="db-sk" />
              <small>{{ k.sub }}</small>
            </div>
            <svg v-if="k.spark" class="db-spark" viewBox="0 0 84 32" preserveAspectRatio="none" aria-hidden="true"><path :d="k.spark" /></svg>
          </div>
        </div>
      </div>

      <!-- FATURAMENTO + SALÃO -->
      <div class="db-linha">
        <section class="db-card db-fat">
          <div class="db-sec-topo">
            <div>
              <h2>Faturamento</h2>
              <p class="db-total">R$&nbsp;{{ moeda(stats.faturamento) }} <small>{{ subGrafico }}</small></p>
            </div>
            <div class="db-seg" role="tablist" aria-label="Período do resumo">
              <button v-for="p in PERIODOS" :key="p.valor" role="tab" :aria-selected="periodo === p.valor" @click="mudarPeriodo(p.valor)">{{ p.rotulo }}</button>
            </div>
          </div>
          <div class="db-grafico">
            <div v-if="carregando" class="db-sk db-sk-graf" />
            <div v-else-if="!stats.faturamento" class="db-vazio">
              <strong>Nenhum pagamento {{ sufixo === 'hoje' ? 'hoje ainda' : sufixo }}</strong>
              <span>As vendas aparecem aqui assim que o primeiro pagamento for registrado.</span>
            </div>
            <GraficoBarras v-else :barras="barras" :rotulo-a-cada="umDia ? 3 : barras.length > 10 ? 5 : 1" :descricao="`Faturamento ${sufixo}`" />
          </div>
          <div class="db-mix">
            <div v-for="m in mix" :key="m.nome">
              <span><i :style="{ background: m.cor }" />{{ m.nome }}</span>
              <b>{{ m.pct }}%</b>
            </div>
            <div v-if="!mix.length"><span>Formas de pagamento</span><b>—</b></div>
          </div>
        </section>

        <section class="db-card db-salao">
          <div class="db-sec-topo">
            <div>
              <h2>Salão agora</h2>
              <p class="db-sub">{{ resumoSalao }}</p>
            </div>
            <NuxtLink v-if="podeMesas" to="/mesas" class="db-link">Abrir mesas</NuxtLink>
          </div>
          <div v-if="stats.salao.length" class="db-barra-occ" aria-hidden="true">
            <i :style="{ flex: ocupadas }" class="o" /><i :style="{ flex: contaPedida }" class="c" />
          </div>
          <div v-if="stats.salao.length" class="db-mesas">
            <component :is="podeMesas ? NuxtLink : 'div'" v-for="m in stats.salao" :key="m.id" :to="podeMesas ? '/mesas' : undefined" class="db-mesa" :class="{ conta: m.contaPedida }" :title="m.nome || `Mesa ${m.numero}`">
              <b>{{ m.nome || String(m.numero).padStart(2, '0') }}</b>
              <small>R$&nbsp;{{ moeda(m.total) }}</small>
            </component>
          </div>
          <div v-else class="db-vazio db-vazio-p"><strong>Nenhuma mesa aberta</strong><span>As mesas em atendimento aparecem aqui.</span></div>
          <div class="db-legenda">
            <span><i class="o" />Ocupada</span><span><i class="c" />Conta pedida</span>
          </div>
        </section>
      </div>

      <!-- PAGAMENTOS + MAIS VENDIDOS -->
      <div class="db-linha">
        <section class="db-card db-tab">
          <div class="db-sec-topo">
            <h2>Últimos pagamentos</h2>
            <div class="db-filtros">
              <button v-for="f in FILTROS" :key="f" :class="{ on: filtro === f }" @click="filtro = f">{{ f }}</button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table>
              <thead><tr><th>Hora</th><th>Origem</th><th>Forma</th><th class="r">Valor</th></tr></thead>
              <tbody>
                <tr v-for="p in pagamentosFiltrados" :key="p.id">
                  <td class="mono">{{ periodo === 'hoje' ? fmtHora(p.createdAt) : fmtDataHora(p.createdAt) }}</td>
                  <td><b>{{ p.nomeMesa || 'Venda direta' }}</b></td>
                  <td><span class="db-pill">{{ p.metodo }}</span></td>
                  <td class="r"><b>R$&nbsp;{{ moeda(p.valor) }}</b><small v-if="p.troco > 0">troco R$&nbsp;{{ moeda(p.troco) }}</small></td>
                </tr>
              </tbody>
            </table>
            <p v-if="!carregando && !pagamentosFiltrados.length" class="db-vazio-linha">Nenhum pagamento {{ filtro === 'Todos' ? sufixo : 'neste filtro' }}.</p>
          </div>
        </section>

        <section class="db-card db-top">
          <div class="db-sec-topo">
            <h2>Mais vendidos {{ sufixo }}</h2>
            <NuxtLink v-if="podeRelatorios" to="/relatorios" class="db-link">Relatórios</NuxtLink>
          </div>
          <ol v-if="stats.maisVendidos.length">
            <li v-for="(p, i) in stats.maisVendidos" :key="p.nome">
              <span class="mono">{{ String(i + 1).padStart(2, '0') }}</span>
              <div class="min-w-0">
                <b class="truncate">{{ p.nome }}</b>
                <div class="db-trilho"><i :class="{ um: i === 0 }" :style="{ width: (p.qtd / maxVendido) * 100 + '%' }" /></div>
              </div>
              <div class="r"><b>R$&nbsp;{{ moeda(p.total) }}</b><small>{{ p.qtd }} un.</small></div>
            </li>
          </ol>
          <div v-else class="db-vazio db-vazio-p"><strong>Nada vendido {{ sufixo }}</strong><span>Os produtos mais pedidos aparecem aqui.</span></div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { numeroBR } from '~/lib/moeda'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { RefreshCw, Plus } from 'lucide-vue-next'
import { NuxtLink } from '#components'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/services/api'
import { useSocket } from '~/services/socket'
import { aoMudarCaixa } from '~/lib/eventosCaixa'
import { barrasPorHora, barrasPorDia } from '~/utils/barras'

const router    = useRouter()
const authStore = useAuthStore()
const api       = useApi()
const socket    = useSocket()

interface Ponto { total: number; qtd: number }
const carregando = ref(true)
const atualizadoEm = ref(0)
const agora = ref(Date.now())
const stats = ref({
  faturamento:        0,
  pagamentos:         0,
  mesasAbertas:       0,
  pedidos:            0,
  ticketMedio:        0,
  anterior:           null as null | { faturamento: number; pedidos: number; ticketMedio: number },
  pagamentosRecentes: [] as any[],
  metodosPie:         [] as { metodo: string; qtd: number; total: number }[],
  porHora:            [] as ({ hora: number } & Ponto)[],
  porDia:             [] as ({ dia: string } & Ponto)[],
  maisVendidos:       [] as { nome: string; qtd: number; total: number }[],
  salao:              [] as { id: string; numero: number; nome: string | null; contaPedida: boolean; total: number }[],
})

// Período do resumo (fica salvo no aparelho)
type Periodo = 'hoje' | 'ontem' | '7d' | '30d'
const PERIODOS: { valor: Periodo; rotulo: string; sufixo: string; antes: string }[] = [
  { valor: 'hoje',  rotulo: 'Hoje',    sufixo: 'hoje',       antes: 'ontem até esta hora' },
  { valor: 'ontem', rotulo: 'Ontem',   sufixo: 'ontem',      antes: 'anteontem' },
  { valor: '7d',    rotulo: '7 dias',  sufixo: 'em 7 dias',  antes: 'os 7 dias anteriores' },
  { valor: '30d',   rotulo: '30 dias', sufixo: 'em 30 dias', antes: 'os 30 dias anteriores' },
]
const periodo = ref<Periodo>('hoje')
const atual = computed(() => PERIODOS.find(p => p.valor === periodo.value)!)
const sufixo = computed(() => atual.value.sufixo)
function mudarPeriodo(p: Periodo) {
  periodo.value = p
  try { localStorage.setItem('dashboard:periodo', p) } catch {}
  carregar()
}

const usuarioNome = computed(() => authStore.usuario?.nome?.split(' ')[0] || 'Operador')
const saudacao = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
})
const dataHoje = (d => d.charAt(0).toUpperCase() + d.slice(1))(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))
const atualizadoRotulo = computed(() => {
  if (!atualizadoEm.value) return 'Carregando…'
  const min = Math.floor((agora.value - atualizadoEm.value) / 60000)
  return min < 1 ? 'Atualizado agora' : `Atualizado há ${min} min`
})

const podeVender     = computed(() => authStore.temPermissao('gerenciarCaixa'))
const podeMesas      = computed(() => ['abrirMesa', 'fecharMesa', 'adicionarPedido'].some(p => authStore.temPermissao(p)))
const podeRelatorios = computed(() => authStore.temPermissao('verRelatorios'))

function moeda(v: number) { return numeroBR(v) }
function fmtHora(dt: string) { return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
function fmtDataHora(dt: string) { return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }

// ── Indicadores ────────────────────────────────────────────────────────────
function delta(atualV: number, antesV: number | undefined) {
  if (antesV == null || (!atualV && !antesV)) return null
  if (!antesV) return { txt: 'novo', cls: 'sobe' }
  const pct = ((atualV - antesV) / antesV) * 100
  const txt = (pct > 0 ? '+' : pct < 0 ? '−' : '') + Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
  return { txt, cls: pct > 0.05 ? 'sobe' : pct < -0.05 ? 'desce' : '' }
}
const umDia = computed(() => periodo.value === 'hoje' || periodo.value === 'ontem')
const serie = computed<Ponto[]>(() => umDia.value ? stats.value.porHora : stats.value.porDia)
function spark(valores: number[]) {
  if (valores.length < 2 || !valores.some(v => v > 0)) return ''
  const mx = Math.max(...valores), mn = Math.min(...valores)
  return valores.map((v, i) => `${i ? 'L' : 'M'}${(i / (valores.length - 1) * 84).toFixed(1)} ${(30 - (v - mn) / (mx - mn || 1) * 28).toFixed(1)}`).join(' ')
}
// Em "hoje", a linha vai só até a hora atual
const pontosSpark = computed(() => periodo.value === 'hoje' ? serie.value.slice(0, new Date().getHours() + 1) : serie.value)
const kpis = computed(() => {
  const st = stats.value, a = st.anterior ?? undefined
  const acum = (f: (p: Ponto) => number) => { let t = 0; return pontosSpark.value.map(p => (t += f(p))) }
  return [
    { rotulo: 'Faturamento', valor: `R$ ${moeda(st.faturamento)}`, sub: `${st.pagamentos} pagamento${st.pagamentos !== 1 ? 's' : ''}`, delta: delta(st.faturamento, a?.faturamento), spark: spark(acum(p => p.total)) },
    { rotulo: 'Mesas abertas', valor: String(st.mesasAbertas), sub: `${contaPedida.value} pediram a conta`, delta: null, spark: '' },
    { rotulo: 'Pedidos', valor: String(st.pedidos), sub: 'comandas pagas', delta: delta(st.pedidos, a?.pedidos), spark: spark(acum(p => p.qtd)) },
    { rotulo: 'Ticket médio', valor: `R$ ${moeda(st.ticketMedio)}`, sub: 'por pagamento', delta: delta(st.ticketMedio, a?.ticketMedio), spark: '' },
  ]
})

// ── Gráfico ────────────────────────────────────────────────────────────────
const barras = computed(() => umDia.value ? barrasPorHora(stats.value.porHora) : barrasPorDia(stats.value.porDia, { ultimoEhHoje: true }))
const subGrafico = computed(() => {
  const s = serie.value
  if (!stats.value.faturamento || !s.length) return umDia.value ? 'por hora' : 'por dia'
  const i = s.reduce((m, p, j) => (p.total > s[m].total ? j : m), 0)
  return umDia.value ? `por hora · pico às ${stats.value.porHora[i]?.hora ?? 0}h` : `por dia · pico em ${barras.value[i]?.rotulo}`
})
const CORES = ['var(--acao)', 'var(--txt)', 'var(--st-conta)', 'var(--txt-3)', 'var(--st-pronto)']
const mix = computed(() => {
  const tot = stats.value.metodosPie.reduce((s, m) => s + m.total, 0)
  return [...stats.value.metodosPie].sort((a, b) => b.total - a.total).slice(0, 5)
    .map((m, i) => ({ nome: m.metodo, pct: tot ? Math.round((m.total / tot) * 100) : 0, cor: CORES[i] }))
})

// ── Salão ──────────────────────────────────────────────────────────────────
const contaPedida = computed(() => stats.value.salao.filter(m => m.contaPedida).length)
const ocupadas = computed(() => stats.value.salao.length - contaPedida.value)
const resumoSalao = computed(() => {
  const n = stats.value.salao.length
  if (!n) return 'Nenhuma mesa em atendimento'
  return `${n} mesa${n !== 1 ? 's' : ''} aberta${n !== 1 ? 's' : ''} · ${contaPedida.value} pedi${contaPedida.value !== 1 ? 'ram' : 'u'} a conta`
})

// ── Pagamentos ─────────────────────────────────────────────────────────────
const FILTROS = ['Todos', 'Mesas', 'Venda direta'] as const
const filtro = ref<typeof FILTROS[number]>('Todos')
const pagamentosFiltrados = computed(() => stats.value.pagamentosRecentes.filter((p: any) =>
  filtro.value === 'Todos' || (filtro.value === 'Mesas' ? !!p.nomeMesa : !p.nomeMesa)))
const maxVendido = computed(() => Math.max(1, ...stats.value.maisVendidos.map(p => p.qtd)))

async function carregar(mostrarLoading = true) {
  if (mostrarLoading) carregando.value = true
  try {
    const data = await api.get<typeof stats.value>(`/dashboard/stats?periodo=${periodo.value}`)
    stats.value = { ...stats.value, ...data }
    atualizadoEm.value = Date.now()
    agora.value = Date.now()
  } catch (e) {
    console.error('Erro ao carregar dashboard:', e)
  } finally {
    if (mostrarLoading) carregando.value = false
  }
}

let pollingTimer: ReturnType<typeof setInterval> | null = null
let relogio: ReturnType<typeof setInterval> | null = null
const desinscrever: Array<() => void> = []

function onVisibilityChange() {
  if (!document.hidden) carregar(false)
}

onMounted(() => {
  if (!authStore.isAuthenticated) return router.push('/login')
  // Mesma regra do menu (useNavItems) e da API (/dashboard/stats)
  if (!authStore.temPermissao('verDashboard') && !authStore.temPermissao('verRelatorios')) return router.replace('/mesas')
  try {
    const salvo = localStorage.getItem('dashboard:periodo') as Periodo | null
    if (salvo && PERIODOS.some(p => p.valor === salvo)) periodo.value = salvo
  } catch {}
  carregar()
  pollingTimer = setInterval(() => { if (!document.hidden) carregar(false) }, 30000)
  relogio = setInterval(() => { agora.value = Date.now() }, 30000)
  document.addEventListener('visibilitychange', onVisibilityChange)

  // Tempo real via socket (conexão é gerenciada globalmente em
  // plugins/socket.client.ts); o polling acima continua como rede de segurança
  desinscrever.push(aoMudarCaixa(socket, () => carregar(false)))
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  if (relogio) clearInterval(relogio)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  desinscrever.forEach(fn => fn())
})
</script>

<style scoped>
/* Dashboard sobre os tokens do app (claro e escuro). */
.db{padding:28px clamp(16px,2.5vw,32px) 48px;display:flex;flex-direction:column;gap:20px;max-width:1440px}
.mono{font-family:var(--fonte-numero)}
.r{text-align:right}

.db-topo{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
.db-data{font-size:13px;color:var(--txt-3);margin:0 0 6px}
.db-topo h1{font-size:clamp(26px,2.6vw,32px);font-weight:800;letter-spacing:-.03em;line-height:1.1;color:var(--txt)}
.db-topo h1 span{color:var(--acao)}
.db-acoes{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.db-atual{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--txt-3)}
.db-atual i{width:6px;height:6px;border-radius:50%;background:var(--st-pronto)}
.db-btn{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:10px;border:1px solid var(--linha);background:var(--sup-cartao);font-weight:600;font-size:13px;color:var(--txt);transition:background var(--tempo-toque)}
.db-btn:hover{background:var(--sup-elevado)}
.db-btn[disabled]{opacity:.6}
.db-btn.pri{background:var(--acao);border-color:var(--acao);color:#0E1119}
.db-btn.pri:hover{background:var(--acao-hover)}

.db-card{background:var(--sup-cartao);border:1px solid var(--linha);border-radius:16px;min-width:0}
.db-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:14px}
.db-kpi{padding:18px 20px;display:flex;flex-direction:column;gap:14px}
.db-kpi-top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;font-weight:500;color:var(--txt-2)}
.db-delta{font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--sup-elevado);color:var(--txt-2)}
.db-delta.sobe{background:var(--st-pronto-bg);color:var(--st-pronto)}
.db-delta.desce{background:var(--st-atencao-bg);color:var(--st-atencao)}
.db-kpi-base{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
.db-kpi-base b{display:block;font:700 26px/1 var(--fonte-numero);letter-spacing:-.03em;color:var(--txt);white-space:nowrap}
.db-kpi-base small{display:block;margin-top:6px;font-size:12px;color:var(--txt-3)}
.db-spark{flex:0 1 64px;min-width:40px;height:28px;overflow:visible}
.db-spark path{fill:none;stroke:var(--acao);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.db-sk{display:block;width:110px;height:26px;border-radius:8px;background:var(--sup-elevado);animation:pulse 1.5s ease-in-out infinite}
.db-sk-graf{width:100%;height:220px}

.db-linha{display:flex;flex-wrap:wrap;gap:20px;align-items:stretch}
.db-fat,.db-tab{flex:2 1 520px;display:flex;flex-direction:column}
.db-salao,.db-top{flex:1 1 320px;display:flex;flex-direction:column}
.db-sec-topo{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 22px 0;flex-wrap:wrap}
.db-sec-topo h2{font-size:14px;font-weight:600;color:var(--txt);letter-spacing:0}
.db-total{margin:6px 0 0;font:700 26px var(--fonte-numero);letter-spacing:-.03em;color:var(--txt)}
.db-total small{font:400 13px var(--fonte-texto);letter-spacing:0;color:var(--txt-3);margin-left:6px}
.db-sub{margin:2px 0 0;font-size:13px;color:var(--txt-3)}
.db-link{font-size:13px;font-weight:600;color:var(--acao)}
.db-link:hover{text-decoration:underline}
.db-seg{display:flex;padding:3px;border-radius:10px;background:var(--sup-elevado)}
.db-seg button{font-size:12px;font-weight:600;padding:7px 12px;border-radius:8px;color:var(--txt-3)}
.db-seg button:hover{color:var(--txt)}
.db-seg button[aria-selected=true]{background:var(--sup-cartao);color:var(--txt);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.db-grafico{padding:16px 22px 14px;flex:1}
.db-vazio{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:24px}
.db-vazio strong{font-size:15px;color:var(--txt)}
.db-vazio span{font-size:14px;color:var(--txt-3);max-width:340px}
.db-vazio-p{min-height:180px;flex:1}
.db-mix{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));border-top:1px solid var(--linha)}
.db-mix div{padding:14px 22px;display:flex;flex-direction:column;gap:4px;border-right:1px solid var(--linha)}
.db-mix div:last-child{border-right:0}
.db-mix span{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--txt-3)}
.db-mix i{width:8px;height:8px;border-radius:2px;flex:none}
.db-mix b{font:600 15px var(--fonte-numero);color:var(--txt)}

.db-barra-occ{display:flex;gap:2px;height:8px;margin:14px 22px 0;border-radius:999px;overflow:hidden;background:var(--sup-elevado)}
.db-barra-occ .o{background:var(--acao)}
.db-barra-occ .c{background:var(--txt)}
.db-mesas{padding:16px 22px;display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:8px}
.db-mesa{display:flex;flex-direction:column;gap:2px;padding:9px 10px;border-radius:10px;min-height:54px;background:var(--acao);color:#0E1119;transition:transform var(--tempo-toque)}
a.db-mesa:hover{transform:translateY(-1px)}
.db-mesa.conta{background:var(--txt);color:var(--sup-fundo)}
.db-mesa b{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-mesa small{font:500 11px var(--fonte-numero);opacity:.85}
.db-legenda{margin-top:auto;display:flex;gap:16px;padding:14px 22px;border-top:1px solid var(--linha);font-size:12px;color:var(--txt-2)}
.db-legenda span{display:flex;align-items:center;gap:6px}
.db-legenda i{width:8px;height:8px;border-radius:2px}
.db-legenda .o{background:var(--acao)}
.db-legenda .c{background:var(--txt)}

.db-tab{overflow:hidden}
.db-tab .db-sec-topo{padding-bottom:16px;align-items:center}
.db-filtros{display:flex;gap:6px;flex-wrap:wrap}
.db-filtros button{font-size:12px;font-weight:500;padding:6px 12px;border-radius:999px;border:1px solid var(--linha);color:var(--txt-2)}
.db-filtros button.on{background:var(--txt);border-color:var(--txt);color:var(--sup-fundo)}
table{width:100%;min-width:480px;border-collapse:collapse;font-size:14px}
th{padding:10px 22px;text-align:left;font-size:12px;font-weight:600;color:var(--txt-3);background:var(--sup-elevado);border-block:1px solid var(--linha)}
td{padding:12px 22px;border-bottom:1px solid var(--linha);color:var(--txt-2);vertical-align:middle}
td b{color:var(--txt);font-weight:600}
td.mono{font-size:13px;color:var(--txt-3)}
td small{display:block;font-size:12px;color:var(--st-pronto)}
tbody tr:hover{background:var(--sup-elevado)}
tbody tr:last-child td{border-bottom:0}
.db-pill{display:inline-flex;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;background:var(--sup-elevado);color:var(--txt-2);white-space:nowrap}
.db-vazio-linha{padding:32px 22px;text-align:center;font-size:14px;color:var(--txt-3)}

.db-top ol{list-style:none;margin:0;padding:8px 22px 12px}
.db-top li{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid var(--linha)}
.db-top li:last-child{border-bottom:0}
.db-top li>span{font-size:12px;color:var(--txt-3)}
.db-top li b{display:block;font-size:14px;font-weight:500;color:var(--txt)}
.db-top .r b{font-weight:600;font-family:var(--fonte-numero)}
.db-top .r small{font-size:12px;color:var(--txt-3)}
.db-trilho{height:4px;margin-top:6px;border-radius:999px;background:var(--sup-elevado);overflow:hidden}
.db-trilho i{display:block;height:100%;border-radius:999px;background:color-mix(in srgb,var(--acao) 45%,transparent)}
.db-trilho i.um{background:var(--acao)}

@media (max-width:640px){.db{padding-top:20px}.db-sec-topo,.db-grafico,.db-mesas{padding-left:16px;padding-right:16px}td,th{padding-left:16px;padding-right:16px}}
</style>
