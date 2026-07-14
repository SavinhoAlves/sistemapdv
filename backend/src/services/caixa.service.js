// Consultas compartilhadas do caixa: painel admin, fechamento com conferência,
// histórico e impressão do resumo.
//
// Regra dos totais: caixas antigos registravam o saldo inicial como um movimento
// 'suprimento' com descrição 'Abertura de caixa'. Esse lançamento é ignorado nos
// somatórios (o valor inicial já entra pela coluna caixa.valor_inicial) para não
// contar em dobro. Caixas novos não geram mais esse movimento.

const { query } = require('../database/connection')

const LEGADO_ABERTURA = "(mc.tipo = 'suprimento' AND COALESCE(mc.descricao, '') = 'Abertura de caixa')"

function num(v) { return Math.round(Number(v || 0) * 100) / 100 }

// Resumo financeiro completo de um caixa (aberto ou fechado)
async function resumoCaixa(caixaId) {
  const [caixa] = await query(`
    SELECT c.*, u.nome AS operador, uf.nome AS fechado_por_nome
    FROM caixa c
    LEFT JOIN usuarios u  ON u.id  = c.funcionario_id
    LEFT JOIN usuarios uf ON uf.id = c.fechado_por
    WHERE c.id = ?
  `, [caixaId])
  if (!caixa) return null

  const [tot] = await query(`
    SELECT
      COALESCE(SUM(CASE WHEN mc.tipo IN ('pagamento','suprimento') AND NOT ${LEGADO_ABERTURA} THEN mc.valor ELSE 0 END), 0) AS total_entradas,
      COALESCE(SUM(CASE WHEN mc.tipo IN ('sangria','estorno') THEN mc.valor ELSE 0 END), 0) AS total_saidas,
      COALESCE(SUM(CASE WHEN mc.tipo = 'suprimento' AND NOT ${LEGADO_ABERTURA} THEN mc.valor ELSE 0 END), 0) AS total_suprimentos,
      COALESCE(SUM(CASE WHEN mc.tipo = 'sangria' THEN mc.valor ELSE 0 END), 0) AS total_sangrias,
      COALESCE(SUM(CASE WHEN mc.tipo = 'estorno' THEN mc.valor ELSE 0 END), 0) AS total_estornos
    FROM movimentos_caixa mc
    WHERE mc.caixa_id = ?
  `, [caixaId])

  // Vendas por método (pagamentos estornados ficam de fora)
  const porMetodo = await query(`
    SELECT m.nome AS metodo, COUNT(*) AS qtd, COALESCE(SUM(p.valor), 0) AS total
    FROM pagamentos p
    JOIN metodos_pagamento m ON m.id = p.metodo_id
    WHERE p.caixa_id = ? AND p.status = 'confirmado'
    GROUP BY m.id, m.nome
    ORDER BY total DESC
  `, [caixaId])

  const [vend] = await query(`
    SELECT COUNT(DISTINCT p.pedido_id) AS quantidade, COALESCE(SUM(p.valor), 0) AS total
    FROM pagamentos p
    WHERE p.caixa_id = ? AND p.status = 'confirmado'
  `, [caixaId])

  const dinheiroVendas = porMetodo
    .filter(m => (m.metodo || '').toLowerCase().includes('dinheiro'))
    .reduce((s, m) => s + Number(m.total), 0)

  const valorInicial = Number(caixa.valor_inicial || 0)
  const quantidadeVendas = Number(vend.quantidade || 0)

  return {
    caixa,
    totais: {
      valor_inicial: num(valorInicial),
      total_entradas: num(tot.total_entradas),
      total_saidas: num(tot.total_saidas),
      total_suprimentos: num(tot.total_suprimentos),
      total_sangrias: num(tot.total_sangrias),
      total_estornos: num(tot.total_estornos),
      saldo_atual: num(valorInicial + Number(tot.total_entradas) - Number(tot.total_saidas)),
      // Só o que fisicamente está na gaveta: dinheiro das vendas + suprimentos − sangrias
      esperado_dinheiro: num(valorInicial + dinheiroVendas + Number(tot.total_suprimentos) - Number(tot.total_sangrias))
    },
    porMetodo: porMetodo.map(m => ({ metodo: m.metodo, qtd: Number(m.qtd), total: num(m.total) })),
    vendas: {
      quantidade: quantidadeVendas,
      total: num(vend.total),
      ticket_medio: quantidadeVendas ? num(Number(vend.total) / quantidadeVendas) : 0
    }
  }
}

// Extrato de movimentos com operador e status do pagamento vinculado
async function movimentosCaixa(caixaId) {
  return query(`
    SELECT
      mc.id, mc.tipo, mc.valor, mc.descricao, mc.created_at, mc.pagamento_id,
      p.status AS pagamento_status,
      u.nome AS operador
    FROM movimentos_caixa mc
    LEFT JOIN usuarios u   ON u.id = mc.usuario_id
    LEFT JOIN pagamentos p ON p.id = mc.pagamento_id
    WHERE mc.caixa_id = ?
    ORDER BY mc.created_at DESC, mc.id DESC
  `, [caixaId])
}

module.exports = { resumoCaixa, movimentosCaixa, LEGADO_ABERTURA }
