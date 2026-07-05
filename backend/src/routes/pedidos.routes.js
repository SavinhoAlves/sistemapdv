const express = require('express')
const router = express.Router()

const { query, transaction } = require('../database/connection')
const { authenticate } = require('../middlewares/auth.middleware')
const { registrarAuditoria } = require('../services/auditoria.service')

// ======================
// ADICIONAR PRODUTO
// ======================
router.post('/adicionar', authenticate, async (req, res) => {
  try {
    const {
      mesa_id,
      produto_id,
      quantidade
    } = req.body

    // ======================
    // VALIDAÇÃO
    // ======================
    if (!mesa_id || !produto_id || !quantidade || quantidade <= 0) {
      return res.status(400).json({
        error: 'mesa_id, produto_id e quantidade (> 0) são obrigatórios'
      })
    }

    // ======================
    // VALIDAR MESA
    // ======================
    const mesa = await query(`
      SELECT id
      FROM mesas
      WHERE id = ?
      LIMIT 1
    `, [mesa_id])

    if (!mesa || mesa.length === 0) {
      return res.status(404).json({
        error: 'Mesa não encontrada'
      })
    }

    const mesaId = mesa[0].id

    const garcomId = req.user.id

    // ======================
    // OPERAÇÃO ATÔMICA
    // ======================
    const resultado = await transaction(async (conn) => {

      // Busca e trava o produto para leitura de estoque segura
      const [prodRows] = await conn.execute(`
        SELECT id, preco, estoque_atual, gerenciar_estoque
        FROM produtos
        WHERE id = ? AND ativo = 1
        LIMIT 1
        FOR UPDATE
      `, [produto_id])

      if (!prodRows || prodRows.length === 0) {
        const err = new Error('Produto não encontrado')
        err.status = 404
        throw err
      }

      const prod = prodRows[0]

      if (prod.gerenciar_estoque && prod.estoque_atual < quantidade) {
        const err = new Error(
          prod.estoque_atual <= 0
            ? 'Produto sem estoque disponível'
            : `Estoque insuficiente. Disponível: ${prod.estoque_atual}`
        )
        err.status = 400
        throw err
      }

      const preco = Number(prod.preco)

      // Busca pedido aberto com lock para evitar race condition
      const [pedidos] = await conn.execute(`
        SELECT id
        FROM pedidos
        WHERE mesa_id = ?
          AND status != 'fechado'
        LIMIT 1
        FOR UPDATE
      `, [mesaId])

      let pedidoId

      if (!pedidos || pedidos.length === 0) {
        const [result] = await conn.execute(`
          INSERT INTO pedidos (mesa_id, garcom_id, status, total)
          VALUES (?, ?, 'aberto', 0)
        `, [mesaId, garcomId])

        pedidoId = result.insertId
      } else {
        pedidoId = pedidos[0].id
      }

      // Se o produto já está no pedido, acumula quantidade em vez de duplicar
      const [existente] = await conn.execute(`
        SELECT id
        FROM pedido_itens
        WHERE pedido_id = ? AND produto_id = ?
        LIMIT 1
      `, [pedidoId, produto_id])

      if (existente && existente.length > 0) {
        await conn.execute(`
          UPDATE pedido_itens
          SET quantidade  = quantidade + ?,
              preco_total = preco_total + ?
          WHERE id = ?
        `, [quantidade, preco * quantidade, existente[0].id])
      } else {
        await conn.execute(`
          INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, preco_total)
          VALUES (?, ?, ?, ?, ?)
        `, [pedidoId, produto_id, quantidade, preco, preco * quantidade])
      }

      // Desconta estoque se o produto controla estoque
      if (prod.gerenciar_estoque) {
        await conn.execute(`
          UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?
        `, [quantidade, produto_id])
      }

      const [totais] = await conn.execute(`
        SELECT SUM(preco_total) AS total
        FROM pedido_itens
        WHERE pedido_id = ?
      `, [pedidoId])

      const total = Number(totais[0]?.total || 0)

      await conn.execute(`
        UPDATE pedidos
        SET total = ?
        WHERE id = ?
      `, [total, pedidoId])

      await conn.execute(`
        UPDATE mesas
        SET status = 'aberta'
        WHERE id = ?
      `, [mesaId])

      return { pedidoId, total }
    })

    return res.json({
      success: true,
      mesa_id: mesaId,
      pedido_id: resultado.pedidoId,
      total: resultado.total
    })

  } catch (error) {
    console.error('ERRO COMPLETO:', error)

    return res.status(500).json({
      error: error.sqlMessage || error.message || 'Erro ao adicionar produto'
    })
  }
})

