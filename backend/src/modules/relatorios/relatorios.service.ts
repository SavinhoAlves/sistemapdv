import { prisma } from '../../lib/prisma'
import { hojeLocal, intervaloDias, partesLocais, somarDias } from '../../lib/fuso'

/**
 * Filtros comuns a todos os relatórios. Cada relatório usa os que fazem
 * sentido para ele e ignora o resto (a tela só oferece os aplicáveis).
 *
 * Período: dias inteiros no fuso de Brasília. Antes o intervalo era montado
 * em UTC, e uma venda às 22h caía no dia seguinte.
 */
export interface Filtros {
  dataInicio?: string
  dataFim?: string
  funcionarioId?: string   // garçom que lançou o pedido / operador do caixa
  metodoId?: string
  categoriaId?: string
  produtoId?: string
  origem?: 'mesa' | 'balcao' // mesa = comanda de mesa; balcao = venda direta
  status?: string
}

function periodo(f: Filtros) {
  const hoje = hojeLocal()
  const inicio = f.dataInicio || hoje
  const fim = f.dataFim || inicio
  return { inicio, fim, range: intervaloDias(inicio, fim) }
}

const dinheiro = (v: number) => Number(v.toFixed(2))
const filtroOrigem = (origem?: Filtros['origem']) =>
  origem === 'mesa' ? { mesaId: { not: null } } : origem === 'balcao' ? { mesaId: null } : {}
const nomeLocal = (mesa: { nomeMesa: string | null; numero: number } | null, numeroPedido?: number) =>
  mesa ? (mesa.nomeMesa ?? `Mesa ${mesa.numero}`) : `Balcão${numeroPedido ? ` #${numeroPedido}` : ''}`

/** Pedidos do garçom (para filtrar pagamentos/itens por quem atendeu). */
async function pedidosDoFuncionario(tenantId: string, funcionarioId: string, range?: { gte: Date; lt: Date }) {
  const pedidos = await prisma.pedido.findMany({
    where: { tenantId, garcomId: funcionarioId, ...(range ? { createdAt: range } : {}) },
    select: { id: true },
  })
  return pedidos.map((p) => p.id)
}

// ─── filtros ────────────────────────────────────────────────────────────────────

export async function filtros(tenantId: string) {
  const [funcionarios, metodos, categorias, produtos] = await Promise.all([
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
    prisma.produto.findMany({
      where: { tenantId },
      select: { id: true, nome: true, categoriaId: true },
      orderBy: { nome: 'asc' },
    }),
  ])
  return { funcionarios, metodos, categorias, produtos }
}

// ─── visão geral ────────────────────────────────────────────────────────────────

