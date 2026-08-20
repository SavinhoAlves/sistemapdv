import { prisma } from '../../lib/prisma'
import { emitParaTenant } from '../../sockets/socket'

interface AdicionarItemInput {
  mesaId: string
  produtoId: string
  quantidade: number
  garcomId: string
  usuarioId: string
  observacao?: string
}

export async function adicionarItem(tenantId: string, input: AdicionarItemInput) {
  const { mesaId, produtoId, quantidade, garcomId, usuarioId, observacao } = input

  return prisma.$transaction(async (tx) => {
    // 1. Busca produto
    const produto = await tx.produto.findFirst({
      where: { id: produtoId, tenantId, ativo: true },
      include: { categoria: { select: { vaiCozinha: true } } },
    })
    if (!produto) throw Object.assign(new Error('Produto não encontrado ou inativo'), { status: 404 })

    // Verifica estoque
    if (produto.gerenciarEstoque && Number(produto.estoqueAtual) < quantidade) {
      throw Object.assign(
        new Error(`Estoque insuficiente. Disponível: ${Number(produto.estoqueAtual)}`),
        { status: 400 },
      )
    }

    // 2. Busca ou cria pedido aberto da mesa
    let pedido = await tx.pedido.findFirst({
      where: { tenantId, mesaId, status: { in: ['aberto', 'preparando', 'pronto'] } },
    })
    if (!pedido) {
      pedido = await tx.pedido.create({
        data: {
          tenantId,
          mesaId,
          garcomId,
          status: 'aberto',
          total: 0,
          desconto: 0,
          taxaPct: 0,
        },
      })
    }

    const vaiCozinha = produto.categoria?.vaiCozinha ?? true

    // 3. Verifica se produto já está no pedido em status pendente/preparando
    const itemExistente = await tx.pedidoItem.findFirst({
      where: {
        tenantId,
        pedidoId: pedido.id,
        produtoId,
        status: { in: ['pendente', 'preparando'] },
      },
    })

    let item
    if (itemExistente) {
      // Incrementa quantidade
      item = await tx.pedidoItem.update({
        where: { id: itemExistente.id },
        data: {
          quantidade: { increment: quantidade },
          precoTotal: { increment: Number(produto.preco) * quantidade },
        },
      })
    } else {
      // Cria novo item
      item = await tx.pedidoItem.create({
        data: {
          tenantId,
          pedidoId: pedido.id,
          produtoId,
          quantidade,
          precoUnitario: produto.preco,
          precoTotal: Number(produto.preco) * quantidade,
          status: vaiCozinha ? 'pendente' : 'pronto',
          observacao: observacao || null,
        },
      })
    }

    // 4. Gerencia estoque
    if (produto.gerenciarEstoque) {
      await tx.produto.update({
        where: { id: produtoId, tenantId },
        data: { estoqueAtual: { decrement: quantidade } },
      })
      await tx.movimentacaoEstoque.create({
        data: {
          tenantId,
          produtoId,
          tipo: 'saida',
          quantidade,
          motivo: `Venda - Pedido ${pedido.id}`,
          usuarioId,
        },
      })
    }

    // 5. Recalcula total do pedido
    const totaisItens = await tx.pedidoItem.aggregate({
      where: { tenantId, pedidoId: pedido.id, status: { not: 'cancelado' } },
      _sum: { precoTotal: true },
    })
    const novoTotal = Number(totaisItens._sum.precoTotal ?? 0)

    await tx.pedido.update({
      where: { id: pedido.id, tenantId },
      data: { total: novoTotal },
    })

    const resultado = {
      pedidoId: pedido.id,
      itemId: item.id,
      total: novoTotal,
      notificaCozinha: vaiCozinha,
      produtoNome: produto.nome,
    }
    return resultado
  }).then((resultado) => {
    emitParaTenant(tenantId).itemAdicionado({
      mesaId: input.mesaId,
      produtoNome: resultado.produtoNome,
      quantidade: input.quantidade,
      notificaCozinha: resultado.notificaCozinha,
    })
    return resultado
  })
}

