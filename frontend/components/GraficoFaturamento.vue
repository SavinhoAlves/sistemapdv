<template>
  <div class="bg-white dark:bg-white/[0.02] rounded-2xl border border-gray-200 dark:border-white/[0.07] overflow-hidden">
    <div class="px-5 py-4 border-b border-gray-100 dark:border-white/[0.05] flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-2.5">
        <div class="size-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-sm shadow-orange-900/50 flex items-center justify-center">
          <ChartColumn :size="13" class="text-white" />
        </div>
        <div>
          <h2 class="text-sm font-black text-gray-900 dark:text-white">Faturamento</h2>
          <p class="text-[11px] text-gray-400 dark:text-white/35 tabular-nums">
            {{ modo === 'hoje' ? 'Hoje, por hora' : 'Últimos 7 dias' }} · R$&nbsp;{{ moeda(totalPeriodo) }}
          </p>
        </div>
      </div>
      <div class="flex rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] p-1" role="tablist" aria-label="Período do gráfico">
        <button
          v-for="m in MODOS" :key="m.valor"
          role="tab" :aria-selected="modo === m.valor"
          class="h-7 px-3 rounded-lg text-xs font-black transition-colors"
          :class="modo === m.valor ? 'bg-orange-500 text-white' : 'text-gray-500 dark:text-white/45 hover:text-gray-800 dark:hover:text-white/80'"
          @click="modo = m.valor"
        >{{ m.rotulo }}</button>
      </div>
    </div>

    <div class="px-3 sm:px-5 pt-4 pb-3">
      <div v-if="carregando" class="h-[220px] rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />

      <div v-else-if="!totalPeriodo" class="h-[220px] flex flex-col items-center justify-center text-center">
        <ChartColumn :size="22" class="text-gray-300 dark:text-white/15 mb-2" />
        <p class="text-sm font-bold text-gray-400 dark:text-white/25">
          {{ modo === 'hoje' ? 'Nenhum pagamento hoje ainda' : 'Nenhum pagamento nos últimos 7 dias' }}
        </p>
      </div>

      <div v-else ref="caixa" class="relative" @mouseleave="foco = null">
        <svg :viewBox="`0 0 ${L} ${A}`" class="w-full h-[220px] overflow-visible" role="img"
          :aria-label="`Faturamento ${modo === 'hoje' ? 'de hoje por hora' : 'dos últimos 7 dias'}`">
          <!-- grade recessiva + valores do eixo -->
          <g v-for="t in ticks" :key="t">
            <line :x1="ESQ" :x2="L" :y1="y(t)" :y2="y(t)" class="stroke-gray-200 dark:stroke-white/[0.06]" stroke-width="1" />
            <text :x="ESQ - 6" :y="y(t) + 3" text-anchor="end" class="fill-gray-400 dark:fill-white/35 text-[10px] tabular-nums">{{ curto(t) }}</text>
          </g>
          <!-- barras: topo arredondado 4px, base reta no eixo -->
          <g v-for="(b, i) in barras" :key="b.chave">
            <path :d="barra(i, b.total)" :fill="COR" :opacity="foco === null || foco === i ? 1 : 0.45" class="transition-opacity" />
            <!-- área de toque maior que a barra -->
            <rect :x="ESQ + i * passo" y="0" :width="passo" :height="A - BASE" fill="transparent"
              @mouseenter="foco = i" @click="foco = foco === i ? null : i" />
            <text v-if="mostrarRotulo(i)" :x="ESQ + i * passo + passo / 2" :y="A - BASE + 14" text-anchor="middle"
              class="fill-gray-400 dark:fill-white/35 text-[10px] tabular-nums">{{ b.rotulo }}</text>
          </g>
        </svg>

        <div
          v-if="foco !== null"
          class="pointer-events-none absolute -translate-x-1/2 -translate-y-full px-3 py-2 rounded-xl bg-gray-900 dark:bg-[#1c2231] border border-white/10 shadow-xl text-white whitespace-nowrap"
          :style="{ left: `${((ESQ + foco * passo + passo / 2) / L) * 100}%`, top: `${(y(barras[foco].total) / A) * 220 - 8}px` }"
        >
          <p class="text-[11px] text-white/60">{{ barras[foco].titulo }}</p>
          <p class="text-sm font-black tabular-nums">R$&nbsp;{{ moeda(barras[foco].total) }}</p>
          <p class="text-[11px] text-white/60 tabular-nums">{{ barras[foco].qtd }} pagamento{{ barras[foco].qtd === 1 ? '' : 's' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { ChartColumn } from 'lucide-vue-next'

interface Ponto { total: number; qtd: number }
const props = defineProps<{
  porHora?: (Ponto & { hora: number })[]
  ultimos7Dias?: (Ponto & { dia: string })[]
  carregando?: boolean
}>()

// Série única na cor da marca (#ea580c passa faixa de luminosidade e 3:1 nos dois temas)
const COR = '#ea580c'
const MODOS = [{ valor: 'hoje', rotulo: 'Hoje' }, { valor: 'semana', rotulo: '7 dias' }] as const
const modo = ref<'hoje' | 'semana'>('hoje')
const foco = ref<number | null>(null)

// Geometria do SVG: 1 unidade = 1px; a largura acompanha o card (sem faixas vazias nem texto esticado)
const A = 220, ESQ = 44, BASE = 22, TOPO = 10
const caixa = ref<HTMLElement | null>(null)
const largura = ref(640)
let obs: ResizeObserver | null = null
watch(caixa, (el) => {
  obs?.disconnect()
  if (!el) return
  obs = new ResizeObserver(([e]) => { largura.value = Math.max(e.contentRect.width, 280) })
  obs.observe(el)
})
onUnmounted(() => obs?.disconnect())

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const barras = computed(() => {
  if (modo.value === 'hoje') {
    return (props.porHora ?? []).map(p => ({
      chave: `h${p.hora}`, total: p.total, qtd: p.qtd,
      rotulo: `${p.hora}h`, titulo: `${String(p.hora).padStart(2, '0')}h – ${String(p.hora).padStart(2, '0')}h59`,
    }))
  }
  return (props.ultimos7Dias ?? []).map((p, i, xs) => {
    const d = new Date(`${p.dia}T12:00:00`)
    const dm = `${p.dia.slice(8, 10)}/${p.dia.slice(5, 7)}`
    return {
      chave: p.dia, total: p.total, qtd: p.qtd,
      rotulo: i === xs.length - 1 ? 'hoje' : `${DIAS[d.getDay()]} ${dm}`,
      titulo: `${DIAS[d.getDay()]}, ${dm}`,
    }
  })
})

const totalPeriodo = computed(() => barras.value.reduce((s, b) => s + b.total, 0))
const L = computed(() => largura.value)
const passo = computed(() => (L.value - ESQ) / Math.max(barras.value.length, 1))

/** Teto "redondo" do eixo e 3 marcas: 1–2–2,5–5 × 10ⁿ. */
const teto = computed(() => {
  const max = Math.max(...barras.value.map(b => b.total), 0)
  if (!max) return 1
  const ordem = 10 ** Math.floor(Math.log10(max / 3))
  const passoEixo = [1, 2, 2.5, 5, 10].map(f => f * ordem).find(s => s * 3 >= max) ?? ordem * 10
  return passoEixo * 3
})
const ticks = computed(() => [0, 1, 2, 3].map(i => (teto.value / 3) * i))
const y = (v: number) => A - BASE - (v / teto.value) * (A - BASE - TOPO)

function barra(i: number, v: number) {
  const larg = Math.min(passo.value * 0.62, 36)
  const x = ESQ + i * passo.value + (passo.value - larg) / 2
  const base = A - BASE
  const topo = y(v)
  const h = base - topo
  if (h <= 0) return ''
  const r = Math.min(4, h, larg / 2)
  return `M${x},${base}V${topo + r}Q${x},${topo} ${x + r},${topo}H${x + larg - r}Q${x + larg},${topo} ${x + larg},${topo + r}V${base}Z`
}

// Rótulos sem encavalar: por hora a cada 3h (6h no celular); por dia, todos (alternados no celular)
const mostrarRotulo = (i: number) => modo.value === 'semana'
  ? largura.value >= 520 || i % 2 === 0 || i === barras.value.length - 1
  : i % (largura.value >= 520 ? 3 : 6) === 0

const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const curto = (v: number) => v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(Math.round(v))
</script>
