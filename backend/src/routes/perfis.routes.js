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

// POST /seed — cria ou atualiza perfis padrão
// ?force=true → atualiza permissões dos perfis já existentes também
router.post('/seed', authenticate, authorize('administrador'), async (req, res) => {
  const PERFIS_PADRAO = [
    {
      nome: 'Garçom',
      descricao: 'Atendimento nas mesas — abre, serve e fecha contas',
      permissoes: {
        modo_venda:            'mesas',
        adicionarPedido:       true,
        cancelarItemPedido:    true,
        abrirMesa:             true,
        fecharMesa:            true,
        gerenciarCaixa:        false,
        verRelatorios:         false,
        verCozinha:            true,
        gerenciarProdutos:     false,
        gerenciarConfiguracoes: false
      }
    },
    {
      nome: 'Caixa',
      descricao: 'Operação financeira — recebe pagamentos e gerencia o caixa',
      permissoes: {
        modo_venda:            'direta',
        adicionarPedido:       true,
        cancelarItemPedido:    true,
        abrirMesa:             false,
        fecharMesa:            true,
        gerenciarCaixa:        true,
        verRelatorios:         true,
        verCozinha:            false,
        gerenciarProdutos:     false,
        gerenciarConfiguracoes: false
      }
    },
    {
      nome: 'Vendedor',
      descricao: 'Venda direta no balcão — sem gestão de mesas',
      permissoes: {
        modo_venda:            'direta',
        adicionarPedido:       true,
        cancelarItemPedido:    true,
        abrirMesa:             false,
        fecharMesa:            false,
        gerenciarCaixa:        true,
        verRelatorios:         false,
        verCozinha:            false,
        gerenciarProdutos:     false,
        gerenciarConfiguracoes: false
      }
    },
    {
      nome: 'Cozinheiro',
      descricao: 'Visualização e preparo dos pedidos na cozinha',
      permissoes: {
        modo_venda:            'ambos',
        adicionarPedido:       false,
        cancelarItemPedido:    false,
        abrirMesa:             false,
        fecharMesa:            false,
        gerenciarCaixa:        false,
        verRelatorios:         false,
        verCozinha:            true,
        gerenciarProdutos:     false,
        gerenciarConfiguracoes: false
      }
    },
    {
      nome: 'Gerente',
      descricao: 'Supervisão operacional completa — exceto configurações do sistema',
      permissoes: {
        modo_venda:            'ambos',
        adicionarPedido:       true,
        cancelarItemPedido:    true,
        abrirMesa:             true,
        fecharMesa:            true,
        gerenciarCaixa:        true,
        verRelatorios:         true,
        verCozinha:            true,
        gerenciarProdutos:     true,
        gerenciarConfiguracoes: false
      }
    }
  ]

  const force = req.query.force === 'true' || req.body.force === true

  try {
    const existentes = await query('SELECT id, nome FROM perfis')
    const mapa = new Map(existentes.map(r => [r.nome, r.id]))
    let criados = 0, atualizados = 0

    for (const p of PERFIS_PADRAO) {
      if (mapa.has(p.nome)) {
        if (force) {
          await query(
            'UPDATE perfis SET descricao = ?, permissoes = ? WHERE id = ?',
            [p.descricao, JSON.stringify(p.permissoes), mapa.get(p.nome)]
          )
          atualizados++
        }
      } else {
        await query(
          'INSERT INTO perfis (nome, descricao, permissoes) VALUES (?, ?, ?)',
          [p.nome, p.descricao, JSON.stringify(p.permissoes)]
        )
        criados++
      }
    }

    return res.json({ success: true, criados, atualizados })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// POST /auto-atribuir — vincula perfis aos usuários com base no cargo
// Por padrão só toca usuários sem perfil; ?force=true sobrescreve todos
router.post('/auto-atribuir', authenticate, authorize('administrador'), async (req, res) => {
  const force = req.query.force === 'true' || req.body.force === true

  const CARGO_PARA_PERFIL = {
    garcom:  'Garçom',
    caixa:   'Caixa',
    cozinha: 'Cozinheiro',
  }

  try {
    const perfisExistentes = await query('SELECT id, nome FROM perfis')
    const perfilPorNome    = new Map(perfisExistentes.map(p => [p.nome, p.id]))

    let atualizados = 0
    const perfisFaltando = []

    for (const [cargo, nomePerfil] of Object.entries(CARGO_PARA_PERFIL)) {
      const perfilId = perfilPorNome.get(nomePerfil)
      if (!perfilId) { perfisFaltando.push(nomePerfil); continue }

      const where  = force ? 'cargo = ?' : 'cargo = ? AND (perfil_id IS NULL OR perfil_id = 0)'
      const result = await query(
        `UPDATE usuarios SET perfil_id = ? WHERE ${where}`,
        [perfilId, cargo]
      )
      atualizados += result.affectedRows
    }

    return res.json({ success: true, atualizados, perfisFaltando })
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
