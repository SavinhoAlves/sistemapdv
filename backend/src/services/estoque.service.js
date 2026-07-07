// Registro de movimentações de estoque (histórico/auditoria).
// quantidade é o delta com sinal: positivo entra, negativo sai.
// Recebe a conexão da transação em andamento para gravar de forma atômica.

async function registrarMovEstoque(conn, { produto_id, tipo, quantidade, estoque_resultante = null, motivo = null, usuario_id = null }) {
  await conn.execute(
    `INSERT INTO estoque_movimentacoes
       (produto_id, tipo, quantidade, estoque_resultante, motivo, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [produto_id, tipo, quantidade, estoque_resultante, motivo ? String(motivo).substring(0, 150) : null, usuario_id]
  )
}

module.exports = { registrarMovEstoque }
