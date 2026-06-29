import { useAuthStore } from '~/stores/auth'

// Rotas que não exigem autenticação
const ROTAS_PUBLICAS = ['/login', '/ativacao', '/logout']

// Mapa de rotas → cargos permitidos
const PERMISSOES: Record<string, string[]> = {
  '/':                ['administrador'],
  '/admin':           ['administrador'],
  '/relatorios':      ['administrador'],
  '/configuracoes':   ['administrador'],
  '/caixa':      ['administrador', 'caixa'],
  '/mesas':      ['administrador', 'garcom'],
  '/produtos':   ['administrador', 'garcom'],
  '/cozinha':    ['administrador', 'cozinha']
}

export default defineNuxtRouteMiddleware((to) => {
  if (ROTAS_PUBLICAS.some(r => to.path.startsWith(r))) return

  if (!process.client) return

  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) return navigateTo('/login')

  const cargo = authStore.usuario?.cargo
  if (!cargo) return navigateTo('/login')

  // Verifica permissão para a rota atual
  const rotaBase = '/' + to.path.split('/')[1]
  const permitidos = PERMISSOES[rotaBase]

  if (permitidos && !permitidos.includes(cargo)) {
    // Redireciona para a home do cargo
    const destinos: Record<string, string> = {
      administrador: '/',
      garcom:        '/mesas',
      caixa:         '/caixa',
      cozinha:       '/cozinha'
    }
    return navigateTo(destinos[cargo] ?? '/mesas')
  }
})
