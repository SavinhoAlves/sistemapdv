<template>
  <div class="space-y-5">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <RelKpi rotulo="Vendas confirmadas" :valor="numero(d.resumo.qtd)" />
      <RelKpi rotulo="Total" :valor="moeda(d.resumo.total)" />
      <RelKpi rotulo="Estornos" :valor="numero(d.resumo.qtdEstornos)" :tom="d.resumo.qtdEstornos ? 'alerta' : undefined" />
      <RelKpi rotulo="Valor estornado" :valor="moeda(d.resumo.totalEstornado)" />
    </div>
    <RelCartao titulo="Lista de vendas" :sub="d.truncado ? 'Mostrando as 1.000 mais recentes — reduza o período para ver todas' : `${d.vendas.length} registro${d.vendas.length === 1 ? '' : 's'}`" sem-padding>
      <RelTabela :colunas="COLS" :linhas="d.vendas" vazio="Nenhuma venda com esses filtros">
        <template #em="{ linha }">{{ dataHora(linha.em) }}</template>
        <template #pedido="{ linha }">#{{ linha.pedido }}</template>
        <template #valor="{ linha }"><span :class="linha.status === 'estornado' ? 'line-through text-gray-400 dark:text-white/35' : ''">{{ moeda(linha.valor) }}</span></template>
        <template #status="{ linha }">
          <span v-if="linha.status === 'estornado'" class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400" :title="linha.motivoEstorno || ''">Estornada</span>
          <span v-else class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Paga</span>
        </template>
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
const COLS = [
  { chave: 'em', rotulo: 'Quando', nowrap: true },
  { chave: 'pedido', rotulo: 'Pedido', nowrap: true },
  { chave: 'local', rotulo: 'Local', forte: true },
  { chave: 'garcom', rotulo: 'Atendente' },
  { chave: 'metodo', rotulo: 'Pagamento' },
  { chave: 'valor', rotulo: 'Valor', direita: true, forte: true, nowrap: true },
  { chave: 'status', rotulo: 'Situação' },
]
</script>
