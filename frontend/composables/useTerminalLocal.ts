/**
 * Modo local (Host): qual terminal é este navegador, pelo IP fixo cadastrado
 * em Admin › Terminais. Fora do modo local devolve terminal null.
 */
export interface TerminalLocal { nome: string; funcao: 'caixa' | 'garcom' | 'cozinha' | 'app'; ip: string }

let consulta: Promise<TerminalLocal | null> | null = null

export function terminalLocal(): Promise<TerminalLocal | null> {
  if (!process.client) return Promise.resolve(null)
  if (!consulta) {
    const config = useRuntimeConfig()
    consulta = $fetch<{ terminal: TerminalLocal | null }>(`${config.public.apiUrl}/api/terminais/eu`)
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
