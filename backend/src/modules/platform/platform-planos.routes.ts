import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requirePlatform } from '../../middlewares/tenant.middleware'
import { prisma } from '../../lib/prisma'
import { aplicarRecursos } from './assinatura'

/**
 * Planos: pacotes de recursos vendidos pela plataforma.
 *
 * O que o sistema checa de fato continua sendo `tenant.rfidDisponivel` e
 * `tenant.vendaMobilePermitida` (login por crachá, venda pelo celular). O
 * plano é a fonte desses dois campos, exceto quando o superadmin libera ou
 * bloqueia um recurso para um restaurante (rfidManual / vendaMobileManual):
 * ver aplicarRecursos em ./assinatura.
 * Delivery e NFC-e ficam registrados no plano, mas ainda não existem no PDV.
 */

const planoBody = z.object({
  nome:        z.string().trim().min(1, 'Informe o nome do plano').max(60),
  descricao:   z.string().trim().max(300).nullish(),
  valor:       z.coerce.number().min(0, 'Valor não pode ser negativo').max(1_000_000),
  valorAnual:  z.coerce.number().min(0, 'Valor anual não pode ser negativo').max(10_000_000).nullish(),
  rfid:        z.boolean().default(false),
  vendaMobile: z.boolean().default(false),
  delivery:    z.boolean().default(false),
  nfce:        z.boolean().default(false),
  ativo:       z.boolean().default(true),
})


function formatar(p: any) {
  return { ...p, valor: Number(p.valor), valorAnual: p.valorAnual == null ? null : Number(p.valorAnual), qtdRestaurantes: p._count?.tenants ?? 0, _count: undefined }
}

export async function platformPlanosRoutes(app: FastifyInstance) {
  // GET / — todos os planos com quantos restaurantes usam cada um
  app.get('/', { preHandler: requirePlatform }, async (_request, reply) => {
    const planos = await prisma.plano.findMany({
      orderBy: [{ ativo: 'desc' }, { valor: 'asc' }, { nome: 'asc' }],
      include: { _count: { select: { tenants: true } } },
    })
    return reply.send(planos.map(formatar))
  })

  // POST / — cria um plano
  app.post('/', { preHandler: requirePlatform }, async (request, reply) => {
    const parsed = planoBody.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
    try {
      const plano = await prisma.plano.create({ data: parsed.data, include: { _count: { select: { tenants: true } } } })
      return reply.status(201).send(formatar(plano))
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: 'Já existe um plano com esse nome' })
      throw err
    }
  })

  // PUT /:id — edita o plano e aplica os recursos aos restaurantes nele
  app.put('/:id', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = planoBody.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
    try {
      const plano = await prisma.plano.update({ where: { id }, data: parsed.data, include: { _count: { select: { tenants: true } } } })
      const afetados = await prisma.tenant.findMany({ where: { planoId: id }, select: { id: true } })
      for (const t of afetados) await aplicarRecursos(t.id)
      return reply.send(formatar(plano))
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Plano não encontrado' })
      if (err.code === 'P2002') return reply.status(409).send({ error: 'Já existe um plano com esse nome' })
      throw err
    }
  })

  // DELETE /:id — só exclui plano que nenhum restaurante usa
  app.delete('/:id', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const emUso = await prisma.tenant.count({ where: { planoId: id } })
    if (emUso > 0) {
      return reply.status(409).send({ error: `${emUso} ${emUso === 1 ? 'restaurante usa' : 'restaurantes usam'} este plano. Troque o plano deles antes de excluir.` })
    }
    try {
      await prisma.plano.delete({ where: { id } })
      return reply.send({ success: true })
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Plano não encontrado' })
      throw err
    }
  })
}

/** GET /api/publico/planos — planos ativos para a página de preços do site. */
export async function planosPublicosRoutes(app: FastifyInstance) {
  app.get('/planos', { config: { public: true } }, async (_request, reply) => {
    const planos = await prisma.plano.findMany({
      where: { ativo: true },
      orderBy: [{ valor: 'asc' }, { nome: 'asc' }],
      // id: o botão "Quero este plano" do site leva para /assinar?plano=<id>
      select: { id: true, nome: true, descricao: true, valor: true, valorAnual: true, rfid: true, vendaMobile: true, delivery: true, nfce: true },
    })
    return reply.send(planos.map((p) => ({ ...p, valor: Number(p.valor), valorAnual: p.valorAnual == null ? null : Number(p.valorAnual) })))
  })
}
