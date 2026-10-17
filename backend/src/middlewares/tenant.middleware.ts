import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma, semEscopoDeTenant } from '../lib/prisma'
import type { TenantJwtPayload } from '../lib/jwt'

/**
 * Situação de acesso do tenant: status do cadastro + licença mais recente.
 *
 * Antes só o status (`ativo`/`suspenso`/`cancelado`) era conferido aqui; a
 * licença vencida ou bloqueada era barrada apenas pelo middleware do frontend,
 * então qualquer chamada direta à API continuava funcionando sem pagamento.
 */
export type AcessoTenant =
  | { ok: true }
  | { ok: false; motivo: 'nao_encontrado' | 'suspenso' | 'cancelado' }
  | { ok: false; motivo: 'sem_licenca' | 'pendente' | 'bloqueado' | 'expirado'; licenca: false }

// Cache de acesso do tenant — TTL de 60s para que suspensões e vencimentos entrem
// em vigor rapidamente sem bater no banco em cada requisição
const acessoCache = new Map<string, { acesso: AcessoTenant; ts: number }>()
const CACHE_TTL_MS = 60_000

async function avaliarAcesso(tenantId: string): Promise<AcessoTenant> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  })
  if (!tenant) return { ok: false, motivo: 'nao_encontrado' }
  if (tenant.status === 'suspenso' || tenant.status === 'cancelado') {
    return { ok: false, motivo: tenant.status }
  }

  // Mesma regra de GET /api/sistema/status-licenca, que decide a tela no frontend
  const licenca = await prisma.licenca.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { status: true, dataVencimento: true },
  })
  if (!licenca) return { ok: false, motivo: 'sem_licenca', licenca: false }
  if (licenca.status !== 'ativado') return { ok: false, motivo: licenca.status, licenca: false }
  if (licenca.dataVencimento && licenca.dataVencimento < new Date()) {
    return { ok: false, motivo: 'expirado', licenca: false }
  }
  return { ok: true }
}

/** Acesso do tenant com cache. Seguro fora de requisição (socket, jobs). */
export async function verificarAcessoTenant(tenantId: string): Promise<AcessoTenant> {
  const now   = Date.now()
  const entry = acessoCache.get(tenantId)
  if (entry && now - entry.ts < CACHE_TTL_MS) return entry.acesso

  const acesso = await semEscopoDeTenant(() => avaliarAcesso(tenantId))
  acessoCache.set(tenantId, { acesso, ts: now })
  return acesso
}

/** Invalida o cache de um tenant (chamar após mudar status ou licença) */
export function invalidateTenantCache(tenantId: string) {
  acessoCache.delete(tenantId)
}

const MENSAGENS: Record<string, string> = {
  suspenso:    'Acesso suspenso. Entre em contato com o suporte.',
  cancelado:   'Acesso suspenso. Entre em contato com o suporte.',
  sem_licenca: 'Licença não encontrada. Entre em contato com o suporte.',
  pendente:    'Licença pendente de ativação. Entre em contato com o suporte.',
  bloqueado:   'Licença bloqueada. Regularize o pagamento ou fale com o suporte.',
  expirado:    'Licença expirada. Regularize o pagamento ou fale com o suporte.',
}

// Garante que a requisição tem um tenant autenticado, ativo e com licença válida.
// Rotas com `config: { semLicenca: true }` (ex.: suporte) aceitam licença vencida,
// mas nunca tenant suspenso/cancelado.
export async function requireTenant(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.auth || request.auth.type !== 'tenant') {
    return reply.status(401).send({ error: 'Autenticação de tenant necessária' })
  }
  if (!request.tenantId) {
    return reply.status(401).send({ error: 'Tenant não identificado' })
  }

  const acesso = await verificarAcessoTenant(request.tenantId)
  if (acesso.ok) return

  if (acesso.motivo === 'nao_encontrado') {
    return reply.status(401).send({ error: 'Tenant não encontrado' })
  }

  if ('licenca' in acesso) {
    // Acesso de suporte da plataforma entra mesmo com licença vencida, para ajudar o cliente
    if ((request.auth as TenantJwtPayload).suporte) return
    if ((request.routeOptions?.config as any)?.semLicenca) return
    return reply.status(403).send({ error: MENSAGENS[acesso.motivo], licenca: false, motivo: acesso.motivo })
  }

  return reply.status(403).send({ error: MENSAGENS[acesso.motivo], motivo: acesso.motivo })
}

// Garante que a requisição é de um usuário da plataforma
export async function requirePlatform(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.auth || request.auth.type !== 'platform') {
    return reply.status(404).send({ error: 'Not found' })
  }
}
