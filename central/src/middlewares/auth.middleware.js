const jwt     = require('jsonwebtoken')
const { prisma } = require('../lib/prisma')

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const token   = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const admin = await prisma.platformUser.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, nome: true, ativo: true },
    })
    if (!admin || !admin.ativo) {
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
