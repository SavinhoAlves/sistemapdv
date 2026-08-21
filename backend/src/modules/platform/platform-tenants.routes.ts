import type { FastifyInstance } from 'fastify'
import { requirePlatform } from '../../middlewares/tenant.middleware'
import { prisma } from '../../lib/prisma'

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function platformTenantsRoutes(app: FastifyInstance) {
  // GET / — lista todos com licença mais recente
  app.get('/', { preHandler: requirePlatform }, async (_request, reply) => {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        nome: true,
        slug: true,
        cnpj: true,
        contato: true,
        responsavel: true,
        telefone: true,
        endereco: true,
        status: true,
        rfidDisponivel: true,
        vendaMobilePermitida: true,
        createdAt: true,
        licencas: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, dataAtivacao: true, dataVencimento: true },
        },
        contratos: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, plano: true, valor: true, ciclo: true, status: true, dataInicio: true, dataFim: true },
        },
      },
      orderBy: { nome: 'asc' },
    })
    return reply.send(tenants)
  })

  // GET /:id — detalhes completos com licença e contratos
  app.get('/:id', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        slug: true,
        cnpj: true,
        contato: true,
        responsavel: true,
        telefone: true,
        endereco: true,
        observacoes: true,
        status: true,
        rfidDisponivel: true,
        vendaMobilePermitida: true,
        createdAt: true,
        licencas: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        contratos: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })
    return reply.send(tenant)
  })

  // POST / — criar tenant (+ licença pendente automática)
  app.post('/', { preHandler: requirePlatform }, async (request, reply) => {
    const body = request.body as any
    const { nome, slug, cnpj, responsavel, contato, telefone, endereco, observacoes, vendaMobilePermitida, rfidDisponivel } = body

    if (!nome?.trim()) return reply.status(400).send({ error: 'Nome é obrigatório' })

    const finalSlug = (slug?.trim() || slugify(nome)).toLowerCase()

    try {
      const tenant = await prisma.$transaction(async (tx) => {
        const t = await tx.tenant.create({
          data: {
            nome:                 nome.trim(),
            slug:                 finalSlug,
            cnpj:                 cnpj?.trim() || null,
            responsavel:          responsavel?.trim() || null,
            contato:              contato?.trim() || null,
            telefone:             telefone?.trim() || null,
            endereco:             endereco?.trim() || null,
            observacoes:          observacoes?.trim() || null,
            vendaMobilePermitida: vendaMobilePermitida ?? true,
            rfidDisponivel:       rfidDisponivel ?? false,
          },
        })
        await tx.licenca.create({ data: { tenantId: t.id, status: 'pendente' } })
        return t
      })
      return reply.status(201).send(tenant)
    } catch (err: any) {
      if (err.code === 'P2002') {
        const field = err.meta?.target?.includes('slug') ? 'slug' : 'CNPJ'
        return reply.status(409).send({ error: `${field} já está em uso` })
      }
      throw err
    }
  })

  // PUT /:id — editar dados do tenant
  app.put('/:id', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as any
    const { nome, slug, cnpj, responsavel, contato, telefone, endereco, observacoes, vendaMobilePermitida, rfidDisponivel } = body

    if (!nome?.trim()) return reply.status(400).send({ error: 'Nome é obrigatório' })

    try {
      const tenant = await prisma.tenant.update({
        where: { id },
        data: {
          nome:                 nome.trim(),
          ...(slug ? { slug: slug.trim().toLowerCase() } : {}),
          cnpj:                 cnpj?.trim() || null,
          responsavel:          responsavel?.trim() || null,
          contato:              contato?.trim() || null,
          telefone:             telefone?.trim() || null,
          endereco:             endereco?.trim() || null,
          observacoes:          observacoes?.trim() || null,
          ...(vendaMobilePermitida !== undefined ? { vendaMobilePermitida } : {}),
          ...(rfidDisponivel !== undefined ? { rfidDisponivel } : {}),
        },
      })
      return reply.send(tenant)
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Tenant não encontrado' })
      if (err.code === 'P2002') {
        const field = err.meta?.target?.includes('slug') ? 'slug' : 'CNPJ'
        return reply.status(409).send({ error: `${field} já está em uso` })
      }
      throw err
    }
  })

  // PATCH /:id/status — ativar / suspender / cancelar
  app.patch('/:id/status', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }

    if (!['ativo', 'suspenso', 'cancelado'].includes(status)) {
      return reply.status(400).send({ error: 'Status inválido' })
    }
    try {
      const tenant = await prisma.tenant.update({
        where: { id },
        data: { status: status as any },
        select: { id: true, nome: true, status: true },
      })
      return reply.send(tenant)
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Tenant não encontrado' })
      throw err
    }
  })

  // PATCH /:id/rfid — habilitar/desabilitar RFID
  app.patch('/:id/rfid', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { disponivel } = request.body as { disponivel: boolean }

    if (typeof disponivel !== 'boolean') {
      return reply.status(400).send({ error: '"disponivel" deve ser boolean' })
    }
    try {
      const tenant = await prisma.tenant.update({
        where: { id },
        data: { rfidDisponivel: disponivel },
        select: { id: true, nome: true, slug: true, rfidDisponivel: true },
      })
      return reply.send(tenant)
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Tenant não encontrado' })
      throw err
    }
  })

  // PUT /:id/licenca — criar ou atualizar licença
  app.put('/:id/licenca', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as any
    const { status, dataVencimento, dataAtivacao } = body

    if (!['ativado', 'pendente', 'bloqueado'].includes(status)) {
      return reply.status(400).send({ error: 'Status de licença inválido' })
    }

    const tenant = await prisma.tenant.findUnique({ where: { id } })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

    const existing = await prisma.licenca.findFirst({
      where: { tenantId: id },
      orderBy: { createdAt: 'desc' },
    })

    const data = {
      status:         status as any,
      dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
      dataAtivacao:   dataAtivacao   ? new Date(dataAtivacao)   : (status === 'ativado' ? new Date() : null),
    }

    const licenca = existing
      ? await prisma.licenca.update({ where: { id: existing.id }, data })
      : await prisma.licenca.create({ data: { tenantId: id, ...data } })

    return reply.send(licenca)
  })
}
