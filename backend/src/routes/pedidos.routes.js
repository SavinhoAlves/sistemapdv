const express = require('express')
const router = express.Router()

const { query, transaction } = require('../database/connection')
const { authenticate, permissoes } = require('../middlewares/auth.middleware')
const { registrarAuditoria } = require('../services/auditoria.service')
const { registrarMovEstoque } = require('../services/estoque.service')
const { emitir } = require('../services/socket.service')

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
        SELECT p.id, p.nome, p.preco, p.estoque_atual, p.gerenciar_estoque,
               COALESCE(c.vai_cozinha, 1) AS vai_cozinha
        FROM produtos p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE p.id = ? AND p.ativo = 1
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

      // Se o produto já está no pedido, acumula quantidade em vez de duplicar —
      // mas só numa linha que ainda está em preparo. Se a linha anterior já saiu
      // (pronto/entregue), a nova unidade precisa voltar à cozinha: vira linha nova.
      const [existente] = await conn.execute(`
        SELECT id, status
        FROM pedido_itens
        WHERE pedido_id = ? AND produto_id = ?
        ORDER BY (status IN ('pendente', 'preparando')) DESC, id DESC
        LIMIT 1
      `, [pedidoId, produto_id])

      const acumula = existente.length > 0 &&
        (!prod.vai_cozinha || ['pendente', 'preparando'].includes(existente[0].status))

      const notificaCozinha = !!prod.vai_cozinha

      if (acumula) {
        await conn.execute(`
          UPDATE pedido_itens
          SET quantidade  = quantidade + ?,
              preco_total = preco_total + ?
          WHERE id = ?
        `, [quantidade, preco * quantidade, existente[0].id])
      } else {
        // Itens de categorias que não vão à cozinha (ex.: bebidas) já nascem prontos
        const statusInicial = prod.vai_cozinha ? 'pendente' : 'pronto'
        await conn.execute(`
          INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, preco_total, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [pedidoId, produto_id, quantidade, preco, preco * quantidade, statusInicial])
      }

      // Desconta estoque se o produto controla estoque
      if (prod.gerenciar_estoque) {
        await conn.execute(`
          UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?
        `, [quantidade, produto_id])
        await registrarMovEstoque(conn, {
          produto_id,
          tipo: 'venda',
          quantidade: -quantidade,
          estoque_resultante: Number(prod.estoque_atual) - quantidade,
          motivo: `Pedido mesa #${mesaId}`,
          usuario_id: req.user.id
        })
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

      return { pedidoId, total, notificaCozinha, produtoNome: prod.nome }
    })

    if (resultado.notificaCozinha) {
      emitir('cozinha:novo_item', {
        mesa_id: mesaId,
        produto: resultado.produtoNome,
        quantidade
      })
    }

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
        SELECT pi.id, pi.produto_id, pi.quantidade, pi.preco_unitario, pi.pedido_id, pi.status,
               p.nome AS produto_nome,
               COALESCE(c.vai_cozinha, 1) AS vai_cozinha,
               ped.mesa_id
        FROM pedido_itens pi
        JOIN produtos p        ON p.id   = pi.produto_id
        LEFT JOIN categorias c ON c.id   = p.categoria_id
        JOIN pedidos ped       ON ped.id = pi.pedido_id
        WHERE pi.id = ?
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
      const [restauro] = await conn.execute(`
        UPDATE produtos SET estoque_atual = estoque_atual + 1
        WHERE id = ? AND gerenciar_estoque = 1
      `, [item.produto_id])
      if (restauro.affectedRows > 0) {
        const [[prod]] = await conn.execute(
          `SELECT estoque_atual FROM produtos WHERE id = ?`, [item.produto_id]
        )
        await registrarMovEstoque(conn, {
          produto_id: item.produto_id,
          tipo: 'cancelamento',
          quantidade: 1,
          estoque_resultante: Number(prod.estoque_atual),
          motivo: `Item removido do pedido #${pedidoId}`,
          usuario_id: req.user.id
        })
      }

      return {
        total,
        deletado: item.quantidade <= 1,
        produto_id: item.produto_id,
        pedido_id: pedidoId,
        emCozinha: item.vai_cozinha && ['pendente', 'preparando'].includes(item.status),
        produto_nome: item.produto_nome,
        mesa_id: item.mesa_id
      }
    })

    if (resultado.emCozinha) {
      emitir('cozinha:item_cancelado', {
        mesa_id: resultado.mesa_id,
        produto: resultado.produto_nome,
        quantidade: 1,
        removido_tudo: resultado.deletado
      })
    }

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
        SELECT pi.pedido_id, pi.produto_id, pi.quantidade, pi.status,
               p.nome AS produto_nome,
               COALESCE(c.vai_cozinha, 1) AS vai_cozinha,
               ped.mesa_id
        FROM pedido_itens pi
        JOIN produtos p        ON p.id   = pi.produto_id
        LEFT JOIN categorias c ON c.id   = p.categoria_id
        JOIN pedidos ped       ON ped.id = pi.pedido_id
        WHERE pi.id = ? LIMIT 1 FOR UPDATE
      `, [itemId])

      if (!rows || rows.length === 0) {
        const err = new Error('Item não encontrado')
        err.status = 404
        throw err
      }

      const { pedido_id: pedidoId, produto_id, quantidade, status, produto_nome, vai_cozinha, mesa_id } = rows[0]

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
      const [restauro] = await conn.execute(`
        UPDATE produtos SET estoque_atual = estoque_atual + ?
        WHERE id = ? AND gerenciar_estoque = 1
      `, [quantidade, produto_id])
      if (restauro.affectedRows > 0) {
        const [[prod]] = await conn.execute(
          `SELECT estoque_atual FROM produtos WHERE id = ?`, [produto_id]
        )
        await registrarMovEstoque(conn, {
          produto_id,
          tipo: 'cancelamento',
          quantidade: Number(quantidade),
          estoque_resultante: Number(prod.estoque_atual),
          motivo: `Item excluído do pedido #${pedidoId}`,
          usuario_id: req.user.id
        })
      }

      return {
        pedidoId, produto_id, quantidade,
        emCozinha: vai_cozinha && ['pendente', 'preparando'].includes(status),
        produto_nome, mesa_id
      }
    })

    if (info.emCozinha) {
      emitir('cozinha:item_cancelado', {
        mesa_id: info.mesa_id,
        produto: info.produto_nome,
        quantidade: Number(info.quantidade),
        removido_tudo: true
      })
    }

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
      SELECT id, total, desconto, taxa_pct
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

    // Taxa de serviço e pagamentos parciais já registrados
    const liquido    = Number(pedido.total) - Number(pedido.desconto)
    const taxa_valor = Math.round(liquido * Number(pedido.taxa_pct)) / 100
    const [pagos] = await query(`
      SELECT COALESCE(SUM(valor), 0) AS pago FROM pagamentos
      WHERE pedido_id = ? AND status = 'confirmado'
    `, [pedido.id])
    const pago     = Number(pagos.pago)
    const restante = Math.max(0, liquido + taxa_valor - pago)

    return res.json({ ...pedido, abatimentos, taxa_valor, pago, restante })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// ======================