export async function visaoGeral(tenantId: string, f: Filtros) {
  const { inicio, fim, range } = periodo(f)

  const where: any = { tenantId, status: 'confirmado', createdAt: range, ...filtroOrigem(f.origem) }
  if (f.metodoId) where.metodoId = f.metodoId
  if (f.funcionarioId) where.pedidoId = { in: await pedidosDoFuncionario(tenantId, f.funcionarioId, range) }

  const [pagamentos, descontos, porMetodo, usuarios] = await Promise.all([
    prisma.pagamento.findMany({ where, select: { valor: true, createdAt: true, pedidoId: true } }),

    // Desconto é a tabela Abatimento: cada linha com motivo e autor
    prisma.abatimento.aggregate({
      where: {
        tenantId, cancelado: false, createdAt: range,
        pedido: { ...(f.funcionarioId ? { garcomId: f.funcionarioId } : {}), ...filtroOrigem(f.origem) },
      },
      _sum: { valor: true },
      _count: { id: true },
    }),

    prisma.pagamento.groupBy({ by: ['metodoId'], where, _count: { id: true }, _sum: { valor: true } }),

    prisma.usuario.findMany({
      where: { tenantId, ...(f.funcionarioId ? { id: f.funcionarioId } : {}) },
      select: {
        id: true, nome: true, cargo: true,
        pedidos: {
          where: { tenantId, createdAt: range, ...filtroOrigem(f.origem) },
          select: {
            id: true,
            pagamentos: {
              where: { status: 'confirmado', ...(f.metodoId ? { metodoId: f.metodoId } : {}) },
              select: { valor: true },
            },
          },
        },
      },
    }),
  ])

  const faturamento = pagamentos.reduce((s, p) => s + Number(p.valor), 0)
  const qtdPedidos = new Set(pagamentos.map((p) => p.pedidoId)).size

  // Por dia e por hora no fuso local
  const byDay = new Map<string, { dia: string; total: number; qtd: number }>()
  const byHour = Array.from({ length: 24 }, (_, hora) => ({ hora, total: 0, qtd: 0 }))
  for (const p of pagamentos) {
    const { dia, hora } = partesLocais(p.createdAt)
    const d = byDay.get(dia) ?? { dia, total: 0, qtd: 0 }
    d.total += Number(p.valor); d.qtd++
    byDay.set(dia, d)
    byHour[hora].total += Number(p.valor); byHour[hora].qtd++
  }
  // Dias sem venda também aparecem (0), para a evolução não pular datas
  const evolucao: { dia: string; total: number; qtd: number }[] = []
  for (let d = inicio; d <= fim && evolucao.length < 400; d = somarDias(d, 1)) {
    const x = byDay.get(d) ?? { dia: d, total: 0, qtd: 0 }
    evolucao.push({ ...x, total: dinheiro(x.total) })
  }

  const nomes = await prisma.metodoPagamento.findMany({
    where: { tenantId, id: { in: porMetodo.map((m) => m.metodoId) } },
    select: { id: true, nome: true },
  })

  // Período anterior de mesmo tamanho, com os mesmos filtros
  const dias = evolucao.length
  const antFim = somarDias(inicio, -1)
  const antIni = somarDias(antFim, -(dias - 1))
  const whereAnt = { ...where, createdAt: intervaloDias(antIni, antFim) }
  if (f.funcionarioId) whereAnt.pedidoId = { in: await pedidosDoFuncionario(tenantId, f.funcionarioId, whereAnt.createdAt) }
  const anteriorAgg = await prisma.pagamento.aggregate({ where: whereAnt, _sum: { valor: true }, _count: { id: true } })

  const porFuncionario = usuarios
    .filter((u) => u.pedidos.length > 0)
    .map((u) => {
      const pags = u.pedidos.flatMap((p) => p.pagamentos)
      const total = pags.reduce((s, p) => s + Number(p.valor), 0)
      return {
        id: u.id, nome: u.nome, cargo: u.cargo,
        qtdPedidos: u.pedidos.length,
        qtdPagamentos: pags.length,
        totalFaturado: dinheiro(total),
        ticketMedio: pags.length ? dinheiro(total / pags.length) : 0,
      }
    })
    .sort((a, b) => b.totalFaturado - a.totalFaturado)

  return {
    periodo: { inicio, fim },
    resumo: {
      faturamento:    dinheiro(faturamento),
      qtdPagamentos:  pagamentos.length,
      qtdPedidos,
      ticketMedio:    pagamentos.length ? dinheiro(faturamento / pagamentos.length) : 0,
      totalAbatido:   Number(descontos._sum.valor ?? 0),
      qtdAbatimentos: descontos._count.id,
    },
    anterior: {
      inicio: antIni, fim: antFim,
      faturamento:   Number(anteriorAgg._sum.valor ?? 0),
      qtdPagamentos: anteriorAgg._count.id,
    },
    evolucao,
    horarios: byHour.map((h) => ({ ...h, total: dinheiro(h.total) })),
    metodos: porMetodo
      .map((m) => ({
        metodoId: m.metodoId,
        metodo: nomes.find((n) => n.id === m.metodoId)?.nome ?? '?',
        qtd:   m._count.id,
        total: Number(m._sum.valor ?? 0),
      }))
      .sort((a, b) => b.total - a.total),
    porFuncionario,
  }
}

// ─── vendas (lista) ─────────────────────────────────────────────────────────────

