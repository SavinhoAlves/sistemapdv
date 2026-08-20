import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from '../../lib/jwt'

async function getPermissoes(
  cargo: string,
  perfilId: string | null,
  tenantId: string
): Promise<Record<string, boolean>> {
  if (!perfilId) return {}
  const perfil = await prisma.perfil.findFirst({
    where: { id: perfilId, tenantId },
  })
  return (perfil?.permissoes as Record<string, boolean>) ?? {}
}

export async function loginComEmail(email: string, senha: string, slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant || tenant.status !== 'ativo') {
    throw new Error('Restaurante não encontrado ou suspenso')
  }

  const usuario = await prisma.usuario.findFirst({
    where: { email, tenantId: tenant.id, ativo: true },
  })
  if (!usuario || !usuario.senhaHash) {
    throw new Error('Credenciais inválidas')
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash)
  if (!senhaValida) throw new Error('Credenciais inválidas')

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

  const permissoes = await getPermissoes(usuario.cargo, usuario.perfilId, usuario.tenantId)
  const newAccessToken = signAccessToken({
    type: 'tenant',
    sub: usuario.id,
    nome: usuario.nome,
    tenantId: usuario.tenantId,
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
}
