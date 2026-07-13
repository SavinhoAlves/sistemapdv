import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/configuracoes'

// Rotas que não exigem autenticação
const ROTAS_PUBLICAS = ['/login', '/ativacao', '/logout', '/admin/login']

// Mapa de rotas → cargos permitidos
const PERMISSOES: Record<string, string[]> = {
  '/':                ['administrador'],
  '/admin':           ['administrador'],
  '/relatorios':      ['administrador'],
  '/configuracoes':   ['administrador'],
  '/caixa':      ['administrador', 'caixa'],
  '/vendas':     ['administrador', 'garcom', 'caixa'],
  '/mesas':      ['administrador', 'garcom'],
  '/produtos':   ['administrador', 'garcom'],
  '/cozinha':    ['administrador', 'cozinha']
}

const DESTINOS_POR_CARGO: Record<string, string> = {
  administrador: '/',
  garcom:        '/mesas',
  caixa:         '/caixa',
  cozinha:       '/cozinha'
}

export default defineNuxtRouteMiddleware(async (to) => {
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
    return navigateTo(DESTINOS_POR_CARGO[cargo] ?? '/mesas')
  }

  // Venda mobile pode ser desligada remotamente pelo painel central de
  // suporte — se estiver, redireciona pra fora de /vendas mesmo que o
  // cargo tenha permissão
  if (rotaBase === '/vendas') {
    const configStore = useConfigStore()
    await configStore.carregar()
    if (!configStore.venda_mobile_permitida) {
      return navigateTo(DESTINOS_POR_CARGO[cargo] ?? '/mesas')
    }
  }
})
