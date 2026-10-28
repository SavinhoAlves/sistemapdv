// Permissão mínima exigida por rota (undefined = rota desconhecida; null = qualquer autenticado).
// Usado pelo middleware roles.global e pelo plugin que aplica mudanças de permissão na hora.
export const PERMISSAO_POR_ROTA: Record<string, string | null> = {
  '/':              null,
  '/mesas':         'adicionarPedido',
  '/vendas':        'gerenciarCaixa',
  '/caixa':         'gerenciarCaixa',
  '/delivery':      'gerenciarCaixa',
  '/entregador':    'fazerEntregas',
  '/cozinha':       'verCozinha',
  '/produtos':      'gerenciarProdutos',
  '/estoque':       'gerenciarProdutos',
  '/relatorios':    'verRelatorios',
  '/configuracoes': 'gerenciarConfiguracoes',
}

export const DESTINO_PADRAO: Record<string, string> = {
  administrador: '/',
  garcom:        '/mesas',
  caixa:         '/caixa',
  cozinha:       '/cozinha',
  entregador:    '/entregador',
}
