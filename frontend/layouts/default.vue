<template>
  <div class="min-h-screen flex flex-col transition-colors duration-200 com-sidebar">

    <!-- SIDEBAR + NAVBAR GLOBAIS -->
    <Sidebar />
    <Navbar />

    <!-- CONTEÚDO DAS PÁGINAS -->
    <main class="flex-1 overflow-auto relative">
      <slot />

      <!-- BLOQUEIO: caixa fechado em páginas que exigem caixa aberto -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="mostrarBloqueio"
          class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/70 dark:bg-neutral-950/75 backdrop-blur-sm"
        >
          <div class="flex flex-col items-center gap-4 text-center px-6 max-w-xs">
            <div class="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center">
              <LockKeyhole :size="28" class="text-gray-400 dark:text-white/30" />
            </div>
            <div>
              <p class="text-base font-black text-gray-900 dark:text-white mb-1">Caixa fechado</p>
              <p class="text-xs text-gray-500 dark:text-white/40 leading-relaxed">
                Abra o caixa pelo botão na barra superior para liberar as operações.
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </main>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { LockKeyhole } from 'lucide-vue-next'
import Navbar from './Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import { useCaixaStore } from '~/stores/caixa'

const route      = useRoute()
const caixaStore = useCaixaStore()

const paginaExempta = computed(() =>
  route.path.startsWith('/admin') || route.path.startsWith('/configuracoes')
)

const mostrarBloqueio = computed(() =>
  caixaStore.inicializado && !caixaStore.aberto && !paginaExempta.value
)
</script>
