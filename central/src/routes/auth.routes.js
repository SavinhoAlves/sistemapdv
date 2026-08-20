const express    = require('express')
const router     = express.Router()
const bcrypt     = require('bcryptjs')
const jwt        = require('jsonwebtoken')
const rateLimit  = require('express-rate-limit')
const { prisma } = require('../lib/prisma')

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login — tente novamente em alguns minutos' },
})

// POST /api/auth/login
router.post('/login', limiteLogin, async (req, res) => {
  try {
    const { email, senha } = req.body
    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' })
    }

    const admin = await prisma.platformUser.findUnique({ where: { email } })
    if (!admin || !admin.ativo) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const senhaValida = await bcrypt.compare(senha, admin.senhaHash)
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    return res.json({ token, admin: { id: admin.id, email: admin.email, nome: admin.nome } })
  } catch (error) {
    console.error('Erro login central:', error)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

module.exports = router
