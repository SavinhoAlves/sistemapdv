import { EVENTOS } from '~/shared/eventos'

/**
 * Eventos que mudam números do caixa e do painel: abrir/fechar caixa,
 * sangria/suprimento, pagamentos e comandas. As telas escutavam
 * 'caixa:atualizado', que o servidor nunca emite.
 */
export const EVENTOS_DO_CAIXA = [
  EVENTOS.caixa.aberto, EVENTOS.caixa.fechado, EVENTOS.caixa.movimentado,
  EVENTOS.pagamento.registrado, EVENTOS.pagamento.estornado,
  EVENTOS.comanda.aberta, EVENTOS.comanda.atualizada, EVENTOS.comanda.fechada,
]

/** Escuta todos e devolve uma função que remove as escutas. */
export function aoMudarCaixa(socket: { on: (e: string, fn: (...a: any[]) => void) => () => void }, fn: () => void) {
  const parar = EVENTOS_DO_CAIXA.map((e) => socket.on(e, fn))
  return () => parar.forEach((p) => p())
}
