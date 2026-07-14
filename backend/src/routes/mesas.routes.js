const express = require('express')
const router = express.Router()

const { query } = require('../database/connection')
const { authenticate, permissoes } = require('../middlewares/auth.middleware')
const { emitir } = require('../services/socket.service')

// ======================
// LISTAR MESAS
// ======================
router.get('/', authenticate, async (req, res) => {
  try {

    const usuario = req.user

    let sql = `
      SELECT
        m.*,
        u.nome AS garcom
      FROM mesas m
      LEFT JOIN usuarios u
        ON u.id = m.garcom_id
      WHERE
        m.status = 'aberta'
        AND m.data_fechamento IS NULL
    `

    const params = []

    if (usuario?.cargo === 'garcom') {
      sql += `
        AND m.garcom_id = ?
      `
      params.push(usuario.id)
    }

    sql += `
      ORDER BY m.id DESC
    `

    const mesas = await query(sql, params)

    return res.json(mesas)

  } catch (error) {

    console.error(error)

    return res.status(500).json({
      error: 'Erro ao buscar mesas'
    })
  }
})

// ======================
// ABRIR MESA
// ======================
router.post('/abrir', authenticate, permissoes.abrirMesa, async (req, res) => {
  try {

    const { cliente, garcom_id, caixa_id, nome_mesa } = req.body

    const resultado = await query(`
      INSERT INTO mesas (cliente, garcom_id, caixa_id, status, data_abertura)
      VALUES (?, ?, ?, 'aberta', NOW())
    `, [
      cliente   || null,
      garcom_id ?? req.user.id ?? null,
      caixa_id  ?? null
    ])

    const mesaId = resultado.insertId

    // Nome escolhido pelo garçom ou numeração automática
    const nomeFinal = (typeof nome_mesa === 'string' && nome_mesa.trim())
      ? nome_mesa.trim().substring(0, 50)
      : `Mesa ${mesaId}`

    await query(
      `UPDATE mesas SET nome_mesa = ? WHERE id = ?`,
      [nomeFinal, mesaId]
    )

    emitir('mesas:atualizado', { mesa_id: mesaId, tipo: 'aberta' })

    return res.json({
      success: true,
      mesa_id: mesaId
    })

  } catch (error) {

    console.error(error)

    return res.status(500).json({
      error: 'Erro ao abrir mesa'
    })
  }
})

// ======================
// FECHAR MESA
// ======================
router.patch('/:id/fechar', authenticate, permissoes.fecharMesa, async (req, res) => {
  try {

    const { id } = req.params

    await query(`
      UPDATE mesas
      SET
        status = 'fechada',
        data_fechamento = NOW()
      WHERE id = ?
    `, [id])

    emitir('mesas:atualizado', { mesa_id: Number(id), tipo: 'fechada' })

    return res.json({
      success: true
    })

  } catch (error) {

    console.error(error)

    return res.status(500).json({
      error: 'Erro ao fechar mesa'
    })
  }
})

// ======================
// PRODUTOS DA MESA
// ======================
router.get('/:id/produtos', authenticate, async (req, res) => {
  try {

    const { id } = req.params

    const produtos = await query(`
      SELECT
        pi.id,
        pi.produto_id,
        pi.pedido_id,
        pi.quantidade,
        pi.preco_unitario,
        pi.preco_total AS total,
        pi.status,
        p.nome
      FROM pedido_itens pi

      INNER JOIN pedidos ped
        ON ped.id = pi.pedido_id

      INNER JOIN produtos p
        ON p.id = pi.produto_id

      WHERE ped.mesa_id = ?
        AND ped.status != 'fechado'

      ORDER BY pi.id DESC
    `, [id])

    return res.json(produtos)

  } catch (error) {

    console.error('ERRO PRODUTOS MESA:', error)

    return res.status(500).json({
      error: error.message
    })
  }
})

module.exports = router
