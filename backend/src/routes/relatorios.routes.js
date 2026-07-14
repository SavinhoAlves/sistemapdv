const express = require('express')
const router = express.Router()

const { query } = require('../database/connection')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { LEGADO_ABERTURA } = require('../services/caixa.service')

// ─── auditoria ───────────────────────────────────────────
// GET /auditoria?acao=&dataInicio=&dataFim=&limite=
router.get('/auditoria', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const clausulas = []
    const params = []

    if (req.query.acao) {
      clausulas.push('a.acao = ?')
      params.push(req.query.acao)
    }
    if (req.query.dataInicio) {
      clausulas.push('DATE(a.created_at) >= ?')
      params.push(req.query.dataInicio)
    }
    if (req.query.dataFim) {
      clausulas.push('DATE(a.created_at) <= ?')
      params.push(req.query.dataFim)
    }

    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : ''
    const limite = Math.min(Number(req.query.limite) || 200, 1000)

    const registros = await query(`
      SELECT a.id, a.acao, a.entidade, a.entidade_id, a.detalhes, a.created_at,
             u.nome AS usuario
      FROM auditoria a
      LEFT JOIN usuarios u ON u.id = a.usuario_id
      ${where}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ${limite}
    `, params)

    return res.json(registros.map(r => ({
      ...r,
      detalhes: r.detalhes ? JSON.parse(r.detalhes) : null
    })))
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// ─── helpers ─────────────────────────────────────────────
function periodo(req) {
  const hoje   = new Date().toISOString().slice(0, 10)
  const inicio = req.query.dataInicio || hoje
  const fim    = req.query.dataFim    || hoje
  return { inicio, fim }
}

// Monta cláusulas WHERE opcionais e retorna { clausulas: string, params: [] }
function filtrosExtras(req, alias = {}) {
  // alias: { garcom: 'pe', metodo: 'p', categoria: 'pr' }
  const clausulas = []
  const params    = []

  const garcomAlias    = alias.garcom    || 'pe'
  const metodoAlias    = alias.metodo    || 'p'
  const categoriaAlias = alias.categoria || 'pr'

  if (req.query.garcomId && req.query.garcomId !== 'todos') {
    clausulas.push(`${garcomAlias}.garcom_id = ?`)
    params.push(req.query.garcomId)
  }
  if (req.query.metodoId && req.query.metodoId !== 'todos') {
    clausulas.push(`${metodoAlias}.metodo_id = ?`)
    params.push(req.query.metodoId)
  }
  if (req.query.categoriaId && req.query.categoriaId !== 'todos') {
    clausulas.push(`${categoriaAlias}.categoria_id = ?`)
    params.push(req.query.categoriaId)
  }

  return {
    sql:    clausulas.length ? 'AND ' + clausulas.join(' AND ') : '',
    params
  }
}

// ─── GET /filtros — listas para dropdowns ────────────────
router.get('/filtros', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const funcionarios = await query(`
      SELECT id, nome, cargo FROM usuarios ORDER BY nome
    `)
    const metodos = await query(`
      SELECT id, nome FROM metodos_pagamento ORDER BY nome
    `)
    const categorias = await query(`
      SELECT id, nome FROM categorias ORDER BY nome
    `)
    return res.json({ funcionarios, metodos, categorias })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// ─── GET / — Visão Geral ──────────────────────────────────
router.get('/', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { inicio, fim } = periodo(req)

    const garcomId = req.query.garcomId && req.query.garcomId !== 'todos' ? req.query.garcomId : null
    const metodoId = req.query.metodoId && req.query.metodoId !== 'todos' ? req.query.metodoId : null

    // Monta filtros dinâmicos para pagamentos (JOIN com pedidos se precisar de garcom)
    let joinGarcom = garcomId ? 'JOIN pedidos pe ON pe.mesa_id = p.mesa_id' : ''
    let whereGarcom = garcomId ? 'AND pe.garcom_id = ?' : ''
    let whereMetodo = metodoId ? 'AND p.metodo_id = ?' : ''

    const baseParams = [inicio, fim]
    const extraParams = [...(garcomId ? [garcomId] : []), ...(metodoId ? [metodoId] : [])]

    const [resumo] = await query(`
      SELECT
        COALESCE(SUM(p.valor), 0) AS faturamento,
        COUNT(*)                  AS qtdPagamentos,
        COALESCE(AVG(p.valor), 0) AS ticketMedio
      FROM pagamentos p
      ${joinGarcom}
      WHERE DATE(p.created_at) BETWEEN ? AND ?
        AND p.status = 'confirmado'
        ${whereGarcom} ${whereMetodo}
    `, [...baseParams, ...extraParams])

    const [abatimentos] = await query(`
      SELECT COALESCE(SUM(pa.valor), 0) AS totalAbatido, COUNT(*) AS qtdAbatimentos
      FROM pedido_abatimentos pa
      JOIN pedidos pe ON pe.id = pa.pedido_id
      WHERE DATE(pe.criado_em) BETWEEN ? AND ?
        ${garcomId ? 'AND pe.garcom_id = ?' : ''}
    `, [...baseParams, ...(garcomId ? [garcomId] : [])])

    const evolucao = await query(`
      SELECT DATE(p.created_at) AS dia, COALESCE(SUM(p.valor), 0) AS total, COUNT(*) AS qtd
      FROM pagamentos p
      ${joinGarcom}
      WHERE DATE(p.created_at) BETWEEN ? AND ?
        AND p.status = 'confirmado'
        ${whereGarcom} ${whereMetodo}
      GROUP BY dia ORDER BY dia
    `, [...baseParams, ...extraParams])

    const metodos = await query(`
      SELECT mp.nome AS metodo, COUNT(*) AS qtd, SUM(p.valor) AS total
      FROM pagamentos p
      LEFT JOIN metodos_pagamento mp ON mp.id = p.metodo_id
      ${joinGarcom}
      WHERE DATE(p.created_at) BETWEEN ? AND ?
        AND p.status = 'confirmado'
        ${whereGarcom} ${whereMetodo}
      GROUP BY p.metodo_id, mp.nome ORDER BY total DESC
    `, [...baseParams, ...extraParams])

    const horarios = await query(`
      SELECT HOUR(p.created_at) AS hora, COUNT(*) AS qtd, SUM(p.valor) AS total
      FROM pagamentos p
      ${joinGarcom}
      WHERE DATE(p.created_at) BETWEEN ? AND ?
        AND p.status = 'confirmado'
        ${whereGarcom} ${whereMetodo}
      GROUP BY hora ORDER BY hora
    `, [...baseParams, ...extraParams])

    // Ranking de funcionários no período
    const porFuncionario = await query(`
      SELECT
        u.id,
        u.nome,
        u.cargo,
        COUNT(DISTINCT pe.id)     AS qtdPedidos,
        COUNT(DISTINCT p.id)      AS qtdPagamentos,
        COALESCE(SUM(p.valor), 0) AS totalFaturado
      FROM pedidos pe
      JOIN usuarios u ON u.id = pe.garcom_id AND pe.garcom_id IS NOT NULL
      LEFT JOIN pagamentos p ON p.mesa_id = pe.mesa_id
        AND DATE(p.created_at) BETWEEN ? AND ?
        AND p.status = 'confirmado'
        ${metodoId ? 'AND p.metodo_id = ?' : ''}
      WHERE DATE(pe.criado_em) BETWEEN ? AND ?
        ${garcomId ? 'AND pe.garcom_id = ?' : ''}
      GROUP BY u.id, u.nome, u.cargo
      ORDER BY totalFaturado DESC
    `, [
      inicio, fim,
      ...(metodoId ? [metodoId] : []),
      inicio, fim,
      ...(garcomId ? [garcomId] : [])
    ])

    // Comparativo período anterior
    const dias = Math.ceil((new Date(fim) - new Date(inicio)) / 86400000) + 1
    const antFim = new Date(inicio); antFim.setDate(antFim.getDate() - 1)
    const antIni = new Date(antFim); antIni.setDate(antIni.getDate() - dias + 1)
    const [anterior] = await query(`
      SELECT COALESCE(SUM(valor), 0) AS faturamento, COUNT(*) AS qtdPagamentos
      FROM pagamentos
      WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'confirmado'
        ${metodoId ? 'AND metodo_id = ?' : ''}
    `, [antIni.toISOString().slice(0,10), antFim.toISOString().slice(0,10), ...(metodoId ? [metodoId] : [])])

    return res.json({
      periodo: { inicio, fim },
      resumo: {
        faturamento:    Number(resumo.faturamento),
        qtdPagamentos:  Number(resumo.qtdPagamentos),
        ticketMedio:    Number(resumo.ticketMedio),
        totalAbatido:   Number(abatimentos.totalAbatido),
        qtdAbatimentos: Number(abatimentos.qtdAbatimentos)
      },
      anterior: { faturamento: Number(anterior.faturamento), qtdPagamentos: Number(anterior.qtdPagamentos) },
      evolucao,
      metodos,
      horarios,
      porFuncionario
    })
  } catch (e) {
    console.error('ERRO RELATORIO GERAL:', e)
    return res.status(500).json({ error: e.message })
  }
})

