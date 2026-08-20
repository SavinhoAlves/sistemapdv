import { prisma } from '../../lib/prisma'

export async function listar(tenantId: string) {
  const produtos = await prisma.produto.findMany({
    where: { tenantId },
    orderBy: { nome: 'asc' },
    include: { categoria: { select: { nome: true } } },
  })
  return produtos.map((p) => ({
    ...p,
    preco: Number(p.preco),
    estoqueAtual: Number(p.estoqueAtual),
    estoqueMinimo: Number(p.estoqueMinimo),
    categoria: p.categoria?.nome ?? null,
  }))
}

export async function criar(
  tenantId: string,
  data: {
    nome: string
    descricao?: string
    preco: number
    categoriaId?: string
    imagemUrl?: string
    tempoPreparoMinutos?: number
    gerenciarEstoque?: boolean
    estoqueAtual?: number
    estoqueMinimo?: number
  },
) {
  const produto = await prisma.produto.create({
    data: {
      tenantId,
      nome: data.nome.trim(),
      descricao: data.descricao,
      preco: data.preco,
      categoriaId: data.categoriaId || null,
      imagemUrl: data.imagemUrl,
      tempoPreparoMinutos: data.tempoPreparoMinutos ?? 0,
      gerenciarEstoque: data.gerenciarEstoque ?? false,
      estoqueAtual: data.estoqueAtual ?? 0,
      estoqueMinimo: data.estoqueMinimo ?? 0,
    },
  })
  return { ...produto, preco: Number(produto.preco), estoqueAtual: Number(produto.estoqueAtual), estoqueMinimo: Number(produto.estoqueMinimo) }
}

export async function atualizar(
  tenantId: string,
  id: string,
  data: {
    nome?: string
    descricao?: string
    preco?: number
    categoriaId?: string | null
    imagemUrl?: string | null
    tempoPreparoMinutos?: number
    gerenciarEstoque?: boolean
    estoqueAtual?: number
    estoqueMinimo?: number
    ativo?: boolean
  },
  usuarioId?: string,
) {
  // Se estoqueAtual mudou, busca valor anterior e registra movimentação
  if (data.estoqueAtual !== undefined && usuarioId) {
    const atual = await prisma.produto.findFirst({ where: { id, tenantId } })
    if (atual && Number(atual.estoqueAtual) !== data.estoqueAtual) {
      const diff = data.estoqueAtual - Number(atual.estoqueAtual)
      await prisma.movimentacaoEstoque.create({
        data: {
          tenantId,
          produtoId: id,
          tipo: diff > 0 ? 'entrada' : 'saida',
          quantidade: Math.abs(diff),
          motivo: 'Ajuste manual via edição de produto',
          usuarioId,
        },
      })
    }
  }
  const produto = await prisma.produto.update({
    where: { id, tenantId },
    data: {
      ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
      ...(data.descricao !== undefined ? { descricao: data.descricao } : {}),
      ...(data.preco !== undefined ? { preco: data.preco } : {}),
      ...(data.categoriaId !== undefined ? { categoriaId: data.categoriaId } : {}),
      ...(data.imagemUrl !== undefined ? { imagemUrl: data.imagemUrl } : {}),
      ...(data.tempoPreparoMinutos !== undefined ? { tempoPreparoMinutos: data.tempoPreparoMinutos } : {}),
      ...(data.gerenciarEstoque !== undefined ? { gerenciarEstoque: data.gerenciarEstoque } : {}),
      ...(data.estoqueAtual !== undefined ? { estoqueAtual: data.estoqueAtual } : {}),
      ...(data.estoqueMinimo !== undefined ? { estoqueMinimo: data.estoqueMinimo } : {}),
      ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
    },
  })
  return { ...produto, preco: Number(produto.preco), estoqueAtual: Number(produto.estoqueAtual), estoqueMinimo: Number(produto.estoqueMinimo) }
}

export async function ajusteEstoque(
  tenantId: string,
  id: string,
  tipo: 'entrada' | 'saida',
  quantidade: number,
  motivo: string,
  usuarioId: string,
) {
  return prisma.$transaction(async (tx) => {
    const produto = await tx.produto.findFirst({ where: { id, tenantId } })
    if (!produto) throw Object.assign(new Error('Produto não encontrado'), { status: 404 })

    if (tipo === 'saida' && Number(produto.estoqueAtual) < quantidade) {
      throw Object.assign(new Error(`Estoque insuficiente. Disponível: ${Number(produto.estoqueAtual)}`), { status: 400 })
    }

    const updatedProduto = await tx.produto.update({
      where: { id, tenantId },
      data: {
        estoqueAtual: tipo === 'entrada'
          ? { increment: quantidade }
          : { decrement: quantidade },
      },
    })

    const mov = await tx.movimentacaoEstoque.create({
      data: {
        tenantId,
        produtoId: id,
        tipo,
        quantidade,
        motivo,
        usuarioId,
      },
    })

    return {
      estoqueAtual: Number(updatedProduto.estoqueAtual),
      movimentacaoId: mov.id,
    }
  })
}

export async function historicoEstoque(tenantId: string, produtoId: string) {
  const movs = await prisma.movimentacaoEstoque.findMany({
    where: { tenantId, produtoId },
    orderBy: { createdAt: 'desc' },
    include: { usuario: { select: { id: true, nome: true } } },
  })
  return movs.map((m) => ({ ...m, quantidade: Number(m.quantidade) }))
}

export async function desativar(tenantId: string, id: string) {
  const produto = await prisma.produto.findFirst({ where: { id, tenantId } })
  if (!produto) throw Object.assign(new Error('Produto não encontrado'), { status: 404 })
  return prisma.produto.update({
    where: { id, tenantId },
    data: { ativo: false },
  })
}
