// middleware/auth.global.ts
import { useAuthStore } from '../stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  // 1. Tenta restaurar a sessão se a store estiver vazia (essencial para F5)
  if (!auth.token && process.client) {
    auth.restoreSession()
  }

  const isAuthenticated = !!auth.token
  const isLoginPage = to.path === '/login' || to.path === '/admin/login'
  // /ativacao precisa ficar acessível sem login — é para lá que o
  // middleware de licença (00.licenca.global.ts) redireciona quando o
  // sistema está bloqueado, mesmo para quem ainda não autenticou
  const isRotaPublica = isLoginPage || to.path === '/ativacao'

  if (!isAuthenticated && !isRotaPublica) {
    return navigateTo('/login')
  }

  if (isAuthenticated && to.path === '/login') {
    return navigateTo('/')
  }

  // 4. Trava de Segurança para Evitar Loop Infinito
  // Se o usuário já está na rota de destino ('/'), não redirecione novamente
  if (isAuthenticated && to.path === '/') {
    return // Permite que a navegação continue normalmente
  }
})