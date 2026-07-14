const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { query } = require('../database/connection')

function hashToken(tokenBruto) {
  return crypto.createHash('sha256').update(tokenBruto).digest('hex')
}

// MySQL não aceita string ISO 8601 ('...T...Z') direto em coluna DATETIME
// quando o valor chega como string (via JSON) — precisa do formato
// 'YYYY-MM-DD HH:MM:SS'.
function paraDatetimeMysql(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

// POST /api/sync — chamada pela instalação do restaurante, não pelo admin.
// Autenticação via Authorization: Bearer <sync_token> (não é o JWT do admin).
router.post('/', async (req, res) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de sincronização não fornecido' })
    }
    const tokenBruto = header.split(' ')[1]
    const tokenHash = hashToken(tokenBruto)

    const [cliente] = await query('SELECT * FROM clientes WHERE sync_token_hash = ? LIMIT 1', [tokenHash])
    if (!cliente) {
      return res.status(401).json({ error: 'Token de sincronização inválido' })
    }

    const {
      instalacaoUuid, caixaAberto, caixaAbertoDesde,
      faturamentoHoje, mesasAbertas, pedidosHoje, ticketMedio
    } = req.body

    await query(
      `UPDATE clientes SET
         instalacao_uuid = COALESCE(?, instalacao_uuid),
         caixa_aberto = ?, caixa_aberto_desde = ?,
         faturamento_hoje = ?, mesas_abertas = ?, pedidos_hoje = ?, ticket_medio = ?,
         ultimo_sync_em = NOW()
       WHERE id = ?`,
      [
        instalacaoUuid ?? null,
        caixaAberto ? 1 : 0, paraDatetimeMysql(caixaAbertoDesde),
        Number(faturamentoHoje) || 0, Number(mesasAbertas) || 0,
        Number(pedidosHoje) || 0, Number(ticketMedio) || 0,
        cliente.id
      ]
    )

    return res.json({
      vendaMobilePermitida: Boolean(cliente.venda_mobile_permitida),
      // Suspender/Reativar no painel central (bloco "clientes.status") só
      // tinha efeito cosmético até aqui — devolvendo isso na sincronização,
      // o PDV passa a se bloquear/liberar sozinho no próximo check-in
      licencaAtiva: cliente.status === 'ativo'
    })
  } catch (error) {
    console.error('Erro no sync:', error)
    return res.status(500).json({ error: 'Erro ao processar sincronização' })
  }
})

module.exports = router
