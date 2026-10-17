import type { TenantJwtPayload, PlatformJwtPayload } from '../lib/jwt'

declare module 'fastify' {
  interface FastifyRequest {
    auth: TenantJwtPayload | PlatformJwtPayload | null
    tenantId: string | null
  }

  interface FastifyContextConfig {
    public?: boolean
    /** requireTenant aceita licença vencida/bloqueada (nunca tenant suspenso) */
    semLicenca?: boolean
  }
}
