import { prisma } from '../../lib/prisma'
import { PERMISSOES_CARGO } from '../../middlewares/permission.middleware'

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

export async function excluir(tenantId: string, id: string) {
  const perfil = await prisma.perfil.findFirst({ where: { id, tenantId } })
  if (!perfil) return false
  await prisma.$transaction([
    prisma.usuario.updateMany({ where: { tenantId, perfilId: id }, data: { perfilId: null } }),
    prisma.perfil.delete({ where: { id, tenantId } }),
  ])
  return true
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

// ── Permissões das funções (cargos) por restaurante ─────────────────────────

/** Administrador tem acesso total e não é editável: evita o restaurante se trancar para fora. */
export const FUNCOES_EDITAVEIS = ['garcom', 'caixa', 'cozinha', 'entregador'] as const
// Lista completa de chaves conhecidas: o administrador tem todas
const CHAVES = Object.keys(PERMISSOES_CARGO.administrador)

async function ajustesFuncoes(tenantId: string): Promise<Record<string, Record<string, boolean>>> {
  const cfg = await prisma.configuracoes.findUnique({ where: { tenantId }, select: { permissoesFuncoes: true } })
  return (cfg?.permissoesFuncoes as Record<string, Record<string, boolean>>) ?? {}
}

/** Padrão de cada função neste restaurante: o do sistema com os ajustes salvos por cima. */
export async function padroesFuncoes(tenantId: string) {
  const ajustes = await ajustesFuncoes(tenantId)
  const r: Record<string, Record<string, boolean>> = {}
  for (const [cargo, padrao] of Object.entries(PERMISSOES_CARGO)) {
    r[cargo] = cargo === 'administrador' ? { ...padrao } : { ...padrao, ...(ajustes[cargo] ?? {}) }
  }
  return r
}

/** Funções que o restaurante alterou (para mostrar "personalizada" e oferecer restaurar). */
export async function funcoesPersonalizadas(tenantId: string) {
  return Object.keys(await ajustesFuncoes(tenantId)).filter(c => (FUNCOES_EDITAVEIS as readonly string[]).includes(c))
}

/**
 * Salva as permissões de uma função. Guarda só chaves conhecidas e booleanas.
 * `null` volta a função ao padrão do sistema.
 */
export async function salvarFuncao(tenantId: string, cargo: string, permissoes: Record<string, unknown> | null) {
  const ajustes = await ajustesFuncoes(tenantId)
  if (permissoes === null) delete ajustes[cargo]
  else {
    const limpo: Record<string, boolean> = {}
    for (const k of CHAVES) if (typeof permissoes[k] === 'boolean') limpo[k] = permissoes[k] as boolean
    ajustes[cargo] = limpo
  }
  await prisma.configuracoes.upsert({
    where: { tenantId },
    update: { permissoesFuncoes: ajustes },
    create: { tenantId, permissoesFuncoes: ajustes },
  })
  return (await padroesFuncoes(tenantId))[cargo]
}
