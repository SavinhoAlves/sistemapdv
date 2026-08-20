import { prisma } from '../../lib/prisma'
import { emitParaTenant } from '../../sockets/socket'

export async function listarMetodos(tenantId: string) {
  return prisma.metodoPagamento.findMany({
    where: { tenantId, ativo: true },
    orderBy: { nome: 'asc' },
  })
}

export async function todosMetodos(tenantId: string) {
  return prisma.metodoPagamento.findMany({
    where: { tenantId },
    orderBy: { nome: 'asc' },
  })
}

export async function criarMetodo(tenantId: string, nome: string) {
  return prisma.metodoPagamento.create({
    data: { tenantId, nome: nome.trim(), ativo: true },
  })
}

export async function toggleMetodo(tenantId: string, id: string, ativo: boolean) {
  return prisma.metodoPagamento.update({
    where: { id, tenantId },
    data: { ativo },
  })
}

interface RegistrarPagamentoInput {
  mesaId: string
  pedidoId?: string
  metodoId: string
  valorPago: number
  valorRecebido?: number
  usuarioId: string
}

export async function registrarPagamento(
  tenantId: string,
  input: RegistrarPagamentoInput,
) {
  const { mesaId, metodoId, valorPago, valorRecebido, usuarioId } = input

  return prisma.$transaction(async (tx) => {
    // 1. Verifica caixa aberto
    const caixa = await tx.caixa.findFirst({
      where: { tenantId, status: 'aberto' },
    })
    if (!caixa) throw Object.assign(new Error('Nenhum caixa aberto'), { status: 400 })

    const metodo = await tx.metodoPagamento.findFirst({ where: { id: metodoId, tenantId } })

    // 2. Busca pedido aberto da mesa
    const pedido = await tx.pedido.findFirst({
      where: {
        tenantId,
        mesaId,
        status: { in: ['aberto', 'preparando', 'pronto'] },
      },
      include: {
        pagamentos: { where: { status: 'confirmado' } },
        mesa: { select: { numero: true, nomeMesa: true } },
      },
    })
    if (!pedido) throw Object.assign(new Error('Nenhum pedido aberto nessa mesa'), { status: 404 })

    // 3. Calcula total com taxa e desconto
    const subtotal = Number(pedido.total)
    const taxaPct = Number(pedido.taxaPct)
    const desconto = Number(pedido.desconto)
    const taxa = taxaPct > 0 ? subtotal * (taxaPct / 100) : 0
    const totalComTaxa = subtotal + taxa - desconto

    const jaFoiPago = pedido.pagamentos.reduce((acc, p) => acc + Number(p.valor), 0)
    const restante = Math.max(0, totalComTaxa - jaFoiPago)

    // 4. Valida que há restante
    if (restante <= 0) throw Object.assign(new Error('Pedido já quitado'), { status: 400 })

    // 5. Aplica no máximo o restante
    const valorAplicado = Math.min(Number(valorPago), restante)
    const recebido = valorRecebido !== undefined ? Number(valorRecebido) : valorAplicado
    const troco = Math.max(0, recebido - valorAplicado)

    // 6. Cria pagamento
    const pagamento = await tx.pagamento.create({
      data: {
        tenantId,
        mesaId,
        pedidoId: pedido.id,
        metodoId,
        valor: valorAplicado,
        troco,
        caixaId: caixa.id,
        usuarioId,
        status: 'confirmado',
      },
    })

    // 7. Cria movimento de caixa
    await tx.movimentoCaixa.create({
      data: {
        tenantId,
        caixaId: caixa.id,
        tipo: 'pagamento',
        valor: valorAplicado,
        descricao: `Pagamento ${pedido.mesa?.nomeMesa || `Mesa ${pedido.mesa?.numero}`} · ${metodo?.nome || 'Pagamento'}`,
        usuarioId,
      },
    })

    const novoRestante = restante - valorAplicado
    const quitado = novoRestante <= 0

    // 8. Se quitado, fecha pedido e mesa
    if (quitado) {
      await tx.pedido.update({
        where: { id: pedido.id, tenantId },
        data: { status: 'fechado' },
      })
      await tx.mesa.update({
        where: { id: mesaId, tenantId },
        data: { status: 'fechada', dataFechamento: new Date() },
      })
    }

    const resultado = {
      pagamentoId: pagamento.id,
      quitado,
      restante: Number(novoRestante.toFixed(2)),
      valorAplicado: Number(valorAplicado.toFixed(2)),
      troco: Number(troco.toFixed(2)),
    }
    return resultado
  }).then((resultado) => {
    emitParaTenant(tenantId).pagamentoRegistrado({
      mesaId: input.mesaId,
      quitado: resultado.quitado,
      valorAplicado: resultado.valorAplicado,
    })
    return resultado
  })
}
