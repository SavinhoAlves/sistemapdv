import { useAuthStore } from '~/stores/auth'

const ROTAS_PUBLICAS = ['/login', '/ativacao', '/logout', '/admin/login', '/m', '/platform', '/cardapio', '/pedido']

// Permissão mínima exigida por rota (undefined = rota desconhecida; null = qualquer autenticado)
const PERMISSAO_POR_ROTA: Record<string, string | null> = {
  '/':              null,
  '/mesas':         'adicionarPedido',
  '/vendas':        'adicionarPedido',
  '/caixa':         'gerenciarCaixa',
  '/delivery':      'gerenciarCaixa',
  '/entregador':    'fazerEntregas',
  '/cozinha':       'verCozinha',
  '/produtos':      'gerenciarProdutos',
  '/estoque':       'gerenciarProdutos',
  '/relatorios':    'verRelatorios',
  '/configuracoes': 'gerenciarConfiguracoes',
}

const DESTINO_PADRAO: Record<string, string> = {
  administrador: '/',
  garcom:        '/mesas',
  caixa:         '/caixa',
  cozinha:       '/cozinha',
  entregador:    '/entregador',
}

export default defineNuxtRouteMiddleware((to) => {
  if (ROTAS_PUBLICAS.some(r => to.path.startsWith(r))) return
  if (!process.client) return

  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) return navigateTo('/login')

  const usuario = authStore.usuario
  if (!usuario) return navigateTo('/login')

  const rotaBase = '/' + to.path.split('/')[1]
  const destino  = DESTINO_PADRAO[usuario.cargo] ?? '/mesas'

  // Painel admin e suporte: exclusivos para cargo administrador
  if (rotaBase === '/admin' || rotaBase === '/suporte') {
    if (usuario.cargo !== 'administrador') return navigateTo(destino)
    return
  }

  // O entregador só usa a própria rota (app do entregador)
  if (usuario.cargo === 'entregador' && rotaBase !== '/entregador') return navigateTo('/entregador')

  // Rotas mapeadas: verifica a permissão necessária
  if (rotaBase in PERMISSAO_POR_ROTA) {
    const perm = PERMISSAO_POR_ROTA[rotaBase]
    if (perm && !authStore.temPermissao(perm)) return navigateTo(destino)
  }
})
