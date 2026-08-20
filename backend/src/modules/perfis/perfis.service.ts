import { prisma } from '../../lib/prisma'

export async function listar(tenantId: string) {
  const perfis = await prisma.perfil.findMany({
    where: { tenantId },
    orderBy: { nome: 'asc' },
    include: {
      _count: { select: { usuarios: true } },
    },
  })
  return perfis.map((p) => ({
    ...p,
    totalUsuarios: p._count.usuarios,
    _count: undefined,
  }))
}

interface PerfilData {
  nome: string
  descricao?: string
  permissoes?: Record<string, boolean>
}

export async function criar(tenantId: string, data: PerfilData) {
  return prisma.perfil.create({
    data: {
      tenantId,
      nome: data.nome.trim(),
      descricao: data.descricao || null,
      permissoes: data.permissoes ?? {},
    },
  })
}

export async function atualizar(tenantId: string, id: string, data: PerfilData) {
  return prisma.perfil.update({
    where: { id, tenantId },
    data: {
      ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
      ...(data.descricao !== undefined ? { descricao: data.descricao } : {}),
      ...(data.permissoes !== undefined ? { permissoes: data.permissoes } : {}),
    },
  })
}

const PERFIS_PADRAO: Array<{ nome: string; descricao: string; permissoes: Record<string, boolean> }> = [
  {
    nome: 'Garçom',
    descricao: 'Atendimento de mesas',
    permissoes: {
      adicionarPedido: true,
      abrirMesa: true,
      verCozinha: true,
    },
  },
  {
    nome: 'Caixa',
    descricao: 'Operação de caixa e pagamentos',
    permissoes: {
      adicionarPedido: true,
      cancelarItemPedido: true,
      abrirMesa: true,
      fecharMesa: true,
      gerenciarCaixa: true,
      verCozinha: true,
      verRelatorios: true,
      aplicarDesconto: true,
    },
  },
  {
    nome: 'Vendedor',
    descricao: 'Vendas e atendimento',
    permissoes: {
      adicionarPedido: true,
      abrirMesa: true,
      fecharMesa: true,
      gerenciarCaixa: true,
    },
  },
  {
    nome: 'Cozinha',
    descricao: 'Visualização e atualização de pedidos na cozinha',
    permissoes: {
      verCozinha: true,
    },
  },
]

export async function seed(tenantId: string) {
  const results = []
  for (const perfil of PERFIS_PADRAO) {
    const result = await prisma.perfil.upsert({
      where: { tenantId_nome: { tenantId, nome: perfil.nome } },
      update: {
        descricao: perfil.descricao,
        permissoes: perfil.permissoes,
      },
      create: {
        tenantId,
        nome: perfil.nome,
        descricao: perfil.descricao,
        permissoes: perfil.permissoes,
      },
    })
    results.push(result)
  }
  return results
}