// ======================
// DECREMENTAR 1 UNIDADE
// ======================
router.patch('/itens/:itemId/decrementar', authenticate, async (req, res) => {
  try {
    const { itemId } = req.params

    const resultado = await transaction(async (conn) => {
      const [rows] = await conn.execute(`
        SELECT id, produto_id, quantidade, preco_unitario, pedido_id
        FROM pedido_itens
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `, [itemId])

      if (!rows || rows.length === 0) {
        const err = new Error('Item não encontrado')
        err.status = 404
        throw err
      }

      const item = rows[0]
      const pedidoId = item.pedido_id

      if (item.quantidade <= 1) {
        await conn.execute('DELETE FROM pedido_itens WHERE id = ?', [itemId])
      } else {
        await conn.execute(`
          UPDATE pedido_itens
          SET
            quantidade  = quantidade - 1,
            preco_total = preco_total - preco_unitario
          WHERE id = ?
        `, [itemId])
      }

      const [totais] = await conn.execute(`
        SELECT COALESCE(SUM(preco_total), 0) AS total
        FROM pedido_itens
        WHERE pedido_id = ?
      `, [pedidoId])

      const total = Number(totais[0].total)

      await conn.execute('UPDATE pedidos SET total = ? WHERE id = ?', [total, pedidoId])

      // Restaura 1 unidade no estoque
      await conn.execute(`
        UPDATE produtos SET estoque_atual = estoque_atual + 1
        WHERE id = ? AND gerenciar_estoque = 1
      `, [item.produto_id])

      return { total, deletado: item.quantidade <= 1, produto_id: item.produto_id, pedido_id: pedidoId }
    })

    registrarAuditoria(req.user.id, 'item_decrementar', 'pedido_item', Number(itemId), {
      pedido_id: resultado.pedido_id, produto_id: resultado.produto_id, excluido: resultado.deletado
    })
    return res.json({ success: true, ...resultado })

  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.sqlMessage || error.message || 'Erro ao decrementar item'
    })
  }
})

// ======================
// EXCLUIR ITEM
// ======================
router.delete('/itens/:itemId', authenticate, async (req, res) => {
  try {
    const { itemId } = req.params

    const info = await transaction(async (conn) => {
      const [rows] = await conn.execute(`
        SELECT pedido_id, produto_id, quantidade
        FROM pedido_itens WHERE id = ? LIMIT 1 FOR UPDATE
      `, [itemId])

      if (!rows || rows.length === 0) {
        const err = new Error('Item não encontrado')
        err.status = 404
        throw err
      }

      const { pedido_id: pedidoId, produto_id, quantidade } = rows[0]

      await conn.execute('DELETE FROM pedido_itens WHERE id = ?', [itemId])

      const [totais] = await conn.execute(`
        SELECT COALESCE(SUM(preco_total), 0) AS total
        FROM pedido_itens
        WHERE pedido_id = ?
      `, [pedidoId])

      await conn.execute('UPDATE pedidos SET total = ? WHERE id = ?', [
        Number(totais[0].total),
        pedidoId
      ])

      // Restaura todas as unidades no estoque
      await conn.execute(`
        UPDATE produtos SET estoque_atual = estoque_atual + ?
        WHERE id = ? AND gerenciar_estoque = 1
      `, [quantidade, produto_id])

      return { pedidoId, produto_id, quantidade }
    })

    registrarAuditoria(req.user.id, 'item_excluir', 'pedido_item', Number(itemId), {
      pedido_id: info.pedidoId, produto_id: info.produto_id, quantidade: info.quantidade
    })
    return res.json({ success: true })

  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.sqlMessage || error.message || 'Erro ao excluir item'
    })
  }
})

