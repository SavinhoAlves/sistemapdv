import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin((nuxtApp) => {
  const auth = useAuthStore()

  // Sessão vinda do painel.<domínio> no link (#suporte=…): vira as chaves pendentes
  const marca = location.hash.match(/(?:^#|&)suporte=([^&]+)/)
  if (marca) {
    try {
      const p = JSON.parse(decodeURIComponent(marca[1]))
      for (const k of ['token', 'tenant', 'modo', 'nome', 'cargo', 'id'] as const) if (p[k]) localStorage.setItem(`suporte_pending_${k}`, String(p[k]))
    } catch { /* link inválido: segue sem sessão de suporte */ }
    // Tira o token da barra de endereço depois que a página montou (antes disso o
    // roteador ainda usa o endereço original e devolveria o #)
    nuxtApp.hook('app:mounted', () => setTimeout(() => history.replaceState(history.state, '', location.pathname + location.search), 0))
  }

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
