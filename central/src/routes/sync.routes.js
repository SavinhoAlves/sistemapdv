const express    = require('express')
const router     = express.Router()
const { prisma } = require('../lib/prisma')

// POST /api/sync — legado, PDVs SaaS não usam mais sync manual.
// Mantido apenas para não quebrar instalações antigas em transição.
// No modelo multi-tenant, os dados são consultados diretamente no banco compartilhado.
router.post('/', async (req, res) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const slug = req.body?.slug || null
    if (!slug) {
      return res.json({ vendaMobilePermitida: true, suspenso: false, novaExpiracao: null })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: { licencas: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant não encontrado', revogado: true })
    }

    const licenca = tenant.licencas[0]
    const suspenso = tenant.status === 'suspenso'
    const novaExpiracao = licenca?.dataVencimento?.toISOString() ?? null

    return res.json({
      vendaMobilePermitida: tenant.vendaMobilePermitida,
      suspenso,
      novaExpiracao,
    })
  } catch (error) {
    console.error('Erro no sync:', error)
    return res.status(500).json({ error: 'Erro ao processar sincronização' })
  }
})

module.exports = router
