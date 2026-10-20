<template>
  <div class="min-h-screen transition-colors duration-200 com-sidebar">
    <Sidebar />
    <Navbar />

    <main class="p-4 sm:p-6 w-full">

      <!-- ══ CABEÇALHO ══ -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div class="flex items-center gap-3">
          <div class="size-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-md shadow-orange-900/50 flex items-center justify-center shrink-0">
            <FileText :size="18" class="text-white" />
          </div>
          <div>
            <h1 class="text-2xl font-black text-gray-900 dark:text-white">Relatórios</h1>
            <p class="text-sm text-gray-500 dark:text-white/50 mt-0.5">{{ abaAtual.rotulo }} · {{ rotuloPeriodo }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0 no-print">
          <button class="rel-btn" @click="imprimir"><Printer :size="13" /> Imprimir</button>
          <button class="rel-btn" :disabled="!dados" @click="exportarCSV"><Download :size="13" /> CSV</button>
        </div>
      </div>

      <!-- ══ PERÍODO + FILTROS ══ -->
      <div class="flex flex-wrap items-center gap-2 no-print">
        <div class="flex bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-xl p-1 gap-0.5 overflow-x-auto max-w-full">
          <button v-for="a in ATALHOS" :key="a.tipo" @click="aplicarAtalho(a.tipo)"
            class="h-8 px-3 rounded-lg text-xs font-black transition-all whitespace-nowrap"
            :class="atalho === a.tipo ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80'">
            {{ a.rotulo }}
          </button>
        </div>
        <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 h-10">
          <CalendarDays :size="13" class="text-gray-400 dark:text-white/40 shrink-0" />
          <input v-model="dataInicio" type="date" aria-label="Data inicial" :max="dataFim" @change="atalho = 'custom'"
            class="bg-transparent text-xs font-bold text-gray-700 dark:text-white/80 outline-none w-[7.2rem]" />
          <span class="text-gray-300 dark:text-white/25 text-xs">–</span>
          <input v-model="dataFim" type="date" aria-label="Data final" :min="dataInicio" @change="atalho = 'custom'"
            class="bg-transparent text-xs font-bold text-gray-700 dark:text-white/80 outline-none w-[7.2rem]" />
        </div>

        <!-- Botão de filtros + painel -->
        <div class="relative" ref="ancoraFiltros">
          <button
            class="h-10 px-4 rounded-xl border text-xs font-black flex items-center gap-2 transition-all"
            :class="painelAberto || ativosNaAba.length
              ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400'
              : 'border-gray-200 dark:border-white/[0.08] bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white'"
            :aria-expanded="painelAberto" aria-haspopup="dialog"
            @click="painelAberto = !painelAberto"
          >
            <SlidersHorizontal :size="14" /> Filtros
            <span v-if="ativosNaAba.length" class="min-w-5 h-5 px-1.5 rounded-full bg-orange-500 text-white text-[10px] leading-5 tabular-nums">{{ ativosNaAba.length }}</span>
          </button>

          <div v-if="painelAberto" role="dialog" aria-label="Filtros do relatório"
            class="absolute z-40 mt-2 left-0 sm:left-auto sm:right-0 w-[min(22rem,calc(100vw-2rem))] p-4 rounded-2xl bg-white dark:bg-[#1c2231] border border-gray-200 dark:border-white/10 shadow-2xl space-y-3">
            <p class="text-[11px] text-gray-500 dark:text-white/45">Filtros que valem para <b class="text-gray-800 dark:text-white/80">{{ abaAtual.rotulo }}</b></p>
            <label v-for="c in abaAtual.filtros" :key="c" class="block">
              <span class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/45 mb-1">{{ rotuloFiltro(c, aba) }}</span>
              <select v-model="filtros[c]" class="rel-select">
                <option value="">{{ c === 'status' ? 'Só confirmadas' : 'Todos' }}</option>
                <option v-for="o in opcoesDe(c)" :key="o.id" :value="o.id">{{ o.nome }}</option>
              </select>
            </label>
            <div class="flex justify-between pt-1">
              <button class="text-xs font-bold text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white disabled:opacity-40" :disabled="!ativos.length" @click="limparFiltros">Limpar filtros</button>
              <button class="h-8 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-black" @click="painelAberto = false">Pronto</button>
            </div>
          </div>
        </div>

        <button @click="buscar" :disabled="carregando" title="Atualizar" aria-label="Atualizar relatório"
          class="h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition-all active:scale-95 flex items-center justify-center">
          <RefreshCw :size="14" :class="carregando ? 'animate-spin' : ''" />
        </button>
      </div>

      <!-- ══ BADGES DOS FILTROS ATIVOS ══ -->
      <div v-if="ativos.length" class="flex flex-wrap items-center gap-2 mt-3">
        <span
          v-for="f in ativos" :key="f.chave"
          class="inline-flex items-center gap-1.5 h-7 pl-3 pr-1 rounded-full text-xs border"
          :class="f.aplica
            ? 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300'
            : 'border-dashed border-gray-300 dark:border-white/15 text-gray-400 dark:text-white/35'"
          :title="f.aplica ? '' : `Não vale para ${abaAtual.rotulo}`"
        >
          <span class="font-medium">{{ f.rotulo }}:</span><b class="font-black">{{ f.valor }}</b>
          <button class="size-5 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10" :aria-label="`Remover filtro ${f.rotulo}`" @click="filtros[f.chave] = ''">
            <X :size="12" />
          </button>
        </span>
        <button class="text-xs font-bold text-gray-500 dark:text-white/45 hover:text-gray-900 dark:hover:text-white ml-1" @click="limparFiltros">Limpar tudo</button>
      </div>

      <!-- ══ ABAS ══ -->
      <div class="mt-5 mb-5 border-b border-gray-200 dark:border-white/[0.08] overflow-x-auto no-print" role="tablist" aria-label="Tipo de relatório">
        <div class="flex gap-1 min-w-max">
          <button v-for="a in abasVisiveis" :key="a.valor" role="tab" :aria-selected="aba === a.valor"
            class="relative h-10 px-3.5 text-sm font-bold whitespace-nowrap transition-colors"
            :class="aba === a.valor ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70'"
            @click="aba = a.valor">
            {{ a.rotulo }}
            <span v-if="aba === a.valor" class="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-orange-500" />
          </button>
        </div>
      </div>

      <!-- ══ CONTEÚDO ══ -->
      <div v-if="carregando && !dados" class="space-y-5">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="n in 4" :key="n" class="h-24 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
        </div>
        <div class="h-72 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
      </div>
      <div v-else-if="erro" class="flex flex-col items-center py-20 text-center gap-3">
        <p class="text-base font-black text-gray-700 dark:text-white/80">Não deu para carregar o relatório</p>
        <p class="text-sm text-gray-400 dark:text-white/40">{{ erro }}</p>
        <button class="rel-btn" @click="buscar">Tentar novamente</button>
      </div>
      <div v-else-if="dados" :class="carregando ? 'opacity-60 transition-opacity' : ''">
        <component :is="COMPONENTES[aba]" :dados="dados" />
      </div>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDays, RefreshCw, Printer, Download, FileText, SlidersHorizontal, X } from 'lucide-vue-next'