export async function decrementarItem(tenantId: string, itemId: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.pedidoItem.findFirst({ where: { id: itemId, tenantId } })
    if (!item) throw Object.assign(new Error('Item não encontrado'), { status: 404 })

    const produto = await tx.produto.findFirst({ where: { id: item.produtoId, tenantId } })

    if (item.quantidade <= 1) {
      // Deleta item
      await tx.pedidoItem.delete({ where: { id: itemId } })

      // Restaura estoque
      if (produto?.gerenciarEstoque) {
        await tx.produto.update({
          where: { id: item.produtoId, tenantId },
          data: { estoqueAtual: { increment: 1 } },
        })
        await tx.movimentacaoEstoque.create({
          data: {
            tenantId,
            produtoId: item.produtoId,
            tipo: 'entrada',
            quantidade: 1,
            motivo: 'Cancelamento de item de pedido',
            usuarioId,
          },
        })
      }
    } else {
      await tx.pedidoItem.update({
        where: { id: itemId },
        data: {
          quantidade: { decrement: 1 },
          precoTotal: { decrement: Number(item.precoUnitario) },
        },
      })

      if (produto?.gerenciarEstoque) {
        await tx.produto.update({
          where: { id: item.produtoId, tenantId },
          data: { estoqueAtual: { increment: 1 } },
        })
        await tx.movimentacaoEstoque.create({
          data: {
            tenantId,
            produtoId: item.produtoId,
            tipo: 'entrada',
            quantidade: 1,
            motivo: 'Decremento de item de pedido',
            usuarioId,
          },
        })
      }
    }

    // Recalcula total do pedido
    const totaisItens = await tx.pedidoItem.aggregate({
      where: { tenantId, pedidoId: item.pedidoId, status: { not: 'cancelado' } },
      _sum: { precoTotal: true },
    })
    const novoTotal = Number(totaisItens._sum.precoTotal ?? 0)
    await tx.pedido.update({
      where: { id: item.pedidoId, tenantId },
      data: { total: novoTotal },
    })

    return { success: true, total: novoTotal }
  })
}

export async function excluirItem(tenantId: string, itemId: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.pedidoItem.findFirst({ where: { id: itemId, tenantId } })
    if (!item) throw Object.assign(new Error('Item não encontrado'), { status: 404 })

    const produto = await tx.produto.findFirst({ where: { id: item.produtoId, tenantId } })

    await tx.pedidoItem.delete({ where: { id: itemId } })

    // Restaura estoque total do item
    if (produto?.gerenciarEstoque) {
      await tx.produto.update({
        where: { id: item.produtoId, tenantId },
        data: { estoqueAtual: { increment: item.quantidade } },
      })
      await tx.movimentacaoEstoque.create({
        data: {
          tenantId,
          produtoId: item.produtoId,
          tipo: 'entrada',
          quantidade: item.quantidade,
          motivo: 'Remoção de item de pedido',
          usuarioId,
        },
      })
    }

    // Recalcula total
    const totaisItens = await tx.pedidoItem.aggregate({
      where: { tenantId, pedidoId: item.pedidoId, status: { not: 'cancelado' } },
      _sum: { precoTotal: true },
    })
    const novoTotal = Number(totaisItens._sum.precoTotal ?? 0)
    await tx.pedido.update({
      where: { id: item.pedidoId, tenantId },
      data: { total: novoTotal },
    })

    return { success: true, total: novoTotal }
  })
}

