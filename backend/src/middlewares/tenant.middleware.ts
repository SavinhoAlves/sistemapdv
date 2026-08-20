import type { FastifyRequest, FastifyReply } from 'fastify'

// Garante que a requisição tem um tenant autenticado
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