import Navbar  from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import RelGeral from '~/components/relatorios/RelGeral.vue'
import RelVendas from '~/components/relatorios/RelVendas.vue'
import RelProdutos from '~/components/relatorios/RelProdutos.vue'
import RelMesas from '~/components/relatorios/RelMesas.vue'
import RelDescontos from '~/components/relatorios/RelDescontos.vue'
import RelCaixa from '~/components/relatorios/RelCaixa.vue'
import RelEstoque from '~/components/relatorios/RelEstoque.vue'
import RelAuditoria from '~/components/relatorios/RelAuditoria.vue'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import {
  ABAS, ORIGENS, STATUS_VENDA, ACOES_AUDITORIA, rotuloFiltro, diaLocal, somarDias, diaBR,
  type Aba, type ChaveFiltro,
} from '~/lib/relatorios'
import { csvDoRelatorio } from '~/lib/relatoriosCsv'

definePageMeta({ layout: false })

const api       = useApi()
const authStore = useAuthStore()
const route     = useRoute()
const router    = useRouter()

const COMPONENTES: Record<Aba, any> = {
  geral: RelGeral, vendas: RelVendas, produtos: RelProdutos, mesas: RelMesas,
  descontos: RelDescontos, caixa: RelCaixa, estoque: RelEstoque, auditoria: RelAuditoria,
}
const isAdmin      = computed(() => authStore.usuario?.cargo === 'administrador')
const abasVisiveis = computed(() => ABAS.filter(a => !a.admin || isAdmin.value))

