import { prisma } from '../../lib/prisma'
import { partesLocais, inicioDoDia, hojeLocal, somarDias } from '../../lib/fuso'

/**
 * Faturamento confirmado por hora de hoje e por dia nos últimos 7 dias
 * (hora local), para o gráfico da página inicial.
 */
async function series(tenantId: string) {
  const hoje = hojeLocal()
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i - 6))
  const pagamentos = await prisma.pagamento.findMany({
    where: { tenantId, status: 'confirmado', createdAt: { gte: inicioDoDia(dias[0]) } },
    select: { valor: true, createdAt: true },
  })

  const porHora = Array.from({ length: 24 }, (_, hora) => ({ hora, total: 0, qtd: 0 }))
  const porDia = dias.map((dia) => ({ dia, total: 0, qtd: 0 }))
  for (const p of pagamentos) {
    const { dia, hora } = partesLocais(p.createdAt)
    const v = Number(p.valor)
    const d = porDia.find((x) => x.dia === dia)
    if (d) { d.total += v; d.qtd++ }
    if (dia === hoje) { porHora[hora].total += v; porHora[hora].qtd++ }
  }
  const arred = <T extends { total: number }>(xs: T[]) => xs.map((x) => ({ ...x, total: Number(x.total.toFixed(2)) }))
  return { porHora: arred(porHora), ultimos7Dias: arred(porDia) }
}

export async function stats(tenantId: string) {
  // Mesas abertas
  const mesasAbertas = await prisma.mesa.count({
    where: { tenantId, status: { in: ['aberta', 'fechando'] }, dataFechamento: null },
  })

  // Tudo pela data do dia (hora local), igual a Relatórios → Hoje
  const filtro = { tenantId, status: 'confirmado' as const, createdAt: { gte: inicioDoDia(hojeLocal()) } }

  const aggs = await prisma.pagamento.aggregate({
    where: filtro,
    _sum: { valor: true },
    _count: { id: true },
    _avg: { valor: true },
  })

  const pedidosDistintos = await prisma.pagamento.findMany({
    where: filtro,
    select: { pedidoId: true },
    distinct: ['pedidoId'],
  })

  const recentes = await prisma.pagamento.findMany({
    where: filtro,
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: {
      mesa:   { select: { nomeMesa: true, numero: true } },
      metodo: { select: { nome: true } },
    },
  })

  const pagamentosRecentes = recentes.map((p) => ({
    id:        p.id,
    valor:     Number(p.valor),
    troco:     Number(p.troco),
    createdAt: p.createdAt,
    nomeMesa:  p.mesa ? (p.mesa.nomeMesa ?? `Mesa ${p.mesa.numero}`) : null, // sem mesa = venda direta
    metodo:    p.metodo.nome,
  }))

  const grupados = await prisma.pagamento.groupBy({
    by: ['metodoId'],
    where: filtro,
    _count: { id: true },
    _sum: { valor: true },
  })

  const metodosMap = await prisma.metodoPagamento.findMany({
    where: { tenantId, id: { in: grupados.map((g) => g.metodoId) } },
    select: { id: true, nome: true },
  })

  const metodosPie = grupados.map((g) => ({
    metodo: metodosMap.find((m) => m.id === g.metodoId)?.nome ?? '?',
    qtd:    g._count.id,
    total:  Number(g._sum.valor ?? 0),
  }))

  return {
    ...(await series(tenantId)),
    faturamentoHoje: Number(aggs._sum.valor ?? 0),
    pagamentosHoje:  aggs._count.id,
    mesasAbertas,
    pedidosHoje:     pedidosDistintos.length,
    ticketMedio:     Number(Number(aggs._avg.valor ?? 0).toFixed(2)),
    pagamentosRecentes,
    metodosPie,
  }
}


