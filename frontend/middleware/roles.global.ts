import { useAuthStore } from '~/stores/auth'

// Rotas que não exigem autenticação
const ROTAS_PUBLICAS = ['/login', '/ativacao', '/logout', '/admin/login']

// Mapa de rotas → cargos permitidos
const PERMISSOES: Record<string, string[]> = {
  '/':                ['administrador'],
  '/admin':           ['administrador'],
  '/relatorios':      ['administrador'],
  '/configuracoes':   ['administrador'],
  '/caixa':      ['administrador', 'caixa'],
  '/vendas':     ['administrador'],
  '/mesas':      ['administrador', 'garcom'],
  '/produtos':   ['administrador'],
  '/cozinha':    ['administrador', 'cozinha']
}

const DESTINOS_POR_CARGO: Record<string, string> = {
  administrador: '/',
  garcom:        '/mesas',
  caixa:         '/caixa',
  cozinha:       '/cozinha'
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
    return navigateTo(DESTINOS_POR_CARGO[cargo] ?? '/mesas')
  }

  // Checagem de venda_mobile_permitida (toggle remoto do painel central)
  // fica a cargo da própria página /vendas — redirecionar aqui exigiria
  // aguardar um fetch no meio do middleware, arriscando o redirect chegar
  // depois que a página já começou a montar/transicionar
})
