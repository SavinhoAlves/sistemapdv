<template>
  <div class="space-y-5">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <RelKpi rotulo="Caixas no período" :valor="numero(r.qtdCaixas)" />
      <RelKpi rotulo="Diferença acumulada" :valor="moeda(r.diferencaTotal)" :sub="r.comDiferenca ? `${r.comDiferenca} fechamento${r.comDiferenca === 1 ? '' : 's'} com diferença` : 'todos os fechamentos bateram'" :tom="r.diferencaTotal < -0.005 ? 'ruim' : undefined" />
      <RelKpi rotulo="Sangrias" :valor="moeda(r.totalSangrias)" />
      <RelKpi rotulo="Suprimentos" :valor="moeda(r.totalSuprimentos)" />
    </div>
    <RelCartao titulo="Aberturas e fechamentos" sem-padding>
      <RelTabela :colunas="COLS" :linhas="d.historico" vazio="Nenhum caixa no período">
        <template #dataAbertura="{ linha }">{{ dataHora(linha.dataAbertura) }}</template>
        <template #fechadoEm="{ linha }">{{ linha.fechadoEm ? dataHora(linha.fechadoEm) : 'Aberto' }}</template>
        <template #valorInicial="{ linha }">{{ moeda(linha.valorInicial) }}</template>
        <template #valorFechamento="{ linha }">{{ linha.valorFechamento === null ? '—' : moeda(linha.valorFechamento) }}</template>
        <template #valorContado="{ linha }">{{ linha.valorContado === null ? '—' : moeda(linha.valorContado) }}</template>
        <template #diferenca="{ linha }">
          <span v-if="linha.diferenca === null">—</span>
          <span v-else class="font-black" :class="linha.diferenca < -0.005 ? 'text-red-500 dark:text-red-400' : linha.diferenca > 0.005 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'">
            {{ linha.diferenca > 0.005 ? '+' : '' }}{{ moeda(linha.diferenca) }}
          </span>
        </template>
      </RelTabela>
    </RelCartao>
    <RelCartao titulo="Sangrias e suprimentos" sem-padding>
      <RelTabela :colunas="COLS_MOV" :linhas="d.movimentos" vazio="Nenhuma sangria ou suprimento">
        <template #em="{ linha }">{{ dataHora(linha.em) }}</template>
        <template #tipo="{ linha }">{{ linha.tipo === 'sangria' ? 'Sangria' : 'Suprimento' }}</template>
        <template #valor="{ linha }">{{ moeda(linha.valor) }}</template>
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
const r = computed(() => d.value.resumo)
const COLS = [
  { chave: 'operador', rotulo: 'Operador', forte: true },
  { chave: 'dataAbertura', rotulo: 'Abertura', nowrap: true },
  { chave: 'fechadoEm', rotulo: 'Fechamento', nowrap: true },
  { chave: 'valorInicial', rotulo: 'Inicial', direita: true, nowrap: true },
  { chave: 'valorFechamento', rotulo: 'Esperado', direita: true, nowrap: true },
  { chave: 'valorContado', rotulo: 'Contado', direita: true, nowrap: true },
  { chave: 'diferenca', rotulo: 'Diferença', direita: true, nowrap: true },
]
const COLS_MOV = [
  { chave: 'em', rotulo: 'Quando', nowrap: true },
  { chave: 'tipo', rotulo: 'Tipo', forte: true },
  { chave: 'valor', rotulo: 'Valor', direita: true, nowrap: true },
  { chave: 'descricao', rotulo: 'Descrição' },
  { chave: 'operador', rotulo: 'Por' },
]
</script>
