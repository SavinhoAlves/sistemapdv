require('dotenv').config()
const { pool } = require('./src/database/connection')

async function migrate() {
  const conn = await pool.getConnection()
  try {
    console.log('Rodando migração...')

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS categorias (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        nome       VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✓ Tabela categorias criada (ou já existia)')

    await conn.execute(`
      ALTER TABLE produtos
        ADD COLUMN IF NOT EXISTS categoria_id INT DEFAULT NULL AFTER categoria
    `)
    console.log('✓ Coluna categoria_id adicionada (ou já existia)')

    try {
      await conn.execute(`
        ALTER TABLE produtos
          ADD CONSTRAINT fk_produtos_categoria
            FOREIGN KEY (categoria_id) REFERENCES categorias(id)
            ON DELETE SET NULL
      `)
      console.log('✓ FK fk_produtos_categoria criada')
    } catch (err) {
      // errno 121 = InnoDB duplicate FK name; errno 1826 = ER_FK_DUP_NAME
      if (err.errno === 1826 || err.message.includes('errno: 121') || err.message.includes('fk_produtos_categoria')) {
        console.log('✓ FK fk_produtos_categoria já existia')
      } else {
        throw err
      }
    }

    await conn.execute(`
      ALTER TABLE pedidos
        ADD COLUMN IF NOT EXISTS desconto DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total
    `)
    console.log('✓ Coluna desconto adicionada a pedidos (ou já existia)')

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pedido_abatimentos (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        pedido_id  INT NOT NULL,
        valor      DECIMAL(10,2) NOT NULL,
        motivo     VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_abat_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✓ Tabela pedido_abatimentos criada (ou já existia)')

    await conn.execute(`
      ALTER TABLE pedido_abatimentos
        ADD COLUMN IF NOT EXISTS motivo VARCHAR(100) DEFAULT NULL AFTER valor
    `)
    console.log('✓ Coluna motivo em pedido_abatimentos (ou já existia)')

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS metodos_pagamento (
        id   INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        ativo TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✓ Tabela metodos_pagamento criada (ou já existia)')

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pagamentos (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        mesa_id    INT NOT NULL,
        pedido_id  INT DEFAULT NULL,
        metodo_id  INT NOT NULL,
        valor      DECIMAL(10,2) NOT NULL,
        troco      DECIMAL(10,2) DEFAULT 0.00,
        caixa_id   INT DEFAULT NULL,
        usuario_id INT NOT NULL,
        status     ENUM('pendente','confirmado','estornado') DEFAULT 'confirmado',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_pag_mesa   FOREIGN KEY (mesa_id)    REFERENCES mesas(id),
        CONSTRAINT fk_pag_metodo FOREIGN KEY (metodo_id)  REFERENCES metodos_pagamento(id),
        CONSTRAINT fk_pag_user   FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
    console.log('✓ Tabela pagamentos criada (ou já existia)')

    // Semeia métodos de pagamento padrão
    const [metodos] = await conn.execute('SELECT COUNT(*) AS total FROM metodos_pagamento')
    if (metodos[0].total === 0) {
      await conn.execute(`
        INSERT INTO metodos_pagamento (nome, ativo) VALUES
          ('Dinheiro', 1),
          ('PIX', 1),
          ('Cartão de Crédito', 1),
          ('Cartão de Débito', 1),
          ('Vale Refeição', 1)
      `)
      console.log('✓ Métodos de pagamento padrão inseridos')
    } else {
      console.log('✓ Métodos de pagamento já existem')
    }

    await conn.execute(`
      ALTER TABLE pedidos
        ADD COLUMN IF NOT EXISTS garcom_id INT DEFAULT NULL AFTER mesa_id
    `)
    console.log('✓ Coluna garcom_id adicionada a pedidos (ou já existia)')

    await conn.execute(`
      ALTER TABLE mesas
        ADD COLUMN IF NOT EXISTS cliente VARCHAR(120) DEFAULT NULL AFTER nome_mesa
    `)
    console.log('✓ Coluna cliente adicionada a mesas (ou já existia)')

    await conn.execute(`
      ALTER TABLE mesas
        ADD COLUMN IF NOT EXISTS caixa_id INT DEFAULT NULL AFTER garcom_id
    `)
    console.log('✓ Coluna caixa_id adicionada a mesas (ou já existia)')

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
