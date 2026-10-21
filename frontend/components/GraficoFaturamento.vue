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

      <GraficoBarras
        v-else
        :barras="barras"
        :rotulo-a-cada="modo === 'hoje' ? 3 : 1"
        :descricao="`Faturamento ${modo === 'hoje' ? 'de hoje por hora' : 'dos últimos 7 dias'}`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChartColumn } from 'lucide-vue-next'
import { barrasPorHora, barrasPorDia } from '~/utils/barras'

interface Ponto { total: number; qtd: number }
const props = defineProps<{
  porHora?: (Ponto & { hora: number })[]
  ultimos7Dias?: (Ponto & { dia: string })[]
  carregando?: boolean
}>()

const MODOS = [{ valor: 'hoje', rotulo: 'Hoje' }, { valor: 'semana', rotulo: '7 dias' }] as const
const modo = ref<'hoje' | 'semana'>('hoje')

const barras = computed(() => modo.value === 'hoje'
  ? barrasPorHora(props.porHora ?? [])
  : barrasPorDia(props.ultimos7Dias ?? [], { ultimoEhHoje: true }))

const totalPeriodo = computed(() => barras.value.reduce((s, b) => s + b.total, 0))

const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
</script>
