const jwt = require('jsonwebtoken')
const { query } = require('../database/connection')

// Único papel neste sistema: o admin/suporte (Savio). Sem conceito de cargo.
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const [admin] = await query('SELECT id, email FROM admins WHERE id = ?', [decoded.id])
    if (!admin) {
      return res.status(401).json({ error: 'Administrador não encontrado' })
    }

    req.admin = admin
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' })
    }
    return res.status(401).json({ error: 'Token inválido' })
  }
}

module.exports = { authenticate }
