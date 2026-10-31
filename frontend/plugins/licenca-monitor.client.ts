import { getTenantSlug } from '~/composables/useTenantSlug'
import { ehPainel } from '~/lib/hosts'

const ROTAS_LIVRES = ['/acesso', '/ativacao', '/login', '/m', '/platform', '/cardapio', '/pedido', '/assinar', '/confirmar-email']
const POLL_MS = 30_000

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const router = useRouter()
  const cache  = useState<{ valido: boolean | null; ts: number }>(
    'licenca_cache',
    () => ({ valido: null, ts: 0 })
  )
  const aviso = useState<unknown>('licenca_aviso', () => null)

  setInterval(async () => {
    if (ehPainel() || ROTAS_LIVRES.some(r => router.currentRoute.value.path.startsWith(r))) return

    try {
      const res = await $fetch<any>(
        `${config.public.apiUrl}/api/sistema/status-licenca`,
        { query: { slug: getTenantSlug() } }
      )
      const valido = !!(res.ativo && !res.expirado && !res.semLicenca)
      cache.value = { valido, ts: Date.now() }
      aviso.value = res.aviso ?? null
      if (!valido) navigateTo('/ativacao')
    } catch {
      // ignore transient errors — só age em resposta confirmada do backend
    }
  }, POLL_MS)
})
