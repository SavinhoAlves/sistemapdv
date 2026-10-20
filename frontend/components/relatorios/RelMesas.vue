<template>
  <div class="space-y-5">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <RelKpi rotulo="Mesas atendidas" :valor="numero(d.resumo.mesasAtendidas)" :sub="`${d.resumo.comandasFechadas} comanda${d.resumo.comandasFechadas === 1 ? '' : 's'} fechada${d.resumo.comandasFechadas === 1 ? '' : 's'}`" />
      <RelKpi rotulo="Faturamento em mesas" :valor="moeda(d.resumo.faturamentoTotal)" />
      <RelKpi rotulo="Ticket médio" :valor="moeda(d.resumo.ticketMedioGeral)" sub="por pagamento" />
      <RelKpi rotulo="Permanência média" :valor="d.resumo.permanenciaMedia === null ? '—' : duracao(d.resumo.permanenciaMedia)" sub="da abertura ao fechamento" />
    </div>
    <RelCartao titulo="Faturamento por mesa" sem-padding>
      <RelTabela :colunas="COLS" :linhas="d.ranking" vazio="Nenhuma mesa paga com esses filtros">
        <template #totalFaturado="{ linha }">{{ moeda(linha.totalFaturado) }}</template>
        <template #ticketMedio="{ linha }">{{ moeda(linha.ticketMedio) }}</template>
        <template #ultimoPagamento="{ linha }">{{ dataHora(linha.ultimoPagamento) }}</template>
      </RelTabela>
    </RelCartao>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RelCartao from './RelCartao.vue'
import RelKpi from './RelKpi.vue'
import RelTabela from './RelTabela.vue'
import { moeda, numero, dataHora } from '~/lib/relatorios'

const props = defineProps<{ dados: any }>()
const d = computed(() => props.dados)
const duracao = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`)
const COLS = [
  { chave: 'nomeMesa', rotulo: 'Mesa', forte: true },
  { chave: 'qtdPagamentos', rotulo: 'Pagamentos', direita: true },
  { chave: 'totalFaturado', rotulo: 'Faturado', direita: true, forte: true, nowrap: true },
  { chave: 'ticketMedio', rotulo: 'Ticket médio', direita: true, nowrap: true },
  { chave: 'ultimoPagamento', rotulo: 'Último pagamento', nowrap: true },
]
</script>
