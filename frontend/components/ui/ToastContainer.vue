<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none w-80">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg border"
          :class="styles[toast.type]"
        >
          <component :is="icons[toast.type]" :size="16" class="shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <p class="font-black text-sm leading-snug">{{ toast.title }}</p>
            <p v-if="toast.message" class="text-xs mt-0.5 opacity-75 leading-snug">{{ toast.message }}</p>
          </div>
          <button
            @click="toastStore.remove(toast.id)"
            class="shrink-0 opacity-40 hover:opacity-80 transition-opacity mt-0.5"
          >
            <X :size="14" />
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

const icons = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info
}

const styles = {
  success: 'bg-white border-green-200 text-green-900',
  error:   'bg-white border-red-200 text-red-900',
  warning: 'bg-white border-yellow-200 text-yellow-900',
  info:    'bg-white border-blue-200 text-blue-900'
}
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(100%); }
.toast-leave-to     { opacity: 0; transform: translateX(100%); }
.toast-move         { transition: transform 0.3s ease; }
</style>
