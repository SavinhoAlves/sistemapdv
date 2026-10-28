/**
 * Nomes de evento do Socket.IO — fonte única.
 *
 * Este arquivo é copiado literalmente para `frontend/shared/eventos.ts`.
 * Os dois lados importam daqui; ninguém escreve o nome do evento como string
 * solta. Foi exatamente essa divergência que deixou o tempo real morto:
 * o servidor emitia `item_adicionado` e o cliente escutava `cozinha:novo_item`.
 *
 * Convenção: `dominio:fato-no-passado`. O nome descreve o que aconteceu,
 * não o que o receptor deve fazer.
 */

export const EVENTOS = {
  comanda: {
    aberta: 'comanda:aberta',
    atualizada: 'comanda:atualizada',
    fechada: 'comanda:fechada',
  },
  item: {
    lancado: 'item:lancado',
    removido: 'item:removido',
    statusAlterado: 'item:status-alterado',
  },
  pagamento: {
    registrado: 'pagamento:registrado',
    estornado: 'pagamento:estornado',
  },
  caixa: {
    aberto: 'caixa:aberto',
    fechado: 'caixa:fechado',
    movimentado: 'caixa:movimentado',
  },
  delivery: {
    /** pedido novo do cardápio online, aguardando o caixa */
    recebido: 'delivery:recebido',
    /** aceito, recusado, pronto, em rota, entregue */
    atualizado: 'delivery:atualizado',
    /** nova posição GPS de um entregador */
    posicao: 'delivery:posicao',
  },
  equipe: {
    /** admin mudou permissões de função/perfil/pessoa: cada app relê as suas */
    permissoesAtualizadas: 'equipe:permissoes-atualizadas',
  },
} as const

/**
 * Payloads. Todo evento carrega o suficiente para o receptor decidir se
 * precisa refazer fetch — antes os payloads não tinham nem o id do item nem
 * os novos totais, então todo mundo refazia fetch de qualquer forma.
 *
 * Valores monetários trafegam em CENTAVOS INTEIROS, mesma unidade da camada
 * de negócio. Quem exibe divide por 100.
 */

export interface PayloadComanda {
  comandaId: string
  numero: number
  status: string
  /** null quando a comanda ainda não tem pedido */
  pedidoId: string | null
  totalCentavos: number
  pagoCentavos: number
  restanteCentavos: number
  qtdItens: number
  /** itens prontos aguardando entrega — dado que dispara ação do garçom */
  qtdProntos: number
  atualizadoEm: string
}

export interface PayloadItem {
  comandaId: string
  pedidoId: string
  itemId: string
  produtoId: string
  produtoNome: string
  quantidade: number
  status: string
  vaiCozinha: boolean
  rodada: number
  /** total da comanda depois desta alteração */
  totalCentavos: number
}

export interface PayloadPagamento {
  comandaId: string | null
  pedidoId: string
  pagamentoId: string
  metodoNome: string
  valorCentavos: number
  restanteCentavos: number
  quitado: boolean
}

export interface PayloadDelivery {
  id: string
  codigo: string
  status: string
  tipo: 'entrega' | 'retirada'
  clienteNome: string
  totalCentavos: number
}

export interface PayloadPosicao {
  usuarioId: string
  lat: number
  lng: number
  em: string
}

export interface PayloadCaixa {
  caixaId: string
  status: 'aberto' | 'fechado'
  esperadoDinheiroCentavos: number
}

/** Salas. Mantidas prefixadas por tenant — o isolamento aqui já estava certo. */
export const salas = {
  todos: (tenantId: string) => `${tenantId}:todos`,
  cargo: (tenantId: string, cargo: string) => `${tenantId}:cargo:${cargo}`,
  comanda: (tenantId: string, comandaId: string) => `${tenantId}:comanda:${comandaId}`,
}
