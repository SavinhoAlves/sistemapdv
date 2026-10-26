import type { TenantJwtPayload, PlatformJwtPayload } from '../lib/jwt'

declare module 'fastify' {
  interface FastifyRequest {
    auth: TenantJwtPayload | PlatformJwtPayload | null
    tenantId: string | null
    /** A requisição vale em nome do dono do cartão RFID (cabeçalho X-Operador) */
    operadorRfid?: boolean
  }

  interface FastifyContextConfig {
    public?: boolean
    /** requireTenant aceita licença vencida/bloqueada (nunca tenant suspenso) */
    semLicenca?: boolean
  }
}
