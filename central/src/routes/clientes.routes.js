const express    = require('express')
const router     = express.Router()
const crypto     = require('crypto')
const { prisma } = require('../lib/prisma')
const { authenticate } = require('../middlewares/auth.middleware')

router.use(authenticate)

// ── GET /api/clientes ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { nome: 'asc' },
      include: {
        licencas: { orderBy: { createdAt: 'desc' }, take: 1 },
        caixas:   { where: { status: 'aberto' }, take: 1 },
        _count:   { select: { mesas: { where: { status: { in: ['aberta', 'ocupada'] } } } } },
      },
    })

    // Compute today's totals per tenant
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const pagamentosHoje = await prisma.pagamento.groupBy({
      by: ['tenantId'],
      where: { status: 'confirmado', createdAt: { gte: hoje } },
      _sum: { valor: true },
      _count: { id: true },
    })
    const porTenant = Object.fromEntries(pagamentosHoje.map(p => [p.tenantId, p]))

    const resultado = tenants.map(t => {
      const licenca = t.licencas[0] ?? null
      const caixaAberto = t.caixas.length > 0
      const stats = porTenant[t.id]
      const faturamento = stats ? Number(stats._sum.valor ?? 0) : 0
      const pagamentosQtd = stats ? stats._count.id : 0
      const mesasAbertas = t._count.mesas

      return {
        id:                   t.id,
        nome_fantasia:        t.nome,
        slug:                 t.slug,
        contato:              t.contato,
        cnpj:                 t.cnpj,
        responsavel:          t.responsavel,
        telefone:             t.telefone,
        endereco:             t.endereco,
        observacoes:          t.observacoes,
        venda_mobile_permitida: t.vendaMobilePermitida,
        status:               t.status,
        caixa_aberto:         caixaAberto,
        faturamento_hoje:     faturamento,
        mesas_abertas:        mesasAbertas,
        pedidos_hoje:         pagamentosQtd,
        ticket_medio:         pagamentosQtd > 0 ? faturamento / pagamentosQtd : 0,
        licenca_expira_em:    licenca?.dataVencimento ?? null,
        licenca_status:       licenca?.status ?? 'sem_licenca',
        created_at:           t.createdAt,
        online:               caixaAberto,
      }
    })

    return res.json(resultado)
  } catch (error) {
    console.error('Erro ao listar clientes:', error)
    return res.status(500).json({ error: 'Erro ao listar clientes' })
  }
})

// ── POST /api/clientes — cria tenant ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { nome_fantasia, contato, cnpj, responsavel, telefone, endereco, dias } = req.body
    if (!nome_fantasia?.trim()) {
      return res.status(400).json({ error: 'Informe o nome do cliente' })
    }

    const slug = nome_fantasia.trim()
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const tenant = await prisma.tenant.create({
      data: {
        nome:       nome_fantasia.trim(),
        slug:       slug + '-' + crypto.randomBytes(3).toString('hex'),
        contato:    contato?.trim()     || null,
        cnpj:       cnpj?.trim()        || null,
        responsavel: responsavel?.trim() || null,
        telefone:   telefone?.trim()    || null,
        endereco:   endereco?.trim()    || null,
      },
    })

    const resposta = { success: true, id: tenant.id, slug: tenant.slug }

    if (Number(dias) > 0) {
      const expira = new Date()
      expira.setDate(expira.getDate() + Number(dias))
      await prisma.licenca.create({
        data: {
          tenantId:      tenant.id,
          status:        'ativado',
          dataAtivacao:  new Date(),
          dataVencimento: expira,
        },
      })
      resposta.diasLicenca = Number(dias)
      resposta.expira = expira.toISOString()
    }

    return res.status(201).json(resposta)
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Slug já existe — tente um nome diferente' })
    }
    return res.status(500).json({ error: 'Erro ao criar cliente' })
  }
})

// ── PATCH /api/clientes/:id ───────────────────────────────────────────────────
const STATUS_VALIDOS = ['ativo', 'suspenso', 'cancelado']

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      venda_mobile_permitida, nome_fantasia, contato, status,
      cnpj, responsavel, telefone, endereco, observacoes,
    } = req.body

    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ error: `status deve ser um de: ${STATUS_VALIDOS.join(', ')}` })
    }

    const data = {}
    if (venda_mobile_permitida !== undefined) data.vendaMobilePermitida = !!venda_mobile_permitida
    if (nome_fantasia  !== undefined) data.nome        = nome_fantasia.trim()
    if (contato        !== undefined) data.contato     = contato?.trim()     || null
    if (status         !== undefined) data.status      = status
    if (cnpj           !== undefined) data.cnpj        = cnpj?.trim()        || null
    if (responsavel    !== undefined) data.responsavel = responsavel?.trim()  || null
    if (telefone       !== undefined) data.telefone    = telefone?.trim()     || null
    if (endereco       !== undefined) data.endereco    = endereco?.trim()     || null
    if (observacoes    !== undefined) data.observacoes = observacoes?.trim()  || null

    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    await prisma.tenant.update({ where: { id }, data })
    return res.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return res.status(500).json({ error: 'Erro ao atualizar cliente' })
  }
})

// ── DELETE /api/clientes/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenant = await prisma.tenant.findUnique({ where: { id }, select: { id: true } })
    if (!tenant) return res.status(404).json({ error: 'Cliente não encontrado' })
    await prisma.tenant.delete({ where: { id } })
    return res.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir cliente:', error)
    return res.status(500).json({ error: 'Erro ao excluir cliente' })
  }
})

// ── POST /api/clientes/:id/licenca — gera/renova licença ─────────────────────
router.post('/:id/licenca', async (req, res) => {
  try {
    const { id }  = req.params
    const dias    = Number(req.body.dias)

    if (!dias || dias <= 0) {
      return res.status(400).json({ error: 'Informe a validade em dias' })
    }

    const tenant = await prisma.tenant.findUnique({ where: { id }, select: { id: true, nome: true } })
    if (!tenant) return res.status(404).json({ error: 'Cliente não encontrado' })

    const expira = new Date()
    expira.setDate(expira.getDate() + dias)

    const licenca = await prisma.licenca.upsert({
      where:  { id: (await prisma.licenca.findFirst({ where: { tenantId: id }, orderBy: { createdAt: 'desc' }, select: { id: true } }))?.id ?? '' },
      create: { tenantId: id, status: 'ativado', dataAtivacao: new Date(), dataVencimento: expira },
      update: { status: 'ativado', dataVencimento: expira },
    })

    return res.json({ success: true, dias, expira: expira.toISOString(), licencaId: licenca.id })
  } catch (error) {
    console.error('Erro ao gerar licença:', error)
    return res.status(500).json({ error: 'Erro ao gerar licença' })
  }
})

// ── GET /api/clientes/:id/detalhes — detalhes completos ──────────────────────
router.get('/:id/detalhes', async (req, res) => {
  try {
    const { id } = req.params
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        licencas:   { orderBy: { createdAt: 'desc' }, take: 3 },
        dispositivos: { orderBy: { createdAt: 'desc' } },
        contratos:  { orderBy: { createdAt: 'desc' } },
        tickets:    { orderBy: { createdAt: 'desc' }, take: 10 },
        caixas:     { where: { status: 'aberto' }, take: 1 },
        _count:     { select: { usuarios: true, mesas: true, produtos: true } },
      },
    })
    if (!tenant) return res.status(404).json({ error: 'Cliente não encontrado' })
    return res.json(tenant)
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error)
    return res.status(500).json({ error: 'Erro ao buscar detalhes' })
  }
})

module.exports = router