export async function pedidoAtualDaMesa(tenantId: string, mesaId: string) {
  const pedido = await prisma.pedido.findFirst({
    where: {
      tenantId,
      mesaId,
      status: { in: ['aberto', 'preparando', 'pronto'] },
    },
    include: {
      itens: {
        where: { status: { not: 'cancelado' } },
        include: { produto: { select: { id: true, nome: true, preco: true } } },
      },
      pagamentos: {
        where: { status: 'confirmado' },
      },
    },
  })

  if (!pedido) return null

  const total = Number(pedido.total)
  const desconto = Number(pedido.desconto)
  const taxaPct = Number(pedido.taxaPct)
  const subtotal = total
  const taxa = taxaPct > 0 ? subtotal * (taxaPct / 100) : 0
  const totalComTaxa = subtotal + taxa - desconto
  const pago = pedido.pagamentos.reduce((acc, p) => acc + Number(p.valor), 0)
  const restante = Math.max(0, totalComTaxa - pago)

  return {
    ...pedido,
    total,
    desconto,
    taxaPct,
    subtotal,
    taxa: Number(taxa.toFixed(2)),
    totalComTaxa: Number(totalComTaxa.toFixed(2)),
    pago: Number(pago.toFixed(2)),
    restante: Number(restante.toFixed(2)),
    itens: pedido.itens.map((item) => ({
      ...item,
      precoUnitario: Number(item.precoUnitario),
      precoTotal: Number(item.precoTotal),
      produto: { ...item.produto, preco: Number(item.produto.preco) },
    })),
    pagamentos: pedido.pagamentos.map((p) => ({ ...p, valor: Number(p.valor), troco: Number(p.troco) })),
  }
}

export async function aplicarTaxaServico(
  tenantId: string,
  pedidoId: string,
  aplicar: boolean,
  taxaPct: number,
) {
  return prisma.pedido.update({
    where: { id: pedidoId, tenantId },
    data: { taxaPct: aplicar ? taxaPct : 0 },
  })
}

export async function aplicarDesconto(
  tenantId: string,
  pedidoId: string,
  valor: number,
  _motivo: string,
  _usuarioId: string,
) {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findFirst({ where: { id: pedidoId, tenantId } })
    if (!pedido) throw Object.assign(new Error('Pedido não encontrado'), { status: 404 })

    const total = Number(pedido.total)
    const descontoAtual = Number(pedido.desconto)
    const novoDesconto = Math.min(descontoAtual + valor, total)

    return tx.pedido.update({
      where: { id: pedidoId, tenantId },
      data: { desconto: novoDesconto },
    })
  })
}

export async function pedidosCozinha(tenantId: string) {
  const dozeHorasAtras = new Date(Date.now() - 12 * 60 * 60 * 1000)

  const itens = await prisma.pedidoItem.findMany({
    where: {
      tenantId,
      status: { in: ['pendente', 'preparando', 'pronto'] },
      createdAt: { gte: dozeHorasAtras },
    },
    include: {
      produto: {
        select: {
          nome: true,
          categoria: { select: { nome: true } },
        },
      },
      pedido: {
        select: {
          id: true,
          mesaId: true,
          mesa: { select: { numero: true, nomeMesa: true, cliente: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Agrupa por mesa — estrutura esperada pelo frontend
  const byMesa = new Map<string, {
    mesaId: string
    mesaNome: string
    cliente: string | null
    itens: object[]
  }>()

  for (const item of itens) {
    const mesa   = item.pedido?.mesa
    const mesaId = item.pedido?.mesaId ?? 'sem-mesa'
    const mesaNome = mesa?.nomeMesa || `Mesa ${mesa?.numero ?? '?'}`
    const cliente  = mesa?.cliente ?? null

    if (!byMesa.has(mesaId)) {
      byMesa.set(mesaId, { mesaId, mesaNome, cliente, itens: [] })
    }

    byMesa.get(mesaId)!.itens.push({
      id:         item.id,
      pedidoId:   item.pedidoId,
      produto:    item.produto.nome,
      categoria:  item.produto.categoria?.nome ?? null,
      quantidade: item.quantidade,
      status:     item.status,
      observacao: item.observacao,
      createdAt:  item.createdAt,
      updatedAt:  item.updatedAt,
    })
  }

  return [...byMesa.values()]
}

export async function atualizarStatusItem(tenantId: string, itemId: string, status: string) {
  const validStatuses = ['pendente', 'preparando', 'pronto', 'entregue', 'cancelado']
  if (!validStatuses.includes(status))
    throw Object.assign(new Error('Status inválido'), { status: 400 })

  const item = await prisma.pedidoItem.update({
    where: { id: itemId, tenantId },
    data: { status: status as any },
  })
  if (status === 'pronto') {
    emitParaTenant(tenantId).pedidoPronto({ itemId, status })
  }
  return item
}