// ─── GET /produtos ────────────────────────────────────────
router.get('/produtos', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { inicio, fim } = periodo(req)
    const garcomId    = req.query.garcomId    && req.query.garcomId    !== 'todos' ? req.query.garcomId    : null
    const categoriaId = req.query.categoriaId && req.query.categoriaId !== 'todos' ? req.query.categoriaId : null

    const whereGarcom    = garcomId    ? 'AND pe.garcom_id = ?'    : ''
    const whereCategoria = categoriaId ? 'AND pr.categoria_id = ?' : ''
    const extraParams    = [...(garcomId ? [garcomId] : []), ...(categoriaId ? [categoriaId] : [])]

    const ranking = await query(`
      SELECT
        pr.id,
        pr.nome,
        c.nome  AS categoria,
        SUM(ip.quantidade)                     AS qtdVendida,
        SUM(ip.quantidade * ip.preco_unitario) AS totalGerado,
        AVG(ip.preco_unitario)                 AS precoMedio
      FROM pedido_itens ip
      JOIN produtos  pr ON pr.id = ip.produto_id
      JOIN pedidos   pe ON pe.id = ip.pedido_id
      LEFT JOIN categorias c ON c.id = pr.categoria_id
      WHERE DATE(pe.criado_em) BETWEEN ? AND ?
        ${whereGarcom} ${whereCategoria}
      GROUP BY ip.produto_id, pr.nome, c.nome
      ORDER BY qtdVendida DESC
    `, [inicio, fim, ...extraParams])

    const porCategoria = await query(`
      SELECT
        COALESCE(c.nome, 'Sem categoria') AS categoria,
        SUM(ip.quantidade)                     AS qtdVendida,
        SUM(ip.quantidade * ip.preco_unitario) AS totalGerado,
        COUNT(DISTINCT ip.produto_id)          AS qtdProdutos
      FROM pedido_itens ip
      JOIN pedidos   pe ON pe.id = ip.pedido_id
      JOIN produtos  pr ON pr.id = ip.produto_id
      LEFT JOIN categorias c ON c.id = pr.categoria_id
      WHERE DATE(pe.criado_em) BETWEEN ? AND ?
        ${whereGarcom} ${whereCategoria}
      GROUP BY c.id, c.nome ORDER BY totalGerado DESC
    `, [inicio, fim, ...extraParams])

    const semVenda = await query(`
      SELECT pr.id, pr.nome, COALESCE(c.nome, 'Sem categoria') AS categoria
      FROM produtos pr
      LEFT JOIN categorias c ON c.id = pr.categoria_id
      WHERE pr.ativo = 1
        ${categoriaId ? 'AND pr.categoria_id = ?' : ''}
        AND pr.id NOT IN (
          SELECT DISTINCT ip.produto_id
          FROM pedido_itens ip
          JOIN pedidos pe ON pe.id = ip.pedido_id
          WHERE DATE(pe.criado_em) BETWEEN ? AND ?
            ${whereGarcom}
        )
      ORDER BY pr.nome
    `, [
      ...(categoriaId ? [categoriaId] : []),
      inicio, fim,
      ...(garcomId ? [garcomId] : [])
    ])

    return res.json({ periodo: { inicio, fim }, ranking, porCategoria, semVenda })
  } catch (e) {
    console.error('ERRO RELATORIO PRODUTOS:', e)
    return res.status(500).json({ error: e.message })
  }
})

