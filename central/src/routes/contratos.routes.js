const express    = require('express')
const router     = express.Router()
const { prisma } = require('../lib/prisma')
const { authenticate } = require('../middlewares/auth.middleware')

router.use(authenticate)

const CICLOS_VALIDOS  = ['mensal', 'trimestral', 'semestral', 'anual']
const STATUS_VALIDOS  = ['trial', 'ativo', 'suspenso', 'cancelado']

function mapContrato(ct) {
  return {
    id:          ct.id,
    tenant_id:   ct.tenantId,
    plano:       ct.plano,
    valor:       ct.valor != null ? Number(ct.valor) : null,
    ciclo:       ct.ciclo,
    data_inicio: ct.dataInicio ? ct.dataInicio.toISOString().slice(0, 10) : null,
    data_fim:    ct.dataFim    ? ct.dataFim.toISOString().slice(0, 10)    : null,
    status:      ct.status,
    observacoes: ct.observacoes,
    created_at:  ct.createdAt,
    updated_at:  ct.updatedAt,
  }
}

// GET /api/contratos/cliente/:tenantId
router.get('/cliente/:tenantId', async (req, res) => {
  try {
    const contratos = await prisma.contrato.findMany({
      where:   { tenantId: req.params.tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(contratos.map(mapContrato))
  } catch (error) {
    console.error('Erro ao listar contratos:', error)
    return res.status(500).json({ error: 'Erro ao listar contratos' })
  }
})

// POST /api/contratos/cliente/:tenantId
router.post('/cliente/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params
    const { plano, valor, ciclo, data_inicio, data_fim, status, observacoes } = req.body

    if (!plano?.trim()) return res.status(400).json({ error: 'Informe o plano' })

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })
    if (!tenant) return res.status(404).json({ error: 'Cliente não encontrado' })

    const contrato = await prisma.contrato.create({
      data: {
        tenantId,
        plano:      plano.trim(),
        valor:      valor != null ? Number(valor) : null,
        ciclo:      CICLOS_VALIDOS.includes(ciclo) ? ciclo : 'mensal',
        dataInicio: data_inicio ? new Date(data_inicio) : null,
        dataFim:    data_fim    ? new Date(data_fim)    : null,
        status:     STATUS_VALIDOS.includes(status) ? status : 'ativo',
        observacoes: observacoes?.trim() || null,
      },
    })
    return res.status(201).json({ success: true, id: contrato.id, ...mapContrato(contrato) })
  } catch (error) {
    console.error('Erro ao criar contrato:', error)
    return res.status(500).json({ error: 'Erro ao criar contrato' })
  }
})

// PATCH /api/contratos/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { plano, valor, ciclo, data_inicio, data_fim, status, observacoes } = req.body

    const data = {}
    if (plano       !== undefined) data.plano      = plano.trim()
    if (valor       !== undefined) data.valor      = valor != null ? Number(valor) : null
    if (ciclo       !== undefined) data.ciclo      = CICLOS_VALIDOS.includes(ciclo) ? ciclo : 'mensal'
    if (data_inicio !== undefined) data.dataInicio = data_inicio ? new Date(data_inicio) : null
    if (data_fim    !== undefined) data.dataFim    = data_fim    ? new Date(data_fim)    : null
    if (status      !== undefined) data.status     = STATUS_VALIDOS.includes(status) ? status : 'ativo'
    if (observacoes !== undefined) data.observacoes = observacoes?.trim() || null

    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    await prisma.contrato.update({ where: { id }, data })
    return res.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar contrato:', error)
    return res.status(500).json({ error: 'Erro ao atualizar contrato' })
  }
})

// DELETE /api/contratos/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.contrato.delete({ where: { id: req.params.id } })
    return res.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir contrato:', error)
    return res.status(500).json({ error: 'Erro ao excluir contrato' })
  }
})

module.exports = router
