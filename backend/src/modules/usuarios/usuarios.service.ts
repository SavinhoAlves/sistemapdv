import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import os from 'os'
import { signAccessToken } from '../../lib/jwt'
import type { TenantJwtPayload } from '../../lib/jwt'
import { getPermissoes } from '../auth/auth.service'
import { motivoSemAcessoPeloQr } from '../configuracoes/configuracoes.service'

const SALT_ROUNDS = 10

/** Nome de usuário: minúsculo, começa com letra (para não confundir com o código), único na plataforma. */
export const LOGIN_REGEX = /^[a-z][a-z0-9._-]{2,29}$/

function normalizarLogin(login?: string | null) {
  return login?.trim().toLowerCase() || null
}

function hashPin(pin: string): string {
  // PINs são curtos — armazenamos como bcrypt também por segurança
  return bcrypt.hashSync(pin, SALT_ROUNDS)
}

export async function listar(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { codigo: true } })
  const usuarios = await prisma.usuario.findMany({
    where: { tenantId },
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      codigo: true,
      login: true,
      nome: true,
      email: true,
      cargo: true,
      cartaoRfid: true,
      pin: true, // só vira temPin abaixo; o hash nunca sai
      ...CAMPOS_PESSOAIS,
      perfilId: true,
      ativo: true,
      ultimoLogin: true,
      createdAt: true,
      perfil: { select: { id: true, nome: true } },
    },
  })
  // Código digitado no login: restaurante-usuário (ex.: 1001-3)
  return usuarios.map(({ pin, ...u }) => ({ ...u, temPin: Boolean(pin), codigoAcesso: `${tenant?.codigo}-${u.codigo}` }))
}

/** Dados pessoais do funcionário: null apaga, ausente não mexe */
export interface DadosPessoais {
  cpf?: string | null
  telefone?: string | null
  nascimento?: Date | null
  cep?: string | null
  endereco?: string | null
  cidade?: string | null
  uf?: string | null
}
export const CAMPOS_PESSOAIS = { cpf: true, telefone: true, nascimento: true, cep: true, endereco: true, cidade: true, uf: true } as const

interface CriarUsuarioData extends DadosPessoais {
  nome: string
  login?: string
  email?: string
  senha?: string
  cartaoRfid?: string
  cargo: string
  pin?: string | null
  perfilId?: string
  ativo?: boolean
}

function pessoais(data: DadosPessoais) {
  const r: DadosPessoais = {}
  for (const k of Object.keys(CAMPOS_PESSOAIS) as (keyof DadosPessoais)[]) if (data[k] !== undefined) (r as any)[k] = data[k]
  return r
}

export async function criar(tenantId: string, data: CriarUsuarioData) {
  const senhaHash = data.senha ? await bcrypt.hash(data.senha, SALT_ROUNDS) : null
  const pinHash = data.pin ? hashPin(data.pin) : null

  const usuario = await prisma.usuario.create({
    data: {
      tenantId,
      nome: data.nome.trim(),
      login: normalizarLogin(data.login),
      email: data.email || null,
      senhaHash,
      cartaoRfid: data.cartaoRfid || null,
      cargo: data.cargo as any,
      pin: pinHash,
      perfilId: data.perfilId || null,
      ativo: data.ativo ?? true,
      ...pessoais(data),
    },
    select: {
      id: true,
      codigo: true,
      login: true,
      nome: true,
      email: true,
      cargo: true,
      cartaoRfid: true,
      perfilId: true,
      ativo: true,
      createdAt: true,
    },
  })
  return usuario
}

interface AtualizarUsuarioData extends DadosPessoais {
  nome?: string
  login?: string | null
  email?: string
  senha?: string
  cartaoRfid?: string | null
  cargo?: string
  pin?: string | null
  perfilId?: string | null
  ativo?: boolean
}

export async function atualizar(tenantId: string, id: string, data: AtualizarUsuarioData) {
  const senhaHash = data.senha ? await bcrypt.hash(data.senha, SALT_ROUNDS) : undefined
  const pinHash = data.pin ? hashPin(data.pin) : data.pin === null ? null : undefined

  const usuario = await prisma.usuario.update({
    where: { id, tenantId },
    data: {
      ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
      ...(data.login !== undefined ? { login: normalizarLogin(data.login) } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(senhaHash !== undefined ? { senhaHash } : {}),
      ...(data.cartaoRfid !== undefined ? { cartaoRfid: data.cartaoRfid } : {}),
      ...(data.cargo !== undefined ? { cargo: data.cargo as any } : {}),
      ...(pinHash !== undefined ? { pin: pinHash } : {}),
      ...(data.perfilId !== undefined ? { perfilId: data.perfilId } : {}),
      ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      ...pessoais(data),
    },
    select: {
      id: true,
      codigo: true,
      login: true,
      nome: true,
      email: true,
      cargo: true,
      cartaoRfid: true,
      perfilId: true,
      ativo: true,
      updatedAt: true,
    },
  })
  return usuario
}

export async function toggleAtivo(tenantId: string, id: string, ativo: boolean) {
  return prisma.usuario.update({
    where: { id, tenantId },
    data: { ativo },
    select: { id: true, nome: true, ativo: true },
  })
}

export async function gerarMobileToken(tenantId: string, id: string) {
  const usuario = await prisma.usuario.findFirst({
    where: { id, tenantId },
    include: { perfil: { select: { permissoes: true } } },
  })
  if (!usuario) throw Object.assign(new Error('Usuário não encontrado'), { status: 404 })
  if (!usuario.ativo) throw Object.assign(new Error('Funcionário desativado'), { status: 409 })

  // Sem isso o QR seria recusado no celular: plano, chave em Configurações → Acesso
  // e caixa aberto (entregador: delivery no plano)
  const motivo = await motivoSemAcessoPeloQr(tenantId, usuario.cargo)
  if (motivo) throw Object.assign(new Error(motivo), { status: 409 })

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } })

  const payload: TenantJwtPayload = {
    type: 'tenant',
    sub: usuario.id,
    nome: usuario.nome,
    tenantId,
    slug: tenant?.slug ?? '',
    cargo: usuario.cargo,
    perfilId: usuario.perfilId,
    permissoes: await getPermissoes(usuario.cargo, usuario.perfilId, tenantId),
    pessoal: true,
  }

  // Token com validade de 10h para uso mobile
  const token = signAccessToken(payload)

  // Calcula IPs locais para o frontend montar a URL
  const networkInterfaces = os.networkInterfaces()
  const ips: string[] = []
  for (const iface of Object.values(networkInterfaces)) {
    if (!iface) continue
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address)
      }
    }
  }

  return { token, ips }
}
