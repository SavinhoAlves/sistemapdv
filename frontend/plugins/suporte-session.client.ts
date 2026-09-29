import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(() => {
  const auth = useAuthStore()

  const token  = localStorage.getItem('suporte_pending_token')
  const tenant = localStorage.getItem('suporte_pending_tenant')
  const modo   = localStorage.getItem('suporte_pending_modo') as 'visualizacao' | 'auxiliar' | null
  const nome   = localStorage.getItem('suporte_pending_nome')
  const cargo  = localStorage.getItem('suporte_pending_cargo')
  const id     = localStorage.getItem('suporte_pending_id')

  if (token && tenant && modo && nome && cargo && id) {
    // Limpa chaves temporárias para não reativar em reloads da mesma aba
    localStorage.removeItem('suporte_pending_token')
    localStorage.removeItem('suporte_pending_tenant')
    localStorage.removeItem('suporte_pending_modo')
    localStorage.removeItem('suporte_pending_nome')
    localStorage.removeItem('suporte_pending_cargo')
    localStorage.removeItem('suporte_pending_id')

    // Ativa sessão de suporte nesta aba
    localStorage.setItem('suporte_token',  token)
    localStorage.setItem('suporte_tenant', tenant)
    localStorage.setItem('suporte_modo',   modo)

    auth.setAuth(token, { id, nome, cargo: cargo as any })
    auth.modoSuporte   = modo
    auth.suporteTenant = tenant
  }
})
