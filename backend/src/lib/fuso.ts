/**
 * Datas no fuso do restaurante. O banco guarda instantes em UTC; "dia" e
 * "hora" para o usuário são os de Brasília — 22h de segunda não pode cair
 * em 01h de terça só porque o servidor agrupou em UTC.
 */
export const FUSO = 'America/Sao_Paulo'

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
})

/** Dia (AAAA-MM-DD) e hora (0–23) locais de um instante. */
export function partesLocais(d: Date): { dia: string; hora: number } {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]))
  return { dia: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour) }
}

/** Deslocamento do fuso em minutos naquele instante (Brasília: -180). */
function offsetMin(d: Date): number {
  const nome = new Intl.DateTimeFormat('en-US', { timeZone: FUSO, timeZoneName: 'longOffset' })
    .formatToParts(d).find((x) => x.type === 'timeZoneName')?.value ?? 'GMT'
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(nome)
  if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0))
}

/** Instante em que começa o dia local AAAA-MM-DD. */
export function inicioDoDia(dia: string): Date {
  const meioDiaUtc = new Date(`${dia}T12:00:00.000Z`)
  return new Date(Date.parse(`${dia}T00:00:00.000Z`) - offsetMin(meioDiaUtc) * 60000)
}

/** Intervalo [início do dia `inicio`, fim do dia `fim`] em hora local. */
export function intervaloDias(inicio: string, fim: string): { gte: Date; lt: Date } {
  return { gte: inicioDoDia(inicio), lt: inicioDoDia(somarDias(fim, 1)) }
}

/** Soma n dias a AAAA-MM-DD (calendário puro, sem fuso). */
export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Hoje (AAAA-MM-DD) no fuso do restaurante. */
export const hojeLocal = () => partesLocais(new Date()).dia
