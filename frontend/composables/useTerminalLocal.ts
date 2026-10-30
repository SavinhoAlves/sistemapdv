/**
 * Qual terminal é este navegador: pela chave guardada quando o administrador
 * autorizou o aparelho em Admin › Terminais (nuvem ou Host) ou, no modo local,
 * pelo IP fixo cadastrado. Aparelho não autorizado devolve terminal null.
 */
export interface TerminalLocal { id?: string; nome: string; funcao: 'caixa' | 'garcom' | 'cozinha' | 'app'; ip: string | null; cracha: boolean; slug?: string }

const CHAVE_TERMINAL = 'pdv_terminal_chave'

let consulta: Promise<TerminalLocal | null> | null = null

/** Chave deste aparelho (cabeçalho X-Terminal); vazio se não foi autorizado */
export function chaveDoTerminal(): string {
  if (!process.client) return ''
  try { return localStorage.getItem(CHAVE_TERMINAL) || '' } catch { return '' }
}

/** Guarda (ou apaga, com vazio) a chave deste aparelho e refaz a consulta */
export function guardarChaveDoTerminal(chave: string) {
  try {
    if (chave) localStorage.setItem(CHAVE_TERMINAL, chave)
    else localStorage.removeItem(CHAVE_TERMINAL)
  } catch { /* navegador sem armazenamento: o aparelho fica sem terminal */ }
  consulta = null
}

/** Esquece a consulta (o terminal foi editado): a próxima pergunta à API de novo */
export function reconsultarTerminal() { consulta = null }

export function terminalLocal(): Promise<TerminalLocal | null> {
  if (!process.client) return Promise.resolve(null)
  if (!consulta) {
    const config = useRuntimeConfig()
    const chave = chaveDoTerminal()
    consulta = $fetch<{ terminal: TerminalLocal | null }>(`${config.public.apiUrl}/api/terminais/eu`, { headers: chave ? { 'X-Terminal': chave } : {} })
      .then(r => r?.terminal ?? null)
      .catch(() => null)
  }
  return consulta
}

/** Tela inicial de cada função de terminal */
export const TELA_DA_FUNCAO: Record<TerminalLocal['funcao'], string> = {
  caixa: '/vendas',
  garcom: '/mesas',
  cozinha: '/cozinha',
  app: '/m',
}
