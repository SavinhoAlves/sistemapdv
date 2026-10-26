import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { PERMISSOES_CARGO } from '../../middlewares/permission.middleware'
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from '../../lib/jwt'

/**
 * Permissões efetivas: padrão da função (cargo) + ajustes do perfil
 * personalizado. Antes o token levava só o perfil — sem perfil ia vazio, e o
 * frontend escondia telas que a API (que cai no padrão do cargo) liberava.
 * Valores não booleanos do perfil (ex.: modo_venda) seguem junto.
 */
export async function getPermissoes(
  cargo: string,
  perfilId: string | null,
  tenantId: string
): Promise<Record<string, boolean>> {
  const padrao = PERMISSOES_CARGO[cargo] ?? {}
  if (!perfilId) return { ...padrao }
  const perfil = await prisma.perfil.findFirst({
    where: { id: perfilId, tenantId },
  })
  return { ...padrao, ...((perfil?.permissoes as Record<string, boolean>) ?? {}) }
}

/** Busca o restaurante pelo código numérico (1001) ou pelo slug. */
export function buscarTenant(ref: string) {
  const valor = ref.trim().toLowerCase()
  return /^\d+$/.test(valor)
    ? prisma.tenant.findUnique({ where: { codigo: Number(valor) } })
    : prisma.tenant.findUnique({ where: { slug: valor } })
}

/**
 * Usuários que correspondem ao identificador digitado no login:
 * - "1001-3": código do restaurante + código do usuário (também aceita . ou /)
 * - "joao": nome de usuário (único na plataforma)
 * - e-mail: aceito na transição; com vários restaurantes, a senha desempata
 * - "3": código do usuário só vale quando o restaurante vem junto (clientes antigos)
 */
async function buscarCandidatos(identificador: string, slug?: string) {
  const valor = identificador.trim().toLowerCase()
  const base = { ativo: true, senhaHash: { not: null } }
  const include = { tenant: true }

  const completo = valor.match(/^(\d+)\s*[-./]\s*(\d+)$/)
  if (completo) {
    return prisma.usuario.findMany({
      where: { ...base, codigo: Number(completo[2]), tenant: { codigo: Number(completo[1]) } },
      include,
    })
  }

  const tenant = slug ? await buscarTenant(slug) : null
  if (/^\d+$/.test(valor)) {
    if (!tenant) throw new Error('Use o código completo, ex.: 1001-1')
    return prisma.usuario.findMany({ where: { ...base, codigo: Number(valor), tenantId: tenant.id }, include })
  }
  if (valor.includes('@')) {
    return prisma.usuario.findMany({
      where: { ...base, email: { equals: valor, mode: 'insensitive' }, ...(tenant ? { tenantId: tenant.id } : {}) },
      include,
    })
  }
  return prisma.usuario.findMany({ where: { ...base, login: valor }, include })
}

export async function loginComSenha(identificador: string, senha: string, slug?: string) {
  const candidatos = await buscarCandidatos(identificador, slug)

  let usuario: (typeof candidatos)[number] | null = null
  for (const c of candidatos) {
    if (await bcrypt.compare(senha, c.senhaHash!)) { usuario = c; break }
  }
  if (!usuario) throw new Error('Credenciais inválidas')

  // Só revela o status do restaurante depois da senha conferida
  const tenant = usuario.tenant
  if (tenant.status !== 'ativo') throw new Error('Restaurante suspenso')

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoLogin: new Date() },
  })

  const permissoes = await getPermissoes(usuario.cargo, usuario.perfilId, tenant.id)
  const accessToken = signAccessToken({
    type: 'tenant',
    sub: usuario.id,
    nome: usuario.nome,
    tenantId: tenant.id,
    slug: tenant.slug,
    cargo: usuario.cargo,
    perfilId: usuario.perfilId,
    permissoes,
  })

  const refreshRaw = generateRefreshToken()
  await prisma.refreshToken.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: hashRefreshToken(refreshRaw),
      expiresAt: refreshTokenExpiry(),
    },
  })

  return {
    accessToken,
    refreshToken: refreshRaw,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      cargo: usuario.cargo,
      perfilId: usuario.perfilId,
      permissoes,
    },
    tenant: { codigo: tenant.codigo, slug: tenant.slug, nome: tenant.nome },
  }
}

