<template>
  <!-- Foto do produto; sem foto (ou se a imagem falhar), o ícone da categoria -->
  <span class="relative overflow-hidden flex items-center justify-center shrink-0 bg-orange-500/10 text-orange-500" :class="classe">
    <img v-if="imagem && !falhou" :src="imagem" alt="" loading="lazy" class="absolute inset-0 size-full object-cover" @error="falhou = true" />
    <component :is="icone" v-else :size="tamanhoIcone" :stroke-width="1.75" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { iconeDaCategoria } from '~/lib/iconeCategoria'

const props = withDefaults(defineProps<{ imagem?: string | null; categoria?: string | null; classe?: string; tamanhoIcone?: number }>(), {
  imagem: null, categoria: null, classe: 'size-12 rounded-xl', tamanhoIcone: 22,
})
const falhou = ref(false)
watch(() => props.imagem, () => { falhou.value = false })
const icone = computed(() => iconeDaCategoria(props.categoria))
</script>
