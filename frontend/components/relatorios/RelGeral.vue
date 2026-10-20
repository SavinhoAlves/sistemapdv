<template>
  <div class="space-y-5">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <RelKpi rotulo="Faturamento" :valor="moeda(d.resumo.faturamento)" :sub="variacao.texto" :sub-tom="variacao.tom" />
      <RelKpi rotulo="Pagamentos" :valor="numero(d.resumo.qtdPagamentos)" :sub="`${numero(d.resumo.qtdPedidos)} pedido${d.resumo.qtdPedidos === 1 ? '' : 's'}`" />
      <RelKpi rotulo="Ticket médio" :valor="moeda(d.resumo.ticketMedio)" sub="por pagamento" />
      <RelKpi rotulo="Descontos" :valor="moeda(d.resumo.totalAbatido)" :sub="`${d.resumo.qtdAbatimentos} concedido${d.resumo.qtdAbatimentos === 1 ? '' : 's'}`" />
    </div>

    <div v-if="!d.resumo.qtdPagamentos" class="flex flex-col items-center justify-center py-16 text-center">
      <BarChart2 :size="24" class="text-gray-300 dark:text-white/20 mb-3" />
      <p class="text-base font-black text-gray-700 dark:text-white/80">Nenhuma venda neste período</p>
      <p class="text-sm text-gray-400 dark:text-white/40 mt-1">Amplie o período ou remova algum filtro.</p>
    </div>

    <template v-else>
      <RelCartao :titulo="d.evolucao.length > 1 ? 'Faturamento por dia' : 'Faturamento por hora'" :sub="d.evolucao.length > 1 ? `${d.evolucao.length} dias` : 'no dia'">
        <GraficoBarras
          :barras="d.evolucao.length > 1 ? barrasPorDia(d.evolucao) : barrasPorHora(d.horarios)"
          :rotulo-a-cada="d.evolucao.length > 1 ? 1 : 3"
          :descricao="d.evolucao.length > 1 ? 'Faturamento por dia no período' : 'Faturamento por hora no dia'"
        />
      </RelCartao>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RelCartao titulo="Como pagaram">
          <div class="space-y-3.5">
            <div v-for="m in d.metodos" :key="m.metodo">
              <div class="flex justify-between items-baseline mb-1.5 text-xs">
                <span class="font-bold text-gray-700 dark:text-white/80">{{ m.metodo }}</span>
                <span class="tabular-nums"><b class="text-gray-900 dark:text-white">{{ moeda(m.total) }}</b>
                  <span class="text-gray-400 dark:text-white/40 ml-1.5">{{ pct(m.total, d.resumo.faturamento) }}% · {{ m.qtd }}x</span></span>
              </div>
              <div class="h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-[#ea580c]" :style="{ width: pct(m.total, maxMetodo) + '%' }" />
              </div>
            </div>
          </div>
        </RelCartao>

        <RelCartao v-if="d.evolucao.length > 1" titulo="Horário de pico" sub="soma do período, por hora">
          <GraficoBarras :barras="barrasPorHora(d.horarios)" :altura="180" :rotulo-a-cada="3" descricao="Faturamento por hora no período" />
        </RelCartao>

        <RelCartao titulo="Equipe" sub="faturamento dos pedidos que cada um lançou" sem-padding :class="d.evolucao.length > 1 ? 'lg:col-span-2' : ''">
          <RelTabela :colunas="COLS_EQUIPE" :linhas="d.porFuncionario" vazio="Nenhum atendimento no período">
            <template #nome="{ linha }"><span class="font-bold text-gray-900 dark:text-white">{{ linha.nome }}</span>
              <span class="text-[11px] text-gray-400 dark:text-white/40 ml-1.5 capitalize">{{ linha.cargo }}</span></template>
            <template #totalFaturado="{ linha }">{{ moeda(linha.totalFaturado) }}</template>
            <template #ticketMedio="{ linha }">{{ moeda(linha.ticketMedio) }}</template>
            <template #participacao="{ linha }">{{ pct(linha.totalFaturado, d.resumo.faturamento) }}%</template>
          </RelTabela>
        </RelCartao>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BarChart2 } from 'lucide-vue-next'
import RelCartao from './RelCartao.vue'
import RelKpi from './RelKpi.vue'
import RelTabela from './RelTabela.vue'
import GraficoBarras from '~/components/GraficoBarras.vue'
import { barrasPorDia, barrasPorHora } from '~/utils/barras'
import { moeda, numero, diaBR } from '~/lib/relatorios'

const props = defineProps<{ dados: any }>()
const d = computed(() => props.dados)

const pct = (v: number, t: number) => (t > 0 ? Math.round((Number(v) / t) * 100) : 0)
const maxMetodo = computed(() => Math.max(...d.value.metodos.map((m: any) => m.total), 0))

const variacao = computed(() => {
  const ant = d.value.anterior
  if (!ant?.faturamento) return { texto: 'sem vendas no período anterior', tom: 'neutro' as const }
  const p = ((d.value.resumo.faturamento - ant.faturamento) / ant.faturamento) * 100
  const quando = ant.inicio === ant.fim ? diaBR(ant.inicio) : `${diaBR(ant.inicio)} a ${diaBR(ant.fim)}`
  return { texto: `${p >= 0 ? '↑' : '↓'} ${Math.abs(p).toFixed(1).replace('.', ',')}% vs ${quando}`, tom: p >= 0 ? 'bom' as const : 'ruim' as const }
})

const COLS_EQUIPE = [
  { chave: 'nome', rotulo: 'Atendente' },
  { chave: 'qtdPedidos', rotulo: 'Pedidos', direita: true },
  { chave: 'totalFaturado', rotulo: 'Faturado', direita: true, forte: true },
  { chave: 'ticketMedio', rotulo: 'Ticket médio', direita: true },
  { chave: 'participacao', rotulo: '% do total', direita: true },
]
</script>
