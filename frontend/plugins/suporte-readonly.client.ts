import { useAuthStore } from '~/stores/auth'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export default defineNuxtPlugin(() => {
  const auth  = useAuthStore()
  const toast = useToast()
  const orig  = globalThis.fetch

  globalThis.fetch = function (input, init) {
    if (auth.modoSuporteLeitura && MUTATING.has((init?.method ?? 'GET').toUpperCase())) {
      toast.add({
        title:       'Modo visualização',
        description: 'Alterne para o modo auxiliar para fazer alterações.',
        color:       'amber',
        icon:        'i-lucide-eye',
        duration:    3000,
      })
      return Promise.reject(new Error('bloqueado-modo-visualizacao'))
    }
    return orig(input, init)
  }
})
