<template>
  <div class="space-y-5">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <RelKpi rotulo="Produtos controlados" :valor="numero(r.produtosControlados)" :sub="`${moeda(r.valorEmEstoque)} a preço de venda`" />
      <RelKpi rotulo="Zerados" :valor="numero(r.zerados)" :tom="r.zerados ? 'ruim' : undefined" />
      <RelKpi rotulo="Abaixo do mínimo" :valor="numero(r.baixos)" :tom="r.baixos ? 'alerta' : undefined" />
      <RelKpi rotulo="Entradas / saídas" :valor="`${numero(r.entradas)} / ${numero(r.saidas)}`" sub="unidades no período" />
    </div>
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <RelCartao titulo="Posição atual" sub="hoje, independente do período" sem-padding>
        <RelTabela :colunas="COLS_POS" :linhas="d.posicao" vazio="Nenhum produto com controle de estoque">
          <template #situacao="{ linha }">
            <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
              :class="linha.situacao === 'zerado' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : linha.situacao === 'baixo' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'">
              {{ linha.situacao === 'zerado' ? 'Zerado' : linha.situacao === 'baixo' ? 'Baixo' : 'OK' }}
            </span>
          </template>
          <template #estoqueAtual="{ linha }">{{ numero(linha.estoqueAtual) }}<span class="text-gray-400 dark:text-white/35"> / {{ numero(linha.estoqueMinimo) }}</span></template>
        </RelTabela>
      </RelCartao>
      <RelCartao titulo="Movimentações no período" sem-padding>
        <RelTabela :colunas="COLS_MOV" :linhas="d.movimentos" vazio="Nenhuma movimentação no período">
          <template #em="{ linha }">{{ dataHora(linha.em) }}</template>
          <template #quantidade="{ linha }">
            <span class="font-black" :class="linha.tipo === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'">{{ linha.tipo === 'entrada' ? '+' : '−' }}{{ numero(linha.quantidade) }}</span>
          </template>
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
import { moeda, numero, dataHora } from '~/lib/relatorios'

const props = defineProps<{ dados: any }>()
const d = computed(() => props.dados)
const r = computed(() => d.value.resumo)
const COLS_POS = [
  { chave: 'nome', rotulo: 'Produto', forte: true },
  { chave: 'categoria', rotulo: 'Categoria' },
  { chave: 'estoqueAtual', rotulo: 'Atual / mín.', direita: true, nowrap: true },
  { chave: 'situacao', rotulo: 'Situação' },
]
const COLS_MOV = [
  { chave: 'em', rotulo: 'Quando', nowrap: true },
  { chave: 'produto', rotulo: 'Produto', forte: true },
  { chave: 'quantidade', rotulo: 'Qtd', direita: true },
  { chave: 'motivo', rotulo: 'Motivo' },
  { chave: 'por', rotulo: 'Por' },
]
</script>