export async function vendas(tenantId: string, f: Filtros) {
  const { inicio, fim, range } = periodo(f)
  const where: any = { tenantId, createdAt: range, ...filtroOrigem(f.origem) }
  where.status = f.status === 'estornado' ? 'estornado' : f.status === 'todos' ? { in: ['confirmado', 'estornado'] } : 'confirmado'
  if (f.metodoId) where.metodoId = f.metodoId
  if (f.funcionarioId) where.pedido = { garcomId: f.funcionarioId }

  const LIMITE = 1000
  const linhas = await prisma.pagamento.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: LIMITE + 1,
    select: {
      id: true, valor: true, troco: true, status: true, createdAt: true, motivoEstorno: true,
      metodo: { select: { nome: true } },
      usuario: { select: { nome: true } },
      mesa: { select: { nomeMesa: true, numero: true } },
      pedido: { select: { numero: true, garcom: { select: { nome: true } } } },
    },
  })

  const lista = linhas.slice(0, LIMITE).map((p) => ({
    id: p.id,
    em: p.createdAt,
    pedido: p.pedido.numero,
    local: nomeLocal(p.mesa),
    origem: p.mesa ? 'mesa' : 'balcao',
    garcom: p.pedido.garcom.nome,
    operador: p.usuario.nome,
    metodo: p.metodo.nome,
    valor: Number(p.valor),
    troco: Number(p.troco),
    status: p.status,
    motivoEstorno: p.motivoEstorno,
  }))
  const confirmadas = lista.filter((v) => v.status === 'confirmado')

  return {
    periodo: { inicio, fim },
    resumo: {
      qtd: confirmadas.length,
      total: dinheiro(confirmadas.reduce((s, v) => s + v.valor, 0)),
      qtdEstornos: lista.length - confirmadas.length,
      totalEstornado: dinheiro(lista.filter((v) => v.status === 'estornado').reduce((s, v) => s + v.valor, 0)),
    },
    truncado: linhas.length > LIMITE,
    vendas: lista,
  }
}

// ─── produtos ──────────────────────────────────────────────────────────────────

export async function produtos(tenantId: string, f: Filtros) {
  const { inicio, fim, range } = periodo(f)

  const itens = await prisma.pedidoItem.findMany({
    where: {
      tenantId,
      status: { not: 'cancelado' },
      pedido: {
        createdAt: range,
        status: { not: 'cancelado' },
        ...(f.funcionarioId ? { garcomId: f.funcionarioId } : {}),
        ...filtroOrigem(f.origem),
      },
      ...(f.categoriaId ? { produto: { categoriaId: f.categoriaId } } : {}),
      ...(f.produtoId ? { produtoId: f.produtoId } : {}),
    },
    select: {
      produtoId: true, quantidade: true, precoTotal: true,
      produto: { select: { nome: true, categoria: { select: { nome: true } } } },
    },
  })

  const porProduto = new Map<string, { id: string; nome: string; categoria: string; qtdVendida: number; totalGerado: number }>()
  const porCat = new Map<string, { categoria: string; qtdVendida: number; totalGerado: number; produtos: Set<string> }>()
  for (const i of itens) {
    const cat = i.produto.categoria?.nome ?? 'Sem categoria'
    const p = porProduto.get(i.produtoId) ?? { id: i.produtoId, nome: i.produto.nome, categoria: cat, qtdVendida: 0, totalGerado: 0 }
    p.qtdVendida += i.quantidade; p.totalGerado += Number(i.precoTotal)
    porProduto.set(i.produtoId, p)
    const c = porCat.get(cat) ?? { categoria: cat, qtdVendida: 0, totalGerado: 0, produtos: new Set() }
    c.qtdVendida += i.quantidade; c.totalGerado += Number(i.precoTotal); c.produtos.add(i.produtoId)
    porCat.set(cat, c)
  }

  const semVenda = await prisma.produto.findMany({
    where: {
      tenantId, ativo: true,
      id: { notIn: [...porProduto.keys()] },
      ...(f.categoriaId ? { categoriaId: f.categoriaId } : {}),
      ...(f.produtoId ? { id: f.produtoId } : {}),
    },
    select: { id: true, nome: true, categoria: { select: { nome: true } } },
    orderBy: { nome: 'asc' },
  })

  return {
    periodo: { inicio, fim },
    ranking: [...porProduto.values()]
      .map((r) => ({ ...r, totalGerado: dinheiro(r.totalGerado) }))
      .sort((a, b) => b.qtdVendida - a.qtdVendida),
    porCategoria: [...porCat.values()]
      .map((c) => ({ categoria: c.categoria, qtdVendida: c.qtdVendida, totalGerado: dinheiro(c.totalGerado), qtdProdutos: c.produtos.size }))
      .sort((a, b) => b.totalGerado - a.totalGerado),
    semVenda: semVenda.map((p) => ({ id: p.id, nome: p.nome, categoria: p.categoria?.nome ?? 'Sem categoria' })),
  }
}

