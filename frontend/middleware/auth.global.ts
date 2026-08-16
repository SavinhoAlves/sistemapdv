import { useAuthStore } from '../stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  // Página de autenticação mobile (/m ou /m/) — deixa passar sempre,
  // ela cuida da autenticação via token QR por conta própria.
  if (to.path === '/m' || to.path === '/m/') return

  // Demais rotas mobile (/m/mesas, /m/vendas…): restaura sessão do
  // localStorage e redireciona para /m se não estiver autenticado.
  if (to.path.startsWith('/m/')) {
    if (!auth.token && process.client) auth.restoreSession()
    if (!auth.token) return navigateTo('/m')
    return
  }

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
