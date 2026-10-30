/**
 * Sessão de suporte (Central › Acessar › Só olhar / Ajudar): vale só na aba
 * aberta para isso. Fica no sessionStorage (por aba, sobrevive ao F5 dela) e
 * nunca no localStorage, que é compartilhado por todas as abas do navegador.
 *
 * Antes ia para o localStorage, nas mesmas chaves da sessão normal: quem
 * também estava logado como admin do restaurante no mesmo navegador passava a
 * ver a barra de suporte (e a conta do suporte) ao atualizar qualquer aba.
 */
export interface SessaoSuporte {
  token: string
  tenant: string
  modo: 'visualizacao' | 'auxiliar'
  nome: string
  cargo: string
  id: string
}

const CHAVE = 'pdv_suporte'

export function lerSuporte(): SessaoSuporte | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(CHAVE) || 'null')
    return s?.token && s?.tenant && s?.id ? s : null
  } catch {
    return null
  }
}

export function gravarSuporte(s: SessaoSuporte | null) {
  try {
    if (s) sessionStorage.setItem(CHAVE, JSON.stringify(s))
    else sessionStorage.removeItem(CHAVE)
  } catch { /* sem armazenamento: a sessão vive só até o F5 */ }
}

/** Token emitido para o suporte (support-token marca `suporte: true`) */
export function ehTokenDeSuporte(token: string | null) {
  try {
    const corpo = token?.split('.')[1]
    if (!corpo) return false
    return JSON.parse(atob(corpo.replace(/-/g, '+').replace(/_/g, '/'))).suporte === true
  } catch {
    return false
  }
}

/** Chaves das versões antigas no localStorage (sessão de suporte compartilhada) */
export const CHAVES_ANTIGAS = [
  'suporte_token', 'suporte_tenant', 'suporte_modo',
  'suporte_pending_token', 'suporte_pending_tenant', 'suporte_pending_modo',
  'suporte_pending_nome', 'suporte_pending_cargo', 'suporte_pending_id',
]
