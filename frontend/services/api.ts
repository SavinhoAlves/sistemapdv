import { useAuthStore } from '../stores/auth'
import { useRouter, useRuntimeConfig } from '#imports'
import { chaveDoTerminal } from '~/composables/useTerminalLocal'
import { ajustarRelogio } from '~/lib/relogio'
import { tokenOperador, pedirCartaoDeNovo } from '~/lib/operador'

let logoutEmAndamento = false
let refreshPromise: Promise<boolean> | null = null

export function useApi() {
  const router    = useRouter()
  const authStore = useAuthStore()
  const config    = useRuntimeConfig()
  const baseURL   = `${config.public.apiUrl}/api`

  async function tentarRefresh(): Promise<boolean> {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      const rt = authStore.refreshToken
      if (!rt) return false
      try {
        const resp = await fetch(`${baseURL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        })
        if (!resp.ok) return false
        const data = await resp.json()
        if (data?.accessToken || data?.access_token) {
          authStore.setAuth(data.accessToken ?? data.access_token, authStore.usuario!, data.refreshToken ?? data.refresh_token)
          return true
        }
        return false
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  async function request<T>(endpoint: string, options: RequestInit = {}, _isRetry = false): Promise<T> {
    const token      = authStore.token
    const isAuthRoute = endpoint.includes('/auth/login') || endpoint.includes('/auth/rfid') || endpoint.includes('/auth/refresh')

    const headers: Record<string, string> = {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...((options.headers as Record<string, string>) || {})
    }

    if (token && !isAuthRoute) {
      headers['Authorization'] = `Bearer ${token}`
    }
    // Cartão RFID recém-passado: a ação vale em nome do dono do cartão
    const operador = tokenOperador()
    if (operador && !isAuthRoute && (options.method ?? 'GET') !== 'GET') {
      headers['X-Operador'] = operador
    }

    const response = await fetch(`${baseURL}${endpoint}`, { ...options, headers })
    ajustarRelogio(response.headers.get('date'))

    if (response.status === 401) {
      if (!isAuthRoute && !_isRetry) {
        const refrescou = await tentarRefresh()
        if (refrescou) {
          return request<T>(endpoint, options, true)
        }
      }

      let errMsg = 'Sessão expirada'
      try {
        const body = await response.clone().json()
        if (body?.error) errMsg = body.error
      } catch {}

      if (!isAuthRoute && !logoutEmAndamento) {
        logoutEmAndamento = true
        authStore.logout()
        router.push('/login')
        setTimeout(() => { logoutEmAndamento = false }, 3000)
      }
      throw new Error(errMsg)
    }

    if (response.status === 204) return null as T

    if (!response.ok) {
      let errorMsg = `Erro ${response.status}`
      try {
        const errorData = await response.json()
        if (response.status === 403 && errorData.licenca === false) {
          router.push('/ativacao')
        }
        // RFID ligado e sem cartão válido: pede o cartão e repete a ação uma vez
        if (response.status === 403 && !_isRetry &&
            (errorData.codigo === 'CARTAO_OBRIGATORIO' || errorData.codigo === 'CARTAO_EXPIRADO')) {
          if (await pedirCartaoDeNovo(errorData.error || 'Passe o cartão para continuar')) {
            return request<T>(endpoint, options, true)
          }
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
      // Sem slug: o identificador (1001-3 ou nome de usuário) já indica o restaurante
      login: (identificador: string, senha: string) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ identificador, senha }) }),
      // Só nos terminais com crachá liberado: a chave do aparelho diz qual é o restaurante
      rfid: (rfid: string) => {
        const chave = chaveDoTerminal()
        return request('/auth/rfid', { method: 'POST', body: JSON.stringify({ cartaoRfid: rfid }), headers: chave ? { 'X-Terminal': chave } : {} })
      },
      me: () => request('/auth/me')
    },

    caixa: {
      abrir:            (valorInicial: number)  => request('/caixa/abrir',    { method: 'POST', body: JSON.stringify({ valorInicial }) }),
      fechar:           ()                      => request('/caixa/fechar',   { method: 'POST' }),
      movimentos:       ()                      => request('/caixa/movimentos'),
      adicionarMovimento: (dados: any)          => request('/caixa/movimento', { method: 'POST', body: JSON.stringify(dados) })
    },

    mesas: {
      listar:    <T>()              => request<T[]>('/mesas'),
      buscar:    <T>(id: string)    => request<T>(`/mesas/${id}`),
      abrirMesa: <T>(dados: any)    => request<T>('/mesas/abrir',        { method: 'POST',  body: JSON.stringify(dados) }),
      fechar:    <T>(id: string)    => request<T>(`/mesas/${id}/fechar`, { method: 'PATCH' })
    },

    perfis: {
      listar:    <T>()                    => request<T[]>('/perfis'),
      criar:     <T>(dados: any)          => request<T>('/perfis',           { method: 'POST',   body: JSON.stringify(dados) }),
      atualizar: <T>(id: string, dados: any) => request<T>(`/perfis/${id}`, { method: 'PUT',    body: JSON.stringify(dados) }),
      excluir:   <T>(id: string)          => request<T>(`/perfis/${id}`,     { method: 'DELETE' })
    }
  }
}
