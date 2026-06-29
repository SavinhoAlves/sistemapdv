const express = require('express')
const router = express.Router()

const { query } = require('../database/connection')
const { authenticate } = require('../middlewares/auth.middleware')

router.get('/stats', authenticate, async (req, res) => {
  try {
    const [faturamento] = await query(`
      SELECT COALESCE(SUM(valor), 0) AS total, COUNT(*) AS qtd
      FROM pagamentos
      WHERE DATE(created_at) = CURDATE() AND status = 'confirmado'
    `)

    const [mesas] = await query(`
      SELECT COUNT(*) AS abertas FROM mesas WHERE status = 'aberta' AND data_fechamento IS NULL
    `)

    const [pedidosHoje] = await query(`
      SELECT COUNT(*) AS qtd FROM pedidos WHERE DATE(criado_em) = CURDATE()
    `)

    const [ticketMedio] = await query(`
      SELECT COALESCE(AVG(valor), 0) AS media
      FROM pagamentos
      WHERE DATE(created_at) = CURDATE() AND status = 'confirmado'
    `)

    const pagamentosRecentes = await query(`
      SELECT
        p.id,
        p.valor,
        p.troco,
        p.created_at,
        m.nome_mesa,
        mp.nome AS metodo
      FROM pagamentos p
      LEFT JOIN mesas m        ON m.id  = p.mesa_id
      LEFT JOIN metodos_pagamento mp ON mp.id = p.metodo_id
      WHERE p.status = 'confirmado'
      ORDER BY p.created_at DESC
      LIMIT 8
    `)

    const metodosPie = await query(`
      SELECT mp.nome AS metodo, COUNT(*) AS qtd, SUM(p.valor) AS total
      FROM pagamentos p
      LEFT JOIN metodos_pagamento mp ON mp.id = p.metodo_id
      WHERE DATE(p.created_at) = CURDATE() AND p.status = 'confirmado'
      GROUP BY p.metodo_id, mp.nome
      ORDER BY total DESC
    `)

    return res.json({
      faturamentoHoje:  Number(faturamento.total),
      pagamentosHoje:   Number(faturamento.qtd),
      mesasAbertas:     Number(mesas.abertas),
      pedidosHoje:      Number(pedidosHoje.qtd),
      ticketMedio:      Number(ticketMedio.media),
      pagamentosRecentes,
      metodosPie
    })
  } catch (error) {
    console.error('ERRO DASHBOARD:', error)
    return res.status(500).json({ error: error.message })
  }
})

module.exports = router
