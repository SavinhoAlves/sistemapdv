import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'

// Cache de status do tenant — TTL de 60s para que suspensões entrem em vigor rapidamente
// sem bater no banco em cada requisição
const tenantStatusCache = new Map<string, { status: string; ts: number }>()
const CACHE_TTL_MS = 60_000

async function getTenantStatus(tenantId: string): Promise<string | null> {
  const now   = Date.now()
  const entry = tenantStatusCache.get(tenantId)
  if (entry && now - entry.ts < CACHE_TTL_MS) return entry.status

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  })
  if (!tenant) return null

  tenantStatusCache.set(tenantId, { status: tenant.status, ts: now })
  return tenant.status
}

/** Invalida o cache de um tenant (chamar após mudar o status) */
export function invalidateTenantCache(tenantId: string) {
  tenantStatusCache.delete(tenantId)
}

// Garante que a requisição tem um tenant autenticado e ativo
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

  const status = await getTenantStatus(request.tenantId)
  if (!status) {
    return reply.status(401).send({ error: 'Tenant não encontrado' })
  }
  if (status !== 'ativo') {
    return reply.status(403).send({ error: 'Acesso suspenso. Entre em contato com o suporte.' })
  }
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
