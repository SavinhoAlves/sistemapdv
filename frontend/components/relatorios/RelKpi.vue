<template>
  <div class="bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-200 dark:border-white/[0.08] p-4 sm:p-5">
    <p class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/45">{{ rotulo }}</p>
    <p class="text-xl sm:text-2xl font-black mt-2 leading-none tabular-nums" :class="tom === 'ruim' ? 'text-red-500 dark:text-red-400' : tom === 'alerta' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'">{{ valor }}</p>
    <p v-if="sub" class="text-[11px] mt-2 font-bold tabular-nums" :class="subTom === 'bom' ? 'text-emerald-600 dark:text-emerald-400' : subTom === 'ruim' ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-white/40'">{{ sub }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ rotulo: string; valor: string | number; sub?: string; subTom?: 'bom' | 'ruim' | 'neutro'; tom?: 'ruim' | 'alerta' }>()
</script>
