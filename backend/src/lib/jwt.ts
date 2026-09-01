import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const INSECURE_DEFAULTS = new Set([
  'change-me-access', 'change-me-refresh', 'change-me',
  'troque_acesso_em_producao', 'troque_refresh_em_producao',
  'troque_este_segredo_em_producao', 'secret', 'jwt_secret',
])

function validateSecret(name: string, value: string) {
  if (process.env.NODE_ENV === 'production') {
    if (INSECURE_DEFAULTS.has(value) || value.length < 32) {
      console.error(`[SEGURANÇA] ${name} é fraco ou padrão. Defina um segredo forte (≥32 chars) antes de ir para produção.`)
      process.exit(1)
    }
  }
}

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || process.env.JWT_SECRET || 'change-me-access'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh'

// Cap TTL em 8h — converte qualquer valor para segundos e limita
function parseTtlSeconds(ttl: string): number {
  const m = ttl.match(/^(\d+)(s|m|h|d)?$/)
  if (!m) return 8 * 3600
  const n = parseInt(m[1])
  const unit = m[2] ?? 's'
  const secs = unit === 'd' ? n * 86400 : unit === 'h' ? n * 3600 : unit === 'm' ? n * 60 : n
  return Math.min(secs, 8 * 3600)
}
const RAW_TTL    = process.env.JWT_EXPIRES_IN || '8h'
const ACCESS_TTL = `${parseTtlSeconds(RAW_TTL)}s`

validateSecret('JWT_ACCESS_SECRET', ACCESS_SECRET)
validateSecret('JWT_REFRESH_SECRET', REFRESH_SECRET)

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