// ─── mesas ─────────────────────────────────────────────────────────────────────

export async function mesas(tenantId: string, f: Filtros) {
  const { inicio, fim, range } = periodo(f)

  const where: any = { tenantId, status: 'confirmado', createdAt: range, mesaId: { not: null } }
  if (f.metodoId) where.metodoId = f.metodoId
  if (f.funcionarioId) where.pedido = { garcomId: f.funcionarioId }

  const [pagamentos, comandas] = await Promise.all([
    prisma.pagamento.findMany({
      where,
      select: { valor: true, createdAt: true, mesaId: true, mesa: { select: { nomeMesa: true, numero: true } } },
    }),
    // Tempo de permanência: comandas de mesa fechadas no período
    prisma.pedido.findMany({
      where: {
        tenantId, mesaId: { not: null }, fechadoEm: range, status: 'fechado',
        ...(f.funcionarioId ? { garcomId: f.funcionarioId } : {}),
      },
      select: { createdAt: true, fechadoEm: true },
    }),
  ])

  const byMesa = new Map<string, { id: string; nomeMesa: string; qtdPagamentos: number; totalFaturado: number; ultimoPagamento: Date | null }>()
  for (const p of pagamentos) {
    const m = byMesa.get(p.mesaId!) ?? { id: p.mesaId!, nomeMesa: nomeLocal(p.mesa), qtdPagamentos: 0, totalFaturado: 0, ultimoPagamento: null }
    m.qtdPagamentos++; m.totalFaturado += Number(p.valor)
    if (!m.ultimoPagamento || p.createdAt > m.ultimoPagamento) m.ultimoPagamento = p.createdAt
    byMesa.set(p.mesaId!, m)
  }

  const total = pagamentos.reduce((s, p) => s + Number(p.valor), 0)
  const minutos = comandas
    .filter((c) => c.fechadoEm)
    .map((c) => (c.fechadoEm!.getTime() - c.createdAt.getTime()) / 60000)

  return {
    periodo: { inicio, fim },
    resumo: {
      mesasAtendidas:   byMesa.size,
      comandasFechadas: comandas.length,
      faturamentoTotal: dinheiro(total),
      ticketMedioGeral: pagamentos.length ? dinheiro(total / pagamentos.length) : 0,
      permanenciaMedia: minutos.length ? Math.round(minutos.reduce((a, b) => a + b, 0) / minutos.length) : null,
    },
    ranking: [...byMesa.values()]
      .map((m) => ({ ...m, totalFaturado: dinheiro(m.totalFaturado), ticketMedio: dinheiro(m.totalFaturado / m.qtdPagamentos) }))
      .sort((a, b) => b.totalFaturado - a.totalFaturado),
  }
}

// ─── descontos, cancelamentos e estornos ───────────────────────────────────────