// ─── GET /estoque ─────────────────────────────────────────
router.get('/estoque', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { inicio, fim } = periodo(req)
    const categoriaId = req.query.categoriaId && req.query.categoriaId !== 'todos' ? req.query.categoriaId : null
    const whereCategoria = categoriaId ? 'AND pr.categoria_id = ?' : ''

    const totaisPorTipo = await query(`
      SELECT em.tipo, COUNT(*) AS qtd, SUM(ABS(em.quantidade)) AS quantidadeTotal
      FROM estoque_movimentacoes em
      JOIN produtos pr ON pr.id = em.produto_id
      WHERE DATE(em.created_at) BETWEEN ? AND ?
        ${whereCategoria}
      GROUP BY em.tipo ORDER BY quantidadeTotal DESC
    `, [inicio, fim, ...(categoriaId ? [categoriaId] : [])])

    const maiorSaida = await query(`
      SELECT
        pr.id, pr.nome, c.nome AS categoria,
        SUM(CASE WHEN em.quantidade < 0 THEN -em.quantidade ELSE 0 END) AS qtdSaida,
        SUM(CASE WHEN em.quantidade > 0 THEN em.quantidade ELSE 0 END)  AS qtdEntrada
      FROM estoque_movimentacoes em
      JOIN produtos pr ON pr.id = em.produto_id
      LEFT JOIN categorias c ON c.id = pr.categoria_id
      WHERE DATE(em.created_at) BETWEEN ? AND ?
        ${whereCategoria}
      GROUP BY pr.id, pr.nome, c.nome
      ORDER BY qtdSaida DESC
      LIMIT 50
    `, [inicio, fim, ...(categoriaId ? [categoriaId] : [])])

    // Situação ATUAL (não é por período) — mesma regra de "baixo estoque"
    // já usada em PainelProdutos.vue no front
    const abaixoDoMinimo = await query(`
      SELECT pr.id, pr.nome, c.nome AS categoria, pr.estoque_atual, pr.estoque_minimo
      FROM produtos pr
      LEFT JOIN categorias c ON c.id = pr.categoria_id
      WHERE pr.ativo = 1 AND pr.gerenciar_estoque = 1
        AND pr.estoque_atual <= pr.estoque_minimo
        ${whereCategoria}
      ORDER BY pr.estoque_atual ASC
    `, categoriaId ? [categoriaId] : [])

    return res.json({ periodo: { inicio, fim }, totaisPorTipo, maiorSaida, abaixoDoMinimo })
  } catch (e) {
    console.error('ERRO RELATORIO ESTOQUE:', e)
    return res.status(500).json({ error: e.message })
  }
})

