<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppLoadingSkeleton v-if="!rotaPronta" class="fixed inset-0 z-[9999]" />
  <UiToastContainer />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '~/stores/theme'

const themeStore = useThemeStore()
const router = useRouter()

const ROTAS_LOGIN = ['/login', '/admin/login']

// rotaPronta fica false durante a navegação inicial (aguarda os middlewares
// assíncronos de licença/login) e também logo após sair da tela de login,
// enquanto a rota de destino resolve — mostra este skeleton em vez de piscar
// a página antiga ou uma tela em branco.
const rotaPronta = ref(false)

router.beforeEach((to, from) => {
  if (ROTAS_LOGIN.includes(from.path) && to.path !== from.path) {
    rotaPronta.value = false
  }
})
router.afterEach(() => { rotaPronta.value = true })

onMounted(async () => {
  themeStore.init()
  await router.isReady()
  rotaPronta.value = true
})
</script>
