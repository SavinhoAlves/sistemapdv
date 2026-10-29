import { prisma } from '../../lib/prisma'
import { partesLocais, inicioDoDia, hojeLocal, somarDias } from '../../lib/fuso'

/**
 * Resumo do Dashboard por período (hora local): hoje, ontem, 7 ou 30 dias.
 * Cards, gráfico, últimos pagamentos e métodos usam o mesmo intervalo.
 * Mesas abertas é sempre "agora".
 */
export const PERIODOS = ['hoje', 'ontem', '7d', '30d'] as const
export type Periodo = typeof PERIODOS[number]

function intervalo(periodo: Periodo) {
  const hoje = hojeLocal()
  const amanha = somarDias(hoje, 1)
  if (periodo === 'ontem') return { dias: [somarDias(hoje, -1)], gte: inicioDoDia(somarDias(hoje, -1)), lt: inicioDoDia(hoje) }
  const n = periodo === '30d' ? 30 : periodo === '7d' ? 7 : 1
  const dias = Array.from({ length: n }, (_, i) => somarDias(hoje, i - (n - 1)))
  return { dias, gte: inicioDoDia(dias[0]), lt: inicioDoDia(amanha) }
}

export async function stats(tenantId: string, periodo: Periodo = 'hoje') {
  const { dias, gte, lt } = intervalo(periodo)
  const filtro = { tenantId, status: 'confirmado' as const, createdAt: { gte, lt } }

  const [mesasAbertas, aggs, pedidosDistintos, recentes, grupados, pagamentos] = await Promise.all([
    prisma.mesa.count({ where: { tenantId, status: { in: ['aberta', 'fechando'] }, dataFechamento: null } }),
    prisma.pagamento.aggregate({ where: filtro, _sum: { valor: true }, _count: { id: true }, _avg: { valor: true } }),
    prisma.pagamento.findMany({ where: filtro, select: { pedidoId: true }, distinct: ['pedidoId'] }),
    prisma.pagamento.findMany({
      where: filtro, orderBy: { createdAt: 'desc' }, take: 8,
      include: { mesa: { select: { nomeMesa: true, numero: true } }, metodo: { select: { nome: true } } },
    }),
    prisma.pagamento.groupBy({ by: ['metodoId'], where: filtro, _count: { id: true }, _sum: { valor: true } }),
    prisma.pagamento.findMany({ where: filtro, select: { valor: true, createdAt: true } }),
  ])

  // Gráfico: por hora num dia só (hoje/ontem); por dia em 7 e 30 dias
  const porHora = Array.from({ length: 24 }, (_, hora) => ({ hora, total: 0, qtd: 0 }))
  const porDia = dias.map((dia) => ({ dia, total: 0, qtd: 0 }))
  for (const p of pagamentos) {
    const { dia, hora } = partesLocais(p.createdAt)
    const v = Number(p.valor)
    const d = porDia.find((x) => x.dia === dia)
    if (d) { d.total += v; d.qtd++ }
    if (dias.length === 1) { porHora[hora].total += v; porHora[hora].qtd++ }
  }
  const arred = <T extends { total: number }>(xs: T[]) => xs.map((x) => ({ ...x, total: Number(x.total.toFixed(2)) }))

  const metodosMap = await prisma.metodoPagamento.findMany({
    where: { tenantId, id: { in: grupados.map((g) => g.metodoId) } },
    select: { id: true, nome: true },
  })

  const [anterior, maisVendidos, salao] = await Promise.all([
    periodoAnterior(tenantId, gte, lt),
    topProdutos(tenantId, gte, lt),
    mesasDoSalao(tenantId),
  ])

  return {
    periodo,
    anterior,
    maisVendidos,
    salao,
    dia: dias.length === 1 ? dias[0] : null,
    porHora: dias.length === 1 ? arred(porHora) : [],
    porDia: dias.length > 1 ? arred(porDia) : [],
    faturamento: Number(aggs._sum.valor ?? 0),
    pagamentos: aggs._count.id,
    mesasAbertas,
    pedidos: pedidosDistintos.length,
    ticketMedio: Number(Number(aggs._avg.valor ?? 0).toFixed(2)),
    pagamentosRecentes: recentes.map((p) => ({
      id: p.id,
      valor: Number(p.valor),
      troco: Number(p.troco),
      createdAt: p.createdAt,
      nomeMesa: p.mesa ? (p.mesa.nomeMesa ?? `Mesa ${p.mesa.numero}`) : null, // sem mesa = venda direta
      metodo: p.metodo.nome,
    })),
    metodosPie: grupados.map((g) => ({
      metodo: metodosMap.find((m) => m.id === g.metodoId)?.nome ?? '?',
      qtd: g._count.id,
      total: Number(g._sum.valor ?? 0),
    })),
  }
}

/**
 * O mesmo trecho de tempo logo antes, para a tendência dos cards. Em "hoje"
 * compara com ontem até a mesma hora (não com o dia inteiro de ontem).
 */
async function periodoAnterior(tenantId: string, gte: Date, lt: Date) {
  const fim = Math.min(lt.getTime(), Date.now())
  const span = lt.getTime() - gte.getTime()
  const filtro = { tenantId, status: 'confirmado' as const, createdAt: { gte: new Date(gte.getTime() - span), lt: new Date(fim - span) } }
  const [aggs, pedidos] = await Promise.all([
    prisma.pagamento.aggregate({ where: filtro, _sum: { valor: true }, _avg: { valor: true } }),
    prisma.pagamento.findMany({ where: filtro, select: { pedidoId: true }, distinct: ['pedidoId'] }),
  ])
  return {
    faturamento: Number(aggs._sum.valor ?? 0),
    pedidos: pedidos.length,
    ticketMedio: Number(Number(aggs._avg.valor ?? 0).toFixed(2)),
  }
}

/** Os 5 produtos com mais unidades lançadas no período (sem os cancelados). */
async function topProdutos(tenantId: string, gte: Date, lt: Date) {
  const grupos = await prisma.pedidoItem.groupBy({
    by: ['produtoId'],
    where: { tenantId, status: { notIn: ['cancelado', 'rascunho'] }, createdAt: { gte, lt } },
    _sum: { quantidade: true, precoTotal: true },
    orderBy: { _sum: { quantidade: 'desc' } },
    take: 5,
  })
  const produtos = await prisma.produto.findMany({
    where: { tenantId, id: { in: grupos.map((g) => g.produtoId) } },
    select: { id: true, nome: true },
  })
  return grupos.map((g) => ({
    nome: produtos.find((p) => p.id === g.produtoId)?.nome ?? '?',
    qtd: g._sum.quantidade ?? 0,
    total: Number(g._sum.precoTotal ?? 0),
  }))
}

/** Mesas abertas agora, com o consumo de cada uma (para o "Salão agora"). */
async function mesasDoSalao(tenantId: string) {
  const mesas = await prisma.mesa.findMany({
    where: { tenantId, status: { in: ['aberta', 'fechando'] }, dataFechamento: null },
    orderBy: { numero: 'asc' },
    select: {
      id: true, numero: true, nomeMesa: true, status: true,
      pedidos: { select: { itens: { where: { status: { notIn: ['cancelado'] } }, select: { precoTotal: true } } } },
    },
  })
  return mesas.map((m) => ({
    id: m.id,
    numero: m.numero,
    nome: m.nomeMesa,
    contaPedida: m.status === 'fechando',
    total: Number(m.pedidos.flatMap((p) => p.itens).reduce((s, i) => s + Number(i.precoTotal), 0).toFixed(2)),
  }))
}
