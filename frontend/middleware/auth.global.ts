import { useAuthStore } from '../stores/auth'
import { noApp, destinoNoCelular } from '../lib/app'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  // Rotas da plataforma central (super admin) — gerenciam própria autenticação
  if (to.path.startsWith('/platform')) return

  // Páginas do cliente final (cardápio online e acompanhamento): sem login
  if (to.path.startsWith('/cardapio') || to.path.startsWith('/pedido')) return

  // Página de autenticação mobile (/m ou /m/) — deixa passar sempre,
  // ela cuida da autenticação via token QR por conta própria.
  if (to.path === '/m' || to.path === '/m/') return

  // Entrada do app da equipe (ler QR ou código e senha): decide sozinha para onde ir
  if (to.path === '/acesso') {
    if (!auth.token && process.client) auth.restoreSession()
    return
  }

  // Demais rotas mobile (/m/mesas, /m/vendas…): restaura sessão do
  // localStorage e redireciona para /m se não estiver autenticado.
  if (to.path.startsWith('/m/')) {
    if (!auth.token && process.client) auth.restoreSession()
    if (!auth.token) return navigateTo(noApp() ? '/acesso' : '/m')
    return
  }

  // Restaura sessão do localStorage se a store estiver vazia (essencial para F5)
  if (!auth.token && process.client) {
    auth.restoreSession()
  }

  // Nova aba de suporte: pending_token ainda não foi migrado pelo plugin
  if (!auth.token && process.client && localStorage.getItem('suporte_pending_token')) return

  const isAuthenticated = !!auth.token
  const isLoginPage     = to.path === '/login' || to.path === '/admin/login'

  if (!isAuthenticated && !isLoginPage) return navigateTo(noApp() ? '/acesso' : '/login')
  if (isAuthenticated  && isLoginPage)  return navigateTo(noApp() ? destinoNoCelular(auth.usuario?.cargo) : '/')
  if (isAuthenticated  && to.path === '/') return

  // Atualiza permissões em background a cada navegação
  // (throttled no store — no máximo 1x a cada 2 minutos)
  if (isAuthenticated && process.client) {
    auth.refreshUsuario()
  }
})
