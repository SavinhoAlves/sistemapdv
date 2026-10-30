import { useAuthStore } from '~/stores/auth'
import { CHAVES_ANTIGAS, ehTokenDeSuporte, gravarSuporte } from '~/lib/sessaoSuporte'

/**
 * Roda antes dos outros plugins (00.): abre a sessão de suporte desta aba a
 * partir do link da Central (#suporte=…), antes de auth.client restaurar a
 * sessão e do socket conectar. A sessão fica só nesta aba (lib/sessaoSuporte.ts).
 */
export default defineNuxtPlugin((nuxtApp) => {
  // Versões antigas guardavam o suporte no localStorage (todas as abas):
  // apaga, e se a sessão "normal" ficou sendo a do suporte, sai dela
  try {
    for (const k of CHAVES_ANTIGAS) localStorage.removeItem(k)
    if (ehTokenDeSuporte(localStorage.getItem('auth_token'))) {
      for (const k of ['auth_token', 'auth_user', 'auth_refresh_token']) localStorage.removeItem(k)
    }
  } catch { /* sem armazenamento */ }

  const marca = location.hash.match(/(?:^#|&)suporte=([^&]+)/)
  if (!marca) return
  try {
    const p = JSON.parse(decodeURIComponent(marca[1]))
    if (p?.token && p?.tenant && p?.id) {
      gravarSuporte({ token: p.token, tenant: p.tenant, modo: p.modo === 'visualizacao' ? 'visualizacao' : 'auxiliar', nome: p.nome ?? '', cargo: p.cargo ?? 'administrador', id: p.id })
      useAuthStore().restoreSession()
    }
  } catch { /* link inválido: segue sem sessão de suporte */ }
  // Tira o token da barra de endereço depois que a página montou (antes disso o
  // roteador ainda usa o endereço original e devolveria o #)
  nuxtApp.hook('app:mounted', () => setTimeout(() => history.replaceState(history.state, '', location.pathname + location.search), 0))
})
