/** Formatação e definições compartilhadas pela página de Relatórios. */

export const moeda = (v: unknown) =>
  `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const numero = (v: unknown) => Number(v || 0).toLocaleString('pt-BR')
export const dataHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
export const diaBR = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(2, 4)}`

/** AAAA-MM-DD no horário local do navegador (toISOString usaria UTC e viraria o dia às 21h). */
export function diaLocal(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function somarDias(dia: string, n: number) {
  const d = new Date(`${dia}T12:00:00`)
  d.setDate(d.getDate() + n)
  return diaLocal(d)
}

export type Aba = 'geral' | 'vendas' | 'produtos' | 'mesas' | 'descontos' | 'caixa' | 'estoque' | 'auditoria'
export type ChaveFiltro = 'funcionarioId' | 'metodoId' | 'categoriaId' | 'produtoId' | 'origem' | 'status' | 'acao'

export const ABAS: { valor: Aba; rotulo: string; endpoint: string; filtros: ChaveFiltro[]; admin?: boolean }[] = [
  { valor: 'geral',     rotulo: 'Visão geral',  endpoint: '',           filtros: ['funcionarioId', 'metodoId', 'origem'] },
  { valor: 'vendas',    rotulo: 'Vendas',       endpoint: '/vendas',    filtros: ['funcionarioId', 'metodoId', 'origem', 'status'] },
  { valor: 'produtos',  rotulo: 'Produtos',     endpoint: '/produtos',  filtros: ['funcionarioId', 'categoriaId', 'produtoId', 'origem'] },
  { valor: 'mesas',     rotulo: 'Mesas',        endpoint: '/mesas',     filtros: ['funcionarioId', 'metodoId'] },
  { valor: 'descontos', rotulo: 'Descontos e cancelamentos', endpoint: '/descontos', filtros: ['funcionarioId', 'categoriaId'] },
  { valor: 'caixa',     rotulo: 'Caixa',        endpoint: '/caixa',     filtros: ['funcionarioId'] },
  { valor: 'estoque',   rotulo: 'Estoque',      endpoint: '/estoque',   filtros: ['categoriaId', 'produtoId', 'funcionarioId'] },
  { valor: 'auditoria', rotulo: 'Auditoria',    endpoint: '/auditoria', filtros: ['funcionarioId', 'acao'], admin: true },
]

/** Rótulo de cada filtro; em Caixa e Estoque o "funcionário" é quem operou. */
export function rotuloFiltro(chave: ChaveFiltro, aba: Aba) {
  if (chave === 'funcionarioId') return aba === 'caixa' ? 'Operador' : aba === 'estoque' || aba === 'auditoria' ? 'Usuário' : 'Atendente'
  return ({ metodoId: 'Pagamento', categoriaId: 'Categoria', produtoId: 'Produto', origem: 'Origem', status: 'Situação', acao: 'Ação' } as Record<string, string>)[chave]
}

export const ORIGENS = [{ id: 'mesa', nome: 'Mesas (comanda)' }, { id: 'balcao', nome: 'Balcão (venda direta)' }]
export const STATUS_VENDA = [{ id: 'todos', nome: 'Confirmadas e estornadas' }, { id: 'estornado', nome: 'Só estornadas' }]

/** Ações gravadas em lib/auditoria (backend) → rótulo e cor. */
export const ACOES_AUDITORIA: Record<string, { rotulo: string; cor: string }> = {
  'caixa.fechado':                   { rotulo: 'Fechamento de caixa', cor: 'bg-gray-500/15 text-gray-600 dark:text-white/60' },
  'caixa.sangria':                   { rotulo: 'Sangria',             cor: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  'caixa.suprimento':                { rotulo: 'Suprimento',          cor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  'item.cancelado':                  { rotulo: 'Item cancelado',      cor: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  'pedido.abatimento':               { rotulo: 'Desconto',            cor: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  'pedido.abatimento_cancelado':     { rotulo: 'Desconto desfeito',   cor: 'bg-gray-500/15 text-gray-600 dark:text-white/60' },
  'pagamento.estornado':             { rotulo: 'Estorno',             cor: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  'comanda.reaberta':                { rotulo: 'Comanda reaberta',    cor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  'comanda.encerrada_sem_pagamento': { rotulo: 'Encerrada sem pagamento', cor: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  'comanda.transferida':             { rotulo: 'Comanda transferida', cor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
}
export const infoAcao = (a: string) => ACOES_AUDITORIA[a] ?? { rotulo: a, cor: 'bg-gray-500/15 text-gray-600 dark:text-white/60' }
