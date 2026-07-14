const express = require('express')
const router = express.Router()
const { transaction } = require('../database/connection')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { registrarAuditoria } = require('../services/auditoria.service')
const { registrarMovEstoque } = require('../services/estoque.service')

// POST / — Venda direta (ficha de balcão, sem mesa) — só administrador
// (mesma restrição já aplicada à rota /vendas no frontend)
router.post('/', authenticate, authorize('administrador'), async (req, res) => {
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
      // Caixa aberto é obrigatório — sem ele a venda não entraria no extrato
      const [caixas] = await conn.execute(
        `SELECT id FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`
      )
      if (!caixas.length) {
        const err = new Error('Caixa fechado — abra o caixa antes de registrar vendas')
        err.status = 400
        throw err
      }
      const caixaId = caixas[0].id

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

      // Insere itens e desconta estoque (status = pronto, não passa pela cozinha)
      for (const item of itens) {
        const [prodRows] = await conn.execute(
          `SELECT id, gerenciar_estoque, estoque_atual FROM produtos WHERE id = ? AND ativo = 1 LIMIT 1 FOR UPDATE`,
          [item.produto_id]
        )

        if (!prodRows || prodRows.length === 0) {
          throw new Error(`Produto "${item.nome_produto || item.produto_id}" não encontrado`)
        }

        const prod = prodRows[0]
        const qtd  = Number(item.quantidade)

        const estoqueAtual = Number(prod.estoque_atual)
        const temEstoque   = prod.gerenciar_estoque || estoqueAtual > 0

        // Bloqueia venda apenas quando gerenciar_estoque está ativo e o estoque é insuficiente
        if (prod.gerenciar_estoque && estoqueAtual < qtd) {
          throw new Error(
            estoqueAtual <= 0
              ? `"${item.nome_produto}" sem estoque disponível`
              : `Estoque insuficiente para "${item.nome_produto}". Disponível: ${estoqueAtual}`
          )
        }

        await conn.execute(
          `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, preco_total, status)
           VALUES (?, ?, ?, ?, ?, 'pronto')`,
          [pedidoId, item.produto_id, qtd, item.preco_unit, Number(item.preco_unit) * qtd]
        )

        // Decrementa sempre que o produto tem estoque configurado (>0) ou gerenciar_estoque ativo
        if (temEstoque) {
          await conn.execute(
            `UPDATE produtos SET estoque_atual = GREATEST(0, estoque_atual - ?) WHERE id = ?`,
            [qtd, item.produto_id]
          )
          const resultante = Math.max(0, estoqueAtual - qtd)
          await registrarMovEstoque(conn, {
            produto_id: item.produto_id,
            tipo: 'venda',
            quantidade: resultante - estoqueAtual,
            estoque_resultante: resultante,
            motivo: `Venda ${numero}`,
            usuario_id: req.user.id
          })
        }
      }

      // Registro em pagamentos
      const [pagRes] = await conn.execute(
        `INSERT INTO pagamentos (mesa_id, pedido_id, metodo_id, valor, troco, caixa_id, usuario_id, status)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, 'confirmado')`,
        [pedidoId, metodo_id, liquido, troco, caixaId, req.user.id]
      )

      // Registro no extrato do caixa, vinculado ao pagamento (permite estorno)
      const itensDesc = itens.map(i => `${i.quantidade}x ${i.nome_produto}`).join(', ')
      await conn.execute(
        `INSERT INTO movimentos_caixa (caixa_id, tipo, valor, descricao, usuario_id, pagamento_id)
         VALUES (?, 'pagamento', ?, ?, ?, ?)`,
        [caixaId, liquido, `${metodoNome} · ${numero} · ${itensDesc}`.substring(0, 254), req.user.id, pagRes.insertId]
      )

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

    if (desc > 0) {
      registrarAuditoria(req.user.id, 'venda_desconto', 'pedido', ficha.pedido_id, {
        desconto: desc, subtotal
      })
    }
    return res.json({ success: true, ficha })
  } catch (error) {
    console.error('ERRO VENDA DIRETA:', error)
    return res.status(error.status || 500).json({ error: error.message })
  }
})

module.exports = router
