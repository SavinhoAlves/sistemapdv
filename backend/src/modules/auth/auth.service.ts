import bcrypt from 'bcryptjs'
import { marcarPinRecente } from './biometria.service'
import { prisma } from '../../lib/prisma'
import { contratoAtual } from '../platform/assinatura'
import { padroesFuncoes } from '../perfis/perfis.service'
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
  // Padrão da função com os ajustes que o restaurante fez em Cargos e permissões
  const padrao = (await padroesFuncoes(tenantId))[cargo] ?? {}
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

/**
 * Assinatura pelo site ainda sem pagamento: contrato sem nenhum período pago
 * (sem vencimento, sem teste) e nenhuma mensalidade registrada. Restaurante
 * criado pela Central sempre nasce com vencimento, então não cai aqui.
 */
async function aguardandoPrimeiroPagamento(tenantId: string) {
  const c = await contratoAtual(prisma, tenantId)
  if (!c || c.isento || c.proximoVencimento || c.testeAte) return false
  return (await prisma.pagamentoMensalidade.count({ where: { tenantId } })) === 0
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
  if (await aguardandoPrimeiroPagamento(tenant.id)) {
    throw new Error('O pagamento da assinatura ainda não foi confirmado. Assim que for, o acesso é liberado.')
  }

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

/**
 * PIN no lugar do cartão, no celular (sem leitor). Confere o PIN de quem está
 * logado — não identifica outra pessoa — e devolve o mesmo que o cartão.
 * Cinco erros seguidos travam o PIN daquele usuário por 5 minutos.
 */
const PIN_MAX_ERROS = 5
const PIN_BLOQUEIO_MS = 5 * 60_000
const errosPin = new Map<string, { erros: number; ate: number }>()

export async function identificarPin(usuarioId: string, pin: string, tenantId: string) {
  const agora = Date.now()
  const reg = errosPin.get(usuarioId)
  if (reg && reg.ate > agora) {
    const min = Math.ceil((reg.ate - agora) / 60_000)
    throw Object.assign(new Error(`PIN bloqueado por erros seguidos. Tente de novo em ${min} min`), { status: 429 })
  }

  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId, tenantId, ativo: true },
    select: { id: true, nome: true, cargo: true, perfilId: true, pin: true },
  })
  if (!usuario) return null
  if (!usuario.pin) {
    throw Object.assign(new Error('Você ainda não tem PIN. Peça ao administrador para cadastrar em Admin › Funcionários'), { status: 409 })
  }

  if (!/^\d{4,6}$/.test(pin) || !(await bcrypt.compare(pin, usuario.pin))) {
    // Bloqueio vencido zera a contagem
    const erros = (reg && reg.ate === 0 ? reg.erros : 0) + 1
    errosPin.set(usuarioId, { erros, ate: erros >= PIN_MAX_ERROS ? agora + PIN_BLOQUEIO_MS : 0 })
    const resta = PIN_MAX_ERROS - erros
    throw Object.assign(new Error(resta > 0 ? `PIN incorreto. ${resta} ${resta === 1 ? 'tentativa' : 'tentativas'} antes de bloquear` : 'PIN bloqueado por 5 min'), { status: resta > 0 ? 400 : 429 })
  }

  errosPin.delete(usuarioId)
  // PIN certo agora: pode ativar o Face ID / digital neste celular
  marcarPinRecente(usuarioId)
  const { pin: _pin, ...dados } = usuario
  const permissoes = await getPermissoes(usuario.cargo, usuario.perfilId, tenantId)
  return { ...dados, permissoes }
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
