<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 dark:bg-white/[0.03]">
        <tr>
          <th v-for="c in colunas" :key="c.chave"
            class="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 whitespace-nowrap"
            :class="c.direita ? 'text-right' : 'text-left'">{{ c.rotulo }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!linhas.length">
          <td :colspan="colunas.length" class="px-4 py-10 text-center text-xs text-gray-400 dark:text-white/35">{{ vazio }}</td>
        </tr>
        <tr v-for="(l, i) in linhas" :key="l.id ?? i" class="border-t border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.03]">
          <td v-for="c in colunas" :key="c.chave" class="px-4 py-2.5 align-top"
            :class="[c.direita ? 'text-right tabular-nums' : 'text-left', c.forte ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-white/70', c.nowrap ? 'whitespace-nowrap' : '']">
            <slot :name="c.chave" :linha="l">{{ l[c.chave] ?? '—' }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
export interface Coluna { chave: string; rotulo: string; direita?: boolean; forte?: boolean; nowrap?: boolean }
withDefaults(defineProps<{ colunas: Coluna[]; linhas: any[]; vazio?: string }>(), { vazio: 'Nada no período' })
</script>