// ======================
// PEDIDO ATUAL DA MESA
// ======================
router.get('/mesa/:mesaId', authenticate, async (req, res) => {
  try {
    const rows = await query(`
      SELECT id, total, desconto
      FROM pedidos
      WHERE mesa_id = ? AND status != 'fechado'
      ORDER BY id DESC LIMIT 1
    `, [req.params.mesaId])

    if (!rows.length) return res.json(null)

    const pedido = rows[0]
    const abatimentos = await query(`
      SELECT id, valor, motivo FROM pedido_abatimentos
      WHERE pedido_id = ? ORDER BY id ASC
    `, [pedido.id])

    return res.json({ ...pedido, abatimentos })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// ======================
// ABATER VALOR DO PEDIDO
// ======================
router.patch('/:id/abater', authenticate, async (req, res) => {
  try {
    const { valor } = req.body
    if (!valor || isNaN(valor) || Number(valor) <= 0) {
      return res.status(400).json({ error: 'Valor inválido' })
    }

    const resultado = await transaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id, total, desconto FROM pedidos WHERE id = ? FOR UPDATE',
        [req.params.id]
      )
      if (!rows.length) {
        const err = new Error('Pedido não encontrado'); err.status = 404; throw err
      }

      const v = Math.min(Number(valor), Number(rows[0].total) - Number(rows[0].desconto))
      if (v <= 0) {
        const err = new Error('Abatimento excede o total do pedido'); err.status = 400; throw err
      }

      const motivo = req.body.motivo || null
      const [ins] = await conn.execute(
        'INSERT INTO pedido_abatimentos (pedido_id, valor, motivo) VALUES (?, ?, ?)',
        [req.params.id, v, motivo]
      )
      await conn.execute(
        'UPDATE pedidos SET desconto = desconto + ? WHERE id = ?',
        [v, req.params.id]
      )
      return { id: ins.insertId, valor: v, motivo }
    })

    registrarAuditoria(req.user.id, 'pedido_abater', 'pedido', Number(req.params.id), {
      valor: resultado.valor, motivo: resultado.motivo
    })
    return res.json({ success: true, abatimento: resultado })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message })
  }
})

// ======================
// KDS — PEDIDOS DA COZINHA
// ======================
router.get('/cozinha', authenticate, async (req, res) => {
  try {
    const itens = await query(`
      SELECT
        pi.id,
        pi.pedido_id,
        pi.produto_id,
        pi.quantidade,
        pi.status,
        pi.observacao,
        pi.created_at,
        p.nome AS produto,
        m.id   AS mesa_id,
        COALESCE(m.nome_mesa, CONCAT('Mesa ', m.id)) AS mesa_nome,
        m.cliente
      FROM pedido_itens pi
      JOIN pedidos ped ON ped.id = pi.pedido_id AND ped.status != 'fechado'
      JOIN produtos p   ON p.id  = pi.produto_id
      JOIN mesas m      ON m.id  = ped.mesa_id
      WHERE pi.status IN ('pendente', 'preparando')
      ORDER BY pi.created_at ASC
    `)

    // Agrupa por mesa
    const mesasMap = {}
    for (const item of itens) {
      const key = item.mesa_id
      if (!mesasMap[key]) {
        mesasMap[key] = {
          mesa_id:   item.mesa_id,
          mesa_nome: item.mesa_nome,
          cliente:   item.cliente,
          itens:     []
        }
      }
      mesasMap[key].itens.push({
        id:         item.id,
        pedido_id:  item.pedido_id,
        produto_id: item.produto_id,
        produto:    item.produto,
        quantidade: item.quantidade,
        status:     item.status,
        observacao: item.observacao,
        created_at: item.created_at
      })
    }

    return res.json(Object.values(mesasMap))
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// ======================
// ATUALIZAR STATUS DO ITEM (COZINHA)
// ======================
router.patch('/itens/:itemId/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body
    const statusValidos = ['pendente', 'preparando', 'pronto']
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' })
    }

    await query(
      'UPDATE pedido_itens SET status = ? WHERE id = ?',
      [status, req.params.itemId]
    )
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

module.exports = router