// TAXA DE SERVIÇO (aplicar/remover)
// ======================
router.patch('/:id/taxa-servico', authenticate, async (req, res) => {
  try {
    const aplicar = !!req.body.aplicar

    let pct = 0
    if (aplicar) {
      const [cfg] = await query(`SELECT taxa_servico_pct FROM configuracoes WHERE id = 1`)
      pct = Number(cfg?.taxa_servico_pct ?? 10)
      if (pct <= 0) pct = 10
    }

    const resultado = await query(
      `UPDATE pedidos SET taxa_pct = ? WHERE id = ? AND status != 'fechado'`,
      [pct, req.params.id]
    )
    if (!resultado.affectedRows) {
      return res.status(404).json({ error: 'Pedido não encontrado ou já fechado' })
    }

    if (!aplicar) {
      registrarAuditoria(req.user.id, 'taxa_remover', 'pedido', Number(req.params.id), null)
    }

    return res.json({ success: true, taxa_pct: pct })
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
    // Prontos ficam visíveis na aba de expedição até serem entregues
    // (janela de 12h para não arrastar backlog antigo de mesas esquecidas)
    const itens = await query(`
      SELECT
        pi.id,
        pi.pedido_id,
        pi.produto_id,
        pi.quantidade,
        pi.status,
        pi.observacao,
        pi.created_at,
        pi.updated_at,
        p.nome AS produto,
        c.nome AS categoria,
        m.id   AS mesa_id,
        COALESCE(m.nome_mesa, CONCAT('Mesa ', m.id)) AS mesa_nome,
        m.cliente
      FROM pedido_itens pi
      JOIN pedidos ped ON ped.id = pi.pedido_id AND ped.status != 'fechado'
      JOIN produtos p   ON p.id  = pi.produto_id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      JOIN mesas m      ON m.id  = ped.mesa_id
      WHERE COALESCE(c.vai_cozinha, 1) = 1
        AND (
          pi.status IN ('pendente', 'preparando')
          OR (pi.status = 'pronto' AND pi.updated_at >= NOW() - INTERVAL 12 HOUR)
        )
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
        categoria:  item.categoria,
        quantidade: item.quantidade,
        status:     item.status,
        observacao: item.observacao,
        created_at: item.created_at,
        updated_at: item.updated_at
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
router.patch('/itens/:itemId/status', authenticate, permissoes.atualizarItemCozinha, async (req, res) => {
  try {
    const { status } = req.body
    const statusValidos = ['pendente', 'preparando', 'pronto', 'entregue']
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' })
    }

    const resultado = await query(
      'UPDATE pedido_itens SET status = ? WHERE id = ?',
      [status, req.params.itemId]
    )
    if (!resultado.affectedRows) {
      return res.status(404).json({ error: 'Item não encontrado' })
    }

    emitir('cozinha:item_status', { item_id: Number(req.params.itemId), status })
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

module.exports = router
