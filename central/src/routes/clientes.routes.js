const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { query } = require('../database/connection')
const { authenticate } = require('../middlewares/auth.middleware')

const JANELA_ONLINE_MIN = 25

function hashToken(tokenBruto) {
  return crypto.createHash('sha256').update(tokenBruto).digest('hex')
}

function semAcentos(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function gerarChaveAtivacao(nomeCliente, dias) {
  const payload = JSON.stringify({ c: semAcentos(nomeCliente), d: Number(dias), s: process.env.RESTAURANT_LICENSE_SECRET })
  return Buffer.from(payload, 'utf8').toString('base64')
}

router.use(authenticate)

// GET /api/clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await query(`
      SELECT id, nome_fantasia, contato, instalacao_uuid, venda_mobile_permitida,
             status, caixa_aberto, caixa_aberto_desde, faturamento_hoje,
             mesas_abertas, pedidos_hoje, ticket_medio, ultimo_sync_em,
             licenca_expira_em, created_at
      FROM clientes
      ORDER BY nome_fantasia ASC
    `)
    const agora = Date.now()
    const comOnline = clientes.map(c => ({
      ...c,
      venda_mobile_permitida: Boolean(c.venda_mobile_permitida),
      caixa_aberto: Boolean(c.caixa_aberto),
      online: c.ultimo_sync_em
        ? (agora - new Date(c.ultimo_sync_em).getTime()) < JANELA_ONLINE_MIN * 60 * 1000
        : false
    }))
    return res.json(comOnline)
  } catch (error) {
    console.error('Erro ao listar clientes:', error)
    return res.status(500).json({ error: 'Erro ao listar clientes' })
  }
})

// POST /api/clientes — cria cliente + gera token (retornado uma única vez)
router.post('/', async (req, res) => {
  try {
    const { nome_fantasia, contato } = req.body
    if (!nome_fantasia || !nome_fantasia.trim()) {
      return res.status(400).json({ error: 'Informe o nome do cliente' })
    }

    const tokenBruto = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(tokenBruto)

    const resultado = await query(
      `INSERT INTO clientes (nome_fantasia, contato, sync_token_hash) VALUES (?, ?, ?)`,
      [nome_fantasia.trim(), contato?.trim() || null, tokenHash]
    )

    return res.json({ success: true, id: resultado.insertId, syncToken: tokenBruto })
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return res.status(500).json({ error: 'Erro ao criar cliente' })
  }
})

// PATCH /api/clientes/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { venda_mobile_permitida, nome_fantasia, contato, status } = req.body

    const campos = []
    const valores = []
    if (venda_mobile_permitida !== undefined) { campos.push('venda_mobile_permitida = ?'); valores.push(venda_mobile_permitida ? 1 : 0) }
    if (nome_fantasia !== undefined)          { campos.push('nome_fantasia = ?');          valores.push(nome_fantasia.trim()) }
    if (contato !== undefined)                { campos.push('contato = ?');                valores.push(contato?.trim() || null) }
    if (status !== undefined)                 { campos.push('status = ?');                 valores.push(status) }

    if (!campos.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' })

    valores.push(id)
    await query(`UPDATE clientes SET ${campos.join(', ')} WHERE id = ?`, valores)
    return res.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return res.status(500).json({ error: 'Erro ao atualizar cliente' })
  }
})

// DELETE /api/clientes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const [cliente] = await query('SELECT id FROM clientes WHERE id = ?', [id])
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' })

    await query('DELETE FROM clientes WHERE id = ?', [id])
    return res.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir cliente:', error)
    return res.status(500).json({ error: 'Erro ao excluir cliente' })
  }
})

// POST /api/clientes/:id/reset-token — gera novo sync token (retornado uma única vez)
router.post('/:id/reset-token', async (req, res) => {
  try {
    const { id } = req.params
    const [cliente] = await query('SELECT id FROM clientes WHERE id = ?', [id])
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' })

    const tokenBruto = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(tokenBruto)
    await query('UPDATE clientes SET sync_token_hash = ?, instalacao_uuid = NULL, ultimo_sync_em = NULL WHERE id = ?', [tokenHash, id])

    return res.json({ success: true, syncToken: tokenBruto })
  } catch (error) {
    console.error('Erro ao resetar token:', error)
    return res.status(500).json({ error: 'Erro ao resetar token' })
  }
})

// POST /api/clientes/:id/licenca
router.post('/:id/licenca', async (req, res) => {
  try {
    const { id } = req.params
    const dias = Number(req.body.dias)

    if (!process.env.RESTAURANT_LICENSE_SECRET) {
      return res.status(500).json({ error: 'RESTAURANT_LICENSE_SECRET não configurado no .env da central' })
    }
    if (!dias || dias <= 0) return res.status(400).json({ error: 'Informe a validade em dias' })

    const [cliente] = await query('SELECT nome_fantasia FROM clientes WHERE id = ?', [id])
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' })

    const chave = gerarChaveAtivacao(cliente.nome_fantasia, dias)

    const expira = new Date()
    expira.setDate(expira.getDate() + dias)
    const expiraMySQL = expira.toISOString().slice(0, 19).replace('T', ' ')

    await query('UPDATE clientes SET licenca_expira_em = ? WHERE id = ?', [expiraMySQL, id])

    return res.json({ chave, dias, expira: expira.toISOString() })
  } catch (error) {
    console.error('Erro ao gerar chave de licença:', error)
    return res.status(500).json({ error: 'Erro ao gerar chave de licença' })
  }
})

module.exports = router
