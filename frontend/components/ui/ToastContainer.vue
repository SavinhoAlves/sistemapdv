<template>
  <Teleport to="body">
    <div class="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none w-80">
      <TransitionGroup name="toast">
        <div
          v-for="t in toastStore.toasts"
          :key="t.id"
          class="pointer-events-auto relative flex items-start gap-3 px-4 py-3.5 rounded-2xl overflow-hidden
                 bg-neutral-900/95 backdrop-blur-xl border border-white/[0.07] shadow-2xl shadow-black/40"
        >
          <div class="absolute left-0 top-0 bottom-0 w-[3px]" :class="strip[t.type]"></div>
          <component :is="icons[t.type]" :size="15" class="shrink-0 mt-0.5 ml-1" :class="icon[t.type]" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-black text-white leading-snug">{{ t.title }}</p>
            <p v-if="t.message" class="text-xs mt-0.5 text-white/50 leading-snug">{{ t.message }}</p>
          </div>
          <button
            @click="toastStore.remove(t.id)"
            class="shrink-0 text-white/20 hover:text-white/60 transition-colors mt-0.5"
          >
            <X :size="13" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-vue-next'
import { useToastStore } from '~/stores/toast'

const toastStore = useToastStore()

const icons = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info }

const strip = {
  success: 'bg-green-500',
  error:   'bg-red-500',
  warning: 'bg-amber-500',
  info:    'bg-orange-500',
}

const icon = {
  success: 'text-green-400',
  error:   'text-red-400',
  warning: 'text-amber-400',
  info:    'text-orange-400',
}
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(20px); }
.toast-leave-to     { opacity: 0; transform: translateX(20px); }
.toast-move         { transition: transform 0.3s ease; }
</style>
