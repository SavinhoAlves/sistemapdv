/**
 * Respostas do caixa (backend/src/modules/caixa) → o que as telas mostram.
 *
 * A API devolve o caixa em camelCase (dataAbertura, valorContado…) e o
 * resumo em snake_case (esperado_dinheiro, total_vendas, por_metodo…).
 * As telas liam campos que não existiam (totais, total_entradas,
 * saldo_atual, valor_contado), então os cartões do caixa ficavam zerados.
 * As contas derivadas ficam aqui, num lugar só.
 */
export interface ResumoCaixa {
  esperado_dinheiro: number
  total_vendas: number
  qtd_vendas?: number
  valor_inicial: number
  suprimentos: number
  sangrias: number
  dinheiro_recebido: number
  dinheiro_estornado: number
  troco_dado: number
  por_metodo: Record<string, { recebido: number; estornado: number; liquido: number; qtd?: number }>
}

/** Cartões: entradas = vendas + suprimentos; saídas = sangrias; saldo = inicial + entradas − saídas. */
export function totaisDoResumo(r: ResumoCaixa | null | undefined) {
  if (!r) return null
  const entradas = r.total_vendas + r.suprimentos
  const saidas = r.sangrias
  return {
    valorInicial: r.valor_inicial,
    entradas,
    saidas,
    esperadoDinheiro: r.esperado_dinheiro,
    saldoAtual: r.valor_inicial + entradas - saidas,
  }
}

export function vendasDoResumo(r: ResumoCaixa | null | undefined) {
  if (!r) return null
  const qtd = r.qtd_vendas ?? 0
  return { quantidade: qtd, total: r.total_vendas, ticketMedio: qtd ? r.total_vendas / qtd : 0 }
}

/** Vendas por forma de pagamento (líquido de estornos), maior primeiro. */
export function porMetodoDoResumo(r: ResumoCaixa | null | undefined) {
  if (!r) return []
  return Object.entries(r.por_metodo ?? {})
    .map(([metodo, v]) => ({ metodo, qtd: v.qtd ?? 0, total: v.liquido }))
    .filter(m => m.total || m.qtd)
    .sort((a, b) => b.total - a.total)
}
