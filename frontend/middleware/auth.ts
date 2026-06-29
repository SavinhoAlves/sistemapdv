// middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  authStore.restoreSession()

  const publicRoutes = ['/login']

  if (!authStore.isAuthenticated && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }

  if (authStore.isAuthenticated && to.path === '/login') {
    if (authStore.isCozinha) return navigateTo('/cozinha')
    if (authStore.isCaixa) return navigateTo('/caixa')
    return navigateTo('/mesas')
  }

  // Proteção por cargo
  const cargosRoute: Record<string, string[]> = {
    '/admin': ['administrador'],
    '/relatorios': ['administrador', 'caixa'],
    '/caixa': ['caixa', 'administrador'],
    '/cozinha': ['cozinha', 'administrador', 'garcom'],
    '/funcionarios': ['administrador']
  }

  for (const [rota, cargos] of Object.entries(cargosRoute)) {
    if (to.path.startsWith(rota) && authStore.funcionario) {
      if (!cargos.includes(authStore.funcionario.cargo)) {
        return navigateTo('/mesas')
      }
    }
  }
})
