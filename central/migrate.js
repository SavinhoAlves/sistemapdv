require('dotenv').config()
const { pool } = require('./src/database/connection')

async function migrate() {
  const conn = await pool.getConnection()
  try {
    console.log('Rodando migração da central...')

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        email      VARCHAR(150) NOT NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✓ Tabela admins criada (ou já existia)')

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS clientes (
        id                     INT AUTO_INCREMENT PRIMARY KEY,
        nome_fantasia          VARCHAR(150) NOT NULL,
        contato                VARCHAR(150) DEFAULT NULL,
        instalacao_uuid        VARCHAR(36) UNIQUE DEFAULT NULL,
        sync_token_hash        CHAR(64) NOT NULL UNIQUE,
        venda_mobile_permitida TINYINT(1) DEFAULT 1,
        status                 ENUM('ativo','suspenso','cancelado') DEFAULT 'ativo',
        caixa_aberto           TINYINT(1) DEFAULT NULL,
        caixa_aberto_desde     DATETIME DEFAULT NULL,
        faturamento_hoje       DECIMAL(10,2) DEFAULT NULL,
        mesas_abertas          INT DEFAULT NULL,
        pedidos_hoje           INT DEFAULT NULL,
        ticket_medio           DECIMAL(10,2) DEFAULT NULL,
        ultimo_sync_em         DATETIME DEFAULT NULL,
        ultimo_sync_erro       VARCHAR(255) DEFAULT NULL,
        created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✓ Tabela clientes criada (ou já existia)')

    console.log('\nMigração concluída com sucesso!')
  } finally {
    conn.release()
    await pool.end()
  }
}

migrate().catch(err => {
  console.error('Erro na migração:', err.message)
  process.exit(1)
})
