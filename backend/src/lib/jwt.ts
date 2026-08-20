import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || process.env.JWT_SECRET || 'change-me-access'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh'
const ACCESS_TTL     = process.env.JWT_EXPIRES_IN || '8h'

export interface TenantJwtPayload {
  type: 'tenant'
  sub: string           // usuarioId
  nome: string
  tenantId: string
  cargo: string
  perfilId: string | null
  permissoes: Record<string, boolean>
}

export interface PlatformJwtPayload {
  type: 'platform'
  sub: string           // platformUserId
  nome: string
  role: string
}

export type JwtPayload = TenantJwtPayload | PlatformJwtPayload

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL } as any)
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex')
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function refreshTokenExpiry(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d
}
