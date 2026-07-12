// Cria (ou atualiza a senha de) o admin único deste painel.
// Uso: node seed-admin.js <email> <senha>
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { query, pool } = require('./src/database/connection')

async function main() {
  const [, , email, senha] = process.argv
  if (!email || !senha) {
    console.error('Uso: node seed-admin.js <email> <senha>')
    process.exit(1)
  }

  const hash = await bcrypt.hash(senha, 10)
  const existente = await query('SELECT id FROM admins WHERE email = ?', [email])

  if (existente.length) {
    await query('UPDATE admins SET senha_hash = ? WHERE email = ?', [hash, email])
    console.log(`✓ Senha atualizada para ${email}`)
  } else {
    await query('INSERT INTO admins (email, senha_hash) VALUES (?, ?)', [email, hash])
    console.log(`✓ Admin criado: ${email}`)
  }

  await pool.end()
}

main().catch(err => {
  console.error('Erro:', err.message)
  process.exit(1)
})
