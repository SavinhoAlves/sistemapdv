require('dotenv').config()
const { pool } = require('./src/database/connection')

const TABELAS = [
  'pedido_abatimentos',
  'pedido_itens',
  'pagamentos',
  'movimentos_caixa',
  'pedidos',
  'estoque_movimentacoes',
  'caixa',
  'auditoria',
  'clientes',
  'mesas',
  'produtos',
  'categorias',
  'metodos_pagamento',
  'configuracoes',
  'pdv_config',
  'sync_config',
]

async function reset() {
  const conn = await pool.getConnection()
  try {
    console.log('Iniciando reset do banco de dados...')
    console.log('Tabelas preservadas: usuarios, admins\n')

    await conn.execute('SET FOREIGN_KEY_CHECKS = 0')

    for (const tabela of TABELAS) {
      await conn.execute(`TRUNCATE TABLE \`${tabela}\``)
      console.log(`✓ ${tabela} limpa`)
    }

    await conn.execute('SET FOREIGN_KEY_CHECKS = 1')

    // Resemente métodos de pagamento padrão
    await conn.execute(`
      INSERT INTO metodos_pagamento (nome, ativo) VALUES
        ('Dinheiro', 1),
        ('PIX', 1),
        ('Cartão de Crédito', 1),
        ('Cartão de Débito', 1),
        ('Vale Refeição', 1)
    `)
    console.log('\n✓ Métodos de pagamento padrão reinseridos')

    console.log('\nReset concluído. Usuários mantidos intactos.')
  } finally {
    conn.release()
    await pool.end()
  }
}

reset().catch(err => {
  console.error('Erro no reset:', err.message)
  process.exit(1)
})
