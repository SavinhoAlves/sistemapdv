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

// Perfil padrão de cada cargo. Administrador fica de fora: tem acesso total
// pelo cargo, independente de perfil.
const PERFIL_POR_CARGO = {
  garcom: 'Garçom',
  caixa: 'Caixa',
  cozinha: 'Cozinha',
} as const

/** Atribui o perfil padrão do cargo a todo funcionário ativo sem perfil. */
export async function autoAtribuir(tenantId: string) {
  const perfis = await prisma.perfil.findMany({
    where: { tenantId, nome: { in: Object.values(PERFIL_POR_CARGO) } },
    select: { id: true, nome: true },
  })
  const idPorNome = new Map(perfis.map((p) => [p.nome, p.id]))

  let atualizados = 0
  const perfisFaltando: string[] = []

  for (const [cargo, nome] of Object.entries(PERFIL_POR_CARGO)) {
    const perfilId = idPorNome.get(nome)
    if (!perfilId) {
      perfisFaltando.push(nome)
      continue
    }
    const { count } = await prisma.usuario.updateMany({
      where: { tenantId, cargo: cargo as keyof typeof PERFIL_POR_CARGO, perfilId: null },
      data: { perfilId },
    })
    atualizados += count
  }

  return { atualizados, perfisFaltando }
}
