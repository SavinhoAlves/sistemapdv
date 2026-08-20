import { prisma } from '../../lib/prisma'

export async function stats(tenantId: string) {
  // Mesas abertas
  const mesasAbertas = await prisma.mesa.count({
    where: { tenantId, status: { in: ['aberta', 'ocupada', 'fechando'] }, dataFechamento: null },
  })

  // Caixa aberto atual
  const caixaAberto = await prisma.caixa.findFirst({
    where: { tenantId, status: 'aberto' },
    orderBy: { dataAbertura: 'desc' },
  })

  let faturamentoHoje = 0
  let pagamentosHoje = 0
  let pedidosHoje = 0
  let ticketMedio = 0
  let pagamentosRecentes: any[] = []
  let metodosPie: any[] = []

  if (caixaAberto) {
    // Totais do caixa atual
    const aggs = await prisma.pagamento.aggregate({
      where: { tenantId, caixaId: caixaAberto.id, status: 'confirmado' },
      _sum: { valor: true },
      _count: { id: true },
      _avg: { valor: true },
    })

    const pedidosDistintos = await prisma.pagamento.findMany({
      where: { tenantId, caixaId: caixaAberto.id, status: 'confirmado' },
      select: { pedidoId: true },
      distinct: ['pedidoId'],
    })

    faturamentoHoje = Number(aggs._sum.valor ?? 0)
    pagamentosHoje  = aggs._count.id
    ticketMedio     = Number(aggs._avg.valor ?? 0)
    pedidosHoje     = pedidosDistintos.length

    const recentes = await prisma.pagamento.findMany({
      where: { tenantId, caixaId: caixaAberto.id, status: 'confirmado' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        mesa:   { select: { nomeMesa: true, numero: true } },
        metodo: { select: { nome: true } },
      },
    })

    pagamentosRecentes = recentes.map((p) => ({
      id:        p.id,
      valor:     Number(p.valor),
      troco:     Number(p.troco),
      createdAt: p.createdAt,
      nomeMesa:  p.mesa?.nomeMesa ?? `Mesa ${p.mesa?.numero ?? '?'}`,
      metodo:    p.metodo.nome,
    }))

    const grupados = await prisma.pagamento.groupBy({
      by: ['metodoId'],
      where: { tenantId, caixaId: caixaAberto.id, status: 'confirmado' },
      _count: { id: true },
      _sum: { valor: true },
    })

    const metodosMap = await prisma.metodoPagamento.findMany({
      where: { tenantId, id: { in: grupados.map((g) => g.metodoId) } },
      select: { id: true, nome: true },
    })

    metodosPie = grupados.map((g) => ({
      metodo: metodosMap.find((m) => m.id === g.metodoId)?.nome ?? '?',
      qtd:    g._count.id,
      total:  Number(g._sum.valor ?? 0),
    }))
  } else {
    // Sem caixa aberto — dados do dia atual
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const aggs = await prisma.pagamento.aggregate({
      where: { tenantId, status: 'confirmado', createdAt: { gte: hoje } },
      _sum: { valor: true },
      _count: { id: true },
      _avg: { valor: true },
    })

    const pedidosCount = await prisma.pedido.count({
      where: { tenantId, createdAt: { gte: hoje } },
    })

    faturamentoHoje = Number(aggs._sum.valor ?? 0)
    pagamentosHoje  = aggs._count.id
    ticketMedio     = Number(aggs._avg.valor ?? 0)
    pedidosHoje     = pedidosCount

    const recentes = await prisma.pagamento.findMany({
      where: { tenantId, status: 'confirmado', createdAt: { gte: hoje } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        mesa:   { select: { nomeMesa: true, numero: true } },
        metodo: { select: { nome: true } },
      },
    })

    pagamentosRecentes = recentes.map((p) => ({
      id:        p.id,
      valor:     Number(p.valor),
      troco:     Number(p.troco),
      createdAt: p.createdAt,
      nomeMesa:  p.mesa?.nomeMesa ?? `Mesa ${p.mesa?.numero ?? '?'}`,
      metodo:    p.metodo.nome,
    }))

    const grupados = await prisma.pagamento.groupBy({
      by: ['metodoId'],
      where: { tenantId, status: 'confirmado', createdAt: { gte: hoje } },
      _count: { id: true },
      _sum: { valor: true },
    })

    const metodosMap = await prisma.metodoPagamento.findMany({
      where: { tenantId, id: { in: grupados.map((g) => g.metodoId) } },
      select: { id: true, nome: true },
    })

    metodosPie = grupados.map((g) => ({
      metodo: metodosMap.find((m) => m.id === g.metodoId)?.nome ?? '?',
      qtd:    g._count.id,
      total:  Number(g._sum.valor ?? 0),
    }))
  }

  return {
    faturamentoHoje,
    pagamentosHoje,
    mesasAbertas,
    pedidosHoje,
    ticketMedio: Number(ticketMedio.toFixed(2)),
    pagamentosRecentes,
    metodosPie,
  }
}
