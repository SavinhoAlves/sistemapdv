const express    = require('express')
const router     = express.Router()
const { prisma } = require('../lib/prisma')
const { authenticate } = require('../middlewares/auth.middleware')

router.use(authenticate)

const TIPOS_VALIDOS      = ['sync', 'instalacao', 'bug', 'cobranca', 'outro']
const PRIORIDADES_VALIDAS = ['baixa', 'media', 'alta', 'urgente']
const STATUS_VALIDOS      = ['aberto', 'em_andamento', 'resolvido', 'fechado']

// GET /api/tickets — lista global (opcional: ?tenantId=X&status=aberto)
router.get('/', async (req, res) => {
  try {
    const { tenantId, status } = req.query
    const where = {}
    if (tenantId) where.tenantId = tenantId
    if (status)   where.status   = status

    const tickets = await prisma.ticketSuporte.findMany({
      where,
      orderBy: [{ prioridade: 'desc' }, { createdAt: 'desc' }],
      include: { tenant: { select: { nome: true } } },
    })
    return res.json(tickets.map(t => ({ ...t, nome_fantasia: t.tenant?.nome })))
  } catch (error) {
    console.error('Erro ao listar tickets:', error)
    return res.status(500).json({ error: 'Erro ao listar tickets' })
  }
})

// GET /api/tickets/cliente/:tenantId
router.get('/cliente/:tenantId', async (req, res) => {
  try {
    const tickets = await prisma.ticketSuporte.findMany({
      where:   { tenantId: req.params.tenantId },
      orderBy: [{ prioridade: 'desc' }, { createdAt: 'desc' }],
    })
    return res.json(tickets)
  } catch (error) {
    console.error('Erro ao listar tickets:', error)
    return res.status(500).json({ error: 'Erro ao listar tickets' })
  }
})

// POST /api/tickets/cliente/:tenantId
router.post('/cliente/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params
    const { tipo, prioridade, titulo, descricao } = req.body

    if (!titulo?.trim()) return res.status(400).json({ error: 'Informe o título' })

    const ticket = await prisma.ticketSuporte.create({
      data: {
        tenantId,
        tipo:       TIPOS_VALIDOS.includes(tipo) ? tipo : 'outro',
        prioridade: PRIORIDADES_VALIDAS.includes(prioridade) ? prioridade : 'media',
        titulo:     titulo.trim(),
        descricao:  descricao?.trim() || null,
      },
    })
    return res.status(201).json({ success: true, id: ticket.id })
  } catch (error) {
    console.error('Erro ao criar ticket:', error)
    return res.status(500).json({ error: 'Erro ao criar ticket' })
  }
})

// PATCH /api/tickets/:id
router.patch('/:id', async (req, res) => {
  try {
    const { tipo, prioridade, status, titulo, descricao, resolucao } = req.body

    const data = {}
    if (tipo       !== undefined) data.tipo       = TIPOS_VALIDOS.includes(tipo) ? tipo : 'outro'
    if (prioridade !== undefined) data.prioridade = PRIORIDADES_VALIDAS.includes(prioridade) ? prioridade : 'media'
    if (status     !== undefined) data.status     = STATUS_VALIDOS.includes(status) ? status : 'aberto'
    if (titulo     !== undefined) data.titulo     = titulo.trim()
    if (descricao  !== undefined) data.descricao  = descricao?.trim() || null
    if (resolucao  !== undefined) data.resolucao  = resolucao?.trim() || null

    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    await prisma.ticketSuporte.update({ where: { id: req.params.id }, data })
    return res.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar ticket:', error)
    return res.status(500).json({ error: 'Erro ao atualizar ticket' })
  }
})

// DELETE /api/tickets/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.ticketSuporte.delete({ where: { id: req.params.id } })
    return res.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir ticket:', error)
    return res.status(500).json({ error: 'Erro ao excluir ticket' })
  }
})

module.exports = router
