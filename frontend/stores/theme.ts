import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    dark: false
  }),
  actions: {
    init() {
      if (!import.meta.client) return
      const saved = localStorage.getItem('pdv-theme')
      this.dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
      this._apply()
    },
    toggle() {
      this.dark = !this.dark
      if (import.meta.client) {
        localStorage.setItem('pdv-theme', this.dark ? 'dark' : 'light')
        this._apply()
      }
    },
    _apply() {
      document.documentElement.classList.toggle('dark', this.dark)
    }
  }
})