// ── Estado (espelhado na URL: recarregar ou compartilhar mantém o relatório) ──
const q = route.query
const abaInicial = ABAS.find(a => a.valor === q.aba && (!a.admin || isAdmin.value))?.valor ?? 'geral'
const aba        = ref<Aba>(abaInicial)
const abaAtual   = computed(() => ABAS.find(a => a.valor === aba.value)!)

const hoje = diaLocal()
const dataInicio = ref(typeof q.de === 'string' ? q.de : hoje)
const dataFim    = ref(typeof q.ate === 'string' ? q.ate : hoje)
const atalho     = ref(typeof q.de === 'string' ? 'custom' : 'hoje')

const CHAVES: ChaveFiltro[] = ['funcionarioId', 'metodoId', 'categoriaId', 'produtoId', 'origem', 'status', 'acao']
const filtros = reactive(Object.fromEntries(CHAVES.map(c => [c, typeof q[c] === 'string' ? q[c] : ''])) as Record<ChaveFiltro, string>)

// ── Período ──
const ATALHOS = [
  { tipo: 'hoje', rotulo: 'Hoje' }, { tipo: 'ontem', rotulo: 'Ontem' },
  { tipo: '7d', rotulo: '7 dias' }, { tipo: 'mes', rotulo: 'Este mês' }, { tipo: 'mesPassado', rotulo: 'Mês passado' },
]
function aplicarAtalho(tipo: string) {
  const h = diaLocal()
  const ini = `${h.slice(0, 8)}01`
  if (tipo === 'hoje')       { dataInicio.value = dataFim.value = h }
  if (tipo === 'ontem')      { dataInicio.value = dataFim.value = somarDias(h, -1) }
  if (tipo === '7d')         { dataInicio.value = somarDias(h, -6); dataFim.value = h }
  if (tipo === 'mes')        { dataInicio.value = ini; dataFim.value = h }
  if (tipo === 'mesPassado') { const fim = somarDias(ini, -1); dataInicio.value = `${fim.slice(0, 8)}01`; dataFim.value = fim }
  atalho.value = tipo
}
const rotuloPeriodo = computed(() => {
  const a = ATALHOS.find(x => x.tipo === atalho.value)
  if (a) return a.rotulo
  return dataInicio.value === dataFim.value ? diaBR(dataInicio.value) : `${diaBR(dataInicio.value)} a ${diaBR(dataFim.value)}`
})

// ── Opções dos filtros ──
const opcoes = ref<{ funcionarios: any[]; metodos: any[]; categorias: any[]; produtos: any[] }>({ funcionarios: [], metodos: [], categorias: [], produtos: [] })
function opcoesDe(c: ChaveFiltro): { id: string; nome: string }[] {
  if (c === 'funcionarioId') return opcoes.value.funcionarios
  if (c === 'metodoId')      return opcoes.value.metodos
  if (c === 'categoriaId')   return opcoes.value.categorias
  if (c === 'produtoId')     return opcoes.value.produtos.filter(p => !filtros.categoriaId || p.categoriaId === filtros.categoriaId)
  if (c === 'origem')        return ORIGENS
  if (c === 'status')        return STATUS_VENDA
  return Object.entries(ACOES_AUDITORIA).map(([id, v]) => ({ id, nome: v.rotulo }))
}

/** Filtros com valor → badges. `aplica` = vale para a aba atual (os outros ficam tracejados). */
const ativos = computed(() => CHAVES.filter(c => filtros[c]).map(c => ({
  chave: c,
  rotulo: rotuloFiltro(c, aba.value),
  valor: opcoesDe(c).find(o => o.id === filtros[c])?.nome ?? '…',
  aplica: abaAtual.value.filtros.includes(c),
})))
const ativosNaAba = computed(() => ativos.value.filter(f => f.aplica))
function limparFiltros() { CHAVES.forEach(c => { filtros[c] = '' }) }

// Produto que não pertence à categoria escolhida sai do filtro
watch(() => filtros.categoriaId, (cat) => {
  if (cat && filtros.produtoId && opcoes.value.produtos.find(p => p.id === filtros.produtoId)?.categoriaId !== cat) filtros.produtoId = ''
})

