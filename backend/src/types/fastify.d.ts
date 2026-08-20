import type { TenantJwtPayload, PlatformJwtPayload } from '../lib/jwt'

declare module 'fastify' {
  interface FastifyRequest {
    auth: TenantJwtPayload | PlatformJwtPayload | null
    tenantId: string | null
  }
}
