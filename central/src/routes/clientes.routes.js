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

// ── POST /api/clientes — cria tenant com provisionamento completo ─────────────
router.post('/', async (req, res) => {
  const bcrypt = require('bcryptjs')
  try {
    const {
      nome_fantasia, contato, cnpj, responsavel, telefone, endereco, dias,
      admin_email, admin_senha, num_mesas, slug: slugCustom,
    } = req.body

    if (!nome_fantasia?.trim()) {
      return res.status(400).json({ error: 'Informe o nome do cliente' })
    }

    // Slug: usa o fornecido (limpo) ou gera a partir do nome
    const slugBase = (slugCustom?.trim() || nome_fantasia.trim())
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Garante unicidade sem sufixo aleatório quando slug customizado
    const slugFinal = slugCustom?.trim()
      ? slugBase
      : slugBase + '-' + crypto.randomBytes(3).toString('hex')

    const tenant = await prisma.tenant.create({
      data: {
        nome:        nome_fantasia.trim(),
        slug:        slugFinal,
        contato:     contato?.trim()      || null,
        cnpj:        cnpj?.trim()         || null,
        responsavel: responsavel?.trim()  || null,
        telefone:    telefone?.trim()     || null,
        endereco:    endereco?.trim()     || null,
        status:      'ativo',
      },
    })

    // ── Provisionamento automático ────────────────────────────────────────────

    // 1. Configurações padrão
    await prisma.configuracoes.create({
      data: {
        tenantId:         tenant.id,
        nomeRestaurante:  nome_fantasia.trim(),
        taxaServicoPct:   10,
        modoVenda:        'mesa',
      },
    })

    // 2. Métodos de pagamento padrão
    await prisma.metodoPagamento.createMany({
      data: [
        { tenantId: tenant.id, nome: 'Dinheiro',       ativo: true },
        { tenantId: tenant.id, nome: 'PIX',             ativo: true },
        { tenantId: tenant.id, nome: 'Cartão Débito',   ativo: true },
        { tenantId: tenant.id, nome: 'Cartão Crédito',  ativo: true },
      ],
    })

    // 3. Mesas iniciais (padrão 10 se não informado)
    const qtdMesas = Math.max(0, Math.min(50, Number(num_mesas) || 10))
    if (qtdMesas > 0) {
      await prisma.mesa.createMany({
        data: Array.from({ length: qtdMesas }, (_, i) => ({
          tenantId:   tenant.id,
          numero:     i + 1,
          capacidade: 4,
          status:     'livre',
        })),
      })
    }

    // 4. Usuário administrador inicial
    let adminCriado = null
    if (admin_email?.trim()) {
      const senhaFinal = admin_senha?.trim() || crypto.randomBytes(6).toString('hex')
      const senhaHash  = await bcrypt.hash(senhaFinal, 10)
      await prisma.usuario.create({
        data: {
          tenantId: tenant.id,
          nome:     responsavel?.trim() || 'Administrador',
          email:    admin_email.trim().toLowerCase(),
          senhaHash,
          cargo:    'administrador',
          ativo:    true,
        },
      })
      adminCriado = { email: admin_email.trim().toLowerCase(), senha: senhaFinal }
    }

    // ── Licença ────────────────────────────────────────────────────────────────
    const resposta = { success: true, id: tenant.id, slug: tenant.slug, admin: adminCriado }

    if (Number(dias) > 0) {
      const expira = new Date()
      expira.setDate(expira.getDate() + Number(dias))
      await prisma.licenca.create({
        data: {
          tenantId:       tenant.id,
          status:         'ativado',
          dataAtivacao:   new Date(),
          dataVencimento: expira,
        },
      })
      resposta.diasLicenca = Number(dias)
      resposta.expira      = expira.toISOString()
    }

    return res.status(201).json(resposta)
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Slug já existe — escolha um slug diferente' })
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
