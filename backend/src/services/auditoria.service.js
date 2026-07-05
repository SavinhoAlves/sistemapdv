const { query } = require('../database/connection')

// Registra uma ação sensível na trilha de auditoria.
// Fire-and-forget: falha de auditoria nunca derruba a operação principal.
function registrarAuditoria(usuarioId, acao, entidade = null, entidadeId = null, detalhes = null) {
  const detalhesStr = detalhes ? JSON.stringify(detalhes) : null
  query(
    `INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?)`,
    [usuarioId ?? null, acao, entidade, entidadeId, detalhesStr]
  ).catch(err => console.error('[AUDITORIA] Falha ao registrar:', err.message))
}

module.exports = { registrarAuditoria }
