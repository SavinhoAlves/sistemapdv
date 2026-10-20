<template>
  <div class="space-y-5">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <RelKpi rotulo="Itens vendidos" :valor="numero(totalQtd)" />
      <RelKpi rotulo="Total em produtos" :valor="moeda(totalValor)" sub="antes de descontos" />
      <RelKpi rotulo="Produtos diferentes" :valor="numero(d.ranking.length)" />
      <RelKpi rotulo="Sem venda" :valor="numero(d.semVenda.length)" :tom="d.semVenda.length ? 'alerta' : undefined" sub="ativos sem nenhuma venda" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <RelCartao titulo="Mais vendidos" class="lg:col-span-2" sem-padding>
        <RelTabela :colunas="COLS" :linhas="d.ranking" vazio="Nenhum produto vendido com esses filtros">
          <template #pos="{ linha }">{{ d.ranking.indexOf(linha) + 1 }}</template>
          <template #totalGerado="{ linha }">{{ moeda(linha.totalGerado) }}</template>
          <template #part="{ linha }">{{ pct(linha.totalGerado, totalValor) }}%</template>
        </RelTabela>
      </RelCartao>

      <div class="space-y-5">
        <RelCartao titulo="Por categoria">
          <p v-if="!d.porCategoria.length" class="text-xs text-gray-400 dark:text-white/40">Sem dados</p>
          <div v-else class="space-y-3.5">
            <div v-for="c in d.porCategoria" :key="c.categoria">
              <div class="flex justify-between items-baseline mb-1.5 text-xs">
                <span class="font-bold text-gray-700 dark:text-white/80">{{ c.categoria }}</span>
                <span class="tabular-nums font-black text-gray-900 dark:text-white">{{ moeda(c.totalGerado) }}</span>
              </div>
              <div class="h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-[#ea580c]" :style="{ width: pct(c.totalGerado, maxCat) + '%' }" />
              </div>
              <p class="text-[10px] text-gray-400 dark:text-white/40 mt-1 tabular-nums">{{ c.qtdVendida }} itens · {{ c.qtdProdutos }} produto{{ c.qtdProdutos === 1 ? '' : 's' }}</p>
            </div>
          </div>
        </RelCartao>

        <RelCartao titulo="Sem venda no período" :sub="d.semVenda.length ? 'candidatos a revisar no cardápio' : ''">
          <p v-if="!d.semVenda.length" class="text-xs text-gray-400 dark:text-white/40">Todos os produtos ativos venderam.</p>
          <ul v-else class="space-y-1.5 max-h-64 overflow-auto">
            <li v-for="p in d.semVenda" :key="p.id" class="flex justify-between gap-3 text-xs">
              <span class="font-bold text-gray-700 dark:text-white/80 truncate">{{ p.nome }}</span>
              <span class="text-gray-400 dark:text-white/40 shrink-0">{{ p.categoria }}</span>
            </li>
          </ul>
        </RelCartao>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RelCartao from './RelCartao.vue'
import RelKpi from './RelKpi.vue'
import RelTabela from './RelTabela.vue'
import { moeda, numero } from '~/lib/relatorios'

const props = defineProps<{ dados: any }>()
const d = computed(() => props.dados)
const totalQtd = computed(() => d.value.ranking.reduce((s: number, r: any) => s + r.qtdVendida, 0))
const totalValor = computed(() => d.value.ranking.reduce((s: number, r: any) => s + r.totalGerado, 0))
const maxCat = computed(() => Math.max(...d.value.porCategoria.map((c: any) => c.totalGerado), 0))
const pct = (v: number, t: number) => (t > 0 ? Math.round((v / t) * 100) : 0)
const COLS = [
  { chave: 'pos', rotulo: '#' },
  { chave: 'nome', rotulo: 'Produto', forte: true },
  { chave: 'categoria', rotulo: 'Categoria' },
  { chave: 'qtdVendida', rotulo: 'Qtd', direita: true },
  { chave: 'totalGerado', rotulo: 'Total', direita: true, forte: true, nowrap: true },
  { chave: 'part', rotulo: '%', direita: true },
]
</script>
