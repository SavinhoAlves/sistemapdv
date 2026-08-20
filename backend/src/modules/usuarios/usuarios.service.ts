import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import os from 'os'
import { signAccessToken } from '../../lib/jwt'
import type { TenantJwtPayload } from '../../lib/jwt'

const SALT_ROUNDS = 10

function hashPin(pin: string): string {
  // PINs são curtos — armazenamos como bcrypt também por segurança
  return bcrypt.hashSync(pin, SALT_ROUNDS)
}

export async function listar(tenantId: string) {
  const usuarios = await prisma.usuario.findMany({
    where: { tenantId },
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      email: true,
      cargo: true,
      cartaoRfid: true,
      pin: false, // nunca expõe pin
      perfilId: true,
      ativo: true,
      ultimoLogin: true,
      createdAt: true,
      perfil: { select: { id: true, nome: true } },
    },
  })
  return usuarios
}

interface CriarUsuarioData {
  nome: string
  email?: string
  senha?: string
  cartaoRfid?: string
  cargo: string
  pin?: string
  perfilId?: string
  ativo?: boolean
}

export async function criar(tenantId: string, data: CriarUsuarioData) {
  const senhaHash = data.senha ? await bcrypt.hash(data.senha, SALT_ROUNDS) : null
  const pinHash = data.pin ? hashPin(data.pin) : null

  const usuario = await prisma.usuario.create({
    data: {
      tenantId,
      nome: data.nome.trim(),
      email: data.email || null,
      senhaHash,
      cartaoRfid: data.cartaoRfid || null,
      cargo: data.cargo as any,
      pin: pinHash,
      perfilId: data.perfilId || null,
      ativo: data.ativo ?? true,
    },
    select: {
      id: true,
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

interface AtualizarUsuarioData {
  nome?: string
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
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(senhaHash !== undefined ? { senhaHash } : {}),
      ...(data.cartaoRfid !== undefined ? { cartaoRfid: data.cartaoRfid } : {}),
      ...(data.cargo !== undefined ? { cargo: data.cargo as any } : {}),
      ...(pinHash !== undefined ? { pin: pinHash } : {}),
      ...(data.perfilId !== undefined ? { perfilId: data.perfilId } : {}),
      ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
    },
    select: {
      id: true,
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

  const payload: TenantJwtPayload = {
    type: 'tenant',
    sub: usuario.id,
    nome: usuario.nome,
    tenantId,
    cargo: usuario.cargo,
    perfilId: usuario.perfilId,
    permissoes: (usuario.perfil?.permissoes as Record<string, boolean>) ?? {},
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
