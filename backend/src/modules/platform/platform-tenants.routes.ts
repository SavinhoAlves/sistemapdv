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

const FATOR_MRR: Record<string, number> = {
  mensal:      1,
  trimestral:  1 / 3,
  semestral:   1 / 6,
  anual:       1 / 12,
}

export async function platformTenantsRoutes(app: FastifyInstance) {
  // GET /dashboard — métricas consolidadas para o painel
  app.get('/dashboard', { preHandler: requirePlatform }, async (_request, reply) => {
    const tenants = await prisma.tenant.findMany({
      where: { status: { not: 'cancelado' } },
      select: {
        id: true, nome: true, slug: true, status: true,
        licencas:  { orderBy: { createdAt: 'desc' }, take: 1,
          select: { status: true, dataVencimento: true } },
        contratos: { orderBy: { createdAt: 'desc' }, take: 1,
          select: { plano: true, valor: true, ciclo: true, status: true } },
      },
    })

    const agora   = new Date()
    const em30d   = new Date(agora.getTime() + 30 * 86_400_000)
    const em7d    = new Date(agora.getTime() +  7 * 86_400_000)

    let mrr = 0
    const porPlano: Record<string, { count: number; mrr: number }> = {}
    const alertas: { tenantId: string; nome: string; tipo: string; dias?: number }[] = []

    let licAtivas = 0, licPendentes = 0, licBloqueadas = 0, licVencendo30 = 0, licVencidas = 0

    for (const t of tenants) {
      const lic = t.licencas[0]
      const con = t.contratos[0]

      if (lic) {
        if (lic.status === 'ativado') {
          licAtivas++
          if (lic.dataVencimento) {
            const venc = new Date(lic.dataVencimento)
            if (venc < agora) {
              licVencidas++
              alertas.push({ tenantId: t.id, nome: t.nome, tipo: 'licenca_vencida' })
            } else if (venc <= em30d) {
              licVencendo30++
              const dias = Math.ceil((venc.getTime() - agora.getTime()) / 86_400_000)
              alertas.push({ tenantId: t.id, nome: t.nome, tipo: dias <= 7 ? 'licenca_critica' : 'licenca_vencendo', dias })
            }
          }
        } else if (lic.status === 'pendente') {
          licPendentes++
        } else if (lic.status === 'bloqueado') {
          licBloqueadas++
          alertas.push({ tenantId: t.id, nome: t.nome, tipo: 'inadimplente' })
        }
      }

      if (con?.status === 'ativo' && con.valor) {
        const mrrTenant = Number(con.valor) * (FATOR_MRR[con.ciclo] ?? 1)
        mrr += mrrTenant
        if (!porPlano[con.plano]) porPlano[con.plano] = { count: 0, mrr: 0 }
        porPlano[con.plano].count++
        porPlano[con.plano].mrr += mrrTenant
      }
    }

    // Ordena alertas: vencidas > críticas (≤7d) > vencendo > inadimplentes
    const prioridade: Record<string, number> = { licenca_vencida: 0, licenca_critica: 1, licenca_vencendo: 2, inadimplente: 3 }
    alertas.sort((a, b) => (prioridade[a.tipo] ?? 9) - (prioridade[b.tipo] ?? 9))

    return reply.send({
      totais: {
        tenants:   tenants.length,
        ativos:    tenants.filter(t => t.status === 'ativo').length,
        suspensos: tenants.filter(t => t.status === 'suspenso').length,
      },
      licencas: { ativas: licAtivas, pendentes: licPendentes, bloqueadas: licBloqueadas, vencendo: licVencendo30, vencidas: licVencidas },
      financeiro: {
        mrr,
        arr: mrr * 12,
        porPlano: Object.entries(porPlano)
          .map(([plano, d]) => ({ plano, count: d.count, mrr: d.mrr }))
          .sort((a, b) => b.mrr - a.mrr),
      },
      alertas,
    })
  })

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

  // POST / — criar tenant (+ licença pendente automática + contrato opcional)
  app.post('/', { preHandler: requirePlatform }, async (request, reply) => {
    const body = request.body as any
    const { nome, slug, cnpj, responsavel, contato, telefone, endereco, observacoes, vendaMobilePermitida, rfidDisponivel, contrato } = body

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
        if (contrato?.plano?.trim()) {
          await tx.contrato.create({
            data: {
              tenantId:  t.id,
              plano:     contrato.plano.trim(),
              valor:     contrato.valor != null ? contrato.valor : null,
              ciclo:     contrato.ciclo || 'mensal',
              dataInicio: contrato.dataInicio ? new Date(contrato.dataInicio) : new Date(),
              status:    contrato.status || 'ativo',
            },
          })
        }
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

  // PATCH /:id/mobile — habilitar/desabilitar Venda Mobile
  app.patch('/:id/mobile', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { permitida } = request.body as { permitida: boolean }

    if (typeof permitida !== 'boolean') {
      return reply.status(400).send({ error: '"permitida" deve ser boolean' })
    }
    try {
      const tenant = await prisma.tenant.update({
        where: { id },
        data: { vendaMobilePermitida: permitida },
        select: { id: true, nome: true, slug: true, vendaMobilePermitida: true },
      })
      return reply.send(tenant)
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Tenant não encontrado' })
      throw err
    }
  })

  // PUT /:id/contrato — criar ou atualizar contrato
  app.put('/:id/contrato', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as any
    const { plano, valor, ciclo, dataInicio, dataFim, status } = body

    if (!plano?.trim()) return reply.status(400).send({ error: 'Plano é obrigatório' })

    const tenant = await prisma.tenant.findUnique({ where: { id } })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

    const existing = await prisma.contrato.findFirst({
      where: { tenantId: id },
      orderBy: { createdAt: 'desc' },
    })

    const data = {
      plano:     plano.trim(),
      valor:     valor != null ? valor : null,
      ciclo:     (ciclo || 'mensal') as any,
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      dataFim:   dataFim ? new Date(dataFim) : null,
      status:    (status || 'ativo') as any,
    }

    const contrato = existing
      ? await prisma.contrato.update({ where: { id: existing.id }, data })
      : await prisma.contrato.create({ data: { tenantId: id, ...data } })

    return reply.send(contrato)
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