export async function descontos(tenantId: string, f: Filtros) {
  const { inicio, fim, range } = periodo(f)
  const doFuncionario = f.funcionarioId ? { pedido: { garcomId: f.funcionarioId } } : {}

  const [abatimentos, itensCancelados, estornos] = await Promise.all([
    prisma.abatimento.findMany({
      where: { tenantId, cancelado: false, createdAt: range, ...doFuncionario },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, valor: true, tipo: true, percentual: true, motivo: true, createdAt: true,
        usuario: { select: { nome: true } },
        pedido: { select: { numero: true, mesa: { select: { nomeMesa: true, numero: true } } } },
      },
    }),
    prisma.pedidoItem.findMany({
      where: {
        tenantId, status: 'cancelado', updatedAt: range, ...doFuncionario,
        ...(f.categoriaId ? { produto: { categoriaId: f.categoriaId } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, quantidade: true, precoTotal: true, motivoCancelamento: true, updatedAt: true, canceladoPorId: true,
        produto: { select: { nome: true } },
        pedido: { select: { numero: true, mesa: { select: { nomeMesa: true, numero: true } } } },
      },
    }),
    prisma.pagamento.findMany({
      where: { tenantId, status: 'estornado', estornadoEm: range, ...doFuncionario },
      orderBy: { estornadoEm: 'desc' },
      select: {
        id: true, valor: true, motivoEstorno: true, estornadoEm: true,
        metodo: { select: { nome: true } },
        estornadoPor: { select: { nome: true } },
        pedido: { select: { numero: true } },
        mesa: { select: { nomeMesa: true, numero: true } },
      },
    }),
  ])

  // Nome de quem cancelou o item (só o id fica na linha)
  const ids = [...new Set(itensCancelados.map((i) => i.canceladoPorId).filter(Boolean))] as string[]
  const quem = ids.length
    ? await prisma.usuario.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, nome: true } })
    : []
  const nomeDe = (id: string | null) => quem.find((u) => u.id === id)?.nome ?? '—'

  const linhasAbat = abatimentos.map((a) => ({
    id: a.id, em: a.createdAt, tipo: a.tipo, valor: Number(a.valor),
    percentual: a.percentual === null ? null : Number(a.percentual),
    motivo: a.motivo, por: a.usuario.nome, local: nomeLocal(a.pedido.mesa, a.pedido.numero),
  }))
  const linhasItens = itensCancelados.map((i) => ({
    id: i.id, em: i.updatedAt, produto: i.produto.nome, quantidade: i.quantidade, valor: Number(i.precoTotal),
    motivo: i.motivoCancelamento, por: nomeDe(i.canceladoPorId), local: nomeLocal(i.pedido.mesa, i.pedido.numero),
  }))
  const linhasEstornos = estornos.map((e) => ({
    id: e.id, em: e.estornadoEm, valor: Number(e.valor), metodo: e.metodo.nome,
    motivo: e.motivoEstorno, por: e.estornadoPor?.nome ?? '—', local: nomeLocal(e.mesa, e.pedido.numero),
  }))

  const soma = (xs: { valor: number }[]) => dinheiro(xs.reduce((s, x) => s + x.valor, 0))
  return {
    periodo: { inicio, fim },
    resumo: {
      descontos:    { qtd: linhasAbat.filter((a) => a.tipo !== 'cortesia').length, total: soma(linhasAbat.filter((a) => a.tipo !== 'cortesia')) },
      cortesias:    { qtd: linhasAbat.filter((a) => a.tipo === 'cortesia').length, total: soma(linhasAbat.filter((a) => a.tipo === 'cortesia')) },
      cancelamentos: { qtd: linhasItens.length, total: soma(linhasItens) },
      estornos:     { qtd: linhasEstornos.length, total: soma(linhasEstornos) },
    },
    abatimentos: linhasAbat,
    itensCancelados: linhasItens,
    estornos: linhasEstornos,
  }
}

// ─── caixa ─────────────────────────────────────────────────────────────────────

export async function caixa(tenantId: string, f: Filtros) {
  const { inicio, fim, range } = periodo(f)

  const caixas = await prisma.caixa.findMany({
    where: {
      tenantId,
      OR: [{ dataAbertura: range }, { fechadoEm: range }],
      ...(f.funcionarioId ? { funcionarioId: f.funcionarioId } : {}),
    },
    orderBy: { dataAbertura: 'desc' },
    include: { funcionario: { select: { nome: true } } },
  })

  const movs = await prisma.movimentoCaixa.findMany({
    where: { tenantId, caixaId: { in: caixas.map((c) => c.id) }, createdAt: range, tipo: { in: ['sangria', 'suprimento'] } },
    orderBy: { createdAt: 'desc' },
    include: { usuario: { select: { nome: true } } },
  })

  const historico = caixas.map((c) => ({
    id:              c.id,
    operador:        c.funcionario.nome,
    status:          c.status,
    dataAbertura:    c.dataAbertura,
    fechadoEm:       c.fechadoEm,
    valorInicial:    Number(c.valorInicial),
    valorFechamento: c.valorFechamento === null ? null : Number(c.valorFechamento),
    valorContado:    c.valorContado === null ? null : Number(c.valorContado),
    diferenca:       c.diferenca === null ? null : Number(c.diferenca),
  }))

  const fechados = historico.filter((c) => c.diferenca !== null)
  return {
    periodo: { inicio, fim },
    resumo: {
      qtdCaixas:       caixas.length,
      totalSangrias:   dinheiro(movs.filter((m) => m.tipo === 'sangria').reduce((s, m) => s + Number(m.valor), 0)),
      totalSuprimentos: dinheiro(movs.filter((m) => m.tipo === 'suprimento').reduce((s, m) => s + Number(m.valor), 0)),
      diferencaTotal:  dinheiro(fechados.reduce((s, c) => s + (c.diferenca ?? 0), 0)),
      comDiferenca:    fechados.filter((c) => Math.abs(c.diferenca ?? 0) >= 0.01).length,
    },
    historico,
    movimentos: movs.map((m) => ({
      id: m.id, tipo: m.tipo, valor: Number(m.valor), descricao: m.descricao, em: m.createdAt, operador: m.usuario.nome,
    })),
  }
}

