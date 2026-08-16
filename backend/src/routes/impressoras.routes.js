const express = require('express')
const router = express.Router()
const { query } = require('../database/connection')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { montarCupomTeste, enviarParaImpressora, logoParaRasterEscPos, LOGO_LARGURAS } = require('../services/impressao.service')

const DESTINOS_VALIDOS = ['caixa', 'cozinha', 'bar']
const TIPOS_VALIDOS    = ['navegador', 'rede', 'windows']

function normalizar(req) {
  const { nome, destino, tipo, host, porta, largura, copias } = req.body
  return [
    String(nome || 'Impressora').slice(0, 100),
    DESTINOS_VALIDOS.includes(destino) ? destino : 'caixa',
    TIPOS_VALIDOS.includes(tipo) ? tipo : 'navegador',
    host || null,
    Number(porta) || 9100,
    [58, 80].includes(Number(largura)) ? Number(largura) : 80,
    Math.min(5, Math.max(1, Number(copias) || 1)),
  ]
}

// GET /api/impressoras
router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM impressoras ORDER BY FIELD(destino,'caixa','cozinha','bar'), id"
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/impressoras
router.post('/', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const vals = normalizar(req)
    const result = await query(
      'INSERT INTO impressoras (nome, destino, tipo, host, porta, largura, copias) VALUES (?,?,?,?,?,?,?)',
      vals
    )
    const rows = await query('SELECT * FROM impressoras WHERE id = ?', [result.insertId])
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /api/impressoras/:id
router.put('/:id', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { ativo } = req.body
    const vals = normalizar(req)
    await query(
      'UPDATE impressoras SET nome=?, destino=?, tipo=?, host=?, porta=?, largura=?, copias=?, ativo=? WHERE id=?',
      [...vals, ativo !== false && ativo !== 0 ? 1 : 0, Number(req.params.id)]
    )
    const rows = await query('SELECT * FROM impressoras WHERE id = ?', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Impressora não encontrada' })
    res.json(rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /api/impressoras/:id
router.delete('/:id', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const result = await query('DELETE FROM impressoras WHERE id = ?', [Number(req.params.id)])
    if (!result.affectedRows) return res.status(404).json({ error: 'Impressora não encontrada' })
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST /api/impressoras/:id/teste
router.post('/:id/teste', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const rows = await query('SELECT * FROM impressoras WHERE id = ?', [Number(req.params.id)])
    if (!rows[0]) return res.status(404).json({ error: 'Impressora não encontrada' })
    const impressora = rows[0]
    if (impressora.tipo === 'navegador') {
      return res.status(400).json({ error: 'Impressão via navegador não suporta teste direto' })
    }

    const cfgRows = await query('SELECT * FROM configuracoes WHERE id = 1')
    const globalCfg = cfgRows[0] || {}

    const config = {
      ...globalCfg,
      impressora_tipo:    impressora.tipo,
      impressora_host:    impressora.host,
      impressora_porta:   impressora.porta,
      impressora_largura: impressora.largura,
      impressora_copias:  impressora.copias,
    }

    const tamanho = config.logo_tamanho === 'personalizado'
      ? Math.max(50, Math.min(600, Number(config.logo_altura_custom) || 320))
      : (LOGO_LARGURAS[config.logo_tamanho] ?? 0.60)

    const logoRaster = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanho)
    const cupom = montarCupomTeste(config, logoRaster)
    await enviarParaImpressora(cupom, config)
    res.json({ success: true, message: 'Cupom de teste enviado' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