export async function loginComRfid(cartaoRfid: string, slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant || tenant.status !== 'ativo') {
    throw new Error('Restaurante não encontrado ou suspenso')
  }

  const usuario = await prisma.usuario.findFirst({
    where: { cartaoRfid, tenantId: tenant.id, ativo: true },
  })
  if (!usuario) throw new Error('Cartão RFID não reconhecido')

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoLogin: new Date() },
  })

  const permissoes = await getPermissoes(usuario.cargo, usuario.perfilId, tenant.id)
  const accessToken = signAccessToken({
    type: 'tenant',
    sub: usuario.id,
    nome: usuario.nome,
    tenantId: tenant.id,
    slug: tenant.slug,
    cargo: usuario.cargo,
    perfilId: usuario.perfilId,
    permissoes,
  })

  const refreshRaw = generateRefreshToken()
  await prisma.refreshToken.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: hashRefreshToken(refreshRaw),
      expiresAt: refreshTokenExpiry(),
    },
  })

  return {
    accessToken,
    refreshToken: refreshRaw,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      cargo: usuario.cargo,
      perfilId: usuario.perfilId,
      permissoes,
    },
  }
}

/** Identifica o dono do cartão no restaurante da sessão, sem criar sessão nova. */
export async function identificarRfid(cartaoRfid: string, tenantId: string) {
  const usuario = await prisma.usuario.findFirst({
    where: { cartaoRfid, tenantId, ativo: true },
    select: { id: true, nome: true, cargo: true, perfilId: true },
  })
  if (!usuario) return null
  const permissoes = await getPermissoes(usuario.cargo, usuario.perfilId, tenantId)
  return { ...usuario, permissoes }
}

export async function loginComPin(pin: string, slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant || tenant.status !== 'ativo') {
    throw new Error('Restaurante não encontrado ou suspenso')
  }

  const usuarios = await prisma.usuario.findMany({
    where: { tenantId: tenant.id, ativo: true, pin: { not: null } },
  })

  let usuarioEncontrado = null
  for (const u of usuarios) {
    if (u.pin) {
      const pinValido = await bcrypt.compare(pin, u.pin)
      if (pinValido) { usuarioEncontrado = u; break }
    }
  }

  if (!usuarioEncontrado) throw new Error('PIN inválido')

  const permissoes = await getPermissoes(
    usuarioEncontrado.cargo,
    usuarioEncontrado.perfilId,
    tenant.id
  )
  const accessToken = signAccessToken({
    type: 'tenant',
    sub: usuarioEncontrado.id,
    nome: usuarioEncontrado.nome,
    tenantId: tenant.id,
    slug: tenant.slug,
    cargo: usuarioEncontrado.cargo,
    perfilId: usuarioEncontrado.perfilId,
    permissoes,
  })

  const refreshRaw = generateRefreshToken()
  await prisma.refreshToken.create({
    data: {
      usuarioId: usuarioEncontrado.id,
      tokenHash: hashRefreshToken(refreshRaw),
      expiresAt: refreshTokenExpiry(),
    },
  })

  return {
    accessToken,
    refreshToken: refreshRaw,
    usuario: {
      id: usuarioEncontrado.id,
      nome: usuarioEncontrado.nome,
      cargo: usuarioEncontrado.cargo,
      perfilId: usuarioEncontrado.perfilId,
      permissoes,
    },
  }
}

export async function refreshAccessToken(refreshTokenRaw: string) {
  const tokenHash = hashRefreshToken(refreshTokenRaw)

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new Error('Refresh token inválido ou expirado')
  }

  // Revogar token atual (rotation)
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  })

  const usuario = await prisma.usuario.findUnique({ where: { id: stored.usuarioId } })
  if (!usuario || !usuario.ativo) throw new Error('Usuário inativo')

  const tenant = await prisma.tenant.findUnique({ where: { id: usuario.tenantId } })
  if (!tenant || tenant.status !== 'ativo') throw new Error('Restaurante suspenso ou inativo')

  const permissoes = await getPermissoes(usuario.cargo, usuario.perfilId, usuario.tenantId)
  const newAccessToken = signAccessToken({
    type: 'tenant',
    sub: usuario.id,
    nome: usuario.nome,
    tenantId: usuario.tenantId,
    slug: tenant.slug,
    cargo: usuario.cargo,
    perfilId: usuario.perfilId,
    permissoes,
  })

  const newRefreshRaw = generateRefreshToken()
  await prisma.refreshToken.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: hashRefreshToken(newRefreshRaw),
      expiresAt: refreshTokenExpiry(),
    },
  })

  return { accessToken: newAccessToken, refreshToken: newRefreshRaw }
}

export async function logout(refreshTokenRaw: string) {
  const tokenHash = hashRefreshToken(refreshTokenRaw)
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  })
  // Limpa tokens expirados ou revogados há mais de 30 dias
  const cutoff = new Date(Date.now() - 30 * 86_400_000)
  await prisma.refreshToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] },
  })
}
