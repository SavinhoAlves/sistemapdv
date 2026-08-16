import { navigateTo, useRuntimeConfig } from 'nuxt/app'
import { defineStore } from 'pinia'

export interface Usuario {
  id: number
  nome: string
  cargo: 'administrador' | 'garcom' | 'caixa' | 'cozinha'
  email?: string
  cartao_rfid?: string
  perfil_id?: number | null
  permissoes?: Record<string, boolean> | null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token:          null as string | null,
    usuario:        null as Usuario | null,
    loading:        false,
    ultimoRefresh:  0
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.usuario,
    isCozinha:       (state) => state.usuario?.cargo === 'cozinha',
    isCaixa:         (state) => state.usuario?.cargo === 'caixa',
    funcionario:     (state) => state.usuario,
    // Checa uma permissão específica do perfil; admin sempre tem acesso
    temPermissao:    (state) => (perm: string): boolean => {
      if (state.usuario?.cargo === 'administrador') return true
      if (!state.usuario?.permissoes) return false
      return Boolean(state.usuario.permissoes[perm])
    }
  },

  actions: {
    restoreSession() {
      if (!process.client) return

      const token = localStorage.getItem('auth_token')
      const user  = localStorage.getItem('auth_user')

      if (token && user) {
        try {
          this.token   = token
          this.usuario = JSON.parse(user)
        } catch (error) {
          console.error('[AUTH] Erro ao restaurar sessão:', error)
          this.logout()
        }
      }
    },

    setAuth(token: string, usuario: Usuario) {
      this.token   = token
      this.usuario = usuario

      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(usuario))
    },

    async loginWithRfid(rfid: string) {
      if (!rfid || typeof rfid !== 'string' || rfid.trim() === '') return false

      const config = useRuntimeConfig()
      this.loading = true

      try {
        const resposta = await $fetch<any>(
          `${config.public.apiUrl}/api/auth/rfid`,
          { method: 'POST', body: { rfid: rfid.trim() } }
        )

        if (resposta?.usuario) {
          this.setAuth(resposta.token || 'token-dev', resposta.usuario)
          return true
        }
        return false
      } catch {
        return false
      } finally {
        this.loading = false
      }
    },

    logout() {
      this.token   = null
      this.usuario = null

      if (process.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }

      navigateTo('/login')
    },

    async refreshUsuario() {
      if (!this.token || !process.client) return
      // Throttle: no máximo 1 vez a cada 2 minutos
      const agora = Date.now()
      if (agora - this.ultimoRefresh < 2 * 60 * 1000) return
      const config = useRuntimeConfig()
      try {
        const resp = await $fetch<any>(`${config.public.apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${this.token}` }
        })
        if (resp?.usuario) {
          this.usuario = { ...this.usuario, ...resp.usuario } as Usuario
          localStorage.setItem('auth_user', JSON.stringify(this.usuario))
          this.ultimoRefresh = agora
        }
      } catch (e: any) {
        if (e?.status === 401 || e?.statusCode === 401) this.logout()
      }
    },

    redirectByRole() {
      const destinos: Record<string, string> = {
        administrador: '/',
        garcom:        '/mesas',
        caixa:         '/caixa',
        cozinha:       '/cozinha'
      }
      const cargo = this.usuario?.cargo ?? 'garcom'
      return navigateTo(destinos[cargo] ?? '/mesas')
    }
  }
})
