<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Transition name="skeleton">
    <AppLoadingSkeleton v-if="!rotaPronta" class="fixed inset-0 z-[9999]" />
  </Transition>
  <UiToastContainer />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '~/stores/theme'

const themeStore = useThemeStore()
const router = useRouter()

// Tempo mínimo que o skeleton permanece visível após a rota resolver.
// Garante que o efeito de carregamento seja perceptível mesmo em navegações rápidas.
const SKELETON_MIN_MS = 1500

const rotaPronta = ref(false)
let skeletonTimer: ReturnType<typeof setTimeout> | null = null

router.beforeEach(() => {
  if (skeletonTimer) { clearTimeout(skeletonTimer); skeletonTimer = null }
  rotaPronta.value = false
})

router.afterEach(() => {
  skeletonTimer = setTimeout(() => {
    rotaPronta.value = true
    skeletonTimer = null
  }, SKELETON_MIN_MS)
})

onMounted(async () => {
  themeStore.init()
  await router.isReady()
  skeletonTimer = setTimeout(() => {
    rotaPronta.value = true
    skeletonTimer = null
  }, SKELETON_MIN_MS)
})
</script>

<style>
.skeleton-enter-active {
  transition: opacity 0.2s ease;
}
.skeleton-leave-active {
  transition: opacity 0.2s ease;
}
.skeleton-enter-from,
.skeleton-leave-to {
  opacity: 0;
}
</style>
