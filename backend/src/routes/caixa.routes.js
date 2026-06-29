const express = require('express')
const router = express.Router()

const { query } = require('../database/connection')
const { authenticate } = require('../middlewares/auth.middleware')

// GET /atual
router.get('/atual', authenticate, async (req, res) => {
  try {
    const caixas = await query(`SELECT * FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`)
    const caixa = caixas[0]
    return res.json(caixa ? { aberto: true, caixa } : { aberto: false })
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar caixa' })
  }
})

// POST /abrir
router.post('/abrir', authenticate, async (req, res) => {
  try {
    const { usuario_id, valor_inicial } = req.body

    if (valor_inicial === undefined || valor_inicial === null || valor_inicial === '') {
      return res.status(400).json({ error: 'Informe o saldo inicial do caixa' })
    }
    const saldo = Number(valor_inicial)
    if (isNaN(saldo) || saldo <= 0) {
      return res.status(400).json({ error: 'O saldo inicial deve ser maior que zero' })
    }

    const abertos = await query(`SELECT id FROM caixa WHERE status = 'aberto' LIMIT 1`)
    if (abertos.length) {
      return res.status(400).json({ error: 'Já existe um caixa aberto' })
    }

    const resultado = await query(`
      INSERT INTO caixa (funcionario_id, valor_inicial, status, data_abertura)
      VALUES (?, ?, 'aberto', NOW())
    `, [usuario_id ?? req.user.id, saldo])

    // Registra o saldo inicial como primeiro movimento do caixa
    await query(`
      INSERT INTO movimentos_caixa (caixa_id, tipo, valor, descricao, usuario_id)
      VALUES (?, 'suprimento', ?, 'Abertura de caixa', ?)
    `, [resultado.insertId, saldo, usuario_id ?? req.user.id])

    const [caixa] = await query(`SELECT * FROM caixa WHERE id = ?`, [resultado.insertId])
    return res.json({ success: true, caixa })
  } catch (error) {
    console.error('ERRO ABRIR CAIXA:', error)
    return res.status(500).json({ error: error.message })
  }
})

// POST /fechar
router.post('/fechar', authenticate, async (req, res) => {
  try {
    const { caixa_id } = req.body

    const caixas = await query(`SELECT * FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`)
    if (!caixas.length) {
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' })
    }

    const id = caixa_id ?? caixas[0].id

    // Calcula valor de fechamento: valor_inicial + movimentos (pagamento/suprimento - sangria/estorno)
    const [saldo] = await query(`
      SELECT
        c.valor_inicial + COALESCE(SUM(
          CASE
            WHEN mc.tipo IN ('pagamento', 'suprimento') THEN mc.valor
            WHEN mc.tipo IN ('sangria', 'estorno')      THEN -mc.valor
            ELSE 0
          END
        ), 0) AS valor_fechamento
      FROM caixa c
      LEFT JOIN movimentos_caixa mc ON mc.caixa_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id])

    await query(`
      UPDATE caixa
      SET status = 'fechado', fechado_em = NOW(), valor_fechamento = ?
      WHERE id = ?
    `, [saldo?.valor_fechamento ?? 0, id])

    return res.json({ success: true })
  } catch (error) {
    console.error('ERRO FECHAR CAIXA:', error)
    return res.status(500).json({ error: error.message })
  }
})

// POST /movimento — sangria / suprimento
router.post('/movimento', authenticate, async (req, res) => {
  try {
    const { tipo, valor, descricao } = req.body
    if (!tipo || !valor || Number(valor) <= 0) {
      return res.status(400).json({ error: 'tipo e valor são obrigatórios' })
    }
    if (!['sangria', 'suprimento'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo deve ser sangria ou suprimento' })
    }

    const caixas = await query(`SELECT id FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`)
    if (!caixas.length) return res.status(400).json({ error: 'Nenhum caixa aberto' })

    await query(
      `INSERT INTO movimentos_caixa (caixa_id, tipo, valor, descricao, usuario_id) VALUES (?, ?, ?, ?, ?)`,
      [caixas[0].id, tipo, Number(valor), descricao || null, req.user.id]
    )
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// GET /mesas-abertas — mesas com totais para o caixa
router.get('/mesas-abertas', authenticate, async (req, res) => {
  try {
    const mesas = await query(`
      SELECT
        m.id,
        COALESCE(m.nome_mesa, CONCAT('Mesa ', m.id)) AS nome_mesa,
        m.cliente,
        m.data_abertura,
        u.nome AS garcom,
        COALESCE(p.total, 0)           AS total_bruto,
        COALESCE(p.desconto, 0)        AS desconto,
        COALESCE(p.total, 0) - COALESCE(p.desconto, 0) AS total_liquido,
        p.id                           AS pedido_id
      FROM mesas m
      LEFT JOIN usuarios u ON u.id = m.garcom_id
      LEFT JOIN (
        SELECT mesa_id, id, total, COALESCE(desconto,0) AS desconto
        FROM pedidos
        WHERE status != 'fechado'
      ) p ON p.mesa_id = m.id
      WHERE m.status = 'aberta' AND m.data_fechamento IS NULL
      ORDER BY m.data_abertura ASC
    `)
    return res.json(mesas)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// GET /movimentos — extrato completo do caixa atual
router.get('/movimentos', authenticate, async (req, res) => {
  try {
    const caixas = await query(`SELECT id, valor_inicial FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`)
    if (!caixas.length) return res.json({ movimentos: [], totais: null })

    const caixaId = caixas[0].id

    const movimentos = await query(`
      SELECT
        mc.id,
        mc.tipo,
        mc.valor,
        mc.descricao,
        mc.created_at,
        u.nome AS operador
      FROM movimentos_caixa mc
      LEFT JOIN usuarios u ON u.id = mc.usuario_id
      WHERE mc.caixa_id = ?
      ORDER BY mc.created_at DESC
    `, [caixaId])

    const [totais] = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo IN ('pagamento','suprimento') THEN valor ELSE 0 END), 0) AS total_entradas,
        COALESCE(SUM(CASE WHEN tipo IN ('sangria','estorno')      THEN valor ELSE 0 END), 0) AS total_saidas
      FROM movimentos_caixa
      WHERE caixa_id = ?
    `, [caixaId])

    return res.json({
      movimentos,
      totais: {
        valor_inicial:  Number(caixas[0].valor_inicial),
        total_entradas: Number(totais.total_entradas),
        total_saidas:   Number(totais.total_saidas),
        saldo_atual:    Number(totais.total_entradas) - Number(totais.total_saidas)
      }
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

module.exports = router
