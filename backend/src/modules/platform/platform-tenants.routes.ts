import type { FastifyInstance } from 'fastify'
import { requirePlatform, invalidateTenantCache } from '../../middlewares/tenant.middleware'
import { prisma } from '../../lib/prisma'
import { signAccessToken } from '../../lib/jwt'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { valorMensalDoCiclo } from './platform-cobranca.routes'
import {
  TESTE_DIAS, aplicarRecursos, contratoAtual, dataDe, hojeBR, proximaDataComDia, registrarPagamento,
  resumir, sincronizarLicenca, somarDias, somarMeses, ymd,
} from './assinatura'

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
const CICLOS = ['mensal', 'trimestral', 'semestral', 'anual'] as const

/** Campos do contrato (cadastro e edição). Valor é o do ciclo; o do plano vem pré-preenchido na tela. */
const contratoBody = z.object({
  planoId:     z.string().min(1).nullish(),
  plano:       z.string().trim().max(60).nullish(),
  valor:       z.coerce.number().min(0, 'Valor não pode ser negativo').max(1_000_000).nullable(),
  ciclo:       z.enum(CICLOS).default('mensal'),
  dataInicio:  z.string().regex(DATA_RE).nullish(),
  dataFim:     z.string().regex(DATA_RE).nullish(),
  status:      z.enum(['trial', 'ativo', 'suspenso', 'cancelado']).default('trial'),
  isento:      z.boolean().default(false),
  observacoes: z.string().trim().max(1000).nullish(),
  diaVencimento: z.coerce.number().int().min(1, 'Dia entre 1 e 31').max(31, 'Dia entre 1 e 31').optional(),
})

const cadastroContratoBody = contratoBody.extend({
  teste:              z.boolean().default(false),
  primeiroVencimento: z.string().regex(DATA_RE, 'Data do primeiro vencimento inválida').nullish(),
  pagamentoInicial:   z.object({
    valor:  z.coerce.number().positive('Informe o valor recebido'),
    pagoEm: z.string().regex(DATA_RE, 'Data do pagamento inválida'),
    forma:  z.enum(['pix', 'dinheiro', 'cartao', 'boleto', 'transferencia']).nullish(),
  }).nullish(),
})

const primeiroErro = (e: z.ZodError) => e.issues[0]?.message ?? 'Dados inválidos'

