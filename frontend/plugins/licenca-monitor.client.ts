const ROTAS_LIVRES = ['/ativacao', '/login', '/m', '/platform']
const POLL_MS = 30_000

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const router = useRouter()
  const slug   = (config.public as any).tenantSlug as string
  const cache  = useState<{ valido: boolean | null; ts: number }>(
    'licenca_cache',
    () => ({ valido: null, ts: 0 })
  )

  setInterval(async () => {
    if (ROTAS_LIVRES.some(r => router.currentRoute.value.path.startsWith(r))) return

    try {
      const res = await $fetch<any>(
        `${config.public.apiUrl}/api/sistema/status-licenca`,
        { query: { slug } }
      )
      const valido = !!(res.ativo && !res.expirado && !res.semLicenca)
      cache.value = { valido, ts: Date.now() }
      if (!valido) navigateTo('/ativacao')
    } catch {
      // ignore transient errors — só age em resposta confirmada do backend
    }
  }, POLL_MS)
})
