/** Dinheiro sempre no padrão brasileiro: R$ 1.234,50 (nunca "R$ 1234.50"). */
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const NUM = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const reais = (v: unknown) => BRL.format(Number(v) || 0)
/** Só o número (1.234,50), para quando o "R$" já está escrito ao lado. */
export const numeroBR = (v: unknown) => NUM.format(Number(v) || 0)
