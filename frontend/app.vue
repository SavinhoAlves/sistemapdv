<template>
  <!-- Barra de suporte remoto (estilo AnyDesk) -->
  <Transition name="support-bar">
    <div v-if="auth.modoSuporte" class="fixed top-0 inset-x-0 z-[10000] h-10 flex items-stretch shadow-xl"
      :class="auth.modoSuporteLeitura ? 'bg-[#0a1628] border-b border-sky-500/40' : 'bg-[#1a0f00] border-b border-amber-500/40'">

      <!-- Indicador de modo -->
      <div class="flex items-center gap-2.5 px-4 border-r"
        :class="auth.modoSuporteLeitura ? 'border-sky-500/20 bg-sky-500/10' : 'border-amber-500/20 bg-amber-500/10'">
        <div class="flex items-center gap-1.5">
          <span class="relative flex size-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              :class="auth.modoSuporteLeitura ? 'bg-sky-400' : 'bg-amber-400'" />
            <span class="relative inline-flex rounded-full size-2"
              :class="auth.modoSuporteLeitura ? 'bg-sky-400' : 'bg-amber-400'" />
          </span>
          <span class="text-[10px] font-black uppercase tracking-widest"
            :class="auth.modoSuporteLeitura ? 'text-sky-400' : 'text-amber-400'">
            {{ auth.modoSuporteLeitura ? 'Visualização' : 'Ação' }}
          </span>
        </div>
      </div>

      <!-- Empresa -->
      <div class="flex items-center gap-2 px-4 border-r border-white/[0.06]">
        <UIcon name="i-lucide-building-2" class="size-3.5 text-white/30 shrink-0" />
        <span class="text-xs font-semibold text-white/70 max-w-[180px] truncate">{{ auth.suporteTenant }}</span>
      </div>

      <!-- Toggle de modo — centro da barra -->
      <div class="flex-1 flex items-center justify-center gap-1 px-4">
        <div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.05] border border-white/[0.07]">
          <button
            @click="auth.alterarModoSuporte('visualizacao')"
            :class="['flex items-center gap-1.5 px-3 h-7 rounded-md text-[11px] font-bold transition-all',
              auth.modoSuporteLeitura
                ? 'bg-sky-500/20 text-sky-300 shadow-sm'
                : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]']">
            <UIcon name="i-lucide-eye" class="size-3.5" />
            Visualização
          </button>
          <button
            @click="auth.alterarModoSuporte('auxiliar')"
            :class="['flex items-center gap-1.5 px-3 h-7 rounded-md text-[11px] font-bold transition-all',
              !auth.modoSuporteLeitura
                ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]']">
            <UIcon name="i-lucide-mouse-pointer-2" class="size-3.5" />
            Ação
          </button>
        </div>
      </div>

      <!-- Descrição do modo atual -->
      <div class="hidden lg:flex items-center px-4 border-l border-white/[0.06]">
        <span class="text-[10px] text-white/25">
          {{ auth.modoSuporteLeitura
            ? 'Apenas visualização — interações bloqueadas'
            : 'Modo ação — você controla o sistema' }}
        </span>
      </div>

      <!-- Desconectar -->
      <button
        @click="auth.sairDoSuporte()"
        class="flex items-center gap-2 px-4 border-l border-white/[0.06] text-[11px] font-bold text-white/40 hover:text-red-400 hover:bg-red-500/[0.07] transition-all">
        <UIcon name="i-lucide-plug-zap" class="size-3.5" />
        <span class="hidden sm:inline">Desconectar</span>
      </button>
    </div>
  </Transition>

  <!-- Overlay bloqueador de interação (modo visualização) -->
  <!-- z-[200]: acima de modais Nuxt UI (z-50) mas abaixo da sidebar/navbar elevadas (z-[300]) -->
  <Transition name="support-border">
    <div v-if="auth.modoSuporteLeitura"
      class="fixed inset-0 z-[200] cursor-not-allowed"
      @click.capture.prevent.stop
      @mousedown.capture.prevent.stop
      @pointerdown.capture.prevent.stop
      @touchstart.capture.prevent.stop
      @keydown.capture.prevent.stop
    />
  </Transition>

  <!-- Borda lateral colorida indicando modo (como o AnyDesk) -->
  <div v-if="auth.modoSuporte" class="fixed inset-0 z-[9998] pointer-events-none"
    :class="auth.modoSuporteLeitura
      ? 'shadow-[inset_0_0_0_2px_rgba(14,165,233,0.4)]'
      : 'shadow-[inset_0_0_0_2px_rgba(251,191,36,0.25)]'" />

  <div :class="auth.modoSuporte ? 'pt-10' : ''">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>

  <Transition name="skeleton">
    <AppLoadingSkeleton v-if="!rotaPronta" class="fixed inset-0 z-[9999]" />
  </Transition>
  <UiToastContainer />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '~/stores/theme'
import { useAuthStore } from '~/stores/auth'

const auth      = useAuthStore()
const themeStore = useThemeStore()
const router    = useRouter()

const SKELETON_MIN_MS = 0
const rotaPronta = ref(false)
let skeletonTimer: ReturnType<typeof setTimeout> | null = null

router.beforeEach(() => {
  if (skeletonTimer) { clearTimeout(skeletonTimer); skeletonTimer = null }
  rotaPronta.value = false
})

router.afterEach(() => {
  skeletonTimer = setTimeout(() => { rotaPronta.value = true; skeletonTimer = null }, SKELETON_MIN_MS)
})

onMounted(async () => {
  themeStore.init()
  await router.isReady()
  skeletonTimer = setTimeout(() => { rotaPronta.value = true; skeletonTimer = null }, SKELETON_MIN_MS)
})
</script>

<style>
.skeleton-enter-active, .skeleton-leave-active { transition: opacity 0.2s ease; }
.skeleton-enter-from, .skeleton-leave-to { opacity: 0; }

.support-bar-enter-active, .support-bar-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.support-bar-enter-from, .support-bar-leave-to { transform: translateY(-100%); opacity: 0; }

.support-border-enter-active, .support-border-leave-active { transition: opacity 0.3s ease; }
.support-border-enter-from, .support-border-leave-to { opacity: 0; }
</style>
