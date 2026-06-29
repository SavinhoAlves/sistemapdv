const express  = require('express')
const router   = express.Router()
const bcrypt   = require('bcryptjs')

const { query }               = require('../database/connection')
const { authenticate, authorize } = require('../middlewares/auth.middleware')

// GET / — listar
router.get('/', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const rows = await query(`
      SELECT id, nome, email, cargo, cartao_rfid, ativo, created_at
      FROM usuarios
      ORDER BY nome ASC
    `)
    return res.json(rows)
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar usuários' })
  }
})

// POST / — criar
router.post('/', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { nome, email, senha, cargo, cartao_rfid } = req.body
    if (!nome?.trim() || !cargo) {
      return res.status(400).json({ error: 'nome e cargo são obrigatórios' })
    }

    const senha_hash = senha ? await bcrypt.hash(senha, 10) : null

    const result = await query(`
      INSERT INTO usuarios (nome, email, senha_hash, cargo, cartao_rfid, ativo)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [nome.trim(), email || null, senha_hash, cargo, cartao_rfid || null])

    return res.status(201).json({ success: true, id: result.insertId })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'E-mail ou RFID já cadastrado' })
    }
    return res.status(500).json({ error: err.message })
  }
})

// PUT /:id — editar
router.put('/:id', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { nome, email, senha, cargo, cartao_rfid, ativo } = req.body

    let senha_hash = undefined
    if (senha) senha_hash = await bcrypt.hash(senha, 10)

    await query(`
      UPDATE usuarios SET
        nome        = COALESCE(?, nome),
        email       = ?,
        cargo       = COALESCE(?, cargo),
        cartao_rfid = ?,
        ativo       = COALESCE(?, ativo)
        ${senha_hash ? ', senha_hash = ?' : ''}
      WHERE id = ?
    `, [
      nome || null,
      email !== undefined ? (email || null) : undefined,
      cargo || null,
      cartao_rfid !== undefined ? (cartao_rfid || null) : undefined,
      ativo !== undefined ? ativo : null,
      ...(senha_hash ? [senha_hash] : []),
      req.params.id
    ].filter(v => v !== undefined))

    return res.json({ success: true })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'E-mail ou RFID já cadastrado' })
    }
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /:id/ativo — ativar/desativar
router.patch('/:id/ativo', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { ativo } = req.body
    await query('UPDATE usuarios SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, req.params.id])
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// DELETE /:id — excluir
router.delete('/:id', authenticate, authorize('administrador'), async (req, res) => {
  try {
    await query('UPDATE usuarios SET ativo = 0 WHERE id = ?', [req.params.id])
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

module.exports = router
