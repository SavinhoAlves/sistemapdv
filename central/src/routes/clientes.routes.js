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

function gerarChaveAtivacao(nomeCliente, expiraEm, syncToken) {
  const payload = JSON.stringify({
    c:          semAcentos(nomeCliente),
    expira_em:  expiraEm.toISOString(),
    s:          process.env.LICENSE_SECRET,
    sync_token: syncToken,
    sync_url:   process.env.CENTRAL_URL || ''
  })
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
             licenca_expira_em, chave_ativacao, licenca_pendente,
             pdv_licenca_status, pdv_licenca_expira, pdv_host_fingerprint,
             pdv_sync_bloqueado, pdv_sync_suspenso, pdv_sync_venda_mobile, pdv_sync_erro,
             created_at
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

// POST /api/clientes — cria cliente + gera token (retornado uma única vez).
// Se vier "dias", já gera a licença junto (mesmo passo), em vez de exigir
// um segundo clique em "Gerar licença" depois.
router.post('/', async (req, res) => {
  try {
    const { nome_fantasia, contato, dias } = req.body
    if (!nome_fantasia || !nome_fantasia.trim()) {
      return res.status(400).json({ error: 'Informe o nome do cliente' })
    }

    const tokenBruto = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(tokenBruto)

    const resultado = await query(
      `INSERT INTO clientes (nome_fantasia, contato, sync_token_hash) VALUES (?, ?, ?)`,
      [nome_fantasia.trim(), contato?.trim() || null, tokenHash]
    )

    const resposta = { success: true, id: resultado.insertId, syncToken: tokenBruto }

    const diasNum = Number(dias)
    if (diasNum > 0) {
      if (!process.env.RESTAURANT_LICENSE_SECRET) {
        return res.status(500).json({ error: 'Cliente criado, mas RESTAURANT_LICENSE_SECRET não configurado no .env da central — gere a licença separadamente' })
      }

      const chave = gerarChaveAtivacao(nome_fantasia.trim(), diasNum)
      const expira = new Date()
      expira.setDate(expira.getDate() + diasNum)
      const expiraMySQL = expira.toISOString().slice(0, 19).replace('T', ' ')

      await query('UPDATE clientes SET licenca_expira_em = ? WHERE id = ?', [expiraMySQL, resultado.insertId])

      resposta.chave = chave
      resposta.diasLicenca = diasNum
      resposta.expira = expira.toISOString()
    }

    return res.json(resposta)
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return res.status(500).json({ error: 'Erro ao criar cliente' })
  }
})

// PATCH /api/clientes/:id
const STATUS_VALIDOS = ['ativo', 'suspenso', 'cancelado']

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { venda_mobile_permitida, nome_fantasia, contato, status } = req.body

    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ error: `status deve ser um de: ${STATUS_VALIDOS.join(', ')}` })
    }

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

    if (!process.env.LICENSE_SECRET) {
      return res.status(500).json({ error: 'LICENSE_SECRET não configurado no .env da central' })
    }
    if (!dias || dias <= 0) return res.status(400).json({ error: 'Informe a validade em dias' })

    const [cliente] = await query('SELECT nome_fantasia FROM clientes WHERE id = ?', [id])
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' })

    const expira = new Date()
    expira.setDate(expira.getDate() + dias)

    // Gera novo sync token junto com a licença — embute na chave para auto-configurar o sync no PDV
    const syncTokenBruto = crypto.randomBytes(32).toString('hex')
    const syncTokenHash  = hashToken(syncTokenBruto)
    const chave = gerarChaveAtivacao(cliente.nome_fantasia, expira, syncTokenBruto)

    const expiraMySQL = expira.toISOString().slice(0, 19).replace('T', ' ')

    await query(
      'UPDATE clientes SET licenca_expira_em = ?, chave_ativacao = ?, sync_token_hash = ?, licenca_pendente = ? WHERE id = ?',
      [expiraMySQL, chave, syncTokenHash, chave, id]
    )

    return res.json({ chave, dias, expira: expira.toISOString() })
  } catch (error) {
    console.error('Erro ao gerar chave de licença:', error)
    return res.status(500).json({ error: 'Erro ao gerar chave de licença' })
  }
})

// POST /api/clientes/:id/aplicar-chave — cola/importa uma chave gerada externamente
router.post('/:id/aplicar-chave', async (req, res) => {
  try {
    const { id } = req.params
    const { chave } = req.body

    if (!chave || !chave.trim()) {
      return res.status(400).json({ error: 'Informe a chave de ativação' })
    }

    if (!process.env.LICENSE_SECRET) {
      return res.status(500).json({ error: 'LICENSE_SECRET não configurado no .env da central' })
    }

    let payload
    try {
      payload = JSON.parse(Buffer.from(chave.trim(), 'base64').toString('utf8'))
    } catch {
      return res.status(400).json({ error: 'Chave inválida — não é um Base64 válido' })
    }

    if (!payload.c || (!payload.expira_em && !payload.d) || payload.s !== process.env.LICENSE_SECRET) {
      return res.status(400).json({ error: 'Chave inválida — secret não confere' })
    }

    let expira
    if (payload.expira_em) {
      expira = new Date(payload.expira_em)
      if (isNaN(expira.getTime())) return res.status(400).json({ error: 'Chave inválida — data de expiração inválida' })
    } else {
      const dias = Number(payload.d)
      if (!dias || dias <= 0) return res.status(400).json({ error: 'Chave inválida — validade ausente' })
      expira = new Date()
      expira.setDate(expira.getDate() + dias)
    }

    const [cliente] = await query('SELECT id FROM clientes WHERE id = ?', [id])
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' })

    const expiraMySQL = expira.toISOString().slice(0, 19).replace('T', ' ')
    const dias = Math.ceil((expira - Date.now()) / (1000 * 60 * 60 * 24))

    await query('UPDATE clientes SET licenca_expira_em = ?, chave_ativacao = ? WHERE id = ?', [expiraMySQL, chave.trim(), id])

    return res.json({ success: true, dias, expira: expira.toISOString() })
  } catch (error) {
    console.error('Erro ao aplicar chave:', error)
    return res.status(500).json({ error: 'Erro ao aplicar chave de ativação' })
  }
})

module.exports = router
