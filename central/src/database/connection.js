const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'restaurante_pdv',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Savio1997*',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
})

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

module.exports = { pool, query }
