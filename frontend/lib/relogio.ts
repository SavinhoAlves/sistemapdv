/**
 * Relógio do servidor no navegador. Cada resposta da API traz o cabeçalho Date;
 * guardamos a diferença para o relógio do aparelho. Assim "há 3 min" não vira
 * "-1min" quando o celular/PC está adiantado ou atrasado.
 */
let diferenca = 0

export function ajustarRelogio(cabecalhoDate: string | null | undefined) {
  const t = Date.parse(cabecalhoDate ?? '')
  // O cabeçalho vem em segundos inteiros: +500 ms é o meio do segundo
  if (!Number.isNaN(t)) diferenca = t + 500 - Date.now()
}

export const agoraServidor = () => Date.now() + diferenca

/** Minutos desde um instante da API, nunca negativo. */
export const minutosDesde = (iso: string | number | Date, agora = agoraServidor()) =>
  Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000))
