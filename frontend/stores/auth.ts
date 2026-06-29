import { navigateTo, useRuntimeConfig } from 'nuxt/app'
import { defineStore } from 'pinia'

export interface Usuario {
  id: number
  nome: string
  cargo: 'administrador' | 'garcom' | 'caixa' | 'cozinha'
  email?: string
  cartao_rfid?: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null as string | null,
    usuario: null as Usuario | null,
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.usuario,
    isCozinha:       (state) => state.usuario?.cargo === 'cozinha',
    isCaixa:         (state) => state.usuario?.cargo === 'caixa',
    funcionario:     (state) => state.usuario
  },

  actions: {
    /*
    |--------------------------------------------------------------------------
    | RESTAURA SESSÃO
    |--------------------------------------------------------------------------
    */

    restoreSession() {
      if (!process.client) return

      const token = localStorage.getItem('auth_token')
      const user = localStorage.getItem('auth_user')

      if (token && user) {
        try {
          this.token = token
          this.usuario = JSON.parse(user)
        } catch (error) {
          console.error('[AUTH] Erro ao restaurar sessão:', error)
          this.logout()
        }
      }
    },

    /*
    |--------------------------------------------------------------------------
    | DEFINE AUTENTICAÇÃO
    |--------------------------------------------------------------------------
    */

    setAuth(token: string, usuario: Usuario) {
      this.token = token
      this.usuario = usuario

      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(usuario))
    },

    /*
    |--------------------------------------------------------------------------
    | LOGIN RFID
    |--------------------------------------------------------------------------
    */

    async loginWithRfid(rfid: string) {
  if (!rfid || typeof rfid !== 'string' || rfid.trim() === '') {
    return false
  }

  const config = useRuntimeConfig()
  this.loading = true

  try {
    const resposta = await $fetch<any>(
      `${config.public.apiUrl}/api/auth/rfid`,
      {
        method: 'POST',
        body: {
          rfid: rfid.trim() // Garante que não vão espaços invisíveis do leitor
        }
      }
    )

    if (resposta?.usuario) {
      this.setAuth(
        resposta.token || 'token-dev',
        resposta.usuario
      );
      return true
    }

    return false
  } catch {
    return false
  } finally {
    this.loading = false
  }
},

    /*
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    */

    logout() {
      this.token = null
      this.usuario = null

      if (process.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }

      navigateTo('/login')
    },

    /*
    |--------------------------------------------------------------------------
    | REDIRECIONAMENTO
    |--------------------------------------------------------------------------
    */

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