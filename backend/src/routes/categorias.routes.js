const express = require('express')
const router = express.Router()

const { query } = require('../database/connection')
const { authenticate, authorize } = require('../middlewares/auth.middleware')

// GET / — listar todas
router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT id, nome FROM categorias ORDER BY nome ASC')
    return res.json(rows)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro ao buscar categorias' })
  }
})

// POST / — criar
router.post('/', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { nome } = req.body
    if (!nome?.trim()) return res.status(400).json({ error: 'nome é obrigatório' })

    const result = await query('INSERT INTO categorias (nome) VALUES (?)', [nome.trim()])
    return res.json({ success: true, id: result.insertId, nome: nome.trim() })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Já existe uma categoria com esse nome' })
    }
    console.error(error)
    return res.status(500).json({ error: 'Erro ao criar categoria' })
  }
})

// PUT /:id — renomear
router.put('/:id', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { nome } = req.body
    if (!nome?.trim()) return res.status(400).json({ error: 'nome é obrigatório' })

    await query('UPDATE categorias SET nome = ? WHERE id = ?', [nome.trim(), req.params.id])
    return res.json({ success: true })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Já existe uma categoria com esse nome' })
    }
    console.error(error)
    return res.status(500).json({ error: 'Erro ao atualizar categoria' })
  }
})

// DELETE /:id — excluir (bloqueia se houver produtos vinculados)
router.delete('/:id', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const [{ total }] = await query(
      'SELECT COUNT(*) AS total FROM produtos WHERE categoria_id = ? AND ativo = 1',
      [req.params.id]
    )
    if (total > 0) {
      return res.status(400).json({
        error: `Não é possível excluir: ${total} produto(s) usa(m) essa categoria`
      })
    }

    await query('DELETE FROM categorias WHERE id = ?', [req.params.id])
    return res.json({ success: true })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro ao excluir categoria' })
  }
})

module.exports = router
