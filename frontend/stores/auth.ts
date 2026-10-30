import { navigateTo, useRuntimeConfig } from 'nuxt/app'
import { defineStore } from 'pinia'
import { noApp } from '~/lib/app'
import { limparOperador } from '~/lib/operador'
import { gravarSuporte, lerSuporte, type SessaoSuporte } from '~/lib/sessaoSuporte'

export interface Usuario {
  id: string
  nome: string
  cargo: 'administrador' | 'garcom' | 'caixa' | 'cozinha'
  email?: string
  cartao_rfid?: string
  perfil_id?: string | null
  permissoes?: Record<string, boolean> | null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token:          null as string | null,
    refreshToken:   null as string | null,
    usuario:        null as Usuario | null,
    loading:        false,
    ultimoRefresh:  0,
    modoSuporte:    false as false | 'visualizacao' | 'auxiliar',
    suporteTenant:  null as string | null,
  }),

  getters: {
    isAuthenticated:     (state) => !!state.token && !!state.usuario,
    modoSuporteLeitura:  (state) => state.modoSuporte === 'visualizacao',
    isCozinha:       (state) => state.usuario?.cargo === 'cozinha',
    isCaixa:         (state) => state.usuario?.cargo === 'caixa',
    funcionario:     (state) => state.usuario,
    /**
     * Mesma regra da API (permission.middleware): o token traz as permissões
     * efetivas (padrão da função + perfil). Chave ausente: só o administrador passa.
     */
    temPermissao:    (state) => (perm: string): boolean => {
      const v = state.usuario?.permissoes?.[perm]
      if (typeof v === 'boolean') return v
      return state.usuario?.cargo === 'administrador'
    }
  },

  actions: {
    restoreSession() {
      if (!process.client) return
      // Aba de suporte: só a sessão dela (nunca a do localStorage, que é de todas as abas)
      const suporte = lerSuporte()
      if (suporte) return this.entrarNaAbaDeSuporte(suporte)

      const token        = localStorage.getItem('auth_token')
      const refreshToken = localStorage.getItem('auth_refresh_token')
      const user         = localStorage.getItem('auth_user')

      if (token && user) {
        try {
          this.token        = token
          this.refreshToken = refreshToken
          this.usuario      = JSON.parse(user)
        } catch (error) {
          console.error('[AUTH] Erro ao restaurar sessão:', error)
          this.logout()
        }
      }
    },

    /**
     * Aba de suporte (lib/sessaoSuporte.ts): a sessão fica só na memória e no
     * sessionStorage desta aba; a sessão normal das outras abas não muda.
     */
    entrarNaAbaDeSuporte(s: SessaoSuporte) {
      if (!process.client) return
      gravarSuporte(s)
      this.modoSuporte   = s.modo
      this.suporteTenant = s.tenant
      this.token         = s.token
      this.refreshToken  = null
      this.usuario       = { id: s.id, nome: s.nome, cargo: s.cargo as Usuario['cargo'] }
    },

    alterarModoSuporte(modo: 'visualizacao' | 'auxiliar') {
      if (!process.client || !this.modoSuporte || !this.token || !this.usuario) return
      this.modoSuporte = modo
      gravarSuporte({ token: this.token, tenant: this.suporteTenant ?? '', modo, nome: this.usuario.nome, cargo: this.usuario.cargo, id: this.usuario.id })
    },

    sairDoSuporte() {
      if (!process.client) return
      gravarSuporte(null)
      this.token         = null
      this.refreshToken  = null
      this.usuario       = null
      this.modoSuporte   = false
      this.suporteTenant = null
      window.close()
    },

    setAuth(token: string, usuario: Usuario, refreshToken?: string | null) {
      this.token        = token
      this.usuario      = usuario
      this.refreshToken = refreshToken ?? null
      // Na aba de suporte nada vai para o localStorage (é de todas as abas)
      if (this.modoSuporte) return

      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(usuario))
      if (refreshToken) localStorage.setItem('auth_refresh_token', refreshToken)
      else localStorage.removeItem('auth_refresh_token')
    },

    /** `navegar = false`: só limpa a sessão (quem chamou cuida do redirecionamento) */
    logout(navegar = true) {
      // Aba de suporte: encerra só ela, sem derrubar a sessão normal das outras abas
      if (this.modoSuporte) return this.sairDoSuporte()
      limparOperador()
      this.token        = null
      this.refreshToken = null
      this.usuario      = null

      if (process.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_refresh_token')
        localStorage.removeItem('auth_user')
      }

      // No app da equipe a saída volta para a tela de ler o QR
      if (navegar) navigateTo(noApp() ? '/acesso' : '/login')
    },

    /**
     * Relê cargo e permissões de agora (/auth/me consulta o banco). `forcar`
     * ignora o intervalo mínimo — usado quando o administrador avisa que mudou
     * algo. Devolve true se cargo ou permissões mudaram.
     */
    async refreshUsuario(forcar = false): Promise<boolean> {
      if (!this.token || !process.client) return false
      const agora = Date.now()
      if (!forcar && agora - this.ultimoRefresh < 30 * 1000) return false
      const config = useRuntimeConfig()
      try {
        const resp = await $fetch<any>(`${config.public.apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${this.token}` }
        })
        if (resp?.auth) {
          const antes = JSON.stringify([this.usuario?.cargo, this.usuario?.permissoes ?? null])
          this.usuario = {
            ...this.usuario,
            id:         resp.auth.sub,
            nome:       resp.auth.nome,
            cargo:      resp.auth.cargo,
            perfil_id:  resp.auth.perfilId ?? null,
            permissoes: resp.auth.permissoes ?? null,
          } as Usuario
          if (!this.modoSuporte) localStorage.setItem('auth_user', JSON.stringify(this.usuario))
          this.ultimoRefresh = agora
          return antes !== JSON.stringify([this.usuario?.cargo, this.usuario?.permissoes ?? null])
        }
      } catch (e: any) {
        if (e?.status === 401 || e?.statusCode === 401) this.logout()
      }
      return false
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
