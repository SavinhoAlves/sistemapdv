import { usePlatformAuthStore } from '~/stores/platformAuth'

export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith('/platform')) return
  if (to.path === '/platform/login' || to.path === '/platform/login/') return
  if (!process.client) return

  const platformAuth = usePlatformAuthStore()
  platformAuth.restore()

  if (!platformAuth.isAuthenticated) {
    return navigateTo('/platform/login')
  }
})
