import bcrypt from 'bcryptjs'
import { prisma, comTenant, semEscopoDeTenant } from '../../lib/prisma'
import { signClienteToken } from '../../lib/jwt'

/**
 * Conta do cliente no cardápio online: celular + senha, de um restaurante só.
 * Guarda nome, celular e endereços para o próximo pedido e mostra os pedidos
 * anteriores. Apagar a conta remove os endereços; os pedidos ficam para o
 * restaurante, sem o vínculo com a conta.
 */
const erro = (status: number, mensagem: string) => Object.assign(new Error(mensagem), { status })
const MAX_ENDERECOS = 10
// Hash fixo para comparar quando o celular não existe: a resposta demora o mesmo
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe', 10)

export async function tenantDoSlug(slug: string) {
  const t = await semEscopoDeTenant(async () => prisma.tenant.findUnique({
    where: { slug: slug.trim().toLowerCase() }, select: { id: true, deliveryDisponivel: true },
  }))
  if (!t || !t.deliveryDisponivel) throw erro(404, 'Cardápio não encontrado')
  return t
}

const soDigitos = (t: string) => t.replace(/\D/g, '')
const publico = (c: { id: string; nome: string; telefone: string }) => ({ id: c.id, nome: c.nome, telefone: c.telefone })

export async function cadastrar(slug: string, d: { nome: string; telefone: string; senha: string }) {
  const t = await tenantDoSlug(slug)
  const telefone = soDigitos(d.telefone)
  return comTenant(t.id, async () => {
    const existe = await prisma.cliente.findFirst({ where: { tenantId: t.id, telefone }, select: { id: true } })
    if (existe) throw erro(409, 'Já existe uma conta com este celular. Entre com a sua senha.')
    const c = await prisma.cliente.create({
      data: { tenantId: t.id, nome: d.nome.trim().slice(0, 80), telefone, senhaHash: await bcrypt.hash(d.senha, 10), ultimoLogin: new Date() },
    })
    return { token: signClienteToken(c.id, t.id), cliente: publico(c) }
  })
}

export async function entrar(slug: string, d: { telefone: string; senha: string }) {
  const t = await tenantDoSlug(slug)
  const telefone = soDigitos(d.telefone)
  return comTenant(t.id, async () => {
    const c = await prisma.cliente.findFirst({ where: { tenantId: t.id, telefone } })
    const ok = await bcrypt.compare(d.senha, c?.senhaHash ?? HASH_FALSO)
    if (!c || !ok) throw erro(401, 'Celular ou senha incorretos')
    await prisma.cliente.update({ where: { id: c.id }, data: { ultimoLogin: new Date() } })
    return { token: signClienteToken(c.id, t.id), cliente: publico(c) }
  })
}

async function buscar(tenantId: string, clienteId: string) {
  const c = await prisma.cliente.findFirst({ where: { tenantId, id: clienteId } })
  if (!c) throw erro(401, 'Sessão encerrada. Entre de novo.')
  return c
}

export async function perfil(tenantId: string, clienteId: string) {
  return comTenant(tenantId, async () => {
    const c = await buscar(tenantId, clienteId)
    const [enderecos, pedidos] = await Promise.all([
      prisma.clienteEndereco.findMany({ where: { tenantId, clienteId }, orderBy: { createdAt: 'desc' } }),
      prisma.pedidoOnline.findMany({
        where: { tenantId, clienteId }, orderBy: { createdAt: 'desc' }, take: 10,
        select: { codigo: true, status: true, total: true, createdAt: true, itens: true },
      }),
    ])
    return {
      cliente: publico(c),
      enderecos: enderecos.map(({ tenantId: _t, clienteId: _c, ...e }) => e),
      pedidos: pedidos.map((p) => ({
        codigo: p.codigo, status: p.status, total: Number(p.total), criadoEm: p.createdAt,
        resumo: (p.itens as any[]).map((i) => `${i.quantidade}× ${i.nome}`).join(', '),
      })),
    }
  })
}

export async function atualizarNome(tenantId: string, clienteId: string, nome: string) {
  return comTenant(tenantId, async () => {
    await buscar(tenantId, clienteId)
    const c = await prisma.cliente.update({ where: { id: clienteId }, data: { nome: nome.trim().slice(0, 80) } })
    return publico(c)
  })
}

export interface DadosEndereco { apelido?: string | null; endereco: string; numero: string; bairro: string; complemento?: string | null; referencia?: string | null }

export async function salvarEndereco(tenantId: string, clienteId: string, d: DadosEndereco) {
  return comTenant(tenantId, async () => {
    await buscar(tenantId, clienteId)
    const iguais = { endereco: d.endereco.trim(), numero: d.numero.trim(), bairro: d.bairro.trim() }
    // O mesmo endereço não vira duas linhas: atualiza complemento/referência
    const existente = await prisma.clienteEndereco.findFirst({ where: { tenantId, clienteId, ...iguais } })
    const extras = {
      apelido: d.apelido?.trim().slice(0, 30) || null,
      complemento: d.complemento?.trim().slice(0, 80) || null,
      referencia: d.referencia?.trim().slice(0, 140) || null,
    }
    if (existente) return prisma.clienteEndereco.update({ where: { id: existente.id }, data: extras })
    const total = await prisma.clienteEndereco.count({ where: { tenantId, clienteId } })
    if (total >= MAX_ENDERECOS) throw erro(409, `Você já tem ${MAX_ENDERECOS} endereços. Apague um para salvar outro.`)
    return prisma.clienteEndereco.create({ data: { tenantId, clienteId, ...iguais, ...extras } })
  })
}

export async function removerEndereco(tenantId: string, clienteId: string, id: string) {
  return comTenant(tenantId, async () => {
    await prisma.clienteEndereco.deleteMany({ where: { tenantId, clienteId, id } })
    return { ok: true }
  })
}

/** LGPD: apaga a conta e os endereços (pede a senha). Os pedidos ficam, sem o vínculo. */
export async function apagarConta(tenantId: string, clienteId: string, senha: string) {
  return comTenant(tenantId, async () => {
    const c = await buscar(tenantId, clienteId)
    if (!(await bcrypt.compare(senha, c.senhaHash))) throw erro(401, 'Senha incorreta')
    await prisma.$transaction([
      prisma.clienteEndereco.deleteMany({ where: { tenantId, clienteId } }),
      prisma.pedidoOnline.updateMany({ where: { tenantId, clienteId }, data: { clienteId: null } }),
      prisma.cliente.delete({ where: { id: clienteId } }),
    ])
    return { ok: true }
  })
}
