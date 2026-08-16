import { useAuthStore } from '../stores/auth'
import { useRouter, useRuntimeConfig } from '#imports'

let logoutEmAndamento = false

export function useApi() {
  const router    = useRouter()
  const authStore = useAuthStore()
  const config    = useRuntimeConfig()
  const baseURL   = `${config.public.apiUrl}/api`

  async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token      = authStore.token
    const isAuthRoute = endpoint.includes('/auth/login') || endpoint.includes('/auth/rfid')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    }

    if (token && !isAuthRoute) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${baseURL}${endpoint}`, { ...options, headers })

    if (response.status === 401) {
      if (!isAuthRoute && !logoutEmAndamento) {
        logoutEmAndamento = true
        authStore.logout()
        router.push('/login')
        setTimeout(() => { logoutEmAndamento = false }, 3000)
      }
      throw new Error('Sessão expirada')
    }

    if (response.status === 204) return null as T

    if (!response.ok) {
      let errorMsg = `Erro ${response.status}`
      try {
        const errorData = await response.json()
        if (response.status === 403 && errorData.licenca === false) {
          router.push('/ativacao')
        }
        errorMsg = errorData.mensagem || errorData.error || errorData.message || errorMsg
      } catch {}
      throw new Error(errorMsg)
    }

    return response.json() as Promise<T>
  }

  return {
    get:    <T>(endpoint: string)                  => request<T>(endpoint),
    post:   <T>(endpoint: string, data?: unknown)  => request<T>(endpoint, { method: 'POST',  body: data ? JSON.stringify(data) : undefined }),
    put:    <T>(endpoint: string, data?: unknown)  => request<T>(endpoint, { method: 'PUT',   body: data ? JSON.stringify(data) : undefined }),
    patch:  <T>(endpoint: string, data?: unknown)  => request<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
    delete: <T>(endpoint: string)                  => request<T>(endpoint, { method: 'DELETE' }),

    auth: {
      login: (email: string, senha: string) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),
      rfid: (rfid: string) =>
        request('/auth/rfid', { method: 'POST', body: JSON.stringify({ rfid }) }),
      me: () => request('/auth/me')
    },

    caixa: {
      abrir:            (valor_inicial: number) => request('/caixa/abrir',    { method: 'POST', body: JSON.stringify({ valor_inicial }) }),
      fechar:           ()                      => request('/caixa/fechar',   { method: 'POST' }),
      movimentos:       ()                      => request('/caixa/movimentos'),
      adicionarMovimento: (dados: any)          => request('/caixa/movimento', { method: 'POST', body: JSON.stringify(dados) })
    },

    mesas: {
      listar:    <T>()              => request<T[]>('/mesas'),
      buscar:    <T>(id: number)    => request<T>(`/mesas/${id}`),
      abrirMesa: <T>(dados: any)    => request<T>('/mesas/abrir',        { method: 'POST',  body: JSON.stringify(dados) }),
      fechar:    <T>(id: number)    => request<T>(`/mesas/${id}/fechar`, { method: 'PATCH' })
    },

    perfis: {
      listar:  <T>()                    => request<T[]>('/perfis'),
      criar:   <T>(dados: any)          => request<T>('/perfis',      { method: 'POST',   body: JSON.stringify(dados) }),
      atualizar: <T>(id: number, dados: any) => request<T>(`/perfis/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
      excluir: <T>(id: number)          => request<T>(`/perfis/${id}`, { method: 'DELETE' })
    }
  }
}