// ─── GET /mesas ───────────────────────────────────────────
router.get('/mesas', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { inicio, fim } = periodo(req)
    const garcomId = req.query.garcomId && req.query.garcomId !== 'todos' ? req.query.garcomId : null
    const metodoId = req.query.metodoId && req.query.metodoId !== 'todos' ? req.query.metodoId : null

    const joinGarcom  = garcomId ? 'JOIN pedidos pe2 ON pe2.mesa_id = p.mesa_id AND pe2.garcom_id = ?' : ''
    const whereMetodo = metodoId ? 'AND p.metodo_id = ?' : ''
    const extraJoin   = garcomId ? [garcomId] : []
    const extraWhere  = metodoId ? [metodoId] : []

    const ranking = await query(`
      SELECT
        m.id,
        m.nome_mesa,
        COUNT(DISTINCT p.id) AS qtdPagamentos,
        SUM(p.valor)         AS totalFaturado,
        AVG(p.valor)         AS ticketMedio,
        MAX(p.created_at)    AS ultimoPagamento
      FROM pagamentos p
      JOIN mesas m ON m.id = p.mesa_id
      ${joinGarcom}
      WHERE DATE(p.created_at) BETWEEN ? AND ?
        AND p.status = 'confirmado'
        ${whereMetodo}
      GROUP BY m.id, m.nome_mesa
      ORDER BY totalFaturado DESC
    `, [...extraJoin, inicio, fim, ...extraWhere])

    const [resumo] = await query(`
      SELECT
        COUNT(DISTINCT p.mesa_id)   AS mesasAtendidas,
        COALESCE(SUM(p.valor), 0)   AS faturamentoTotal,
        COALESCE(AVG(p.valor), 0)   AS ticketMedioGeral
      FROM pagamentos p
      ${joinGarcom}
      WHERE DATE(p.created_at) BETWEEN ? AND ?
        AND p.status = 'confirmado'
        ${whereMetodo}
    `, [...extraJoin, inicio, fim, ...extraWhere])

    const abatimentos = await query(`
      SELECT
        m.nome_mesa,
        COUNT(*) AS qtdAbatimentos,
        SUM(pa.valor) AS totalAbatido
      FROM pedido_abatimentos pa
      JOIN pedidos pe ON pe.id = pa.pedido_id
      JOIN mesas   m  ON m.id  = pe.mesa_id
      WHERE DATE(pe.criado_em) BETWEEN ? AND ?
        ${garcomId ? 'AND pe.garcom_id = ?' : ''}
      GROUP BY pe.mesa_id, m.nome_mesa
      ORDER BY totalAbatido DESC
    `, [inicio, fim, ...(garcomId ? [garcomId] : [])])

    return res.json({ periodo: { inicio, fim }, resumo, ranking, abatimentos })
  } catch (e) {
    console.error('ERRO RELATORIO MESAS:', e)
    return res.status(500).json({ error: e.message })
  }
})

