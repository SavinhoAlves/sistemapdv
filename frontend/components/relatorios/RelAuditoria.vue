<template>
  <RelCartao titulo="Trilha de auditoria" :sub="`${dados.length} operaç${dados.length === 1 ? 'ão' : 'ões'} sensíve${dados.length === 1 ? 'l' : 'is'} — as 300 mais recentes do período`" sem-padding>
    <RelTabela :colunas="COLS" :linhas="dados" vazio="Nenhuma operação sensível no período">
      <template #createdAt="{ linha }">{{ dataHora(linha.createdAt) }}</template>
      <template #acao="{ linha }">
        <span class="text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap" :class="infoAcao(linha.acao).cor">{{ infoAcao(linha.acao).rotulo }}</span>
      </template>
      <template #detalhes="{ linha }"><span class="text-xs">{{ detalhes(linha.detalhes) }}</span></template>
    </RelTabela>
  </RelCartao>
</template>

<script setup lang="ts">
import RelCartao from './RelCartao.vue'
import RelTabela from './RelTabela.vue'
import { dataHora, infoAcao } from '~/lib/relatorios'

defineProps<{ dados: any[] }>()
const COLS = [
  { chave: 'createdAt', rotulo: 'Quando', nowrap: true },
  { chave: 'usuario', rotulo: 'Usuário', forte: true },
  { chave: 'acao', rotulo: 'Ação' },
  { chave: 'detalhes', rotulo: 'Detalhes' },
]
function detalhes(d: any) {
  if (!d || typeof d !== 'object') return '—'
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()}: ${v}`)
    .join(' · ') || '—'
}
</script>
