import { useAuthStore } from '~/stores/auth'
import { noApp, destinoNoCelular } from '~/lib/app'
import { ehPainel } from '~/lib/hosts'

const ROTAS_PUBLICAS = ['/acesso', '/login', '/ativacao', '/logout', '/admin/login', '/m', '/platform', '/cardapio', '/pedido']

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
  if (ROTAS_PUBLICAS.some(r => to.path.startsWith(r)) || ehPainel()) return
  if (!process.client) return

  const authStore = useAuthStore()
  const entrada = noApp() ? '/acesso' : '/login'
  if (!authStore.isAuthenticated) return navigateTo(entrada)

  const usuario = authStore.usuario
  if (!usuario) return navigateTo(entrada)

  // No app da equipe cada cargo fica na sua tela de celular
  if (noApp() && !to.path.startsWith(destinoNoCelular(usuario.cargo))) return navigateTo(destinoNoCelular(usuario.cargo))

  const rotaBase = '/' + to.path.split('/')[1]
  const destino  = DESTINO_PADRAO[usuario.cargo] ?? '/mesas'

  // Painel admin e suporte: exclusivos para cargo administrador
  if (rotaBase === '/admin' || rotaBase === '/suporte') {
    if (usuario.cargo !== 'administrador') return navigateTo(destino)
    return
  }

  // O entregador só usa a própria rota (app da equipe)
  if (usuario.cargo === 'entregador' && rotaBase !== '/entregador') return navigateTo('/entregador')

  // Rotas mapeadas: verifica a permissão necessária
  if (rotaBase in PERMISSAO_POR_ROTA) {
    const perm = PERMISSAO_POR_ROTA[rotaBase]
    if (perm && !authStore.temPermissao(perm)) return navigateTo(destino)
  }
})
