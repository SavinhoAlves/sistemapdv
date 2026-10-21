/**
 * Valor digitado em reais → número. Aceita "0", "0,00", "1.234,56", "1234.56".
 * Vazio dá null (para a tela pedir o valor); texto inválido dá NaN.
 */
export function lerValor(texto: unknown): number | null {
  const s = String(texto ?? '').trim().replace(/\s|R\$/g, '')
  if (!s) return null
  // Com vírgula, ela é o decimal e os pontos são milhar; sem vírgula, o ponto é o decimal
  const normal = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  return /^-?\d+(\.\d+)?$/.test(normal) ? Number(normal) : NaN
}
