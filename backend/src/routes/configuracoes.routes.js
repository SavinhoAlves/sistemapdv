const express = require('express')
const router  = express.Router()
const { query } = require('../database/connection')
const { authenticate } = require('../middlewares/auth.middleware')

async function singleton() {
  await query(`
    INSERT IGNORE INTO configuracoes (id, nome_restaurante, mensagem_ficha)
    VALUES (1, 'Restaurante PDV', 'Obrigado pela preferência!')
  `)
}

// GET /configuracoes — todos os cargos precisam da config para impressão
router.get('/', authenticate, async (req, res) => {
  try {
    await singleton()
    const rows = await query(`
      SELECT nome_restaurante, logo_base64, mensagem_ficha,
             impressora_largura, impressora_copias, impressora_auto_imprimir,
             impressora_tipo, impressora_host, impressora_porta, taxa_servico_pct
      FROM configuracoes WHERE id = 1
    `)
    const row = rows[0] ?? {}

    // Flag remota do painel central de suporte (venda mobile liberada?) —
    // cache local em sync_config; try/catch pra não quebrar em instalações
    // que ainda não rodaram a migração dessa tabela
    let vendaMobilePermitida = true
    try {
      const syncRows = await query(`SELECT venda_mobile_permitida FROM sync_config WHERE id = 1`)
      if (syncRows.length) vendaMobilePermitida = Boolean(syncRows[0].venda_mobile_permitida)
    } catch {}

    return res.json({
      nome_restaurante:         row.nome_restaurante         ?? 'Restaurante PDV',
      logo_base64:              row.logo_base64              ?? null,
      mensagem_ficha:           row.mensagem_ficha           ?? 'Obrigado pela preferência!',
      impressora_largura:       Number(row.impressora_largura ?? 80),
      impressora_copias:        Number(row.impressora_copias  ?? 1),
      impressora_auto_imprimir: Boolean(row.impressora_auto_imprimir),
      impressora_tipo:          row.impressora_tipo          ?? 'navegador',
      impressora_host:          row.impressora_host          ?? '',
      impressora_porta:         Number(row.impressora_porta  ?? 9100),
      taxa_servico_pct:         Number(row.taxa_servico_pct  ?? 10),
      venda_mobile_permitida:   vendaMobilePermitida
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// PUT /configuracoes — somente admin
router.put('/', authenticate, async (req, res) => {
  if (req.user.cargo !== 'administrador') {
    return res.status(403).json({ error: 'Acesso negado' })
  }
  try {
    await singleton()
    const {
      nome_restaurante, logo_base64, mensagem_ficha,
      impressora_largura, impressora_copias, impressora_auto_imprimir,
      impressora_tipo, impressora_host, impressora_porta, taxa_servico_pct
    } = req.body
    const tipo = ['navegador', 'rede', 'windows'].includes(impressora_tipo) ? impressora_tipo : 'navegador'
    const taxaPct = Math.min(30, Math.max(0, Number(taxa_servico_pct) ?? 10))
    await query(
      `UPDATE configuracoes
       SET nome_restaurante = ?, logo_base64 = ?, mensagem_ficha = ?,
           impressora_largura = ?, impressora_copias = ?, impressora_auto_imprimir = ?,
           impressora_tipo = ?, impressora_host = ?, impressora_porta = ?,
           taxa_servico_pct = ?
       WHERE id = 1`,
      [
        nome_restaurante?.trim()  || 'Restaurante PDV',
        logo_base64               ?? null,
        mensagem_ficha?.trim()    || 'Obrigado pela preferência!',
        Number(impressora_largura)        || 80,
        Math.max(1, Number(impressora_copias) || 1),
        impressora_auto_imprimir ? 1 : 0,
        tipo,
        impressora_host?.trim()   || null,
        Number(impressora_porta)  || 9100,
        isNaN(taxaPct) ? 10 : taxaPct
      ]
    )
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

module.exports = router
