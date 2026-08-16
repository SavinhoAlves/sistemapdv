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
      return res.status(401).json({ error: 'Token de sincronização inválido', revogado: true })
    }

    const {
      instalacaoUuid, caixaAberto, caixaAbertoDesde,
      faturamentoHoje, mesasAbertas, pedidosHoje, ticketMedio,
      pdvLicencaStatus, pdvLicencaExpira, pdvHostFingerprint,
      pdvSyncBloqueado, pdvSyncSuspenso, pdvSyncVendaMobile, pdvSyncErro
    } = req.body

    await query(
      `UPDATE clientes SET
         instalacao_uuid = COALESCE(?, instalacao_uuid),
         caixa_aberto = ?, caixa_aberto_desde = ?,
         faturamento_hoje = ?, mesas_abertas = ?, pedidos_hoje = ?, ticket_medio = ?,
         pdv_licenca_status    = COALESCE(?, pdv_licenca_status),
         pdv_licenca_expira    = COALESCE(?, pdv_licenca_expira),
         pdv_host_fingerprint  = COALESCE(?, pdv_host_fingerprint),
         pdv_sync_bloqueado    = ?,
         pdv_sync_suspenso     = ?,
         pdv_sync_venda_mobile = ?,
         pdv_sync_erro         = ?,
         ultimo_sync_em = NOW()
       WHERE id = ?`,
      [
        instalacaoUuid ?? null,
        caixaAberto ? 1 : 0, paraDatetimeMysql(caixaAbertoDesde),
        Number(faturamentoHoje) || 0, Number(mesasAbertas) || 0,
        Number(pedidosHoje) || 0, Number(ticketMedio) || 0,
        pdvLicencaStatus   ?? null,
        paraDatetimeMysql(pdvLicencaExpira),
        pdvHostFingerprint ?? null,
        pdvSyncBloqueado   != null ? (pdvSyncBloqueado   ? 1 : 0) : null,
        pdvSyncSuspenso    != null ? (pdvSyncSuspenso    ? 1 : 0) : null,
        pdvSyncVendaMobile != null ? (pdvSyncVendaMobile ? 1 : 0) : null,
        pdvSyncErro ?? null,
        cliente.id
      ]
    )

    // Heartbeat: a central renova a data de vencimento da licença a cada sync.
    // O prazo nunca ultrapassa a expiração original da licença.
    // Se o cliente for excluído, o sync para de responder → PDV expira em até RENOVACAO_DIAS.
    const RENOVACAO_DIAS = 7
    const agora = new Date()
    const limiteRenovacao = new Date(agora.getTime() + RENOVACAO_DIAS * 24 * 60 * 60 * 1000)
    const expiracaoOriginal = cliente.licenca_expira_em ? new Date(cliente.licenca_expira_em) : null
    const novaExpiracao = expiracaoOriginal
      ? new Date(Math.min(expiracaoOriginal.getTime(), limiteRenovacao.getTime()))
      : limiteRenovacao

    // Se houver licença pendente, incluir na resposta e limpar do banco.
    // O PDV aplica automaticamente na próxima iteração do sync — sem ação do cliente.
    const licencaPendente = cliente.licenca_pendente || null
    if (licencaPendente) {
      await query('UPDATE clientes SET licenca_pendente = NULL WHERE id = ?', [cliente.id]).catch(() => {})
    }

    return res.json({
      vendaMobilePermitida: Boolean(cliente.venda_mobile_permitida),
      suspenso:             cliente.status === 'suspenso',
      novaExpiracao:        novaExpiracao.toISOString(),
      ...(licencaPendente ? { licencaPendente } : {})
    })
  } catch (error) {
    console.error('Erro no sync:', error)
    return res.status(500).json({ error: 'Erro ao processar sincronização' })
  }
})

module.exports = router
