const express = require('express')
const router = express.Router()

const { query, transaction } = require('../database/connection')
const { authenticate } = require('../middlewares/auth.middleware')
const { emitir } = require('../services/socket.service')

// GET /metodos
router.get('/metodos', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT id, nome FROM metodos_pagamento WHERE ativo = 1 ORDER BY id ASC')
    return res.json(rows)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// POST / — registrar pagamento (total ou parcial); fecha pedido/mesa ao quitar
router.post('/', authenticate, async (req, res) => {
  try {
    const { mesa_id, pedido_id, metodo_id, valor_pago, valor_recebido } = req.body

    if (!mesa_id || !metodo_id || !valor_pago || Number(valor_pago) <= 0) {
      return res.status(400).json({ error: 'mesa_id, metodo_id e valor_pago são obrigatórios' })
    }

    const resultado = await transaction(async (conn) => {
      // Caixa aberto é obrigatório — sem ele o pagamento não entraria no extrato
      const [caixas] = await conn.execute(
        `SELECT id FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`
      )
      if (!caixas.length) {
        const err = new Error('Caixa fechado — abra o caixa para receber pagamentos')
        err.status = 400
        throw err
      }
      const caixaId = caixas[0].id

      // Busca pedido aberto da mesa
      const [pedidos] = await conn.execute(`
        SELECT id, total, desconto, taxa_pct FROM pedidos
        WHERE mesa_id = ? AND status != 'fechado'
        ORDER BY id DESC LIMIT 1 FOR UPDATE
      `, [mesa_id])

      if (!pedidos.length) {
        const err = new Error('Nenhum pedido aberto para esta mesa'); err.status = 404; throw err
      }

      const pedido     = pedidos[0]
      const pedId      = pedido_id || pedido.id
      const liquido    = Number(pedido.total) - Number(pedido.desconto)
      const taxaValor  = Math.round(liquido * Number(pedido.taxa_pct)) / 100
      const totalConta = liquido + taxaValor

      // Quanto já foi pago (divisão de conta = vários pagamentos parciais)
      const [pagos] = await conn.execute(`
        SELECT COALESCE(SUM(valor), 0) AS pago FROM pagamentos
        WHERE pedido_id = ? AND status = 'confirmado'
      `, [pedId])
      const jaPago   = Number(pagos[0].pago)
      const restante = Math.max(0, Math.round((totalConta - jaPago) * 100) / 100)

      if (restante <= 0) {
        const err = new Error('Esta conta já está quitada'); err.status = 400; throw err
      }

      // Aplica no máximo o restante; troco calculado sobre o que foi entregue
      const valorAplicado = Math.min(Number(valor_pago), restante)
      const recebido      = Number(valor_recebido) || valorAplicado
      const troco         = Math.max(0, Math.round((recebido - valorAplicado) * 100) / 100)

      // Busca nome do método para registrar na descrição
      const [metodos] = await conn.execute(
        `SELECT nome FROM metodos_pagamento WHERE id = ?`, [metodo_id]
      )
      const metodo = metodos[0]

      const [pagRes] = await conn.execute(`
        INSERT INTO pagamentos (mesa_id, pedido_id, metodo_id, valor, troco, caixa_id, usuario_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmado')
      `, [mesa_id, pedId, metodo_id, valorAplicado, troco, caixaId, req.user.id])

      const novoRestante = Math.max(0, Math.round((restante - valorAplicado) * 100) / 100)
      const quitado      = novoRestante <= 0.009

      if (quitado) {
        await conn.execute(`UPDATE pedidos SET status = 'fechado' WHERE id = ?`, [pedId])
        await conn.execute(`UPDATE mesas SET status = 'fechada', data_fechamento = NOW() WHERE id = ?`, [mesa_id])
      }

      const desc = `${metodo?.nome || 'Pagamento'} · Mesa ${mesa_id}${quitado ? '' : ' (parcial)'}`
      await conn.execute(`
        INSERT INTO movimentos_caixa (caixa_id, tipo, valor, descricao, usuario_id, pagamento_id)
        VALUES (?, 'pagamento', ?, ?, ?, ?)
      `, [caixaId, valorAplicado, desc, req.user.id, pagRes.insertId])

      return { quitado, restante: quitado ? 0 : novoRestante, valor_aplicado: valorAplicado, troco }
    })

    emitir('caixa:atualizado', { tipo: 'pagamento_registrado', mesa_id: Number(mesa_id) })
    if (resultado.quitado) {
      emitir('mesas:atualizado', { mesa_id: Number(mesa_id), tipo: 'fechada' })
    }

    return res.json({ success: true, ...resultado })
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
