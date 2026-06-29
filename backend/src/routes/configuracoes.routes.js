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
             impressora_largura, impressora_copias, impressora_auto_imprimir
      FROM configuracoes WHERE id = 1
    `)
    const row = rows[0] ?? {}
    return res.json({
      nome_restaurante:         row.nome_restaurante         ?? 'Restaurante PDV',
      logo_base64:              row.logo_base64              ?? null,
      mensagem_ficha:           row.mensagem_ficha           ?? 'Obrigado pela preferência!',
      impressora_largura:       Number(row.impressora_largura ?? 80),
      impressora_copias:        Number(row.impressora_copias  ?? 1),
      impressora_auto_imprimir: Boolean(row.impressora_auto_imprimir)
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
      impressora_largura, impressora_copias, impressora_auto_imprimir
    } = req.body
    await query(
      `UPDATE configuracoes
       SET nome_restaurante = ?, logo_base64 = ?, mensagem_ficha = ?,
           impressora_largura = ?, impressora_copias = ?, impressora_auto_imprimir = ?
       WHERE id = 1`,
      [
        nome_restaurante?.trim()  || 'Restaurante PDV',
        logo_base64               ?? null,
        mensagem_ficha?.trim()    || 'Obrigado pela preferência!',
        Number(impressora_largura)        || 80,
        Math.max(1, Number(impressora_copias) || 1),
        impressora_auto_imprimir ? 1 : 0
      ]
    )
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

module.exports = router
