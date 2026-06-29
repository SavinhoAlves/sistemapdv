// stores/toast.ts
import { defineStore } from 'pinia'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [] as Toast[]
  }),

  actions: {
    add(toast: Omit<Toast, 'id'>) {
      const id = Date.now().toString()
      this.toasts.push({ ...toast, id })
      setTimeout(() => this.remove(id), toast.duration || 4000)
      return id
    },

    remove(id: string) {
      this.toasts = this.toasts.filter(t => t.id !== id)
    },

    success(title: string, message?: string) {
      return this.add({ type: 'success', title, message })
    },

    error(title: string, message?: string) {
      return this.add({ type: 'error', title, message, duration: 6000 })
    },

    warning(title: string, message?: string) {
      return this.add({ type: 'warning', title, message })
    },

    info(title: string, message?: string) {
      return this.add({ type: 'info', title, message })
    }
  }
})
