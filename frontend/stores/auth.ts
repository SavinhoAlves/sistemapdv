import { navigateTo, useRuntimeConfig } from 'nuxt/app'
import { defineStore } from 'pinia'
import { noApp } from '~/lib/app'
import { getTenantSlug } from '~/composables/useTenantSlug'

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

      const suporteToken  = localStorage.getItem('suporte_token')
      const suporteTenant = localStorage.getItem('suporte_tenant')
      const suporteModo   = localStorage.getItem('suporte_modo') as 'visualizacao' | 'auxiliar' | null
      if (suporteToken && suporteTenant) {
        this.modoSuporte   = suporteModo ?? 'auxiliar'
        this.suporteTenant = suporteTenant
      }
    },

    entrarComoSuporte(access_token: string, tenantNome: string, usuario: Usuario, modo: 'visualizacao' | 'auxiliar' = 'auxiliar') {
      if (!process.client) return
      // Grava em chaves temporárias; a nova aba lê e migra para as chaves de auth normais.
      // A abertura da aba é responsabilidade do chamador (SupportModal) para evitar race condition.
      localStorage.setItem('suporte_pending_token',  access_token)
      localStorage.setItem('suporte_pending_tenant', tenantNome)
      localStorage.setItem('suporte_pending_modo',   modo)
      localStorage.setItem('suporte_pending_nome',   usuario.nome)
      localStorage.setItem('suporte_pending_cargo',  usuario.cargo)
      localStorage.setItem('suporte_pending_id',     usuario.id)
    },

    alterarModoSuporte(modo: 'visualizacao' | 'auxiliar') {
      if (!process.client) return
      localStorage.setItem('suporte_modo', modo)
      this.modoSuporte = modo
    },

    sairDoSuporte() {
      if (!process.client) return
      localStorage.removeItem('suporte_token')
      localStorage.removeItem('suporte_tenant')
      localStorage.removeItem('suporte_modo')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_refresh_token')
      localStorage.removeItem('auth_user')
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

      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(usuario))
      if (refreshToken) localStorage.setItem('auth_refresh_token', refreshToken)
      else localStorage.removeItem('auth_refresh_token')
    },

    async loginWithRfid(rfid: string) {
      if (!rfid || typeof rfid !== 'string' || rfid.trim() === '') return false

      const config = useRuntimeConfig()
      const slug   = getTenantSlug()
      this.loading = true

      try {
        const resposta = await $fetch<any>(
          `${config.public.apiUrl}/api/auth/rfid`,
          { method: 'POST', body: { cartaoRfid: rfid.trim(), slug } }
        )

        if (resposta?.usuario && (resposta?.accessToken || resposta?.access_token)) {
          const usuario: Usuario = {
            id:         resposta.usuario.id,
            nome:       resposta.usuario.nome,
            cargo:      resposta.usuario.cargo,
            perfil_id:  resposta.usuario.perfilId ?? null,
            permissoes: resposta.usuario.permissoes ?? null,
          }
          this.setAuth(resposta.accessToken ?? resposta.access_token, usuario, resposta.refreshToken ?? resposta.refresh_token)
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
      this.token        = null
      this.refreshToken = null
      this.usuario      = null

      if (process.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_refresh_token')
        localStorage.removeItem('auth_user')
      }

      // No app da equipe a saída volta para a tela de ler o QR
      navigateTo(noApp() ? '/acesso' : '/login')
    },

    async refreshUsuario() {
      if (!this.token || !process.client) return
      const agora = Date.now()
      if (agora - this.ultimoRefresh < 2 * 60 * 1000) return
      const config = useRuntimeConfig()
      try {
        const resp = await $fetch<any>(`${config.public.apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${this.token}` }
        })
        if (resp?.auth) {
          this.usuario = {
            ...this.usuario,
            id:         resp.auth.sub,
            nome:       resp.auth.nome,
            cargo:      resp.auth.cargo,
            perfil_id:  resp.auth.perfilId ?? null,
            permissoes: resp.auth.permissoes ?? null,
          } as Usuario
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
