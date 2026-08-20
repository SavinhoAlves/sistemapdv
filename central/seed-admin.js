// Cria (ou atualiza a senha de) um admin da plataforma central.
// Uso: node seed-admin.js <email> <senha> [nome]
require('dotenv').config()
const bcrypt     = require('bcryptjs')
const { prisma } = require('./src/lib/prisma')

async function main() {
  const [, , email, senha, nome = 'Administrador'] = process.argv
  if (!email || !senha) {
    console.error('Uso: node seed-admin.js <email> <senha> [nome]')
    process.exit(1)
  }

  const hash = await bcrypt.hash(senha, 10)

  const existente = await prisma.platformUser.findUnique({ where: { email }, select: { id: true } })

  await prisma.platformUser.upsert({
    where:  { email },
    create: { email, senhaHash: hash, nome, role: 'SUPER_ADMIN' },
    update: { senhaHash: hash },
  })

  console.log(`✓ Admin ${existente ? 'atualizado' : 'criado'}: ${email}`)
  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Erro:', err.message)
  process.exit(1)
})
