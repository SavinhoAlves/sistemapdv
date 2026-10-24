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
const publico = (c: any) => ({
  id: c.id, nome: c.nome, telefone: c.telefone,
  email: c.email ?? null, nascimento: c.nascimento ? c.nascimento.toISOString().slice(0, 10) : null,
  cpf: c.cpf ?? null, telefone2: c.telefone2 ?? null, contatoPreferido: c.contatoPreferido ?? 'whatsapp',
})

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
      prisma.clienteEndereco.findMany({ where: { tenantId, clienteId }, orderBy: [{ padrao: 'desc' }, { createdAt: 'desc' }] }),
      prisma.pedidoOnline.findMany({
        where: { tenantId, clienteId }, orderBy: { createdAt: 'desc' }, take: 20,
        select: { codigo: true, status: true, total: true, createdAt: true, itens: true, tipo: true, endereco: true, numero: true, bairro: true },
      }),
    ])
    return {
      cliente: publico(c),
      enderecos: enderecos.map(({ tenantId: _t, clienteId: _c, ...e }) => e),
      pedidos: pedidos.map((p) => ({
        codigo: p.codigo, status: p.status, total: Number(p.total), criadoEm: p.createdAt,
        resumo: (p.itens as any[]).map((i) => `${i.quantidade}× ${i.nome}`).join(', '),
        itens: (p.itens as any[]).map((i) => ({ nome: i.nome, quantidade: i.quantidade, preco: Number(i.preco) })),
        endereco: p.tipo === 'entrega' && p.endereco ? `${p.endereco}, ${p.numero} · ${p.bairro}` : null,
      })),
    }
  })
}

export interface DadosPerfil {
  nome: string; email?: string | null; nascimento?: string | null; cpf?: string | null
  telefone2?: string | null; contatoPreferido?: 'whatsapp' | 'ligacao' | 'email'
}

/** O celular é o login da conta e não muda aqui. */
export async function atualizarPerfil(tenantId: string, clienteId: string, d: DadosPerfil) {
  return comTenant(tenantId, async () => {
    await buscar(tenantId, clienteId)
    const c = await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        nome: d.nome.trim().slice(0, 80),
        ...(d.email !== undefined ? { email: d.email?.trim().toLowerCase() || null } : {}),
        ...(d.nascimento !== undefined ? { nascimento: d.nascimento ? new Date(d.nascimento + 'T00:00:00Z') : null } : {}),
        ...(d.cpf !== undefined ? { cpf: d.cpf ? soDigitos(d.cpf) : null } : {}),
        ...(d.telefone2 !== undefined ? { telefone2: d.telefone2 ? soDigitos(d.telefone2) : null } : {}),
        ...(d.contatoPreferido ? { contatoPreferido: d.contatoPreferido } : {}),
      },
    })
    return publico(c)
  })
}

export interface DadosEndereco {
  apelido?: string | null; endereco: string; numero: string; bairro: string; complemento?: string | null; referencia?: string | null
  cep?: string | null; cidade?: string | null; uf?: string | null; latitude?: number | null; longitude?: number | null
}

const extrasEndereco = (d: DadosEndereco) => ({
  apelido: d.apelido?.trim().slice(0, 30) || null,
  complemento: d.complemento?.trim().slice(0, 80) || null,
  referencia: d.referencia?.trim().slice(0, 140) || null,
  ...(d.cep !== undefined ? { cep: d.cep ? soDigitos(d.cep).slice(0, 8) : null } : {}),
  ...(d.cidade !== undefined ? { cidade: d.cidade?.trim().slice(0, 80) || null } : {}),
  ...(d.uf !== undefined ? { uf: d.uf?.trim().toUpperCase().slice(0, 2) || null } : {}),
  ...(d.latitude !== undefined ? { latitude: d.latitude ?? null, longitude: d.longitude ?? null } : {}),
})

export async function salvarEndereco(tenantId: string, clienteId: string, d: DadosEndereco) {
  return comTenant(tenantId, async () => {
    await buscar(tenantId, clienteId)
    const iguais = { endereco: d.endereco.trim(), numero: d.numero.trim(), bairro: d.bairro.trim() }
    // O mesmo endereço não vira duas linhas: atualiza complemento/referência
    const existente = await prisma.clienteEndereco.findFirst({ where: { tenantId, clienteId, ...iguais } })
    const extras = extrasEndereco(d)
    if (existente) return prisma.clienteEndereco.update({ where: { id: existente.id }, data: extras })
    const total = await prisma.clienteEndereco.count({ where: { tenantId, clienteId } })
    if (total >= MAX_ENDERECOS) throw erro(409, `Você já tem ${MAX_ENDERECOS} endereços. Apague um para salvar outro.`)
    // O primeiro endereço já nasce como padrão
    return prisma.clienteEndereco.create({ data: { tenantId, clienteId, ...iguais, ...extras, padrao: total === 0 } })
  })
}

export async function editarEndereco(tenantId: string, clienteId: string, id: string, d: DadosEndereco) {
  return comTenant(tenantId, async () => {
    const e = await prisma.clienteEndereco.findFirst({ where: { tenantId, clienteId, id }, select: { id: true } })
    if (!e) throw erro(404, 'Endereço não encontrado')
    return prisma.clienteEndereco.update({
      where: { id },
      data: { endereco: d.endereco.trim(), numero: d.numero.trim(), bairro: d.bairro.trim(), ...extrasEndereco(d) },
    })
  })
}

export async function definirPadrao(tenantId: string, clienteId: string, id: string) {
  return comTenant(tenantId, async () => {
    const e = await prisma.clienteEndereco.findFirst({ where: { tenantId, clienteId, id }, select: { id: true } })
    if (!e) throw erro(404, 'Endereço não encontrado')
    await prisma.$transaction([
      prisma.clienteEndereco.updateMany({ where: { tenantId, clienteId }, data: { padrao: false } }),
      prisma.clienteEndereco.update({ where: { id }, data: { padrao: true } }),
    ])
    return { ok: true }
  })
}

export async function removerEndereco(tenantId: string, clienteId: string, id: string) {
  return comTenant(tenantId, async () => {
    const e = await prisma.clienteEndereco.findFirst({ where: { tenantId, clienteId, id }, select: { padrao: true } })
    await prisma.clienteEndereco.deleteMany({ where: { tenantId, clienteId, id } })
    // Apagou o padrão: o mais recente assume
    if (e?.padrao) {
      const outro = await prisma.clienteEndereco.findFirst({ where: { tenantId, clienteId }, orderBy: { createdAt: 'desc' }, select: { id: true } })
      if (outro) await prisma.clienteEndereco.update({ where: { id: outro.id }, data: { padrao: true } })
    }
    return { ok: true }
  })
}

/** Coordenadas de um endereço salvo da conta (pedido com a localização do aparelho). */
export async function coordenadasDoEndereco(tenantId: string, clienteId: string, id: string) {
  return comTenant(tenantId, async () => {
    const e = await prisma.clienteEndereco.findFirst({ where: { tenantId, clienteId, id }, select: { latitude: true, longitude: true } })
    return e?.latitude != null && e?.longitude != null ? { lat: e.latitude, lng: e.longitude } : null
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
