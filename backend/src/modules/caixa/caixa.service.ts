import { prisma } from '../../lib/prisma'
import { emitParaTenant } from '../../sockets/socket'

export async function caixaAtual(tenantId: string) {
  const caixa = await prisma.caixa.findFirst({
    where: { tenantId, status: 'aberto' },
    include: {
      funcionario: { select: { id: true, nome: true } },
    },
  })
  return { aberto: !!caixa, caixa }
}

export async function abrirCaixa(
  tenantId: string,
  data: { funcionarioId: string; valorInicial: number },
) {
  // Verifica que não tem caixa aberto
  const caixaAberto = await prisma.caixa.findFirst({
    where: { tenantId, status: 'aberto' },
  })
  if (caixaAberto) throw Object.assign(new Error('Já existe um caixa aberto'), { status: 400 })

  const caixa = await prisma.caixa.create({
    data: {
      tenantId,
      funcionarioId: data.funcionarioId,
      valorInicial: data.valorInicial,
      status: 'aberto',
      dataAbertura: new Date(),
    },
  })
  emitParaTenant(tenantId).caixaAberto({ caixaId: caixa.id })
  return caixa
}

export async function fecharCaixa(
  tenantId: string,
  data: {
    caixaId: string
    valorContado: number
    observacao?: string
    fechadoPorId: string
  },
) {
  const caixa = await prisma.caixa.findFirst({
    where: { id: data.caixaId, tenantId, status: 'aberto' },
  })
  if (!caixa) throw Object.assign(new Error('Caixa não encontrado ou já fechado'), { status: 404 })

  const resumo = await resumoCaixa(tenantId, data.caixaId)

  const diferenca = data.valorContado - resumo.esperadoDinheiro

  const caixaFechado = await prisma.caixa.update({
    where: { id: data.caixaId, tenantId },
    data: {
      status: 'fechado',
      fechadoEm: new Date(),
      valorContado: data.valorContado,
      valorFechamento: resumo.totalVendas,
      diferenca,
      observacaoFechamento: data.observacao || null,
      fechadoPorId: data.fechadoPorId,
    },
  })
  emitParaTenant(tenantId).caixaFechado({ caixaId: caixaFechado.id })
  return caixaFechado
}

export async function registrarMovimento(
  tenantId: string,
  data: { tipo: 'suprimento' | 'sangria'; valor: number; descricao?: string; usuarioId: string },
) {
  const caixa = await prisma.caixa.findFirst({
    where: { tenantId, status: 'aberto' },
  })
  if (!caixa) throw Object.assign(new Error('Nenhum caixa aberto'), { status: 400 })

  // Para sangria, valida saldo disponível
  if (data.tipo === 'sangria') {
    const resumo = await resumoCaixa(tenantId, caixa.id)
    if (data.valor > resumo.esperadoDinheiro) {
      throw Object.assign(
        new Error(`Saldo insuficiente para sangria. Disponível: ${resumo.esperadoDinheiro.toFixed(2)}`),
        { status: 400 },
      )
    }
  }

  return prisma.movimentoCaixa.create({
    data: {
      tenantId,
      caixaId: caixa.id,
      tipo: data.tipo,
      valor: data.valor,
      descricao: data.descricao || null,
      usuarioId: data.usuarioId,
    },
  })
}

export async function mesasAbertas(tenantId: string) {
  const mesas = await prisma.mesa.findMany({
    where: {
      tenantId,
      status: { in: ['aberta', 'ocupada', 'fechando'] },
      dataFechamento: null,
    },
    orderBy: { numero: 'asc' },
  })

  // Para cada mesa, busca o total do pedido aberto
  const result = await Promise.all(
    mesas.map(async (mesa) => {
      const pedido = await prisma.pedido.findFirst({
        where: {
          tenantId,
          mesaId: mesa.id,
          status: { in: ['aberto', 'preparando', 'pronto'] },
        },
        include: {
          pagamentos: { where: { status: 'confirmado' } },
        },
      })

      const total = pedido ? Number(pedido.total) : 0
      const desconto = pedido ? Number(pedido.desconto) : 0
      const taxaPct = pedido ? Number(pedido.taxaPct) : 0
      const taxa = taxaPct > 0 ? total * (taxaPct / 100) : 0
      const totalComTaxa = total + taxa - desconto
      const pago = pedido ? pedido.pagamentos.reduce((acc, p) => acc + Number(p.valor), 0) : 0
      const restante = Math.max(0, totalComTaxa - pago)

      return {
        ...mesa,
        pedidoId: pedido?.id || null,
        total: Number(totalComTaxa.toFixed(2)),
        pago: Number(pago.toFixed(2)),
        restante: Number(restante.toFixed(2)),
      }
    }),
  )

  return result
}

