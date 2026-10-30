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
  slug: string
  cargo: string
  perfilId: string | null
  permissoes: Record<string, boolean>
  suporte?: boolean
  /** Sessão do QR no celular da própria pessoa (não é terminal compartilhado) */
  pessoal?: boolean
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

// ── Código do QR de acesso pelo celular ─────────────────────────────────────
// O QR levava o token de acesso inteiro (nome, restaurante, permissões): um link
// de 500–900 caracteres, QR de ~90×90 quadradinhos que a câmera mal lê na tela.
// Agora leva só quem é e até quando, assinado: "q1.<id+validade>.<assinatura>",
// ~50 caracteres. POST /auth/mobile confere e entrega o token de acesso completo
// (com as permissões de agora). Três partes separadas por ponto, como um JWT:
// o leitor do app (lib/app.ts tokenDoQr) aceita os dois.
const QR_CHAVE = crypto.createHmac('sha256', ACCESS_SECRET).update('codigo-qr-celular-v1').digest()
const assinaturaQr = (corpo: string) => crypto.createHmac('sha256', QR_CHAVE).update(corpo).digest().subarray(0, 16).toString('base64url')

export function assinarCodigoQr(usuarioId: string): string {
  const id = Buffer.from(usuarioId.replace(/-/g, ''), 'hex')
  if (id.length !== 16) throw new Error('Usuário inválido para o QR')
  const validade = Buffer.alloc(4)
  validade.writeUInt32BE(Math.floor(Date.now() / 1000) + parseTtlSeconds(RAW_TTL))
  const corpo = Buffer.concat([id, validade]).toString('base64url')
  return `q1.${corpo}.${assinaturaQr(corpo)}`
}

/** Usuário do código do QR, ou null se a assinatura não confere ou venceu. */
export function lerCodigoQr(codigo: string): { usuarioId: string } | null {
  const [versao, corpo, assinatura] = String(codigo).split('.')
  if (versao !== 'q1' || !corpo || !assinatura) return null
  const esperada = Buffer.from(assinaturaQr(corpo))
  const recebida = Buffer.from(assinatura)
  if (esperada.length !== recebida.length || !crypto.timingSafeEqual(esperada, recebida)) return null
  const bytes = Buffer.from(corpo, 'base64url')
  if (bytes.length !== 20 || bytes.readUInt32BE(16) < Date.now() / 1000) return null
  const h = bytes.subarray(0, 16).toString('hex')
  return { usuarioId: `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` }
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

// ── Operador identificado pelo cartão RFID ──────────────────────────────────
// Vale 2 minutos e só para o restaurante do cartão (tid). Chave derivada: um
// token de operador nunca serve como sessão, e vice-versa.
const OPERADOR_SECRET = crypto.createHmac('sha256', ACCESS_SECRET).update('operador-rfid').digest('hex')

export interface OperadorJwtPayload {
  tipo: 'operador'; sub: string; tid: string; nome: string; cargo: string
  perfilId: string | null; permissoes: Record<string, boolean>
  /** Liberado no celular (PIN ou Face ID/digital do próprio usuário logado) */
  cel?: boolean
}

/**
 * Celular é pessoal: a liberação por PIN/biometria vale 5 minutos e é renovada a
 * cada uso (POST /auth/rfid-identify com `renovar`). O cartão segue com 2 minutos.
 */
export const OPERADOR_CELULAR_S = 5 * 60
export const OPERADOR_CARTAO_S = 2 * 60

export function signOperadorToken(p: Omit<OperadorJwtPayload, 'tipo' | 'cel'>, opcoes: { celular?: boolean } = {}): string {
  const payload: OperadorJwtPayload = { tipo: 'operador', ...p, ...(opcoes.celular ? { cel: true } : {}) }
  return jwt.sign(payload, OPERADOR_SECRET, { expiresIn: opcoes.celular ? OPERADOR_CELULAR_S : OPERADOR_CARTAO_S })
}

export function verifyOperadorToken(token: string): OperadorJwtPayload | null {
  try {
    const p = jwt.verify(token, OPERADOR_SECRET) as any
    return p?.tipo === 'operador' && typeof p.sub === 'string' && typeof p.tid === 'string' ? p : null
  } catch { return null }
}

// ── Cliente do cardápio online ──────────────────────────────────────────────
// Chave derivada (HMAC da chave de acesso + rótulo): um token de cliente nunca
// é aceito como token da equipe, e vice-versa. Vale 30 dias; a conta é de um
// restaurante só (tid).
const CLIENTE_SECRET = crypto.createHmac('sha256', ACCESS_SECRET).update('cliente-cardapio').digest('hex')

export interface ClienteJwtPayload { tipo: 'cliente'; sub: string; tid: string }

export function signClienteToken(clienteId: string, tenantId: string): string {
  return jwt.sign({ tipo: 'cliente', sub: clienteId, tid: tenantId } satisfies ClienteJwtPayload, CLIENTE_SECRET, { expiresIn: '30d' })
}

export function verifyClienteToken(token: string): ClienteJwtPayload | null {
  try {
    const p = jwt.verify(token, CLIENTE_SECRET) as any
    return p?.tipo === 'cliente' && typeof p.sub === 'string' && typeof p.tid === 'string' ? p : null
  } catch { return null }
}
