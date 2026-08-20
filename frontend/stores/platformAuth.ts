import { defineStore } from 'pinia'

interface PlatformUser {
  id: string
  nome: string
  role: string
}

export const usePlatformAuthStore = defineStore('platformAuth', {
  state: () => ({
    token: '' as string,
    user:  null as PlatformUser | null,
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.token && !!state.user,
  },

  actions: {
    set(token: string, user: PlatformUser) {
      this.token = token
      this.user  = user
      if (process.client) {
        localStorage.setItem('platform_token', token)
        localStorage.setItem('platform_user', JSON.stringify(user))
      }
    },

    logout() {
      this.token = ''
      this.user  = null
      if (process.client) {
        localStorage.removeItem('platform_token')
        localStorage.removeItem('platform_user')
        localStorage.removeItem('platform_refresh_token')
      }
    },

    restore() {
      if (!process.client) return
      const token   = localStorage.getItem('platform_token')
      const userStr = localStorage.getItem('platform_user')
      if (token && userStr) {
        try {
          this.token = token
          this.user  = JSON.parse(userStr)
        } catch {
          this.logout()
        }
      }
    },
  },
})
