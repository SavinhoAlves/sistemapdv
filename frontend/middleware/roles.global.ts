import { useAuthStore } from '~/stores/auth'

const ROTAS_PUBLICAS = ['/login', '/ativacao', '/logout', '/admin/login', '/m', '/platform']

// Permissão mínima exigida por rota (undefined = rota desconhecida; null = qualquer autenticado)
const PERMISSAO_POR_ROTA: Record<string, string | null> = {
  '/':              null,
  '/mesas':         'adicionarPedido',
  '/vendas':        'adicionarPedido',
  '/caixa':         'gerenciarCaixa',
  '/cozinha':       'verCozinha',
  '/produtos':      'gerenciarProdutos',
  '/relatorios':    'verRelatorios',
  '/configuracoes': 'gerenciarConfiguracoes',
}

const DESTINO_PADRAO: Record<string, string> = {
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

  const usuario = authStore.usuario
  if (!usuario) return navigateTo('/login')

  const rotaBase = '/' + to.path.split('/')[1]
  const destino  = DESTINO_PADRAO[usuario.cargo] ?? '/mesas'

  // Painel admin: exclusivo para cargo administrador
  if (rotaBase === '/admin') {
    if (usuario.cargo !== 'administrador') return navigateTo(destino)
    return
  }

  // Rotas mapeadas: verifica a permissão necessária
  if (rotaBase in PERMISSAO_POR_ROTA) {
    const perm = PERMISSAO_POR_ROTA[rotaBase]
    if (perm && !authStore.temPermissao(perm)) return navigateTo(destino)
  }
})
