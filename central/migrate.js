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

    // Colunas adicionadas após versão inicial
    const [colsLic] = await conn.execute(`
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'licenca_expira_em'
    `)
    if (!colsLic[0].cnt) {
      await conn.execute(`ALTER TABLE clientes ADD COLUMN licenca_expira_em DATETIME DEFAULT NULL`)
      console.log('✓ Coluna licenca_expira_em adicionada')
    }

    const [colsChave] = await conn.execute(`
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'chave_ativacao'
    `)
    if (!colsChave[0].cnt) {
      await conn.execute(`ALTER TABLE clientes ADD COLUMN chave_ativacao TEXT DEFAULT NULL`)
      console.log('✓ Coluna chave_ativacao adicionada')
    }

    // Chave aguardando ser aplicada automaticamente no próximo sync do PDV
    const [colsPend] = await conn.execute(`
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'licenca_pendente'
    `)
    if (!colsPend[0].cnt) {
      await conn.execute(`ALTER TABLE clientes ADD COLUMN licenca_pendente TEXT DEFAULT NULL`)
      console.log('✓ Coluna licenca_pendente adicionada')
    }

    // Estado real do pdv_config reportado pelo PDV a cada sync
    const [colsPdvStatus] = await conn.execute(`
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'pdv_licenca_status'
    `)
    if (!colsPdvStatus[0].cnt) {
      await conn.execute(`ALTER TABLE clientes ADD COLUMN pdv_licenca_status VARCHAR(20) DEFAULT NULL`)
      console.log('✓ Coluna pdv_licenca_status adicionada')
    }

    const [colsPdvExpira] = await conn.execute(`
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'pdv_licenca_expira'
    `)
    if (!colsPdvExpira[0].cnt) {
      await conn.execute(`ALTER TABLE clientes ADD COLUMN pdv_licenca_expira DATETIME DEFAULT NULL`)
      console.log('✓ Coluna pdv_licenca_expira adicionada')
    }

    // Fingerprint de hardware do PDV (reportado via sync)
    const [colsFp] = await conn.execute(`
      SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'pdv_host_fingerprint'
    `)
    if (!colsFp[0].cnt) {
      await conn.execute(`ALTER TABLE clientes ADD COLUMN pdv_host_fingerprint VARCHAR(255) DEFAULT NULL`)
      console.log('✓ Coluna pdv_host_fingerprint adicionada')
    }

    // Estado real do sync_config reportado pelo PDV a cada sync
    const syncCols = [
      ['pdv_sync_bloqueado',   'TINYINT(1) DEFAULT NULL',  'licenca_bloqueada_remoto confirmado no PDV'],
      ['pdv_sync_suspenso',    'TINYINT(1) DEFAULT NULL',  'suspenso confirmado no PDV'],
      ['pdv_sync_venda_mobile','TINYINT(1) DEFAULT NULL',  'venda_mobile_permitida confirmado no PDV'],
      ['pdv_sync_erro',        'VARCHAR(255) DEFAULT NULL', 'último erro de sync reportado pelo PDV'],
    ]
    for (const [col, tipo, desc] of syncCols) {
      const [rows] = await conn.execute(`
        SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = ?
      `, [col])
      if (!rows[0].cnt) {
        await conn.execute(`ALTER TABLE clientes ADD COLUMN ${col} ${tipo}`)
        console.log(`✓ Coluna ${col} adicionada (${desc})`)
      }
    }

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
