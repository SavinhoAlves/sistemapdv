const express = require('express')
const router = express.Router()

const { query, transaction } = require('../database/connection')
const { authenticate } = require('../middlewares/auth.middleware')

// GET /metodos
router.get('/metodos', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT id, nome FROM metodos_pagamento WHERE ativo = 1 ORDER BY id ASC')
    return res.json(rows)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// POST / — registrar pagamento e fechar pedido/mesa
router.post('/', authenticate, async (req, res) => {
  try {
    const { mesa_id, pedido_id, metodo_id, valor_pago, caixa_id } = req.body

    if (!mesa_id || !metodo_id || !valor_pago) {
      return res.status(400).json({ error: 'mesa_id, metodo_id e valor_pago são obrigatórios' })
    }

    await transaction(async (conn) => {
      // Busca caixa aberto (independente do que o frontend enviou)
      const [caixas] = await conn.execute(
        `SELECT id FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`
      )
      const caixaId = caixas[0]?.id ?? null

      // Busca pedido aberto da mesa
      const [pedidos] = await conn.execute(`
        SELECT id, total, desconto FROM pedidos
        WHERE mesa_id = ? AND status != 'fechado'
        ORDER BY id DESC LIMIT 1 FOR UPDATE
      `, [mesa_id])

      if (!pedidos.length) {
        const err = new Error('Nenhum pedido aberto para esta mesa'); err.status = 404; throw err
      }

      const pedido   = pedidos[0]
      const pedId    = pedido_id || pedido.id
      const totalLiq = Number(pedido.total) - Number(pedido.desconto)
      const troco    = Math.max(0, Number(valor_pago) - totalLiq)

      // Busca nome do método para registrar na descrição
      const [metodos] = await conn.execute(
        `SELECT nome FROM metodos_pagamento WHERE id = ?`, [metodo_id]
      )
      const metodo = metodos[0]

      await conn.execute(`
        INSERT INTO pagamentos (mesa_id, pedido_id, metodo_id, valor, troco, caixa_id, usuario_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmado')
      `, [mesa_id, pedId, metodo_id, totalLiq, troco, caixaId, req.user.id])

      await conn.execute(`UPDATE pedidos SET status = 'fechado' WHERE id = ?`, [pedId])
      await conn.execute(`UPDATE mesas SET status = 'fechada', data_fechamento = NOW() WHERE id = ?`, [mesa_id])

      if (caixaId) {
        await conn.execute(`
          INSERT INTO movimentos_caixa (caixa_id, tipo, valor, descricao, usuario_id)
          VALUES (?, 'pagamento', ?, ?, ?)
        `, [caixaId, totalLiq, `${metodo?.nome || 'Pagamento'} · Mesa ${mesa_id}`, req.user.id])
      }
    })

    return res.json({ success: true })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message })
  }
})

// POST /metodos — criar método
router.post('/metodos', authenticate, async (req, res) => {
  try {
    const { nome } = req.body
    if (!nome?.trim()) return res.status(400).json({ error: 'nome é obrigatório' })
    const result = await query('INSERT INTO metodos_pagamento (nome, ativo) VALUES (?, 1)', [nome.trim()])
    return res.json({ success: true, id: result.insertId })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /metodos/:id — ativar/desativar
router.patch('/metodos/:id', authenticate, async (req, res) => {
  try {
    const { ativo } = req.body
    await query('UPDATE metodos_pagamento SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, req.params.id])
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// GET /metodos/todos — todos (inclusive inativos, para admin)
router.get('/metodos/todos', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT id, nome, ativo FROM metodos_pagamento ORDER BY id ASC')
    return res.json(rows)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

module.exports = router
