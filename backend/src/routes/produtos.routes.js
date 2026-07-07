const express = require('express')
const router = express.Router()

const { query, transaction } = require('../database/connection')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { registrarMovEstoque } = require('../services/estoque.service')

// ======================
// LISTAR PRODUTOS
// ======================
router.get('/', authenticate, async (req, res) => {
  try {
    const produtos = await query(`
      SELECT
        p.id,
        p.nome,
        p.preco,
        p.categoria_id,
        c.nome AS categoria,
        p.ativo,
        p.estoque_atual,
        p.estoque_minimo,
        p.gerenciar_estoque
      FROM produtos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      ORDER BY p.nome ASC
    `)

    return res.json(produtos)

  } catch (error) {
    console.error(error)
    return res.status(500).json({
      error: 'Erro ao buscar produtos'
    })
  }
})

// ======================
// CRIAR PRODUTO
// ======================
router.post('/', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const {
      nome,
      preco,
      categoria_id,
      ativo,
      estoque_atual,
      estoque_minimo,
      gerenciar_estoque
    } = req.body

    if (!nome || preco === undefined) {
      return res.status(400).json({
        error: 'nome e preco são obrigatórios'
      })
    }

    const result = await query(`
      INSERT INTO produtos (
        nome,
        preco,
        categoria_id,
        ativo,
        estoque_atual,
        estoque_minimo,
        gerenciar_estoque
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      nome,
      preco,
      categoria_id || null,
      ativo ?? 1,
      estoque_atual ?? 0,
      estoque_minimo ?? 5,
      gerenciar_estoque ?? 0
    ])

    return res.json({
      success: true,
      id: result.insertId
    })

  } catch (error) {
    console.error('ERRO AO CRIAR PRODUTO:', error)

    return res.status(500).json({
      error: 'Erro ao criar produto'
    })
  }
})

// ======================
// ATUALIZAR PRODUTO
// ======================
router.put('/:id', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { id } = req.params

    const {
      nome,
      preco,
      categoria_id,
      ativo,
      estoque_atual,
      estoque_minimo,
      gerenciar_estoque
    } = req.body

    await transaction(async (conn) => {
      const [atuais] = await conn.execute(
        `SELECT estoque_atual FROM produtos WHERE id = ? LIMIT 1 FOR UPDATE`, [id]
      )
      const estoqueAntes = atuais[0] ? Number(atuais[0].estoque_atual) : null

      await conn.execute(`
        UPDATE produtos
        SET
          nome = ?,
          preco = ?,
          categoria_id = ?,
          ativo = ?,
          estoque_atual = ?,
          estoque_minimo = ?,
          gerenciar_estoque = ?
        WHERE id = ?
      `, [
        nome,
        preco,
        categoria_id || null,
        ativo,
        estoque_atual,
        estoque_minimo,
        gerenciar_estoque,
        id
      ])

      // Alteração manual do estoque na edição vira movimentação de ajuste
      const estoqueNovo = Number(estoque_atual)
      if (estoqueAntes !== null && !Number.isNaN(estoqueNovo) && estoqueNovo !== estoqueAntes) {
        await registrarMovEstoque(conn, {
          produto_id: Number(id),
          tipo: 'ajuste',
          quantidade: estoqueNovo - estoqueAntes,
          estoque_resultante: estoqueNovo,
          motivo: 'Edição do produto',
          usuario_id: req.user.id
        })
      }
    })

    return res.json({ success: true })

  } catch (error) {
    console.error('ERRO AO ATUALIZAR PRODUTO:', error)

    return res.status(500).json({
      error: 'Erro ao atualizar produto'
    })
  }
})

// ======================
// AJUSTE RÁPIDO DE ESTOQUE
// body: { tipo: 'entrada'|'saida'|'ajuste', quantidade, motivo? }
// entrada soma, saída subtrai, ajuste define o valor absoluto
// ======================
router.post('/:id/estoque', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { id } = req.params
    const { tipo, quantidade, motivo } = req.body

    const qtd = Number(quantidade)
    if (!['entrada', 'saida', 'ajuste'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de movimentação inválido' })
    }
    if (!Number.isInteger(qtd) || qtd < 0 || (tipo !== 'ajuste' && qtd === 0)) {
      return res.status(400).json({ error: 'Informe uma quantidade válida' })
    }

    const resultado = await transaction(async (conn) => {
      const [rows] = await conn.execute(
        `SELECT id, nome, estoque_atual FROM produtos WHERE id = ? LIMIT 1 FOR UPDATE`, [id]
      )
      if (!rows.length) {
        const err = new Error('Produto não encontrado')
        err.status = 404
        throw err
      }

      const atual = Number(rows[0].estoque_atual)
      let novo
      if (tipo === 'entrada')      novo = atual + qtd
      else if (tipo === 'saida')   novo = atual - qtd
      else                         novo = qtd

      if (novo < 0) {
        const err = new Error(`Estoque insuficiente. Disponível: ${atual}`)
        err.status = 400
        throw err
      }

      await conn.execute(`UPDATE produtos SET estoque_atual = ? WHERE id = ?`, [novo, id])
      await registrarMovEstoque(conn, {
        produto_id: Number(id),
        tipo,
        quantidade: novo - atual,
        estoque_resultante: novo,
        motivo,
        usuario_id: req.user.id
      })

      return { estoque_atual: novo }
    })

    return res.json({ success: true, ...resultado })

  } catch (error) {
    console.error('ERRO NO AJUSTE DE ESTOQUE:', error)
    return res.status(error.status || 500).json({
      error: error.message || 'Erro ao ajustar estoque'
    })
  }
})

// ======================
// HISTÓRICO DE MOVIMENTAÇÕES
// ======================
router.get('/:id/estoque', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const movs = await query(`
      SELECT m.id, m.tipo, m.quantidade, m.estoque_resultante, m.motivo, m.created_at,
             u.nome AS usuario
      FROM estoque_movimentacoes m
      LEFT JOIN usuarios u ON u.id = m.usuario_id
      WHERE m.produto_id = ?
      ORDER BY m.id DESC
      LIMIT 50
    `, [id])
    return res.json(movs)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro ao buscar movimentações' })
  }
})

// ======================
// DESATIVAR (DELETE LÓGICO)
// ======================
router.delete('/:id', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { id } = req.params

    await query(`
      UPDATE produtos
      SET ativo = 0
      WHERE id = ?
    `, [id])

    return res.json({ success: true })

  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: 'Erro ao desativar produto'
    })
  }
})

module.exports = router
