/**
 * Permissões e funções do PDV. As chaves são as de
 * backend/src/middlewares/permission.middleware.ts (PERMISSOES_CARGO); o
 * padrão de cada função vem da API em GET /perfis/funcoes.
 */

export const GRUPOS_PERMISSOES: { grupo: string; itens: { chave: string; rotulo: string; ajuda?: string }[] }[] = [
  { grupo: 'Atendimento', itens: [
    { chave: 'abrirMesa',          rotulo: 'Abrir mesa' },
    { chave: 'adicionarPedido',    rotulo: 'Lançar pedidos e vender no balcão' },
    { chave: 'cancelarItemPedido', rotulo: 'Cancelar item de pedido' },
    { chave: 'transferirComanda',  rotulo: 'Transferir comanda de mesa' },
    { chave: 'fecharMesa',         rotulo: 'Fechar mesa paga' },
    { chave: 'encerrarSemPagamento', rotulo: 'Encerrar comanda sem pagamento', ajuda: 'Fecha a conta devendo — fica na auditoria' },
  ] },
  { grupo: 'Caixa e financeiro', itens: [
    { chave: 'gerenciarCaixa',     rotulo: 'Abrir, fechar e operar o caixa' },
    { chave: 'aplicarDesconto',    rotulo: 'Dar desconto ou cortesia' },
    { chave: 'estornarPagamento',  rotulo: 'Estornar pagamento', ajuda: 'Mexe em caixa já conferido' },
    { chave: 'verRelatorios',      rotulo: 'Ver relatórios e o painel inicial' },
  ] },
  { grupo: 'Cozinha', itens: [
    { chave: 'verCozinha',         rotulo: 'Ver e atualizar a fila da cozinha' },
  ] },
  { grupo: 'Delivery', itens: [
    { chave: 'fazerEntregas', rotulo: 'Fazer entregas (app RestaurantePDV)' },
  ] },
  { grupo: 'Gestão', itens: [
    { chave: 'gerenciarProdutos',      rotulo: 'Produtos, categorias e estoque' },
    { chave: 'gerenciarConfiguracoes', rotulo: 'Configurações do restaurante' },
    { chave: 'gerenciarUsuarios',      rotulo: 'Cadastrar funcionários' },
    { chave: 'gerenciarPerfis',        rotulo: 'Criar e editar perfis de permissão' },
  ] },
]
export const TODAS_PERMISSOES = GRUPOS_PERMISSOES.flatMap(g => g.itens)
export const rotuloPermissao = (k: string) => TODAS_PERMISSOES.find(p => p.chave === k)?.rotulo ?? k

export type Funcao = 'administrador' | 'garcom' | 'caixa' | 'cozinha' | 'entregador'
export const FUNCOES: { valor: Funcao; rotulo: string; descricao: string; inicio: string; cor: string }[] = [
  { valor: 'administrador', rotulo: 'Administrador', descricao: 'Acesso a tudo, inclusive equipe, configurações e suporte.', inicio: 'Painel', cor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300' },
  { valor: 'caixa',         rotulo: 'Caixa',         descricao: 'Opera o caixa, recebe pagamentos, dá desconto e fecha mesas.', inicio: 'Caixa', cor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { valor: 'garcom',        rotulo: 'Garçom',        descricao: 'Abre mesas e lança pedidos. Não mexe no caixa.', inicio: 'Mesas', cor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  { valor: 'cozinha',       rotulo: 'Cozinha',       descricao: 'Vê e atualiza a fila de pedidos da cozinha.', inicio: 'Cozinha', cor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
  { valor: 'entregador',    rotulo: 'Entregador',    descricao: 'Usa o app RestaurantePDV: rota, GPS e confirmação de entrega.', inicio: 'Minhas entregas', cor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
]
export const funcao = (v: string) => FUNCOES.find(f => f.valor === v)

export const MODOS_VENDA = [
  { valor: 'ambos',  rotulo: 'Mesas e balcão' },
  { valor: 'mesas',  rotulo: 'Só mesas' },
  { valor: 'direta', rotulo: 'Só balcão' },
] as const

/** Permissões efetivas: padrão da função + ajustes do perfil (como o login calcula). */
export function efetivas(padrao: Record<string, boolean> | undefined, perfil?: Record<string, unknown> | null) {
  const r: Record<string, boolean> = {}
  for (const p of TODAS_PERMISSOES) {
    const v = perfil?.[p.chave]
    r[p.chave] = typeof v === 'boolean' ? v : Boolean(padrao?.[p.chave])
  }
  return r
}