// ─── estoque ───────────────────────────────────────────────────────────────────

export async function estoque(tenantId: string, f: Filtros) {
  const { inicio, fim, range } = periodo(f)
  const filtroProduto = {
    ...(f.categoriaId ? { categoriaId: f.categoriaId } : {}),
    ...(f.produtoId ? { id: f.produtoId } : {}),
  }

  const [produtos, movs] = await Promise.all([
    prisma.produto.findMany({
      where: { tenantId, gerenciarEstoque: true, ativo: true, ...filtroProduto },
      select: { id: true, nome: true, preco: true, estoqueAtual: true, estoqueMinimo: true, categoria: { select: { nome: true } } },
      orderBy: { nome: 'asc' },
    }),
    prisma.movimentacaoEstoque.findMany({
      where: {
        tenantId, createdAt: range,
        ...(Object.keys(filtroProduto).length ? { produto: filtroProduto } : {}),
        ...(f.funcionarioId ? { usuarioId: f.funcionarioId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
      select: {
        id: true, tipo: true, quantidade: true, motivo: true, createdAt: true,
        produto: { select: { nome: true } },
        usuario: { select: { nome: true } },
      },
    }),
  ])

  const posicao = produtos.map((p) => {
    const atual = Number(p.estoqueAtual), minimo = Number(p.estoqueMinimo)
    return {
      id: p.id, nome: p.nome, categoria: p.categoria?.nome ?? 'Sem categoria',
      estoqueAtual: atual, estoqueMinimo: minimo,
      situacao: atual <= 0 ? 'zerado' : minimo > 0 && atual <= minimo ? 'baixo' : 'ok',
      valorEmEstoque: dinheiro(Math.max(atual, 0) * Number(p.preco)),
    }
  })

  return {
    periodo: { inicio, fim },
    resumo: {
      produtosControlados: posicao.length,
      zerados: posicao.filter((p) => p.situacao === 'zerado').length,
      baixos:  posicao.filter((p) => p.situacao === 'baixo').length,
      entradas: movs.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + Number(m.quantidade), 0),
      saidas:   movs.filter((m) => m.tipo === 'saida').reduce((s, m) => s + Number(m.quantidade), 0),
      valorEmEstoque: dinheiro(posicao.reduce((s, p) => s + p.valorEmEstoque, 0)),
    },
    posicao: posicao.sort((a, b) => ({ zerado: 0, baixo: 1, ok: 2 }[a.situacao]! - { zerado: 0, baixo: 1, ok: 2 }[b.situacao]!)),
    movimentos: movs.map((m) => ({
      id: m.id, em: m.createdAt, tipo: m.tipo, quantidade: Number(m.quantidade),
      motivo: m.motivo, produto: m.produto.nome, por: m.usuario?.nome ?? 'Sistema',
    })),
  }
}

// ─── auditoria ─────────────────────────────────────────────────────────────────

export async function auditoria(tenantId: string, f: Filtros & { acao?: string; limite?: number }) {
  const { range } = periodo(f)
  const limite = Math.min(Number(f.limite) || 300, 1000)

  const registros = await prisma.auditoria.findMany({
    where: {
      tenantId, createdAt: range,
      ...(f.acao ? { acao: f.acao } : {}),
      ...(f.funcionarioId ? { usuarioId: f.funcionarioId } : {}),
    },
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
