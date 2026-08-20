import { prisma } from '../../lib/prisma'

function periodoDefault(dataInicio?: string, dataFim?: string) {
  const hoje = new Date().toISOString().slice(0, 10)
  return { inicio: dataInicio || hoje, fim: dataFim || hoje }
}

function dateRange(inicio: string, fim: string) {
  const start = new Date(inicio + 'T00:00:00.000Z')
  const end   = new Date(fim   + 'T23:59:59.999Z')
  return { gte: start, lte: end }
}

// ─── filtros ────────────────────────────────────────────────────────────────────

export async function filtros(tenantId: string) {
  const [funcionarios, metodos, categorias] = await Promise.all([
    prisma.usuario.findMany({
      where: { tenantId, ativo: true },
      select: { id: true, nome: true, cargo: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.metodoPagamento.findMany({
      where: { tenantId },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.categoria.findMany({
      where: { tenantId },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ])
  return { funcionarios, metodos, categorias }
}

// ─── visão geral ────────────────────────────────────────────────────────────────

export async function visaoGeral(
  tenantId: string,
  params: { dataInicio?: string; dataFim?: string; garcomId?: string; metodoId?: string },
) {
  const { inicio, fim } = periodoDefault(params.dataInicio, params.dataFim)
  const range = dateRange(inicio, fim)

  const whereBase: any = { tenantId, status: 'confirmado', createdAt: range }
  if (params.metodoId) whereBase.metodoId = params.metodoId

  // Para filtrar por garçom precisamos ir pelos pedidos
  let pedidoIdsComGarcom: string[] | undefined
  if (params.garcomId) {
    const pedidos = await prisma.pedido.findMany({
      where: { tenantId, garcomId: params.garcomId, createdAt: range },
      select: { id: true },
    })
    pedidoIdsComGarcom = pedidos.map((p) => p.id)
    whereBase.pedidoId = { in: pedidoIdsComGarcom }
  }

  const [aggs, descontos, pagamentosEvol, metodosPie, porFuncionario] = await Promise.all([
    prisma.pagamento.aggregate({
      where: whereBase,
      _sum: { valor: true },
      _count: { id: true },
      _avg: { valor: true },
    }),

    prisma.pedido.aggregate({
      where: {
        tenantId,
        createdAt: range,
        desconto: { gt: 0 },
        ...(pedidoIdsComGarcom ? { id: { in: pedidoIdsComGarcom } } : {}),
      },
      _sum: { desconto: true },
      _count: { id: true },
    }),

    // Carrega pagamentos individuais para agregação por dia/hora em JS
    prisma.pagamento.findMany({
      where: whereBase,
      select: { valor: true, createdAt: true },
    }),

    prisma.pagamento.groupBy({
      by: ['metodoId'],
      where: whereBase,
      _count: { id: true },
      _sum: { valor: true },
    }),

    prisma.usuario.findMany({
      where: { tenantId, ativo: true },
      select: {
        id: true, nome: true, cargo: true,
        pedidos: {
          where: { tenantId, createdAt: range },
          select: {
            id: true,
            pagamentos: { where: { status: 'confirmado' }, select: { valor: true } },
          },
        },
      },
    }),
  ])

  // Agrega por dia e por hora em JS (evita $queryRaw com UUID)
  const byDay: Record<string, { dia: string; total: number; qtd: number }> = {}
  const byHour: Record<number, { hora: number; total: number; qtd: number }> = {}
  for (const p of pagamentosEvol) {
    const dia = p.createdAt.toISOString().slice(0, 10)
    byDay[dia] = byDay[dia] ?? { dia, total: 0, qtd: 0 }
    byDay[dia].total += Number(p.valor)
    byDay[dia].qtd++
    const hora = p.createdAt.getUTCHours()
    byHour[hora] = byHour[hora] ?? { hora, total: 0, qtd: 0 }
    byHour[hora].total += Number(p.valor)
    byHour[hora].qtd++
  }
  const evolucao = Object.values(byDay).sort((a, b) => a.dia.localeCompare(b.dia))
  const horarios = Object.values(byHour).sort((a, b) => a.hora - b.hora)

  const metodosMap = await prisma.metodoPagamento.findMany({
    where: { tenantId, id: { in: metodosPie.map((m) => m.metodoId) } },
    select: { id: true, nome: true },
  })

  // Comparativo período anterior
  const dias = Math.ceil((new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000) + 1
  const antFim = new Date(inicio); antFim.setDate(antFim.getDate() - 1)
  const antIni = new Date(antFim); antIni.setDate(antIni.getDate() - dias + 1)
  const anteriorAgg = await prisma.pagamento.aggregate({
    where: {
      tenantId,
      status: 'confirmado',
      createdAt: { gte: antIni, lte: antFim },
      ...(params.metodoId ? { metodoId: params.metodoId } : {}),
    },
    _sum: { valor: true },
    _count: { id: true },
  })

  const porFuncionarioResult = porFuncionario
    .filter((u) => u.pedidos.length > 0)
    .map((u) => {
      const totalFaturado = u.pedidos.reduce(
        (acc, p) => acc + p.pagamentos.reduce((s, pg) => s + Number(pg.valor), 0), 0
      )
      return {
        id:             u.id,
        nome:           u.nome,
        cargo:          u.cargo,
        qtdPedidos:     u.pedidos.length,
        qtdPagamentos:  u.pedidos.reduce((a, p) => a + p.pagamentos.length, 0),
        totalFaturado:  Number(totalFaturado.toFixed(2)),
      }
    })
    .sort((a, b) => b.totalFaturado - a.totalFaturado)

  return {
    periodo: { inicio, fim },
    resumo: {
      faturamento:    Number(aggs._sum.valor ?? 0),
      qtdPagamentos:  aggs._count.id,
      ticketMedio:    Number(aggs._avg.valor ?? 0),
      totalAbatido:   Number(descontos._sum.desconto ?? 0),
      qtdAbatimentos: descontos._count.id,
    },
    anterior: {
      faturamento:   Number(anteriorAgg._sum.valor ?? 0),
      qtdPagamentos: anteriorAgg._count.id,
    },
    evolucao,
    metodos: metodosPie.map((m) => ({
      metodo: metodosMap.find((mm) => mm.id === m.metodoId)?.nome ?? '?',
      qtd:   m._count.id,
      total: Number(m._sum.valor ?? 0),
    })),
    horarios,
    porFuncionario: porFuncionarioResult,
  }
}

// ─── produtos ──────────────────────────────────────────────────────────────────

export async function produtos(
  tenantId: string,
  params: { dataInicio?: string; dataFim?: string; garcomId?: string; categoriaId?: string },
) {
  const { inicio, fim } = periodoDefault(params.dataInicio, params.dataFim)
  const range = dateRange(inicio, fim)

  const pedidoWhere: any = { tenantId, createdAt: range }
  if (params.garcomId) pedidoWhere.garcomId = params.garcomId

  const pedidosIds = (
    await prisma.pedido.findMany({ where: pedidoWhere, select: { id: true } })
  ).map((p) => p.id)

  const itemWhere: any = { tenantId, pedidoId: { in: pedidosIds } }
  if (params.categoriaId) {
    const prods = await prisma.produto.findMany({
      where: { tenantId, categoriaId: params.categoriaId },
      select: { id: true },
    })
    itemWhere.produtoId = { in: prods.map((p) => p.id) }
  }

  const itens = await prisma.pedidoItem.findMany({
    where: itemWhere,
    include: {
      produto: { include: { categoria: { select: { nome: true } } } },
    },
  })

  // Agrega por produto
  const ranking = Object.values(
    itens.reduce((acc: any, item) => {
      const id = item.produtoId
      if (!acc[id]) {
        acc[id] = {
          id,
          nome: item.produto.nome,
          categoria: item.produto.categoria?.nome ?? 'Sem categoria',
          qtdVendida: 0,
          totalGerado: 0,
        }
      }
      acc[id].qtdVendida  += item.quantidade
      acc[id].totalGerado += Number(item.precoTotal)
      return acc
    }, {}),
  )
    .map((r: any) => ({ ...r, totalGerado: Number(r.totalGerado.toFixed(2)) }))
    .sort((a: any, b: any) => b.qtdVendida - a.qtdVendida)

  // Por categoria
  const porCategoria = Object.values(
    itens.reduce((acc: any, item) => {
      const cat = item.produto.categoria?.nome ?? 'Sem categoria'
      if (!acc[cat]) acc[cat] = { categoria: cat, qtdVendida: 0, totalGerado: 0, qtdProdutos: new Set() }
      acc[cat].qtdVendida  += item.quantidade
      acc[cat].totalGerado += Number(item.precoTotal)
      acc[cat].qtdProdutos.add(item.produtoId)
      return acc
    }, {}),
  ).map((c: any) => ({
    categoria: c.categoria,
    qtdVendida: c.qtdVendida,
    totalGerado: Number(c.totalGerado.toFixed(2)),
    qtdProdutos: c.qtdProdutos.size,
  }))

  // Produtos sem venda no período
  const vendidosIds = new Set(itens.map((i) => i.produtoId))
  const semVenda = await prisma.produto.findMany({
    where: {
      tenantId,
      ativo: true,
      id: { notIn: Array.from(vendidosIds) },
      ...(params.categoriaId ? { categoriaId: params.categoriaId } : {}),
    },
    select: {
      id: true, nome: true,
      categoria: { select: { nome: true } },
    },
    orderBy: { nome: 'asc' },
  })

  return {
    periodo: { inicio, fim },
    ranking,
    porCategoria,
    semVenda: semVenda.map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria?.nome ?? 'Sem categoria',
    })),
  }
}

// ─── mesas ─────────────────────────────────────────────────────────────────────

export async function mesas(
  tenantId: string,
  params: { dataInicio?: string; dataFim?: string; garcomId?: string; metodoId?: string },
) {
  const { inicio, fim } = periodoDefault(params.dataInicio, params.dataFim)
  const range = dateRange(inicio, fim)

  const whereBase: any = { tenantId, status: 'confirmado', createdAt: range }
  if (params.metodoId) whereBase.metodoId = params.metodoId
  if (params.garcomId) {
    const pedidos = await prisma.pedido.findMany({
      where: { tenantId, garcomId: params.garcomId },
      select: { id: true },
    })
    whereBase.pedidoId = { in: pedidos.map((p) => p.id) }
  }

  const pagamentos = await prisma.pagamento.findMany({
    where: whereBase,
    include: { mesa: { select: { id: true, nomeMesa: true, numero: true } } },
  })

  // Agrega por mesa
  const byMesa = pagamentos.reduce((acc: any, p) => {
    const mesaId = p.mesaId ?? 'sem_mesa'
    if (!acc[mesaId]) {
      acc[mesaId] = {
        id: mesaId,
        nomeMesa: p.mesa?.nomeMesa ?? `Mesa ${p.mesa?.numero ?? '?'}`,
        qtdPagamentos: 0, totalFaturado: 0, ticketMedio: 0, ultimoPagamento: null,
      }
    }
    acc[mesaId].qtdPagamentos++
    acc[mesaId].totalFaturado += Number(p.valor)
    acc[mesaId].ultimoPagamento = p.createdAt
    return acc
  }, {})

  const ranking = Object.values(byMesa)
    .map((m: any) => ({
      ...m,
      totalFaturado: Number(m.totalFaturado.toFixed(2)),
      ticketMedio: m.qtdPagamentos > 0
        ? Number((m.totalFaturado / m.qtdPagamentos).toFixed(2))
        : 0,
    }))
    .sort((a: any, b: any) => b.totalFaturado - a.totalFaturado)

  const resumo = {
    mesasAtendidas:   Object.keys(byMesa).filter((k) => k !== 'sem_mesa').length,
    faturamentoTotal: Number(pagamentos.reduce((s, p) => s + Number(p.valor), 0).toFixed(2)),
    ticketMedioGeral: pagamentos.length > 0
      ? Number((pagamentos.reduce((s, p) => s + Number(p.valor), 0) / pagamentos.length).toFixed(2))
      : 0,
  }

  // Descontos (abatimentos) no período
  const descontosMesas = await prisma.pedido.findMany({
    where: { tenantId, createdAt: range, desconto: { gt: 0 } },
    select: {
      desconto: true,
      mesa: { select: { nomeMesa: true, numero: true } },
    },
  })

  const abatimentos = descontosMesas.map((p) => ({
    nomeMesa:    p.mesa?.nomeMesa ?? `Mesa ${p.mesa?.numero ?? '?'}`,
    qtdAbatimentos: 1,
    totalAbatido: Number(p.desconto),
  }))

  return { periodo: { inicio, fim }, resumo, ranking, abatimentos }
}

// ─── caixa ─────────────────────────────────────────────────────────────────────

export async function caixa(
  tenantId: string,
  params: { dataInicio?: string; dataFim?: string; funcionarioId?: string },
) {
  const { inicio, fim } = periodoDefault(params.dataInicio, params.dataFim)
  const start = new Date(inicio + 'T00:00:00Z')
  const end   = new Date(fim   + 'T23:59:59Z')

  const caixaWhere: any = {
    tenantId,
    OR: [
      { dataAbertura: { gte: start, lte: end } },
      { fechadoEm:    { gte: start, lte: end } },
    ],
  }
  if (params.funcionarioId) caixaWhere.funcionarioId = params.funcionarioId

  const caixas = await prisma.caixa.findMany({
    where: caixaWhere,
    orderBy: { dataAbertura: 'desc' },
    include: {
      funcionario: { select: { nome: true } },
    },
  })

  const historico = caixas.map((c) => ({
    id:             c.id,
    valorInicial:   Number(c.valorInicial),
    valorFechamento: c.valorFechamento ? Number(c.valorFechamento) : null,
    status:         c.status,
    dataAbertura:   c.dataAbertura,
    fechadoEm:      c.fechadoEm,
    operador:       c.funcionario.nome,
    diferenca:      c.diferenca ? Number(c.diferenca) : null,
  }))

  const caixaIds = caixas.map((c) => c.id)

  const movWhere: any = {
    tenantId,
    caixaId: { in: caixaIds },
    createdAt: { gte: start, lte: end },
  }

  const movs = await prisma.movimentoCaixa.findMany({
    where: movWhere,
    orderBy: { createdAt: 'desc' },
    include: {
      usuario: { select: { nome: true } },
      caixa:   { select: { id: true } },
    },
  })

  const movimentos = movs.map((m) => ({
    tipo:      m.tipo,
    valor:     Number(m.valor),
    descricao: m.descricao,
    createdAt: m.createdAt,
    caixaId:   m.caixa.id,
    operador:  m.usuario.nome,
  }))

  const totaisPorTipo = movs.reduce((acc: any, m) => {
    if (!acc[m.tipo]) acc[m.tipo] = { tipo: m.tipo, qtd: 0, total: 0 }
    acc[m.tipo].qtd++
    acc[m.tipo].total += Number(m.valor)
    return acc
  }, {})

  const resumo = {
    qtdCaixas:      caixas.length,
    totalInicial:   Number(caixas.reduce((s, c) => s + Number(c.valorInicial), 0).toFixed(2)),
    totalFechamento: Number(
      caixas.filter((c) => c.valorFechamento).reduce((s, c) => s + Number(c.valorFechamento), 0).toFixed(2)
    ),
  }

  return { periodo: { inicio, fim }, resumo, historico, movimentos, totaisPorTipo: Object.values(totaisPorTipo) }
}

// ─── auditoria ─────────────────────────────────────────────────────────────────

export async function auditoria(
  tenantId: string,
  params: { acao?: string; dataInicio?: string; dataFim?: string; limite?: number },
) {
  const limite = Math.min(Number(params.limite) || 200, 1000)
  const where: any = { tenantId }

  if (params.acao) where.acao = params.acao
  if (params.dataInicio || params.dataFim) {
    const { inicio, fim } = periodoDefault(params.dataInicio, params.dataFim)
    where.createdAt = dateRange(inicio, fim)
  }

  const registros = await prisma.auditoria.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limite,
    include: { usuario: { select: { nome: true } } },
  })

  return registros.map((r) => ({
    id:         r.id,
    acao:       r.acao,
    entidade:   r.entidade,
    entidadeId: r.entidadeId,
    detalhes:   r.detalhes,
    createdAt:  r.createdAt,
    usuario:    r.usuario?.nome ?? null,
  }))
}
