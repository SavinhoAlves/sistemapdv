<template>
  <div class="min-h-screen flex bg-neutral-100 dark:bg-neutral-950">

    <!-- BARRA DE PROGRESSO NO TOPO -->
    <div class="fixed top-0 left-0 right-0 h-0.5 z-50 overflow-hidden bg-transparent">
      <div class="h-full bg-orange-500 skeleton-progress-bar"></div>
    </div>

    <!-- SIDEBAR (desktop) -->
    <div class="hidden sm:flex flex-col w-14 h-screen shrink-0 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800">
      <div class="h-14 flex items-center justify-center border-b border-neutral-100 dark:border-neutral-900">
        <div class="w-8 h-8 rounded-lg shimmer"></div>
      </div>
      <div class="flex-1 py-3 px-2 space-y-2">
        <div v-for="n in 5" :key="n" class="h-10 rounded-xl shimmer" :style="{ animationDelay: `${n * 60}ms` }"></div>
      </div>
      <div class="py-3 px-2 space-y-2 border-t border-neutral-100 dark:border-neutral-900">
        <div class="h-10 rounded-xl shimmer"></div>
      </div>
    </div>

    <!-- CONTEÚDO -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- NAVBAR -->
      <div class="h-14 px-5 flex items-center justify-between gap-3 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg shimmer sm:hidden"></div>
          <div class="w-32 h-5 rounded-lg shimmer" style="animation-delay: 80ms"></div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-24 h-7 rounded-lg shimmer" style="animation-delay: 120ms"></div>
          <div class="w-8 h-8 rounded-full shimmer" style="animation-delay: 160ms"></div>
        </div>
      </div>

      <!-- CONTEÚDO DA PÁGINA -->
      <div class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 overflow-hidden">

        <!-- HEADER -->
        <div class="flex items-center gap-3">
          <div class="w-1 h-8 rounded-full bg-orange-500/30"></div>
          <div class="space-y-1.5">
            <div class="w-40 h-6 rounded-lg shimmer" style="animation-delay: 80ms"></div>
            <div class="w-56 h-3.5 rounded-md shimmer" style="animation-delay: 120ms"></div>
          </div>
        </div>

        <!-- KPI CARDS -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="n in 4"
            :key="n"
            class="h-32 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shimmer p-5 flex flex-col justify-between"
            :style="{ animationDelay: `${n * 60}ms` }"
          >
            <div class="flex justify-between items-start">
              <div class="w-9 h-9 rounded-xl bg-neutral-200 dark:bg-neutral-800"></div>
              <div class="w-16 h-2.5 rounded bg-neutral-200 dark:bg-neutral-800"></div>
            </div>
            <div>
              <div class="w-24 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 mb-2"></div>
              <div class="w-32 h-2.5 rounded bg-neutral-200 dark:bg-neutral-800"></div>
            </div>
          </div>
        </div>

        <!-- PAINÉIS PRINCIPAIS -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shimmer overflow-hidden" style="animation-delay: 100ms">
            <div class="h-12 border-b border-neutral-200 dark:border-neutral-800 px-5 flex items-center gap-3">
              <div class="w-28 h-4 rounded bg-neutral-200 dark:bg-neutral-800"></div>
            </div>
            <div class="p-5 space-y-3">
              <div v-for="n in 5" :key="n" class="flex items-center gap-3" :style="{ animationDelay: `${120 + n * 50}ms` }">
                <div class="w-9 h-9 rounded-xl bg-neutral-200 dark:bg-neutral-800 shrink-0"></div>
                <div class="flex-1 space-y-1.5">
                  <div class="h-3 rounded bg-neutral-200 dark:bg-neutral-800" :style="{ width: `${55 + n * 7}%` }"></div>
                  <div class="h-2.5 rounded bg-neutral-200 dark:bg-neutral-800 w-24"></div>
                </div>
                <div class="text-right space-y-1.5 shrink-0">
                  <div class="w-16 h-3 rounded bg-neutral-200 dark:bg-neutral-800 ml-auto"></div>
                  <div class="w-10 h-2.5 rounded bg-neutral-200 dark:bg-neutral-800 ml-auto"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shimmer overflow-hidden" style="animation-delay: 160ms">
            <div class="h-12 border-b border-neutral-200 dark:border-neutral-800 px-5 flex items-center">
              <div class="w-24 h-4 rounded bg-neutral-200 dark:bg-neutral-800"></div>
            </div>
            <div class="p-5 space-y-3">
              <div v-for="n in 4" :key="n" class="flex items-center justify-between" :style="{ animationDelay: `${180 + n * 50}ms` }">
                <div class="h-3 rounded bg-neutral-200 dark:bg-neutral-800 w-20"></div>
                <div class="h-3 rounded bg-neutral-200 dark:bg-neutral-800 w-12"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer-wave {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.shimmer {
  background-color: #f5f5f5;
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.65) 50%,
    transparent 100%
  );
  background-size: 400px 100%;
  background-repeat: no-repeat;
  animation: shimmer-wave 1.4s ease-in-out infinite;
}

.dark .shimmer {
  background-color: #171717;
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.045) 50%,
    transparent 100%
  );
}

@keyframes progress-bar {
  0%   { transform: translateX(-100%); width: 40%; }
  50%  { width: 70%; }
  100% { transform: translateX(250%); width: 40%; }
}

.skeleton-progress-bar {
  animation: progress-bar 1.6s ease-in-out infinite;
}
</style>
