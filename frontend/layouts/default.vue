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
          class="absolute inset-0 z-30 flex flex-col items-center justify-center" style="background: color-mix(in srgb, var(--sup-fundo) 88%, transparent)"
        >
          <div class="flex flex-col items-center gap-4 text-center px-6 max-w-xs">
            <div class="w-16 h-16 rounded-[14px] bg-[var(--sup-cartao)] border border-[var(--linha)] flex items-center justify-center">
              <LockKeyhole :size="28" class="text-[var(--txt-2)]" />
            </div>
            <div>
              <p class="text-lg font-bold text-[var(--txt)] mb-1">Caixa fechado</p>
              <p class="text-[15px] text-[var(--txt-2)] leading-relaxed">
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
import { useAuthStore } from '~/stores/auth'

const route      = useRoute()
const caixaStore = useCaixaStore()
const authStore  = useAuthStore()

const paginaExempta = computed(() =>
  route.path.startsWith('/admin') ||
  route.path.startsWith('/configuracoes') ||
  route.path.startsWith('/estoque') ||
  route.path.startsWith('/relatorios')
)

const mostrarBloqueio = computed(() =>
  caixaStore.inicializado && !caixaStore.aberto && !paginaExempta.value
)
</script>
