const express = require('express')
const router = express.Router()

const { query, transaction } = require('../database/connection')
const { authenticate, authorize, permissoes } = require('../middlewares/auth.middleware')
const { registrarAuditoria } = require('../services/auditoria.service')
const { resumoCaixa, movimentosCaixa } = require('../services/caixa.service')
const { registrarMovEstoque } = require('../services/estoque.service')

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
router.post('/abrir', authenticate, permissoes.gerenciarCaixa, async (req, res) => {
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

    // O saldo inicial vive só em caixa.valor_inicial — sem movimento espelho,
    // que duplicava o valor nos somatórios e no fechamento.
    const resultado = await query(`
      INSERT INTO caixa (funcionario_id, valor_inicial, status, data_abertura)
      VALUES (?, ?, 'aberto', NOW())
    `, [usuario_id ?? req.user.id, saldo])

    const [caixa] = await query(`SELECT * FROM caixa WHERE id = ?`, [resultado.insertId])
    registrarAuditoria(req.user.id, 'caixa_abrir', 'caixa', resultado.insertId, { valor_inicial: saldo })
    return res.json({ success: true, caixa })
  } catch (error) {
    console.error('ERRO ABRIR CAIXA:', error)
    return res.status(500).json({ error: error.message })
  }
})

// POST /fechar — fechamento com conferência (valor contado em dinheiro é opcional,
// mas quando informado gera a diferença de caixa)
router.post('/fechar', authenticate, permissoes.gerenciarCaixa, async (req, res) => {
  try {
    const { caixa_id, valor_contado, observacao } = req.body

    const caixas = await query(`SELECT * FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`)
    if (!caixas.length) {
      return res.status(404).json({ error: 'Nenhum caixa aberto encontrado' })
    }
    const id = caixa_id ?? caixas[0].id

    const semContagem = valor_contado === undefined || valor_contado === null || valor_contado === ''
    const contado = semContagem ? null : Number(valor_contado)
    if (contado !== null && (isNaN(contado) || contado < 0)) {
      return res.status(400).json({ error: 'Valor contado inválido' })
    }

    const resumo = await resumoCaixa(id)
    if (!resumo) return res.status(404).json({ error: 'Caixa não encontrado' })

    const diferenca = contado === null
      ? null
      : Math.round((contado - resumo.totais.esperado_dinheiro) * 100) / 100

    await query(`
      UPDATE caixa
      SET status = 'fechado', fechado_em = NOW(), valor_fechamento = ?,
          valor_contado = ?, diferenca = ?, observacao_fechamento = ?, fechado_por = ?
      WHERE id = ?
    `, [
      resumo.totais.saldo_atual,
      contado,
      diferenca,
      (observacao || '').trim().substring(0, 255) || null,
      req.user.id,
      id
    ])

    registrarAuditoria(req.user.id, 'caixa_fechar', 'caixa', id, {
      valor_fechamento: resumo.totais.saldo_atual,
      esperado_dinheiro: resumo.totais.esperado_dinheiro,
      valor_contado: contado,
      diferenca
    })

    const resumoFinal = await resumoCaixa(id)
    return res.json({ success: true, resumo: resumoFinal })
  } catch (error) {
    console.error('ERRO FECHAR CAIXA:', error)
    return res.status(500).json({ error: error.message })
  }
})

