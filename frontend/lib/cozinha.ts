/**
 * Fila da cozinha (GET /pedidos/cozinha) → cartões das telas da cozinha.
 *
 * A API agrupa por rodada (comanda_nome, aberta_em, itens[].nome); as telas
 * liam o formato antigo, agrupado por mesa (mesa_nome, item.produto,
 * item.created_at), e mostravam cartões sem nome e tempos inválidos.
 */
export interface ItemCozinha {
  id: string; pedido_id: string; produto: string; categoria: string | null
  quantidade: number; status: string; observacao: string | null
  created_at: string; updated_at: string
}
export type TipoFicha = 'mesa' | 'balcao' | 'entrega' | 'retirada'
export interface FichaCozinha {
  mesa_id: string; mesa_nome: string; cliente: string | null; itens: ItemCozinha[]
  tipo: TipoFicha; pedido_numero: number | null; observacao: string | null; lancada_por: string | null
}

export function fichasDaCozinha(dados: any[]): FichaCozinha[] {
  return (dados ?? []).map(f => ({
    mesa_id: f.id,
    mesa_nome: f.comanda_nome,
    cliente: f.cliente ?? null,
    tipo: (f.tipo ?? (f.delivery ? f.delivery : f.comanda_id ? 'mesa' : 'balcao')) as TipoFicha,
    pedido_numero: f.pedido_numero ?? null,
    observacao: f.observacao ?? null,
    lancada_por: f.lancada_por ?? null,
    itens: (f.itens ?? []).map((i: any) => ({
      id: i.id,
      pedido_id: f.pedido_id,
      produto: i.nome,
      categoria: i.categoria ?? null,
      quantidade: i.quantidade,
      status: i.status,
      observacao: i.observacao ?? null,
      created_at: i.lancado_em ?? f.aberta_em,
      updated_at: i.atualizado_em ?? i.lancado_em ?? f.aberta_em,
    })),
  }))
}
