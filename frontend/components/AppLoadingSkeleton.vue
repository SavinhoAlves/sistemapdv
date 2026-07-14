<template>
  <div class="min-h-screen flex bg-neutral-100 dark:bg-neutral-950">

    <!-- SIDEBAR (desktop) -->
    <div class="hidden sm:flex flex-col w-14 h-screen shrink-0 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800">
      <div class="h-14 flex items-center justify-center border-b border-neutral-100 dark:border-neutral-900">
        <div class="w-8 h-8 rounded-lg bg-orange-500/40 animate-pulse"></div>
      </div>
      <div class="flex-1 py-3 px-2 space-y-2">
        <div v-for="n in 5" :key="n" class="h-10 rounded-xl bg-neutral-100 dark:bg-neutral-900 animate-pulse"></div>
      </div>
    </div>

    <!-- CONTEÚDO -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- NAVBAR -->
      <div class="h-14 px-5 flex items-center justify-end gap-3 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div class="w-24 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-900 animate-pulse"></div>
        <div class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-900 animate-pulse"></div>
      </div>

      <!-- CARDS -->
      <div class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="n in 4"
            :key="n"
            class="h-32 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 animate-pulse"
          ></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 h-64 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 animate-pulse"></div>
          <div class="h-64 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 animate-pulse"></div>
        </div>
      </div>

    </div>
  </div>
</template>
