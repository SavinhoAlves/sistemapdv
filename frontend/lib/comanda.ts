/**
 * GET /mesas/:id/produtos e GET /pedidos/mesa/:id devolvem a comanda
 * (pedidos.service → comandaDaMesa): { pedido_id, numero, status, conta,
 * rodadas: [{ itens }], abatimentos, pagamentos }. As telas da mesa
 * esperavam uma lista de itens e mostravam a mesa vazia.
 */
export interface ItemComanda {
  id: string
  produto_id: string
  pedido_id: string | null
  nome: string
  quantidade: number
  preco_unitario: number
  total: number
  status: string
  observacao: string | null
}

/** Itens de todas as rodadas, sem os cancelados. */
export function itensDaComanda(c: any): ItemComanda[] {
  if (!c?.rodadas) return []
  return c.rodadas.flatMap((r: any) => r.itens)
    .filter((i: any) => i.status !== 'cancelado')
    .map((i: any) => ({ ...i, pedido_id: c.pedido_id ?? null }))
}
