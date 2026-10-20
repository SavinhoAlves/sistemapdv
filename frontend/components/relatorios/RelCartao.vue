<template>
  <section class="bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
    <header v-if="titulo" class="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/45">{{ titulo }}</h2>
        <p v-if="sub" class="text-[11px] text-gray-400 dark:text-white/35 mt-0.5">{{ sub }}</p>
      </div>
      <slot name="acoes" />
    </header>
    <div :class="semPadding ? '' : 'p-5'"><slot /></div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ titulo?: string; sub?: string; semPadding?: boolean }>()
</script>