// POST /movimento — sangria / suprimento
router.post('/movimento', authenticate, permissoes.gerenciarCaixa, async (req, res) => {
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

    if (tipo === 'sangria') {
      const resumo = await resumoCaixa(caixas[0].id)
      const disponivel = resumo?.totais?.esperado_dinheiro ?? 0
      if (Number(valor) > disponivel + 0.009) {
        return res.status(400).json({
          error: `Sangria maior que o dinheiro em caixa — disponível: R$ ${disponivel.toFixed(2)}`
        })
      }
    }

    await query(
      `INSERT INTO movimentos_caixa (caixa_id, tipo, valor, descricao, usuario_id) VALUES (?, ?, ?, ?, ?)`,
      [caixas[0].id, tipo, Number(valor), descricao || null, req.user.id]
    )
    registrarAuditoria(req.user.id, `caixa_${tipo}`, 'caixa', caixas[0].id, {
      valor: Number(valor), descricao: descricao || null
    })
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// POST /estorno — estorna um pagamento a partir do movimento do extrato (admin).
// Venda direta sem outros pagamentos: cancela o pedido e devolve o estoque gerenciado.
router.post('/estorno', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { movimento_id, motivo } = req.body
    if (!movimento_id) return res.status(400).json({ error: 'movimento_id é obrigatório' })

    const resultado = await transaction(async (conn) => {
      const [movs] = await conn.execute(`
        SELECT mc.*, c.status AS caixa_status
        FROM movimentos_caixa mc
        JOIN caixa c ON c.id = mc.caixa_id
        WHERE mc.id = ? FOR UPDATE
      `, [movimento_id])
      const mov = movs[0]

      if (!mov) { const e = new Error('Movimento não encontrado'); e.status = 404; throw e }
      if (mov.tipo !== 'pagamento') { const e = new Error('Apenas pagamentos podem ser estornados'); e.status = 400; throw e }
      if (mov.caixa_status !== 'aberto') { const e = new Error('O caixa deste movimento já foi fechado'); e.status = 400; throw e }
      if (!mov.pagamento_id) { const e = new Error('Movimento antigo sem vínculo com o pagamento — não é possível estornar automaticamente'); e.status = 400; throw e }

      const [pags] = await conn.execute(`SELECT * FROM pagamentos WHERE id = ? FOR UPDATE`, [mov.pagamento_id])
      const pag = pags[0]
      if (!pag) { const e = new Error('Pagamento não encontrado'); e.status = 404; throw e }
      if (pag.status !== 'confirmado') { const e = new Error('Este pagamento já foi estornado'); e.status = 400; throw e }

      await conn.execute(`UPDATE pagamentos SET status = 'estornado' WHERE id = ?`, [pag.id])

      const desc = `Estorno${motivo ? ` · ${motivo}` : ''} · ${mov.descricao || ''}`.substring(0, 254)
      await conn.execute(
        `INSERT INTO movimentos_caixa (caixa_id, tipo, valor, descricao, usuario_id, pagamento_id)
         VALUES (?, 'estorno', ?, ?, ?, ?)`,
        [mov.caixa_id, mov.valor, desc, req.user.id, pag.id]
      )

      if (pag.pedido_id) {
        const [peds] = await conn.execute(`SELECT id, mesa_id FROM pedidos WHERE id = ? FOR UPDATE`, [pag.pedido_id])
        const ped = peds[0]

        if (ped && ped.mesa_id === null) {
          const [outros] = await conn.execute(
            `SELECT COUNT(*) AS n FROM pagamentos WHERE pedido_id = ? AND status = 'confirmado'`, [ped.id]
          )
          if (!Number(outros[0].n)) {
            await conn.execute(`UPDATE pedidos SET status = 'cancelado' WHERE id = ?`, [ped.id])

            const [itens] = await conn.execute(`
              SELECT pi.produto_id, pi.quantidade, pr.gerenciar_estoque, pr.estoque_atual
              FROM pedido_itens pi
              JOIN produtos pr ON pr.id = pi.produto_id
              WHERE pi.pedido_id = ? FOR UPDATE
            `, [ped.id])

            for (const it of itens) {
              if (!it.gerenciar_estoque) continue
              const qtd = Number(it.quantidade)
              await conn.execute(
                `UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?`,
                [qtd, it.produto_id]
              )
              await registrarMovEstoque(conn, {
                produto_id: it.produto_id,
                tipo: 'cancelamento',
                quantidade: qtd,
                estoque_resultante: Number(it.estoque_atual) + qtd,
                motivo: `Estorno da venda · pedido #${ped.id}`,
                usuario_id: req.user.id
              })
            }
          }
        }
      }

      return { pagamento_id: pag.id, valor: Number(mov.valor) }
    })

    registrarAuditoria(req.user.id, 'caixa_estorno', 'pagamento', resultado.pagamento_id, {
      movimento_id, valor: resultado.valor, motivo: motivo || null
    })
    return res.json({ success: true })
  } catch (error) {
    console.error('ERRO ESTORNO:', error)
    return res.status(error.status || 500).json({ error: error.message })
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
    return res.status(error.status || 500).json({ error: error.message })
  }
})

// GET /movimentos — extrato + totais + vendas por método do caixa atual
router.get('/movimentos', authenticate, async (req, res) => {
  try {
    const caixas = await query(`SELECT id FROM caixa WHERE status = 'aberto' ORDER BY id DESC LIMIT 1`)
    if (!caixas.length) return res.json({ movimentos: [], totais: null, porMetodo: [], vendas: null })

    const caixaId = caixas[0].id
    const [resumo, movimentos] = await Promise.all([
      resumoCaixa(caixaId),
      movimentosCaixa(caixaId)
    ])

    return res.json({
      movimentos,
      totais: resumo.totais,
      porMetodo: resumo.porMetodo,
      vendas: resumo.vendas
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// GET /historico — caixas anteriores (admin)
router.get('/historico', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const caixas = await query(`
      SELECT
        c.id, c.status, c.data_abertura, c.fechado_em,
        c.valor_inicial, c.valor_fechamento, c.valor_contado, c.diferenca,
        c.observacao_fechamento,
        u.nome  AS operador,
        uf.nome AS fechado_por_nome
      FROM caixa c
      LEFT JOIN usuarios u  ON u.id  = c.funcionario_id
      LEFT JOIN usuarios uf ON uf.id = c.fechado_por
      ORDER BY c.id DESC
      LIMIT 30
    `)
    return res.json(caixas)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// GET /historico/:id — detalhes de um caixa (resumo + extrato) (admin)
router.get('/historico/:id', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const caixaId = Number(req.params.id)
    if (!caixaId) return res.status(400).json({ error: 'id inválido' })

    const resumo = await resumoCaixa(caixaId)
    if (!resumo) return res.status(404).json({ error: 'Caixa não encontrado' })

    const movimentos = await movimentosCaixa(caixaId)
    return res.json({ ...resumo, movimentos })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

module.exports = router
