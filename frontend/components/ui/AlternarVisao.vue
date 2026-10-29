<template>
  <!-- Botões Grade / Lista das telas de cartões (o estado vem de useVisao) -->
  <div class="av" role="group" aria-label="Visualização">
    <button type="button" :aria-pressed="modelValue === 'grade'" title="Grade" @click="$emit('update:modelValue', 'grade')">
      <LayoutGrid :size="16" />
    </button>
    <button type="button" :aria-pressed="modelValue === 'lista'" title="Lista" @click="$emit('update:modelValue', 'lista')">
      <List :size="16" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { LayoutGrid, List } from 'lucide-vue-next'
import type { Visao } from '~/composables/useVisao'

defineProps<{ modelValue: Visao }>()
defineEmits<{ 'update:modelValue': [Visao] }>()
</script>

<style scoped>
.av { display: inline-flex; flex: none; gap: 2px; padding: 3px; border-radius: 10px; background: var(--sup-elevado); border: 1px solid var(--linha); }
.av button { width: 34px; height: 32px; display: grid; place-items: center; border-radius: 8px; color: var(--txt-3); transition: background-color .15s, color .15s; }
.av button:hover { color: var(--txt); }
.av button[aria-pressed=true] { background: var(--acao); color: #0E1119; }
</style>
