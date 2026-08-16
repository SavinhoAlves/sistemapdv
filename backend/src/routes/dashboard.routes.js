const express = require('express')
const router = express.Router()

const { query } = require('../database/connection')
const { authenticate, authorize } = require('../middlewares/auth.middleware')

router.get('/stats', authenticate, authorize('administrador', 'caixa'), async (req, res) => {
  try {
    const [mesas] = await query(`
      SELECT COUNT(*) AS abertas FROM mesas WHERE status = 'aberta' AND data_fechamento IS NULL
    `)

    // Quando o caixa está aberto, usa a sessão atual (igual ao caixa.vue via /caixa/movimentos).
    // Quando fechado, cai para os totais do dia — útil na revisão pós-fechamento.
    const caixas = await query(`SELECT id FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`)
    const caixaId = caixas[0]?.id || null

    let faturamentoHoje = 0, pagamentosHoje = 0, pedidosHoje = 0, ticketMedio = 0
    let pagamentosRecentes = [], metodosPie = []

    if (caixaId) {
      const [fat] = await query(`
        SELECT COALESCE(SUM(valor), 0) AS total, COUNT(*) AS qtd, COALESCE(AVG(valor), 0) AS media
        FROM pagamentos
        WHERE caixa_id = ? AND status = 'confirmado'
      `, [caixaId])

      const [peds] = await query(`
        SELECT COUNT(DISTINCT pedido_id) AS qtd
        FROM pagamentos
        WHERE caixa_id = ? AND status = 'confirmado'
      `, [caixaId])

      faturamentoHoje = Number(fat.total)
      pagamentosHoje  = Number(fat.qtd)
      ticketMedio     = Number(fat.media)
      pedidosHoje     = Number(peds.qtd)

      pagamentosRecentes = await query(`
        SELECT p.id, p.valor, p.troco, p.created_at, m.nome_mesa, mp.nome AS metodo
        FROM pagamentos p
        LEFT JOIN mesas m              ON m.id  = p.mesa_id
        LEFT JOIN metodos_pagamento mp ON mp.id = p.metodo_id
        WHERE p.caixa_id = ? AND p.status = 'confirmado'
        ORDER BY p.created_at DESC
        LIMIT 8
      `, [caixaId])

      metodosPie = await query(`
        SELECT mp.nome AS metodo, COUNT(*) AS qtd, SUM(p.valor) AS total
        FROM pagamentos p
        LEFT JOIN metodos_pagamento mp ON mp.id = p.metodo_id
        WHERE p.caixa_id = ? AND p.status = 'confirmado'
        GROUP BY p.metodo_id, mp.nome
        ORDER BY total DESC
      `, [caixaId])
    } else {
      const [fat] = await query(`
        SELECT COALESCE(SUM(valor), 0) AS total, COUNT(*) AS qtd, COALESCE(AVG(valor), 0) AS media
        FROM pagamentos
        WHERE DATE(created_at) = CURDATE() AND status = 'confirmado'
      `)

      const [peds] = await query(`
        SELECT COUNT(*) AS qtd FROM pedidos WHERE DATE(criado_em) = CURDATE()
      `)

      faturamentoHoje = Number(fat.total)
      pagamentosHoje  = Number(fat.qtd)
      ticketMedio     = Number(fat.media)
      pedidosHoje     = Number(peds.qtd)

      pagamentosRecentes = await query(`
        SELECT p.id, p.valor, p.troco, p.created_at, m.nome_mesa, mp.nome AS metodo
        FROM pagamentos p
        LEFT JOIN mesas m              ON m.id  = p.mesa_id
        LEFT JOIN metodos_pagamento mp ON mp.id = p.metodo_id
        WHERE DATE(p.created_at) = CURDATE() AND p.status = 'confirmado'
        ORDER BY p.created_at DESC
        LIMIT 8
      `)

      metodosPie = await query(`
        SELECT mp.nome AS metodo, COUNT(*) AS qtd, SUM(p.valor) AS total
        FROM pagamentos p
        LEFT JOIN metodos_pagamento mp ON mp.id = p.metodo_id
        WHERE DATE(p.created_at) = CURDATE() AND p.status = 'confirmado'
        GROUP BY p.metodo_id, mp.nome
        ORDER BY total DESC
      `)
    }

    return res.json({
      faturamentoHoje,
      pagamentosHoje,
      mesasAbertas: Number(mesas.abertas),
      pedidosHoje,
      ticketMedio,
      pagamentosRecentes,
      metodosPie
    })
  } catch (error) {
    console.error('ERRO DASHBOARD:', error)
    return res.status(500).json({ error: error.message })
  }
})

module.exports = router
