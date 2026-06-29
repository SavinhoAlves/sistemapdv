const ROTAS_LIVRES = ['/login', '/ativacao']

// Cache simples: só reverifica a cada 5 minutos
let cacheValido: boolean | null = null
let cacheTs = 0
const CACHE_TTL = 5 * 60 * 1000

export default defineNuxtRouteMiddleware(async (to) => {
  if (ROTAS_LIVRES.some(r => to.path.startsWith(r))) return
  if (!process.client) return

  const agora = Date.now()
  if (cacheValido !== null && agora - cacheTs < CACHE_TTL) {
    if (!cacheValido) return navigateTo('/ativacao')
    return
  }

  const config = useRuntimeConfig()
  try {
    const res = await $fetch<any>(`${config.public.apiUrl}/api/sistema/status-licenca`)
    cacheValido = !!(res.ativo && !res.expirado && !res.semLicenca)
    cacheTs = agora
    if (!cacheValido) return navigateTo('/ativacao')
  } catch {
    // Backend indisponível — deixa passar para não travar o sistema
  }
})
