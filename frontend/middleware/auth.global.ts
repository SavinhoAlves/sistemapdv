import { useAuthStore } from '../stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  // Restaura sessão do localStorage se a store estiver vazia (essencial para F5)
  if (!auth.token && process.client) {
    auth.restoreSession()
  }

  const isAuthenticated = !!auth.token
  const isLoginPage     = to.path === '/login' || to.path === '/admin/login'

  if (!isAuthenticated && !isLoginPage) return navigateTo('/login')
  if (isAuthenticated  && isLoginPage)  return navigateTo('/')
  if (isAuthenticated  && to.path === '/') return

  // Atualiza permissões em background a cada navegação
  // (throttled no store — no máximo 1x a cada 2 minutos)
  if (isAuthenticated && process.client) {
    auth.refreshUsuario()
  }
})