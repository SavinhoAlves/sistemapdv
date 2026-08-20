import { prisma } from '../../lib/prisma'
import { emitParaTenant } from '../../sockets/socket'

export async function listar(tenantId: string, cargo: string, userId: string) {
  const where: any = {
    tenantId,
    status: { in: ['aberta', 'ocupada', 'fechando'] },
    dataFechamento: null,
  }
  if (cargo === 'garcom') {
    where.garcomId = userId
  }
  const mesas = await prisma.mesa.findMany({
    where,
    orderBy: { numero: 'asc' },
    include: {
      garcom: { select: { id: true, nome: true } },
    },
  })
  return mesas
}

export async function abrir(
  tenantId: string,
  data: {
    nomeMesa?: string
    cliente?: string
    garcomId?: string
    caixaId?: string
    capacidade?: number
  },
) {
  // Calcula próximo número de mesa
  const result = await prisma.mesa.aggregate({
    where: { tenantId },
    _max: { numero: true },
  })
  const proximoNumero = (result._max.numero ?? 0) + 1

  const mesa = await prisma.mesa.create({
    data: {
      tenantId,
      numero: proximoNumero,
      nomeMesa: data.nomeMesa || null,
      cliente: data.cliente || null,
      garcomId: data.garcomId || null,
      caixaId: data.caixaId || null,
      capacidade: data.capacidade ?? 4,
      status: 'aberta',
      dataAbertura: new Date(),
    },
  })
  emitParaTenant(tenantId).novaMesa(mesa)
  return mesa
}

export async function fechar(tenantId: string, id: string) {
  const existe = await prisma.mesa.findFirst({ where: { id, tenantId } })
  if (!existe) throw Object.assign(new Error('Mesa não encontrada'), { status: 404 })

  const mesa = await prisma.mesa.update({
    where: { id, tenantId },
    data: {
      status: 'fechada',
      dataFechamento: new Date(),
    },
  })
  emitParaTenant(tenantId).mesaFechada(mesa)
  return mesa
}

export async function produtosDaMesa(tenantId: string, mesaId: string) {
  // Busca o pedido aberto da mesa
  const pedido = await prisma.pedido.findFirst({
    where: {
      tenantId,
      mesaId,
      status: { in: ['aberto', 'preparando', 'pronto'] },
    },
  })
  if (!pedido) return []

  const itens = await prisma.pedidoItem.findMany({
    where: { tenantId, pedidoId: pedido.id },
    include: {
      produto: { select: { id: true, nome: true, preco: true } },
    },
  })

  return itens.map((item) => ({
    ...item,
    precoUnitario: Number(item.precoUnitario),
    precoTotal: Number(item.precoTotal),
    produto: { ...item.produto, preco: Number(item.produto.preco) },
  }))
}
