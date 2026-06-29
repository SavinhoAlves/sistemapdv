import pool from '../database'

export const buscarProdutos = async () => {

  const [rows] = await pool.query(`
    SELECT
      id,
      nome,
      preco,
      categoria,
      ativo,
      estoque_atual,
      estoque_minimo,
      gerenciar_estoque
    FROM produtos
    WHERE ativo = 1
    ORDER BY nome ASC
  `)

  return rows

}