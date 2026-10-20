import type { Aba } from './relatorios'
import { infoAcao } from './relatorios'

/** Linhas do CSV de cada relatório (o cabeçalho com período e filtros vem da página). */
const n = (v: unknown) => Number(v || 0).toFixed(2).replace('.', ',')
const dh = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR') : '')

export function csvDoRelatorio(aba: Aba, d: any): unknown[][] {
  switch (aba) {
    case 'geral': return [
      ['RESUMO'], ['Faturamento', n(d.resumo.faturamento)], ['Pagamentos', d.resumo.qtdPagamentos],
      ['Pedidos', d.resumo.qtdPedidos], ['Ticket médio', n(d.resumo.ticketMedio)], ['Descontos', n(d.resumo.totalAbatido)], [],
      ['POR DIA'], ['Dia', 'Faturamento', 'Pagamentos'], ...d.evolucao.map((e: any) => [e.dia, n(e.total), e.qtd]), [],
      ['POR HORA'], ['Hora', 'Faturamento', 'Pagamentos'], ...d.horarios.filter((h: any) => h.qtd).map((h: any) => [`${h.hora}h`, n(h.total), h.qtd]), [],
      ['PAGAMENTOS'], ['Método', 'Qtd', 'Total'], ...d.metodos.map((m: any) => [m.metodo, m.qtd, n(m.total)]), [],
      ['EQUIPE'], ['Atendente', 'Cargo', 'Pedidos', 'Faturado', 'Ticket médio'],
      ...d.porFuncionario.map((f: any) => [f.nome, f.cargo, f.qtdPedidos, n(f.totalFaturado), n(f.ticketMedio)]),
    ]
    case 'vendas': return [
      ['Quando', 'Pedido', 'Local', 'Atendente', 'Operador', 'Pagamento', 'Valor', 'Troco', 'Situação', 'Motivo do estorno'],
      ...d.vendas.map((v: any) => [dh(v.em), v.pedido, v.local, v.garcom, v.operador, v.metodo, n(v.valor), n(v.troco), v.status === 'estornado' ? 'Estornada' : 'Paga', v.motivoEstorno ?? '']),
    ]
    case 'produtos': return [
      ['MAIS VENDIDOS'], ['#', 'Produto', 'Categoria', 'Qtd', 'Total'],
      ...d.ranking.map((p: any, i: number) => [i + 1, p.nome, p.categoria, p.qtdVendida, n(p.totalGerado)]), [],
      ['POR CATEGORIA'], ['Categoria', 'Qtd', 'Total', 'Produtos'], ...d.porCategoria.map((c: any) => [c.categoria, c.qtdVendida, n(c.totalGerado), c.qtdProdutos]), [],
      ['SEM VENDA'], ['Produto', 'Categoria'], ...d.semVenda.map((p: any) => [p.nome, p.categoria]),
    ]
    case 'mesas': return [
      ['Mesa', 'Pagamentos', 'Faturado', 'Ticket médio', 'Último pagamento'],
      ...d.ranking.map((m: any) => [m.nomeMesa, m.qtdPagamentos, n(m.totalFaturado), n(m.ticketMedio), dh(m.ultimoPagamento)]),
    ]
    case 'descontos': return [
      ['DESCONTOS E CORTESIAS'], ['Quando', 'Local', 'Tipo', 'Valor', 'Motivo', 'Por'],
      ...d.abatimentos.map((a: any) => [dh(a.em), a.local, a.tipo, n(a.valor), a.motivo, a.por]), [],
      ['ITENS CANCELADOS'], ['Quando', 'Local', 'Item', 'Qtd', 'Valor', 'Motivo', 'Por'],
      ...d.itensCancelados.map((i: any) => [dh(i.em), i.local, i.produto, i.quantidade, n(i.valor), i.motivo ?? '', i.por]), [],
      ['ESTORNOS'], ['Quando', 'Local', 'Pagamento', 'Valor', 'Motivo', 'Por'],
      ...d.estornos.map((e: any) => [dh(e.em), e.local, e.metodo, n(e.valor), e.motivo ?? '', e.por]),
    ]
    case 'caixa': return [
      ['CAIXAS'], ['Operador', 'Abertura', 'Fechamento', 'Inicial', 'Esperado', 'Contado', 'Diferença'],
      ...d.historico.map((c: any) => [c.operador, dh(c.dataAbertura), dh(c.fechadoEm), n(c.valorInicial),
        c.valorFechamento === null ? '' : n(c.valorFechamento), c.valorContado === null ? '' : n(c.valorContado), c.diferenca === null ? '' : n(c.diferenca)]), [],
      ['SANGRIAS E SUPRIMENTOS'], ['Quando', 'Tipo', 'Valor', 'Descrição', 'Por'],
      ...d.movimentos.map((m: any) => [dh(m.em), m.tipo, n(m.valor), m.descricao ?? '', m.operador]),
    ]
    case 'estoque': return [
      ['POSIÇÃO ATUAL'], ['Produto', 'Categoria', 'Atual', 'Mínimo', 'Situação'],
      ...d.posicao.map((p: any) => [p.nome, p.categoria, p.estoqueAtual, p.estoqueMinimo, p.situacao]), [],
      ['MOVIMENTAÇÕES'], ['Quando', 'Produto', 'Tipo', 'Qtd', 'Motivo', 'Por'],
      ...d.movimentos.map((m: any) => [dh(m.em), m.produto, m.tipo, m.quantidade, m.motivo ?? '', m.por]),
    ]
    case 'auditoria': return [
      ['Quando', 'Usuário', 'Ação', 'Detalhes'],
      ...d.map((a: any) => [dh(a.createdAt), a.usuario ?? '', infoAcao(a.acao).rotulo, a.detalhes ? JSON.stringify(a.detalhes) : '']),
    ]
  }
}