// ─── GET /caixa ───────────────────────────────────────────
router.get('/caixa', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { inicio, fim } = periodo(req)
    const funcionarioId = req.query.funcionarioId && req.query.funcionarioId !== 'todos' ? req.query.funcionarioId : null

    const whereFunc = funcionarioId ? 'AND c.funcionario_id = ?' : ''
    const extra     = funcionarioId ? [funcionarioId] : []

    const historico = await query(`
      SELECT
        c.id,
        c.valor_inicial,
        c.valor_fechamento,
        c.status,
        c.data_abertura,
        c.fechado_em,
        u.nome AS operador,
        (COALESCE(c.valor_fechamento, 0) - c.valor_inicial) AS diferenca
      FROM caixa c
      LEFT JOIN usuarios u ON u.id = c.funcionario_id
      WHERE (
        DATE(c.data_abertura) BETWEEN ? AND ?
        OR DATE(c.fechado_em)  BETWEEN ? AND ?
      )
        ${whereFunc}
      ORDER BY c.data_abertura DESC
    `, [inicio, fim, inicio, fim, ...extra])

    const movimentos = await query(`
      SELECT
        mc.tipo,
        mc.valor,
        mc.descricao,
        mc.created_at,
        c.id        AS caixa_id,
        u.nome      AS operador
      FROM movimentos_caixa mc
      JOIN caixa    c ON c.id  = mc.caixa_id
      LEFT JOIN usuarios u ON u.id = c.funcionario_id
      WHERE (
        DATE(mc.created_at) BETWEEN ? AND ?
        OR DATE(c.data_abertura) BETWEEN ? AND ?
        OR DATE(c.fechado_em)    BETWEEN ? AND ?
      )
        ${whereFunc}
      ORDER BY mc.created_at DESC
    `, [inicio, fim, inicio, fim, inicio, fim, ...extra])

    // Exclui a entrada legada "abertura registrada como suprimento" (caixas
    // antigos) — o valor inicial já entra por caixa.valor_inicial; contar
    // esse movimento de novo aqui inflava o total de "suprimento", igual
    // resumoCaixa (caixa.service.js) já evita no resumo por caixa individual
    const totaisPorTipo = await query(`
      SELECT mc.tipo, COUNT(*) AS qtd, SUM(mc.valor) AS total
      FROM movimentos_caixa mc
      JOIN caixa c ON c.id = mc.caixa_id
      WHERE (
        DATE(mc.created_at) BETWEEN ? AND ?
        OR DATE(c.data_abertura) BETWEEN ? AND ?
        OR DATE(c.fechado_em)    BETWEEN ? AND ?
      )
        AND NOT ${LEGADO_ABERTURA}
        ${whereFunc}
      GROUP BY mc.tipo ORDER BY total DESC
    `, [inicio, fim, inicio, fim, inicio, fim, ...extra])

    const [resumo] = await query(`
      SELECT
        COUNT(*) AS qtdCaixas,
        COALESCE(SUM(valor_inicial), 0)    AS totalInicial,
        COALESCE(SUM(valor_fechamento), 0) AS totalFechamento
      FROM caixa c
      WHERE (
        DATE(c.data_abertura) BETWEEN ? AND ?
        OR DATE(c.fechado_em)  BETWEEN ? AND ?
      )
        ${whereFunc}
    `, [inicio, fim, inicio, fim, ...extra])

    return res.json({ periodo: { inicio, fim }, resumo, historico, movimentos, totaisPorTipo })
  } catch (e) {
    console.error('ERRO RELATORIO CAIXA:', e)
    return res.status(500).json({ error: e.message })
  }
})

module.exports = router
