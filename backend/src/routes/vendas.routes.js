const express = require('express')
const router = express.Router()
const { transaction } = require('../database/connection')
const { authenticate } = require('../middlewares/auth.middleware')

// POST / — Venda direta (ficha de balcão, sem mesa)
router.post('/', authenticate, async (req, res) => {
  try {
    const { itens, metodo_id, desconto = 0, valor_pago } = req.body

    if (!Array.isArray(itens) || !itens.length) {
      return res.status(400).json({ error: 'Adicione pelo menos um produto' })
    }
    if (!metodo_id) {
      return res.status(400).json({ error: 'Selecione a forma de pagamento' })
    }

    const subtotal = itens.reduce((s, i) => s + Number(i.preco_unit) * Number(i.quantidade), 0)
    const desc     = Math.min(Math.max(Number(desconto) || 0, 0), subtotal)
    const liquido  = subtotal - desc
    const pago     = Number(valor_pago) || liquido
    const troco    = Math.max(0, pago - liquido)
    const numero   = `F${Date.now()}`

    const ficha = await transaction(async (conn) => {
      // Caixa aberto
      const [caixas] = await conn.execute(
        `SELECT id FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`
      )
      const caixaId = caixas[0]?.id ?? null

      // Método de pagamento
      const [mets] = await conn.execute(
        `SELECT nome FROM metodos_pagamento WHERE id = ?`, [metodo_id]
      )
      const metodoNome = mets[0]?.nome || 'Pagamento'

      // Cria pedido (mesa_id = NULL = venda direta, já fechado)
      const [pedRes] = await conn.execute(
        `INSERT INTO pedidos (mesa_id, garcom_id, status, total, desconto) VALUES (NULL, ?, 'fechado', ?, ?)`,
        [req.user.id, subtotal, desc]
      )
      const pedidoId = pedRes.insertId

      // Insere itens (status = pronto, não passa pela cozinha)
      for (const item of itens) {
        await conn.execute(
          `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, preco_total, status)
           VALUES (?, ?, ?, ?, ?, 'pronto')`,
          [pedidoId, item.produto_id, item.quantidade, item.preco_unit, Number(item.preco_unit) * Number(item.quantidade)]
        )
      }

      // Registro em pagamentos
      await conn.execute(
        `INSERT INTO pagamentos (mesa_id, pedido_id, metodo_id, valor, troco, caixa_id, usuario_id, status)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, 'confirmado')`,
        [pedidoId, metodo_id, liquido, troco, caixaId, req.user.id]
      )

      // Registro no extrato do caixa
      if (caixaId) {
        const itensDesc = itens.map(i => `${i.quantidade}x ${i.nome_produto}`).join(', ')
        await conn.execute(
          `INSERT INTO movimentos_caixa (caixa_id, tipo, valor, descricao, usuario_id)
           VALUES (?, 'pagamento', ?, ?, ?)`,
          [caixaId, liquido, `${metodoNome} · ${numero} · ${itensDesc}`.substring(0, 254), req.user.id]
        )
      }

      return {
        id: numero,
        numero,
        pedido_id: pedidoId,
        itens,
        total: subtotal,
        desconto: desc,
        totalLiquido: liquido,
        valorPago: pago,
        troco,
        metodo: metodoNome,
        operador: req.user.nome,
        createdAt: new Date().toISOString()
      }
    })

    return res.json({ success: true, ficha })
  } catch (error) {
    console.error('ERRO VENDA DIRETA:', error)
    return res.status(500).json({ error: error.message })
  }
})

module.exports = router
