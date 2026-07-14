// services/api.ts
import { useAuthStore } from '../stores/auth'
import { useRouter, useRuntimeConfig } from '#imports'

let logoutEmAndamento = false

export function useApi() {
  const router = useRouter()
  const authStore = useAuthStore()

  // Mesmo protocolo da página (https quando o certificado local mkcert está
  // configurado) — evita bloqueio de "mixed content" e é exigido pela
  // câmera do celular (login por crachá QR)
  const baseURL = process.client
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : 'http://localhost:3001/api'

  async function request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = authStore.token

    const isAuthRoute =
      endpoint.includes('/auth/login') || endpoint.includes('/auth/rfid')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    }

    if (token && !isAuthRoute) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${baseURL}${endpoint}`, {
        ...options,
        headers
      })

      if (response.status === 401) {
        if (!isAuthRoute && !logoutEmAndamento) {
          logoutEmAndamento = true
          authStore.logout()
          setTimeout(() => { logoutEmAndamento = false }, 3000)
          throw new Error('Sessão expirada')
        }
        throw new Error('Sessão expirada')
      }

      if (response.status === 204) {
        return null as T
      }

      if (!response.ok) {
        let errorMsg = `Erro ${response.status}`

        try {
          const errorData = await response.json()
          console.error(`[API Error ${response.status}]`, errorData)

          // Backend bloqueou por licença ausente/expirada/inválida
          if (response.status === 403 && errorData.licenca === false) {
            router.push('/ativacao')
          }

          // ✅ AJUSTADO: Adicionado 'mensagem' para capturar o erro exato do seu backend
          errorMsg = errorData.mensagem || errorData.error || errorData.message || errorMsg
        } catch {}

        throw new Error(errorMsg)
      }

      return await response.json() as T
    } catch (err) {
      throw err
    }
  }

  const api = {
    get: <T>(endpoint: string) => request<T>(endpoint),

    post: <T>(endpoint: string, data?: unknown) =>
      request<T>(endpoint, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined
      }),

    put: <T>(endpoint: string, data?: unknown) =>
      request<T>(endpoint, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined
      }),

    patch: <T>(endpoint: string, data?: unknown) =>
      request<T>(endpoint, {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined
      }),

    delete: <T>(endpoint: string) =>
      request<T>(endpoint, { method: 'DELETE' }),

    // =========================
    // AUTH (🔥 Ajustado para alinhar com o Back-end)
    // =========================
    auth: {
      rfid: (cartao_rfid: string) =>
        request('/auth/rfid', {
          method: 'POST',
          // ✅ AJUSTADO: Alterado de "cartao_rfid" para "rfid" para casar com a validação do backend
          body: JSON.stringify({ rfid: cartao_rfid }) 
        }),

      login: (email: string, senha: string) =>
        request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, senha })
        }),

      me: () => request('/auth/me')
    },

    // =========================
    // MESAS
    // =========================
    mesas: {

      listar: <T>() =>
        request<T[]>('/mesas'),

      // ======================
      // ABRIR NOVA MESA
      // ======================
      abrirMesa: <T>(dados: any) =>
        request<T>('/mesas/abrir', {
          method: 'POST',
          body: JSON.stringify(dados)
        })
    }
  }

  return api
}