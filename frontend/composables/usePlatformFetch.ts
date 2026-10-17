import { usePlatformAuthStore } from '~/stores/platformAuth'

export function usePlatformFetch() {
  const runtimeConfig = useRuntimeConfig()
  const platformAuth  = usePlatformAuthStore()
  const baseUrl       = computed(() => (runtimeConfig.public as any).apiUrl as string)

  async function platformFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const resp = await fetch(`${baseUrl.value}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${platformAuth.token}`,
        ...((options.headers as any) || {}),
      },
    })
    if (resp.status === 401) {
      platformAuth.logout()
      navigateTo('/platform/login')
      throw new Error('Sessão expirada')
    }
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`)
    return data as T
  }

  return { platformFetch }
}
