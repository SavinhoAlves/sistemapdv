<template>
  <div class="bg-white dark:bg-white/[0.02] rounded-2xl border border-gray-200 dark:border-white/[0.07] overflow-hidden">
    <div class="px-5 py-4 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2.5">
      <div class="size-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-sm shadow-orange-900/50 flex items-center justify-center">
        <ChartColumn :size="13" class="text-white" />
      </div>
      <div>
        <h2 class="text-sm font-black text-gray-900 dark:text-white">Faturamento</h2>
        <p class="text-[11px] text-gray-400 dark:text-white/35 tabular-nums">
          {{ rotulo }}{{ porHora ? ', por hora' : ', por dia' }} · R$&nbsp;{{ moeda(totalPeriodo) }}
        </p>
      </div>
    </div>

    <div class="px-3 sm:px-5 pt-4 pb-3">
      <div v-if="carregando" class="h-[220px] rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />

      <div v-else-if="!totalPeriodo" class="h-[220px] flex flex-col items-center justify-center text-center">
        <ChartColumn :size="22" class="text-gray-300 dark:text-white/15 mb-2" />
        <p class="text-sm font-bold text-gray-400 dark:text-white/25">Nenhum pagamento {{ rotulo.toLowerCase() === 'hoje' ? 'hoje ainda' : `em ${rotulo.toLowerCase()}` }}</p>
      </div>

      <GraficoBarras
        v-else
        :barras="barras"
        :rotulo-a-cada="porHora ? 3 : barras.length > 10 ? 5 : 1"
        :descricao="`Faturamento ${rotulo.toLowerCase()}${porHora ? ' por hora' : ' por dia'}`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChartColumn } from 'lucide-vue-next'
import { barrasPorHora, barrasPorDia } from '~/utils/barras'

/** Gráfico do período escolhido no Dashboard: por hora num dia só, por dia em vários dias. */
interface Ponto { total: number; qtd: number }
const props = defineProps<{
  rotulo: string
  porHora?: (Ponto & { hora: number })[]
  porDia?: (Ponto & { dia: string })[]
  carregando?: boolean
}>()

const porHora = computed(() => (props.porHora?.length ?? 0) > 0)
const barras = computed(() => porHora.value
  ? barrasPorHora(props.porHora ?? [])
  : barrasPorDia(props.porDia ?? [], { ultimoEhHoje: true }))

const totalPeriodo = computed(() => barras.value.reduce((s, b) => s + b.total, 0))

const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
</script>
