<template>
  <div ref="caixa" class="relative" @mouseleave="foco = null">
    <svg :viewBox="`0 0 ${L} ${altura}`" class="w-full overflow-visible" :style="{ height: `${altura}px` }" role="img" :aria-label="descricao">
      <!-- grade recessiva + valores do eixo -->
      <g v-for="t in ticks" :key="t">
        <line :x1="ESQ" :x2="L" :y1="y(t)" :y2="y(t)" class="stroke-gray-200 dark:stroke-white/[0.06]" stroke-width="1" />
        <text :x="ESQ - 6" :y="y(t) + 3" text-anchor="end" class="fill-gray-400 dark:fill-white/35 text-[10px] tabular-nums">{{ curto(t) }}</text>
      </g>
      <!-- barras: topo arredondado 4px, base reta no eixo -->
      <g v-for="(b, i) in barras" :key="b.chave">
        <path :d="barra(i, b.total)" :fill="COR" :opacity="foco === null || foco === i ? 1 : 0.45" class="transition-opacity" />
        <!-- área de toque maior que a barra -->
        <rect :x="ESQ + i * passo" y="0" :width="passo" :height="altura - BASE" fill="transparent"
          @mouseenter="foco = i" @click="foco = foco === i ? null : i" />
        <text v-if="mostrarRotulo(i)" :x="ESQ + i * passo + passo / 2" :y="altura - BASE + 14" text-anchor="middle"
          class="fill-gray-400 dark:fill-white/35 text-[10px] tabular-nums">{{ b.rotulo }}</text>
      </g>
    </svg>

    <div
      v-if="foco !== null && barras[foco]"
      class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full px-3 py-2 rounded-xl bg-gray-900 dark:bg-[#1c2231] border border-white/10 shadow-xl text-white whitespace-nowrap"
      :style="{ left: `${((ESQ + foco * passo + passo / 2) / L) * 100}%`, top: `${y(barras[foco].total) - 8}px` }"
    >
      <p class="text-[11px] text-white/60">{{ barras[foco].titulo }}</p>
      <p class="text-sm font-black tabular-nums">R$&nbsp;{{ moeda(barras[foco].total) }}</p>
      <p class="text-[11px] text-white/60 tabular-nums">{{ barras[foco].qtd }} {{ barras[foco].qtd === 1 ? unidade[0] : unidade[1] }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { Barra } from '~/utils/barras'

/**
 * Barras de série única em R$ (faturamento por hora/dia). Hover/toque mostra
 * o valor; rótulos do eixo X são espaçados para não encavalar.
 */
const props = withDefaults(defineProps<{
  barras: Barra[]
  descricao: string
  altura?: number
  /** Mostra 1 a cada N rótulos do eixo X (dobra em telas estreitas). */
  rotuloACada?: number
  unidade?: [string, string]
}>(), { altura: 220, rotuloACada: 1, unidade: () => ['pagamento', 'pagamentos'] })

// Cor da marca: #ea580c passa faixa de luminosidade e 3:1 nos dois temas
const COR = '#ea580c'
const ESQ = 44, BASE = 22, TOPO = 10
const foco = ref<number | null>(null)

// 1 unidade do viewBox = 1px: a largura acompanha o card (sem faixas vazias nem texto esticado)
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

const L = computed(() => largura.value)
const passo = computed(() => (L.value - ESQ) / Math.max(props.barras.length, 1))

/** Teto "redondo" do eixo e 3 marcas: 1–2–2,5–5 × 10ⁿ. */
const teto = computed(() => {
  const max = Math.max(...props.barras.map(b => b.total), 0)
  if (!max) return 1
  const ordem = 10 ** Math.floor(Math.log10(max / 3))
  const passoEixo = [1, 2, 2.5, 5, 10].map(f => f * ordem).find(s => s * 3 >= max) ?? ordem * 10
  return passoEixo * 3
})
const ticks = computed(() => [0, 1, 2, 3].map(i => (teto.value / 3) * i))
const y = (v: number) => props.altura - BASE - (v / teto.value) * (props.altura - BASE - TOPO)

function barra(i: number, v: number) {
  const larg = Math.min(passo.value * 0.62, 36)
  const x = ESQ + i * passo.value + (passo.value - larg) / 2
  const base = props.altura - BASE
  const topo = y(v)
  const h = base - topo
  if (h <= 0) return ''
  const r = Math.min(4, h, larg / 2)
  return `M${x},${base}V${topo + r}Q${x},${topo} ${x + r},${topo}H${x + larg - r}Q${x + larg},${topo} ${x + larg},${topo + r}V${base}Z`
}

// Cabe um rótulo a cada ~44px; o último sempre aparece
const mostrarRotulo = (i: number) => {
  const n = Math.max(props.rotuloACada, Math.ceil(44 / passo.value))
  return i % n === 0 || (n > 1 && i === props.barras.length - 1 && i % n >= n / 2)
}

const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const curto = (v: number) => v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(Math.round(v))
</script>
