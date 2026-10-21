import { usePlatformAuthStore } from '~/stores/platformAuth'
import { ehApp, ehPainel, semPlatform, urlDoHost } from '~/lib/hosts'

export default defineNuxtRouteMiddleware((to) => {
  if (!process.client) return

  // painel.<domínio>: só a Central, sem /platform no endereço
  if (ehPainel()) {
    if (to.path.startsWith('/platform')) {
      const destino = semPlatform(to.path)
      return navigateTo(destino === '/login' ? { path: '/login', query: { acesso: 'plataforma' } } : { path: destino, query: to.query, hash: to.hash }, { replace: true })
    }
    if (to.path === '/login' || to.path === '/logout') return
    // Telas do restaurante não existem no painel: vão para o app
    if (!String(to.name ?? '').startsWith('painel-')) return navigateTo(urlDoHost('app', to.fullPath), { external: true })
    const platformAuth = usePlatformAuthStore()
    platformAuth.restore()
    if (!platformAuth.isAuthenticated) return navigateTo({ path: '/login', query: { acesso: 'plataforma' } })
    return
  }

  if (!to.path.startsWith('/platform')) return
  // app.<domínio>: a Central mora no painel
  if (ehApp()) return navigateTo(urlDoHost('painel', semPlatform(to.path) === '/login' ? '/login' : semPlatform(to.fullPath)), { external: true })

  if (to.path === '/platform/login' || to.path === '/platform/login/') return
  const platformAuth = usePlatformAuthStore()
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) return navigateTo('/platform/login')
})
