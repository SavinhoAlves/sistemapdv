import { getTenantSlug } from '~/composables/useTenantSlug'

const ROTAS_LIVRES = ['/ativacao', '/login', '/m', '/platform']
const CACHE_TTL = 60 * 1000

export default defineNuxtRouteMiddleware(async (to) => {
  if (ROTAS_LIVRES.some(r => to.path.startsWith(r))) return
  if (!process.client) return

  const config = useRuntimeConfig()

  if (localStorage.getItem('suporte_token') || localStorage.getItem('suporte_pending_token')) return

  const cache = useState<{ valido: boolean | null; ts: number }>(
    'licenca_cache',
    () => ({ valido: null, ts: 0 })
  )

  const agora = Date.now()
  if (cache.value.valido !== null && agora - cache.value.ts < CACHE_TTL) {
    if (!cache.value.valido) return navigateTo('/ativacao')
    return
  }

  const slug = getTenantSlug()

  try {
    const res = await $fetch<any>(
      `${config.public.apiUrl}/api/sistema/status-licenca`,
      { query: { slug } }
    )
    cache.value = { valido: !!(res.ativo && !res.expirado && !res.semLicenca), ts: agora }
    if (!cache.value.valido) return navigateTo('/ativacao')
  } catch {
    // Backend indisponível — deixa passar para não travar o sistema
  }
})