export async function platformTenantsRoutes(app: FastifyInstance) {
  // GET /dashboard — métricas consolidadas para o painel
  app.get('/dashboard', { preHandler: requirePlatform }, async (_request, reply) => {
    const tenants = await prisma.tenant.findMany({
      where: { status: { not: 'cancelado' } },
      select: {
        id: true, nome: true, status: true,
        plano: { select: { nome: true } },
        contratos: { orderBy: { createdAt: 'desc' }, take: 1 },
        pagamentosMensalidade: { take: 1, select: { id: true } },
      },
    })

    let mrr = 0
    const porPlano: Record<string, { count: number; mrr: number }> = {}
    const alertas: { tenantId: string; nome: string; tipo: string; dias?: number; valor?: number }[] = []
    const cont = { ativas: 0, pendentes: 0, bloqueadas: 0, vencendo: 0, vencidas: 0, teste: 0 }

    for (const t of tenants) {
      const con = t.contratos[0] ?? null
      const r = resumir(con, t.status, t.pagamentosMensalidade.length > 0)
      const base = { tenantId: t.id, nome: t.nome }

      if (r.situacao === 'em_dia' || r.situacao === 'isento' || r.situacao === 'teste' || r.situacao === 'tolerancia') cont.ativas++
      if (r.situacao === 'pendente') cont.pendentes++
      if (r.situacao === 'bloqueado') { cont.bloqueadas++; alertas.push({ ...base, tipo: 'bloqueado', valor: r.valor ?? undefined }) }
      if (r.situacao === 'tolerancia') {
        cont.vencidas++
        alertas.push({ ...base, tipo: 'tolerancia', dias: r.diasParaBloquear ?? 0, valor: r.valor ?? undefined })
      }
      if (r.situacao === 'em_dia' && r.diasParaVencer !== null && r.diasParaVencer <= 5) {
        cont.vencendo++
        alertas.push({ ...base, tipo: 'vencendo', dias: r.diasParaVencer, valor: r.valor ?? undefined })
      }
      if (r.situacao === 'teste') {
        cont.teste++
        const dias = r.testeAte ? Math.max(0, Math.round((dataDe(r.testeAte).getTime() - dataDe(hojeBR()).getTime()) / 86_400_000)) : 0
        if (dias <= 2) alertas.push({ ...base, tipo: 'teste_acabando', dias })
      }

      // Receita mensal: quem paga (sem teste, isentos, suspensos ou rescindidos)
      if (['em_dia', 'tolerancia', 'bloqueado'].includes(r.situacao) && r.valor) {
        const m = valorMensalDoCiclo(r.valor, r.ciclo)
        const nome = t.plano?.nome ?? con?.plano ?? 'Sem plano'
        mrr += m
        porPlano[nome] ??= { count: 0, mrr: 0 }
        porPlano[nome].count++
        porPlano[nome].mrr += m
      }
    }

    // Bloqueados > em tolerância > teste acabando > vencendo
    const prioridade: Record<string, number> = { bloqueado: 0, tolerancia: 1, teste_acabando: 2, vencendo: 3 }
    alertas.sort((a, b) => (prioridade[a.tipo] ?? 9) - (prioridade[b.tipo] ?? 9) || (a.dias ?? 0) - (b.dias ?? 0))

    return reply.send({
      totais: {
        tenants:   tenants.length,
        ativos:    tenants.filter(t => t.status === 'ativo').length,
        suspensos: tenants.filter(t => t.status === 'suspenso').length,
      },
      licencas: cont,
      financeiro: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        porPlano: Object.entries(porPlano)
          .map(([plano, d]) => ({ plano, count: d.count, mrr: Math.round(d.mrr * 100) / 100 }))
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
        codigo: true,
        nome: true,
        slug: true,
        cnpj: true,
        contato: true,
        responsavel: true,
        telefone: true,
        endereco: true,
        // O modal de edição da lista reenvia estes campos: sem eles, salvar apagava os valores
        cpfResponsavel: true,
        cidade: true,
        uf: true,
        observacoes: true,
        status: true,
        rfidDisponivel: true,
        vendaMobilePermitida: true,
        planoId: true,
        plano: { select: { id: true, nome: true, valor: true } },
        createdAt: true,
        licencas: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, dataAtivacao: true, dataVencimento: true },
        },
        contratos: { orderBy: { createdAt: 'desc' }, take: 1 },
        pagamentosMensalidade: { take: 1, select: { id: true } },
      },
      orderBy: { nome: 'asc' },
    })
    return reply.send(tenants.map(({ pagamentosMensalidade, ...t }) => ({
      ...t,
      assinatura: resumir(t.contratos[0] ?? null, t.status, pagamentosMensalidade.length > 0),
    })))
  })

  // GET /:id — detalhes completos com licença e contratos
  app.get('/:id', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
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
        rfidManual: true,
        vendaMobileManual: true,
        cpfResponsavel: true,
        cidade: true,
        uf: true,
        planoId: true,
        plano: { select: { id: true, nome: true, valor: true, rfid: true, vendaMobile: true } },
        createdAt: true,
        licencas: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        contratos: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        pagamentosMensalidade: { take: 1, select: { id: true } },
      },
    })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })
    const { pagamentosMensalidade, ...resto } = tenant
    return reply.send({ ...resto, assinatura: resumir(tenant.contratos[0] ?? null, tenant.status, pagamentosMensalidade.length > 0) })
  })

  // POST / — cria o restaurante com administrador e assinatura (contrato + licença derivada)
  app.post('/', { preHandler: requirePlatform }, async (request, reply) => {
    const body = request.body as any
    const { nome, slug, cnpj, cpfResponsavel, responsavel, contato, telefone, endereco, cidade, uf, observacoes, adminEmail, adminSenha } = body

    if (typeof nome !== 'string' || !nome.trim()) return reply.status(400).send({ error: 'Nome é obrigatório' })
    if (typeof adminEmail !== 'string' || !adminEmail.trim()) return reply.status(400).send({ error: 'E-mail do administrador é obrigatório' })
    if (typeof adminSenha !== 'string' || adminSenha.length < 6) return reply.status(400).send({ error: 'Senha do administrador deve ter no mínimo 6 caracteres' })

    const parsed = cadastroContratoBody.safeParse(body.contrato ?? {})
    if (!parsed.success) return reply.status(400).send({ error: primeiroErro(parsed.error) })
    const c = parsed.data

    const plano = c.planoId ? await prisma.plano.findUnique({ where: { id: c.planoId } }) : null
    if (c.planoId && !plano) return reply.status(400).send({ error: 'Plano não encontrado' })
    if (!plano && !c.plano) return reply.status(400).send({ error: 'Escolha o plano do restaurante' })

    // Teste: começa hoje e vai até o 7º dia (seg → dom); o 1º vencimento é o dia seguinte.
    // Sem teste: 1º vencimento informado (padrão: hoje, para pagar no fechamento).
    const inicio = c.dataInicio ?? hojeBR()
    const testeAte = c.teste ? somarDias(inicio, TESTE_DIAS - 1) : null
    const primeiroVenc = testeAte ? somarDias(testeAte, 1) : (c.primeiroVencimento ?? inicio)
    const diaVencimento = c.diaVencimento ?? Number(primeiroVenc.slice(8, 10))

    const slugInput = typeof slug === 'string' ? slug.trim() : ''
    const finalSlug = (slugInput || slugify(nome)).toLowerCase()
    const texto = (v: unknown) => (typeof v === 'string' ? v.trim() || null : null)

    let tenant
    try {
      tenant = await prisma.$transaction(async (tx) => {
        const t = await tx.tenant.create({
          data: {
            nome: nome.trim(),
            slug: finalSlug,
            cnpj: texto(cnpj), cpfResponsavel: texto(cpfResponsavel), responsavel: texto(responsavel),
            contato: texto(contato), telefone: texto(telefone), endereco: texto(endereco), cidade: texto(cidade),
            uf: texto(uf)?.toUpperCase() ?? null, observacoes: texto(observacoes),
            planoId: plano?.id ?? null,
          },
        })
        await tx.contrato.create({
          data: {
            tenantId: t.id,
            plano: plano?.nome ?? c.plano!,
            valor: c.valor,
            ciclo: c.ciclo,
            dataInicio: dataDe(inicio),
            dataFim: c.dataFim ? dataDe(c.dataFim) : null,
            status: c.status,
            isento: c.isento,
            observacoes: c.observacoes || null,
            diaVencimento,
            testeAte: testeAte ? dataDe(testeAte) : null,
            proximoVencimento: dataDe(primeiroVenc),
          },
        })
        const senhaHash = await bcrypt.hash(adminSenha, 12)
        await tx.usuario.create({
          data: {
            tenantId: t.id,
            nome:     texto(responsavel) ?? nome.trim(),
            email:    adminEmail.trim().toLowerCase(),
            senhaHash,
            cargo:    'administrador',
            ativo:    true,
          },
        })
        await aplicarRecursos(t.id, tx)
        await sincronizarLicenca(t.id, tx)
        return t
      })
    } catch (err: any) {
      if (err.code === 'P2002') {
        const field = err.meta?.target?.includes('slug') ? 'slug' : 'CNPJ'
        return reply.status(409).send({ error: `${field} já está em uso` })
      }
      throw err
    }

    // Pagamento recebido no fechamento: cobre o 1º ciclo
    if (c.pagamentoInicial && !c.isento) {
      await registrarPagamento(tenant.id, c.pagamentoInicial)
    } else {
      await sincronizarLicenca(tenant.id)
    }
    return reply.status(201).send(tenant)
  })

  // PUT /:id — editar dados do tenant
  app.put('/:id', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as any
    const { nome, slug, cnpj, cpfResponsavel, responsavel, contato, telefone, endereco, cidade, uf, observacoes } = body

    if (typeof nome !== 'string' || !nome.trim()) return reply.status(400).send({ error: 'Nome é obrigatório' })

    try {
      const tenant = await prisma.tenant.update({
        where: { id },
        data: {
          nome:                 nome.trim(),
          ...(typeof slug === 'string' && slug.trim() ? { slug: slug.trim().toLowerCase() } : {}),
          cnpj:                 typeof cnpj === 'string' ? cnpj.trim() || null : null,
          cpfResponsavel:       typeof cpfResponsavel === 'string' ? cpfResponsavel.trim() || null : null,
          responsavel:          typeof responsavel === 'string' ? responsavel.trim() || null : null,
          contato:              typeof contato === 'string' ? contato.trim() || null : null,
          telefone:             typeof telefone === 'string' ? telefone.trim() || null : null,
          endereco:             typeof endereco === 'string' ? endereco.trim() || null : null,
          cidade:               typeof cidade === 'string' ? cidade.trim() || null : null,
          uf:                   typeof uf === 'string' ? uf.trim().toUpperCase() || null : null,
          observacoes:          typeof observacoes === 'string' ? observacoes.trim() || null : null,
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
      // Licença acompanha a suspensão/reativação na hora (sincronizar também invalida o cache)
      await sincronizarLicenca(id)
      return reply.send(tenant)
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Tenant não encontrado' })
      throw err
    }
  })

  // PATCH /:id/recursos — exceção do superadmin sobre o plano: true/false força, null segue o plano
  app.patch('/:id/recursos', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = z.object({
      rfid:        z.boolean().nullable().optional(),
      vendaMobile: z.boolean().nullable().optional(),
    }).safeParse(request.body ?? {})
    if (!parsed.success) return reply.status(400).send({ error: 'Use true, false ou null para cada recurso' })
    const { rfid, vendaMobile } = parsed.data
    try {
      await prisma.tenant.update({
        where: { id },
        data: {
          ...(rfid !== undefined ? { rfidManual: rfid } : {}),
          ...(vendaMobile !== undefined ? { vendaMobileManual: vendaMobile } : {}),
        },
      })
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Tenant não encontrado' })
      throw err
    }
    return reply.send(await aplicarRecursos(id))
  })

  // PATCH /:id/plano — troca o plano; os recursos passam a seguir o plano novo.
  // planoId null tira o plano e mantém os recursos como estão (viram manuais).
  app.patch('/:id/plano', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { planoId } = (request.body ?? {}) as { planoId?: string | null }
    if (planoId !== null && typeof planoId !== 'string') {
      return reply.status(400).send({ error: '"planoId" deve ser o id do plano ou null' })
    }
    const plano = planoId ? await prisma.plano.findUnique({ where: { id: planoId } }) : null
    if (planoId && !plano) return reply.status(400).send({ error: 'Plano não encontrado' })
    try {
      await prisma.tenant.update({ where: { id }, data: { planoId: plano?.id ?? null } })
      const contrato = await contratoAtual(prisma, id)
      if (plano && contrato) await prisma.contrato.update({ where: { id: contrato.id }, data: { plano: plano.nome } })
      await aplicarRecursos(id)
      const tenant = await prisma.tenant.findUnique({
        where: { id },
        select: { id: true, planoId: true, rfidDisponivel: true, vendaMobilePermitida: true, plano: { select: { id: true, nome: true, valor: true } } },
      })
      return reply.send(tenant)
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Tenant não encontrado' })
      throw err
    }
  })

  // PUT /:id/contrato — edita a assinatura: plano, valor, ciclo, vencimento, isenção, situação do papel
  app.put('/:id/contrato', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = contratoBody.safeParse(request.body ?? {})
    if (!parsed.success) return reply.status(400).send({ error: primeiroErro(parsed.error) })
    const c = parsed.data

    const tenant = await prisma.tenant.findUnique({ where: { id }, select: { id: true } })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })
    const plano = c.planoId ? await prisma.plano.findUnique({ where: { id: c.planoId } }) : null
    if (c.planoId && !plano) return reply.status(400).send({ error: 'Plano não encontrado' })
    if (!plano && !c.plano) return reply.status(400).send({ error: 'Escolha o plano do restaurante' })

    const atual = await contratoAtual(prisma, id)

    // Mudou o dia: o próximo vencimento vai para o novo dia, no mesmo mês
    const dia = c.diaVencimento ?? atual?.diaVencimento ?? 10
    let proximo = atual?.proximoVencimento ? ymd(atual.proximoVencimento) : null
    if (proximo && dia !== atual?.diaVencimento) proximo = somarMeses(proximo, 0, dia)
    if (!proximo) proximo = proximaDataComDia(hojeBR(), dia)

    const data = {
      plano:       plano?.nome ?? c.plano!,
      valor:       c.valor,
      ciclo:       c.ciclo,
      dataInicio:  c.dataInicio ? dataDe(c.dataInicio) : atual?.dataInicio ?? null,
      dataFim:     c.dataFim ? dataDe(c.dataFim) : null,
      status:      c.status,
      isento:      c.isento,
      observacoes: c.observacoes || null,
      diaVencimento: dia,
      proximoVencimento: dataDe(proximo),
    }

    const contrato = await prisma.$transaction(async tx => {
      const con = atual
        ? await tx.contrato.update({ where: { id: atual.id }, data })
        : await tx.contrato.create({ data: { tenantId: id, ...data } })
      await tx.tenant.update({ where: { id }, data: { planoId: plano?.id ?? null } })
      await aplicarRecursos(id, tx)
      await sincronizarLicenca(id, tx)
      return con
    })
    invalidateTenantCache(id)
    return reply.send(contrato)
  })

  // GET /:id/admin — retorna o usuário administrador do tenant
  app.get('/:id/admin', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const admin = await prisma.usuario.findFirst({
      where: { tenantId: id, cargo: 'administrador' },
      select: { id: true, codigo: true, login: true, nome: true, email: true, ativo: true },
      orderBy: { createdAt: 'asc' },
    })
    return reply.send(admin ?? null)
  })

  // PUT /:id/admin — cria ou atualiza o usuário administrador do tenant
  app.put('/:id/admin', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { nome, email, senha } = request.body as any

    if (typeof email !== 'string' || !email.trim()) return reply.status(400).send({ error: 'E-mail é obrigatório' })

    const tenant = await prisma.tenant.findUnique({ where: { id }, select: { id: true, nome: true } })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

    const existing = await prisma.usuario.findFirst({
      where: { tenantId: id, cargo: 'administrador' },
      orderBy: { createdAt: 'asc' },
    })

    const senhaHash = senha && senha.length >= 6 ? await bcrypt.hash(senha, 12) : undefined

    if (existing) {
      const updated = await prisma.usuario.update({
        where: { id: existing.id },
        data: {
          ...(typeof nome === 'string' && nome.trim() ? { nome: nome.trim() } : {}),
          email: email.trim().toLowerCase(),
          ...(senhaHash ? { senhaHash } : {}),
          ativo: true,
        },
        select: { id: true, nome: true, email: true, ativo: true },
      })
      // Senha redefinida pelo suporte: derruba as sessões abertas com a senha antiga
      if (senhaHash) {
        await prisma.refreshToken.updateMany({
          where: { usuarioId: existing.id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }
      return reply.send(updated)
    }

    if (!senhaHash) return reply.status(400).send({ error: 'Senha é obrigatória ao criar o administrador (mín. 6 caracteres)' })

    const created = await prisma.usuario.create({
      data: {
        tenantId: id,
        nome:     typeof nome === 'string' && nome.trim() ? nome.trim() : tenant.nome,
        email:    email.trim().toLowerCase(),
        senhaHash,
        cargo:    'administrador',
        ativo:    true,
      },
      select: { id: true, nome: true, email: true, ativo: true },
    })
    return reply.status(201).send(created)
  })

  // POST /:id/support-token — token de curta duração para acesso de suporte
  app.post('/:id/support-token', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true, nome: true, slug: true, status: true },
    })
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado' })

    const admin = await prisma.usuario.findFirst({
      where: { tenantId: id, cargo: 'administrador', ativo: true },
      select: { id: true, nome: true, cargo: true, email: true },
    })
    if (!admin) return reply.status(404).send({ error: 'Nenhum administrador ativo encontrado para este tenant' })

    const access_token = signAccessToken({
      type:       'tenant',
      sub:        admin.id,
      nome:       admin.nome,
      tenantId:   tenant.id,
      slug:       tenant.slug,
      cargo:      admin.cargo,
      perfilId:   null,
      permissoes: {},
      suporte:    true,
    })

    return reply.send({
      access_token,
      tenantNome: tenant.nome,
      tenantSlug: tenant.slug,
      usuario: { id: admin.id, nome: admin.nome, cargo: admin.cargo, email: admin.email },
    })
  })
}
