const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../database/connection')

// POST /api/auth/login — único login deste sistema (admin/suporte)
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body
    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' })
    }

    const [admin] = await query('SELECT * FROM admins WHERE email = ? LIMIT 1', [email])
    if (!admin) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const senhaValida = await bcrypt.compare(senha, admin.senha_hash)
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    return res.json({ token, admin: { id: admin.id, email: admin.email } })
  } catch (error) {
    console.error('Erro login central:', error)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

module.exports = router
