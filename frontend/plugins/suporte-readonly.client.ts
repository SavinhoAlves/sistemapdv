import { useAuthStore } from '~/stores/auth'
// Import direto do Nuxt UI: em plugins o auto-import (e o '#imports') pode
// ainda não ter o useToast na partida a frio, e isso derrubava o app com 500.
import { useToast } from '#ui/composables/useToast'

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