export async function movimentos(tenantId: string) {
  const caixa = await prisma.caixa.findFirst({
    where: { tenantId, status: 'aberto' },
  })
  if (!caixa) return { caixa: null, movimentos: [], totais: {} }

  const movs = await prisma.movimentoCaixa.findMany({
    where: { tenantId, caixaId: caixa.id },
    orderBy: { createdAt: 'desc' },
    include: { usuario: { select: { id: true, nome: true } } },
  })

  const totais = movs.reduce(
    (acc, m) => {
      const tipo = m.tipo as string
      acc[tipo] = (acc[tipo] || 0) + Number(m.valor)
      return acc
    },
    {} as Record<string, number>,
  )

  return {
    caixa,
    movimentos: movs.map((m) => ({ ...m, valor: Number(m.valor) })),
    totais,
  }
}

export async function historico(tenantId: string) {
  const caixas = await prisma.caixa.findMany({
    where: { tenantId },
    orderBy: { dataAbertura: 'desc' },
    take: 30,
    include: {
      funcionario: { select: { id: true, nome: true } },
      fechadoPor: { select: { id: true, nome: true } },
    },
  })
  return caixas.map((c) => ({
    ...c,
    valorInicial: Number(c.valorInicial),
    valorFechamento: c.valorFechamento ? Number(c.valorFechamento) : null,
    valorContado: c.valorContado ? Number(c.valorContado) : null,
    diferenca: c.diferenca ? Number(c.diferenca) : null,
  }))
}

export async function historicoDetalhe(tenantId: string, caixaId: string) {
  const caixa = await prisma.caixa.findFirst({
    where: { id: caixaId, tenantId },
    include: {
      funcionario: { select: { id: true, nome: true } },
      fechadoPor: { select: { id: true, nome: true } },
    },
  })
  if (!caixa) throw Object.assign(new Error('Caixa não encontrado'), { status: 404 })

  const movs = await prisma.movimentoCaixa.findMany({
    where: { tenantId, caixaId },
    orderBy: { createdAt: 'desc' },
    include: { usuario: { select: { id: true, nome: true } } },
  })

  const resumo = await resumoCaixa(tenantId, caixaId)

  return {
    caixa: {
      ...caixa,
      valorInicial: Number(caixa.valorInicial),
      valorFechamento: caixa.valorFechamento ? Number(caixa.valorFechamento) : null,
      valorContado: caixa.valorContado ? Number(caixa.valorContado) : null,
      diferenca: caixa.diferenca ? Number(caixa.diferenca) : null,
    },
    movimentos: movs.map((m) => ({ ...m, valor: Number(m.valor) })),
    resumo,
  }
}

export async function resumoCaixa(tenantId: string, caixaId: string) {
  const caixa = await prisma.caixa.findFirst({ where: { id: caixaId, tenantId } })
  if (!caixa) return { esperadoDinheiro: 0, totalVendas: 0, porMetodo: {} }

  const movs = await prisma.movimentoCaixa.findMany({
    where: { tenantId, caixaId },
  })

  const valorInicial = Number(caixa.valorInicial)
  let suprimentos = 0
  let sangrias = 0
  let pagamentosDinheiro = 0
  let totalVendas = 0

  for (const m of movs) {
    const v = Number(m.valor)
    if (m.tipo === 'suprimento') suprimentos += v
    if (m.tipo === 'sangria') sangrias += v
    if (m.tipo === 'pagamento') totalVendas += v
  }

  // Pagamentos em dinheiro (método com nome "Dinheiro")
  const pagamentos = await prisma.pagamento.findMany({
    where: { tenantId, caixaId },
    include: { metodo: { select: { nome: true } } },
  })

  const porMetodo: Record<string, number> = {}
  for (const p of pagamentos) {
    const nome = p.metodo.nome
    porMetodo[nome] = (porMetodo[nome] || 0) + Number(p.valor)
    if (nome.toLowerCase().includes('dinheiro')) {
      pagamentosDinheiro += Number(p.valor) - Number(p.troco)
    }
  }

  const esperadoDinheiro = valorInicial + suprimentos - sangrias + pagamentosDinheiro

  return {
    esperadoDinheiro: Number(esperadoDinheiro.toFixed(2)),
    totalVendas: Number(totalVendas.toFixed(2)),
    suprimentos: Number(suprimentos.toFixed(2)),
    sangrias: Number(sangrias.toFixed(2)),
    porMetodo,
  }
}
