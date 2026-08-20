import { prisma } from '../../lib/prisma'

export async function listar(tenantId: string) {
  return prisma.categoria.findMany({
    where: { tenantId },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, vaiCozinha: true },
  })
}

export async function criar(tenantId: string, nome: string, vaiCozinha = false) {
  return prisma.categoria.create({
    data: { tenantId, nome: nome.trim(), vaiCozinha },
  })
}

export async function atualizar(tenantId: string, id: string, nome: string) {
  return prisma.categoria.update({
    where: { id, tenantId },
    data: { nome: nome.trim() },
  })
}

export async function atualizarCozinha(tenantId: string, id: string, vaiCozinha: boolean) {
  return prisma.categoria.update({
    where: { id, tenantId },
    data: { vaiCozinha },
  })
}

export async function excluir(tenantId: string, id: string) {
  const total = await prisma.produto.count({ where: { categoriaId: id, tenantId, ativo: true } })
  if (total > 0)
    throw Object.assign(
      new Error(`Não é possível excluir: ${total} produto(s) usa(m) essa categoria`),
      { status: 400 },
    )
  return prisma.categoria.delete({ where: { id, tenantId } })
}
