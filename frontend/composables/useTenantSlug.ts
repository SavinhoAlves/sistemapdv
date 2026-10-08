import { useRuntimeConfig } from '#imports'

const SLUG_KEY = 'pdv_tenant_slug'

// Subdomínios da própria plataforma — não são slugs de restaurante
const SUBDOMINIOS_RESERVADOS = ['www', 'app', 'painel', 'dev', 'api']

/** Retorna o slug ativo da sessão atual (subdomain > localStorage > .env). */
export function getTenantSlug(): string {
  if (process.client) {
    // 1. Subdomínio (produção: restaurante-test.meupdv.com.br)
    const hostname = window.location.hostname
    const parts = hostname.split('.')
    const ehIp = /^\d+(\.\d+){3}$/.test(hostname)
    if (!ehIp && parts.length >= 3 && !SUBDOMINIOS_RESERVADOS.includes(parts[0])) return parts[0]

    // 2. Slug salvo no login desta sessão (diferente entre aba normal e anônima)
    const stored = localStorage.getItem(SLUG_KEY)
    if (stored) return stored
  }

  // 3. Fallback do .env (desenvolvimento com um único tenant)
  const config = useRuntimeConfig()
  return (config.public as any).tenantSlug as string
}

/** Persiste o slug escolhido no login. Cada perfil de navegador tem localStorage próprio. */
export function setTenantSlug(slug: string) {
  if (process.client) localStorage.setItem(SLUG_KEY, slug)
}

export function clearTenantSlug() {
  if (process.client) localStorage.removeItem(SLUG_KEY)
}
