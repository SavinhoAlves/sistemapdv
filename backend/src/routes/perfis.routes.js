const express = require('express')
const router  = express.Router()
const { query }             = require('../database/connection')
const { authenticate, authorize } = require('../middlewares/auth.middleware')

// GET / — listar
router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await query(`
      SELECT p.*, COUNT(u.id) AS total_usuarios
      FROM perfis p
      LEFT JOIN usuarios u ON u.perfil_id = p.id
      GROUP BY p.id
      ORDER BY p.nome ASC
    `)
    return res.json(rows.map(r => ({
      ...r,
      permissoes: typeof r.permissoes === 'string' ? JSON.parse(r.permissoes) : r.permissoes
    })))
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar perfis' })
  }
})

// POST / — criar
router.post('/', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { nome, descricao, permissoes } = req.body
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' })

    const result = await query(
      'INSERT INTO perfis (nome, descricao, permissoes) VALUES (?, ?, ?)',
      [nome.trim(), descricao || null, JSON.stringify(permissoes || {})]
    )
    return res.status(201).json({ success: true, id: result.insertId })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// PUT /:id — atualizar
router.put('/:id', authenticate, authorize('administrador'), async (req, res) => {
  try {
    const { nome, descricao, permissoes } = req.body
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' })

    await query(
      'UPDATE perfis SET nome = ?, descricao = ?, permissoes = ? WHERE id = ?',
      [nome.trim(), descricao || null, JSON.stringify(permissoes || {}), req.params.id]
    )
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// POST /seed — cria perfis padrão (não duplica se já existir pelo nome)
router.post('/seed', authenticate, authorize('administrador'), async (req, res) => {
  const PERFIS_PADRAO = [
    {
      nome: 'Garçom',
      descricao: 'Atendimento nas mesas',
      permissoes: { adicionarPedido: true, cancelarItemPedido: true, abrirMesa: true, fecharMesa: true,
                    gerenciarCaixa: false, verRelatorios: false, verCozinha: false, gerenciarProdutos: false, gerenciarConfiguracoes: false }
    },
    {
      nome: 'Caixa',
      descricao: 'Operação financeira e vendas diretas',
      permissoes: { adicionarPedido: true, cancelarItemPedido: false, abrirMesa: false, fecharMesa: false,
                    gerenciarCaixa: true, verRelatorios: true, verCozinha: false, gerenciarProdutos: false, gerenciarConfiguracoes: false }
    },
    {
      nome: 'Cozinheiro',
      descricao: 'Visualização e preparo dos pedidos',
      permissoes: { adicionarPedido: false, cancelarItemPedido: false, abrirMesa: false, fecharMesa: false,
                    gerenciarCaixa: false, verRelatorios: false, verCozinha: true, gerenciarProdutos: false, gerenciarConfiguracoes: false }
    },
    {
      nome: 'Gerente',
      descricao: 'Supervisão operacional completa',
      permissoes: { adicionarPedido: true, cancelarItemPedido: true, abrirMesa: true, fecharMesa: true,
                    gerenciarCaixa: true, verRelatorios: true, verCozinha: true, gerenciarProdutos: true, gerenciarConfiguracoes: false }
    }
  ]

  try {
    const existentes = await query('SELECT nome FROM perfis')
    const nomes = new Set(existentes.map(r => r.nome))
    let criados = 0
    for (const p of PERFIS_PADRAO) {
      if (!nomes.has(p.nome)) {
        await query('INSERT INTO perfis (nome, descricao, permissoes) VALUES (?, ?, ?)',
          [p.nome, p.descricao, JSON.stringify(p.permissoes)])
        criados++
      }
    }
    return res.json({ success: true, criados })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// DELETE /:id — excluir (desvincula usuários antes)
router.delete('/:id', authenticate, authorize('administrador'), async (req, res) => {
  try {
    await query('UPDATE usuarios SET perfil_id = NULL WHERE perfil_id = ?', [req.params.id])
    await query('DELETE FROM perfis WHERE id = ?', [req.params.id])
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

module.exports = router
