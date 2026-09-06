import { paraCentavos, paraReais, percentual, type Centavos } from '../../lib/money'

/**
 * Fonte única do cálculo da conta.
 *
 * Antes essa fórmula estava copiada em quatro lugares — pedidos.service,
 * pagamentos.service, caixa.service e SidebarMesa.vue — e o frontend usava
 * uma base diferente do backend:
 *
 *     backend:  taxa = subtotal × pct           total = subtotal + taxa − desconto
 *     frontend: taxa = (subtotal − desconto)×pct total = (subtotal − desconto) + taxa
 *
 * Com subtotal 100, desconto 10 e taxa 10%, o garçom imprimia 99,00 e o
 * backend exigia 100,00. A conta nunca quitava.
 *
 * A regra abaixo é a única válida, e é a praticada no varejo brasileiro:
 * o desconto reduz o consumo, e a taxa de serviço incide sobre o que o
 * cliente efetivamente vai pagar pelo consumo — ou seja, sobre o líquido.
 *
 *     bruto     = Σ itens não cancelados
 *     descontos = Σ abatimentos
 *     liquido   = max(0, bruto − descontos)
 *     taxa      = round(liquido × pct)
 *     total     = liquido + taxa
 *     restante  = max(0, total − pagamentos confirmados)
 *
 * Toda aritmética em centavos inteiros. Nenhum float em nenhum ponto.
 */

export interface EntradaConta {
  itens: Array<{ precoTotal: unknown; status: string }>
  abatimentos: Array<{ valor: unknown; cancelado?: boolean }>
  pagamentos: Array<{ valor: unknown; status: string }>
  taxaPct: number
}

export interface Conta {
  brutoCentavos: Centavos
  descontoCentavos: Centavos
  liquidoCentavos: Centavos
  taxaPct: number
  taxaCentavos: Centavos
  totalCentavos: Centavos
  pagoCentavos: Centavos
  restanteCentavos: Centavos
  quitada: boolean
}

export function calcularConta(entrada: EntradaConta): Conta {
  const bruto = entrada.itens
    .filter((i) => i.status !== 'cancelado')
    .reduce((s, i) => s + paraCentavos(i.precoTotal as any), 0)

  const descontoBruto = entrada.abatimentos
    .filter((a) => !a.cancelado)
    .reduce((s, a) => s + paraCentavos(a.valor as any), 0)

  // Desconto nunca ultrapassa o consumo.
  const desconto = Math.min(descontoBruto, bruto)
  const liquido = bruto - desconto

  const taxaPct = Number.isFinite(entrada.taxaPct) ? entrada.taxaPct : 0
  const taxa = percentual(liquido, taxaPct)
  const total = liquido + taxa

  const pago = entrada.pagamentos
    .filter((p) => p.status === 'confirmado')
    .reduce((s, p) => s + paraCentavos(p.valor as any), 0)

  const restante = Math.max(0, total - pago)

  return {
    brutoCentavos: bruto,
    descontoCentavos: desconto,
    liquidoCentavos: liquido,
    taxaPct,
    taxaCentavos: taxa,
    totalCentavos: total,
    pagoCentavos: pago,
    restanteCentavos: restante,
    // Comparação de inteiros. Antes era `restante <= 0` sobre float, e o
    // resíduo de 1e-9 impedia a quitação.
    quitada: total > 0 && restante === 0,
  }
}

/** Serialização para o HTTP: reais como number, além dos centavos. */
export function contaParaJson(c: Conta) {
  return {
    bruto: paraReais(c.brutoCentavos),
    desconto: paraReais(c.descontoCentavos),
    liquido: paraReais(c.liquidoCentavos),
    taxa_pct: c.taxaPct,
    taxa: paraReais(c.taxaCentavos),
    total: paraReais(c.totalCentavos),
    pago: paraReais(c.pagoCentavos),
    restante: paraReais(c.restanteCentavos),
    quitada: c.quitada,
    centavos: {
      bruto: c.brutoCentavos,
      desconto: c.descontoCentavos,
      liquido: c.liquidoCentavos,
      taxa: c.taxaCentavos,
      total: c.totalCentavos,
      pago: c.pagoCentavos,
      restante: c.restanteCentavos,
    },
  }
}

/**
 * Select mínimo para alimentar `calcularConta`. Usar sempre este objeto evita
 * que uma tela esqueça de trazer os pagamentos e mostre um restante errado.
 */
export const includeParaConta = {
  itens: { select: { precoTotal: true, status: true } },
  abatimentos: { select: { valor: true, cancelado: true } },
  pagamentos: { select: { valor: true, status: true } },
} as const