// ── Dados ──
const dados      = ref<any>(null)
const carregando = ref(false)
const erro       = ref('')
let pedido = 0

async function buscar() {
  const meu = ++pedido
  carregando.value = true
  erro.value = ''
  const params = new URLSearchParams({ dataInicio: dataInicio.value, dataFim: dataFim.value })
  for (const c of abaAtual.value.filtros) if (filtros[c]) params.set(c, filtros[c])
  try {
    const r = await api.get<any>(`/relatorios${abaAtual.value.endpoint}?${params}`)
    if (meu === pedido) dados.value = r
  } catch (e: any) {
    if (meu === pedido) { erro.value = e?.message || 'Erro desconhecido'; dados.value = null }
  } finally {
    if (meu === pedido) carregando.value = false
  }
}

// Trocar de aba limpa a tela (formatos diferentes); período e filtros só recarregam
watch(aba, () => { dados.value = null })
watch([aba, dataInicio, dataFim, () => abaAtual.value.filtros.map(c => filtros[c]).join('|')], () => {
  if (dataInicio.value && dataFim.value && dataInicio.value <= dataFim.value) buscar()
  router.replace({ query: {
    aba: aba.value,
    ...(atalho.value === 'custom' ? { de: dataInicio.value, ate: dataFim.value } : {}),
    ...Object.fromEntries(CHAVES.filter(c => filtros[c]).map(c => [c, filtros[c]])),
  } })
})
watch(atalho, (a) => { if (a !== 'custom') router.replace({ query: { ...route.query, de: undefined, ate: undefined } }) })

// ── Exportar ──
function imprimir() { globalThis.print() }
function exportarCSV() {
  if (!dados.value) return
  const cab = [
    ['Relatório', abaAtual.value.rotulo],
    ['Período', `${diaBR(dataInicio.value)} a ${diaBR(dataFim.value)}`],
    ...ativosNaAba.value.map(f => [f.rotulo, f.valor]),
    [],
  ]
  const linhas = [...cab, ...csvDoRelatorio(aba.value, dados.value)]
  const esc = (v: unknown) => { const s = String(v ?? ''); return /[;\n"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const csv = linhas.map(r => r.map(esc).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `relatorio-${aba.value}-${dataInicio.value}_${dataFim.value}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── Painel de filtros: fecha ao clicar fora ou com Esc ──
const painelAberto  = ref(false)
const ancoraFiltros = ref<HTMLElement | null>(null)
function cliqueFora(e: MouseEvent) { if (painelAberto.value && !ancoraFiltros.value?.contains(e.target as Node)) painelAberto.value = false }
function tecla(e: KeyboardEvent) { if (e.key === 'Escape') painelAberto.value = false }

onMounted(async () => {
  document.addEventListener('mousedown', cliqueFora)
  document.addEventListener('keydown', tecla)
  buscar()
  try { opcoes.value = await api.get('/relatorios/filtros') } catch {}
})
onUnmounted(() => {
  document.removeEventListener('mousedown', cliqueFora)
  document.removeEventListener('keydown', tecla)
})
</script>

<style scoped>
.rel-btn {
  height: 2.5rem; padding: 0 0.85rem; border-radius: 0.75rem; display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.75rem; font-weight: 900; border: 1px solid var(--linha); background: var(--sup-elevado); color: var(--txt-2);
}
.rel-btn:hover:not(:disabled) { color: var(--txt); }
.rel-btn:disabled { opacity: 0.45; }
.rel-select {
  width: 100%; height: 2.4rem; padding: 0 0.7rem; border-radius: 0.65rem; font-size: 0.8rem; outline: none;
  background: var(--sup-elevado); border: 1px solid var(--linha); color: var(--txt);
}
.rel-select:focus { border-color: rgb(249 115 22 / 0.6); }
.rel-select option { background: var(--sup-cartao); color: var(--txt); }
</style>

<style>
@media print {
  .no-print, nav, aside, header.nb { display: none !important; }
  body, .min-h-screen { background: white !important; }
  .com-sidebar { padding-left: 0 !important; }
  main { max-width: 100% !important; padding: 0 !important; }
}
</style>
