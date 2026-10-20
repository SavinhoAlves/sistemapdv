<template>
  <div class="space-y-5">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <RelKpi rotulo="Descontos" :valor="moeda(r.descontos.total)" :sub="`${r.descontos.qtd} concedido${r.descontos.qtd === 1 ? '' : 's'}`" />
      <RelKpi rotulo="Cortesias" :valor="moeda(r.cortesias.total)" :sub="`${r.cortesias.qtd} por conta da casa`" />
      <RelKpi rotulo="Itens cancelados" :valor="moeda(r.cancelamentos.total)" :sub="`${r.cancelamentos.qtd} item${r.cancelamentos.qtd === 1 ? '' : 's'}`" :tom="r.cancelamentos.qtd ? 'alerta' : undefined" />
      <RelKpi rotulo="Estornos" :valor="moeda(r.estornos.total)" :sub="`${r.estornos.qtd} pagamento${r.estornos.qtd === 1 ? '' : 's'}`" :tom="r.estornos.qtd ? 'ruim' : undefined" />
    </div>

    <RelCartao titulo="Descontos e cortesias" sub="quem concedeu e por quê" sem-padding>
      <RelTabela :colunas="COLS_ABAT" :linhas="d.abatimentos" vazio="Nenhum desconto no período">
        <template #em="{ linha }">{{ dataHora(linha.em) }}</template>
        <template #tipo="{ linha }">{{ linha.tipo === 'cortesia' ? 'Cortesia' : linha.tipo === 'percentual' ? `${linha.percentual}%` : 'Valor' }}</template>
        <template #valor="{ linha }">{{ moeda(linha.valor) }}</template>
      </RelTabela>
    </RelCartao>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <RelCartao titulo="Itens cancelados" sem-padding>
        <RelTabela :colunas="COLS_ITENS" :linhas="d.itensCancelados" vazio="Nenhum item cancelado">
          <template #em="{ linha }">{{ dataHora(linha.em) }}</template>
          <template #produto="{ linha }">{{ linha.quantidade }}× {{ linha.produto }}</template>
          <template #valor="{ linha }">{{ moeda(linha.valor) }}</template>
        </RelTabela>
      </RelCartao>
      <RelCartao titulo="Estornos de pagamento" sem-padding>
        <RelTabela :colunas="COLS_EST" :linhas="d.estornos" vazio="Nenhum estorno">
          <template #em="{ linha }">{{ dataHora(linha.em) }}</template>
          <template #valor="{ linha }">{{ moeda(linha.valor) }}</template>
        </RelTabela>
      </RelCartao>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RelCartao from './RelCartao.vue'
import RelKpi from './RelKpi.vue'
import RelTabela from './RelTabela.vue'
import { moeda, dataHora } from '~/lib/relatorios'

const props = defineProps<{ dados: any }>()
const d = computed(() => props.dados)
const r = computed(() => d.value.resumo)
const COLS_ABAT = [
  { chave: 'em', rotulo: 'Quando', nowrap: true },
  { chave: 'local', rotulo: 'Local', forte: true },
  { chave: 'tipo', rotulo: 'Tipo' },
  { chave: 'valor', rotulo: 'Valor', direita: true, forte: true, nowrap: true },
  { chave: 'motivo', rotulo: 'Motivo' },
  { chave: 'por', rotulo: 'Por' },
]
const COLS_ITENS = [
  { chave: 'em', rotulo: 'Quando', nowrap: true },
  { chave: 'produto', rotulo: 'Item', forte: true },
  { chave: 'valor', rotulo: 'Valor', direita: true, nowrap: true },
  { chave: 'motivo', rotulo: 'Motivo' },
  { chave: 'por', rotulo: 'Por' },
]
const COLS_EST = [
  { chave: 'em', rotulo: 'Quando', nowrap: true },
  { chave: 'local', rotulo: 'Local', forte: true },
  { chave: 'metodo', rotulo: 'Pagamento' },
  { chave: 'valor', rotulo: 'Valor', direita: true, nowrap: true },
  { chave: 'motivo', rotulo: 'Motivo' },
  { chave: 'por', rotulo: 'Por' },
]
</script>
