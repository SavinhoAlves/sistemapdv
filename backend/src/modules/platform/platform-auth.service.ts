import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from '../../lib/jwt'

export async function platformLogin(email: string, senha: string) {
  const user = await prisma.platformUser.findUnique({ where: { email } })
  if (!user || !user.ativo) throw new Error('Credenciais inválidas')

  const senhaValida = await bcrypt.compare(senha, user.senhaHash)
  if (!senhaValida) throw new Error('Credenciais inválidas')

  await prisma.platformUser.update({
    where: { id: user.id },
    data: { ultimoLogin: new Date() },
  })

  const accessToken = signAccessToken({
    type: 'platform',
    sub: user.id,
    nome: user.nome,
    role: user.role,
  })

  const refreshRaw = generateRefreshToken()
  await prisma.platformRefreshToken.create({
    data: {
      platformUserId: user.id,
      tokenHash: hashRefreshToken(refreshRaw),
      expiresAt: refreshTokenExpiry(),
    },
  })

  return {
    accessToken,
    refreshToken: refreshRaw,
    user: { id: user.id, nome: user.nome, role: user.role },
  }
}

export async function platformRefresh(refreshTokenRaw: string) {
  const tokenHash = hashRefreshToken(refreshTokenRaw)

  const stored = await prisma.platformRefreshToken.findUnique({ where: { tokenHash } })
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new Error('Refresh token inválido ou expirado')
  }

  await prisma.platformRefreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  })

  const user = await prisma.platformUser.findUnique({ where: { id: stored.platformUserId } })
  if (!user || !user.ativo) throw new Error('Usuário inativo')

  const newAccessToken = signAccessToken({
    type: 'platform',
    sub: user.id,
    nome: user.nome,
    role: user.role,
  })

  const newRefreshRaw = generateRefreshToken()
  await prisma.platformRefreshToken.create({
    data: {
      platformUserId: user.id,
      tokenHash: hashRefreshToken(newRefreshRaw),
      expiresAt: refreshTokenExpiry(),
    },
  })

  return { accessToken: newAccessToken, refreshToken: newRefreshRaw }
}

export async function platformLogout(refreshTokenRaw: string) {
  const tokenHash = hashRefreshToken(refreshTokenRaw)
  await prisma.platformRefreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  })
  const cutoff = new Date(Date.now() - 30 * 86_400_000)
  await prisma.platformRefreshToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] },
  })
}
