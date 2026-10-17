/**
 * Estado operacional de uma comanda — uma chave só, escolhida pela urgência.
 * Compartilhado entre o ComandaCard e o filtro/legenda da tela de mesas, para
 * que o número no filtro bata sempre com a cor dos cards.
 */

export type ChaveEstado = 'pronto' | 'conta' | 'cozinha' | 'atencao' | 'parado'

export interface ComandaResumo {
  id: string
  numero: number
  nome: string
  cliente: string | null
  status: 'aberta' | 'fechando' | 'fechada'
  garcom: { id: string; nome: string } | null
  total: number
  pago: number
  restante: number
  qtd_itens: number
  qtd_prontos: number
  qtd_na_cozinha: number
  aberta_em: string | null
  ultimo_lancamento_em: string | null
}

export const LIMITE_PARADA_MIN = 45

export const ROTULO_ESTADO: Record<ChaveEstado, string> = {
  pronto:  'Pronto p/ entregar',
  cozinha: 'Na cozinha',
  conta:   'Conta pedida',
  atencao: 'Sem movimento',
  parado:  'Em atendimento',
}

export function minutosDesde(iso: string | null) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

export function duracao(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  return `${h}h${String(min % 60).padStart(2, '0')}`
}

/** Prato pronto esperando ganha de tudo: é o único que degrada a cada minuto. */
export function chaveEstado(c: ComandaResumo, limiteParadaMin = LIMITE_PARADA_MIN): ChaveEstado {
  if (c.qtd_prontos > 0) return 'pronto'
  if (c.status === 'fechando') return 'conta'
  if (c.qtd_na_cozinha > 0) return 'cozinha'
  if (minutosDesde(c.ultimo_lancamento_em ?? c.aberta_em) >= limiteParadaMin) return 'atencao'
  return 'parado'
}
