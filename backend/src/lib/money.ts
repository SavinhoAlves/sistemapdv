import { Prisma } from '@prisma/client'

/**
 * Dinheiro em centavos inteiros.
 *
 * Motivo: o código anterior convertia Decimal → Number e fazia toda a
 * aritmética da conta em float. Com pagamentos parciais o resíduo acumula e
 * `restante` fica em 1e-9, fazendo a conta nunca quitar. Os `toFixed(2)`
 * espalhados escondiam o sintoma na tela sem corrigir a comparação.
 *
 * Regra: dentro da camada de negócio, dinheiro é `number` inteiro em centavos.
 * A conversão para/de Decimal acontece só na borda do Prisma.
 */

export type Centavos = number

/** Decimal do Prisma (ou número/string vindo do banco) → centavos inteiros. */
export function paraCentavos(valor: Prisma.Decimal | number | string | null | undefined): Centavos {
  if (valor === null || valor === undefined) return 0
  // Decimal.toFixed evita o round-trip por float que perderia precisão.
  const texto = typeof valor === 'object' && 'toFixed' in valor ? valor.toFixed(2) : String(valor)
  const n = Math.round(Number(texto) * 100)
  return Number.isFinite(n) ? n : 0
}

/** Centavos inteiros → Decimal para gravar no Prisma. */
export function paraDecimal(centavos: Centavos): Prisma.Decimal {
  return new Prisma.Decimal((Math.round(centavos) / 100).toFixed(2))
}

/** Centavos → number em reais, só para serializar na resposta HTTP. */
export function paraReais(centavos: Centavos): number {
  return Math.round(centavos) / 100
}

/**
 * Valor recebido do cliente (reais, possivelmente string) → centavos.
 * Rejeita NaN, negativo e valores absurdos em vez de deixar virar 0 silencioso.
 */
export function centavosDoCliente(valor: unknown, campo = 'valor'): Centavos {
  const n = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor)
  if (!Number.isFinite(n)) {
    throw Object.assign(new Error(`${campo} inválido`), { status: 400 })
  }
  if (n < 0) {
    throw Object.assign(new Error(`${campo} não pode ser negativo`), { status: 400 })
  }
  const centavos = Math.round(n * 100)
  if (centavos > 100_000_000) {
    throw Object.assign(new Error(`${campo} acima do limite permitido`), { status: 400 })
  }
  return centavos
}

/**
 * Percentual aplicado sobre centavos, com arredondamento bancário para o
 * centavo mais próximo. `pct` vem como número em pontos percentuais (10 = 10%).
 */
export function percentual(base: Centavos, pct: number): Centavos {
  if (!Number.isFinite(pct) || pct <= 0) return 0
  return Math.round((base * pct) / 100)
}

/** Divide um valor em N partes que somam exatamente o original. */
export function ratear(total: Centavos, partes: number): Centavos[] {
  if (partes < 1) return [total]
  const base = Math.floor(total / partes)
  const resto = total - base * partes
  return Array.from({ length: partes }, (_, i) => base + (i < resto ? 1 : 0))
}

export function formatar(centavos: Centavos): string {
  return (Math.round(centavos) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
