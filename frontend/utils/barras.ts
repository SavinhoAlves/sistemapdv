export interface Barra { chave: string; total: number; qtd: number; rotulo: string; titulo: string }

/** Séries da API ({hora|dia, total, qtd}) → barras do GraficoBarras. */
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const hh = (h: number) => String(h).padStart(2, '0')

export function barrasPorHora(pontos: { hora: number; total: number; qtd: number }[]): Barra[] {
  return pontos.map(p => ({
    chave: `h${p.hora}`, total: p.total, qtd: p.qtd,
    rotulo: `${p.hora}h`, titulo: `${hh(p.hora)}h – ${hh(p.hora)}h59`,
  }))
}

export function barrasPorDia(pontos: { dia: string; total: number; qtd: number }[], opc: { ultimoEhHoje?: boolean } = {}): Barra[] {
  const curto = pontos.length <= 10
  return pontos.map((p, i) => {
    const sem = DIAS[new Date(`${p.dia}T12:00:00`).getDay()]
    const dm = `${p.dia.slice(8, 10)}/${p.dia.slice(5, 7)}`
    return {
      chave: p.dia, total: p.total, qtd: p.qtd,
      rotulo: opc.ultimoEhHoje && i === pontos.length - 1 ? 'hoje' : curto ? `${sem} ${dm}` : dm,
      titulo: `${sem}, ${dm}`,
    }
  })
}
