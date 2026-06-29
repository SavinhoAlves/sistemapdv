const express = require('express')
const router = express.Router()

const { query } = require('../database/connection')
const { authenticate, authorize } = require('../middlewares/auth.middleware')

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

    await query(`
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

    return res.json({ success: true })

  } catch (error) {
    console.error('ERRO AO ATUALIZAR PRODUTO:', error)

    return res.status(500).json({
      error: 'Erro ao atualizar produto'
    })
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
