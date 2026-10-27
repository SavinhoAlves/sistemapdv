import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import { prisma } from '../../lib/prisma'
import { estadoRede, recarregarRede, normalizarIp, ehOProprioHost, ipValido, modoLocal } from '../../lib/redeLocal'

/**
 * Terminais do modo local (Host): cada computador/celular da rede com IP fixo e
 * função. Só os IPs cadastrados aqui acessam o Host.
 */
const FUNCOES = ['caixa', 'garcom', 'cozinha', 'app'] as const

const terminalBody = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do terminal').max(40),
  ip: z.string().trim().refine(ipValido, 'IP inválido (ex.: 10.0.0.3)'),
  funcao: z.enum(FUNCOES),
  ativo: z.boolean().optional(),
})

const primeiro = (e: z.ZodError) => e.issues[0]?.message ?? 'Dados inválidos'

export async function terminaisRoutes(app: FastifyInstance) {
  const admin = { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }

  // Situação da rede local (aberta a qualquer terminal autorizado: diz se é modo local)
  app.get('/rede', { config: { public: true } }, async (request) => {
    const e = estadoRede()
    const ip = normalizarIp(request.ip)
    // IPs e motivo só para o próprio Host (quem configura)
    return ehOProprioHost(ip) || !e.modoLocal
      ? { ...e, noHost: ehOProprioHost(ip), meuIp: ip }
      : { modoLocal: e.modoLocal, bloqueado: e.bloqueado, noHost: false, meuIp: ip }
  })

  // Qual terminal sou eu (pelo IP): o frontend abre na tela da função
  app.get('/eu', { config: { public: true } }, async (request) => {
    if (!modoLocal()) return { terminal: null }
    const ip = normalizarIp(request.ip)
    const t = await prisma.terminal.findFirst({ where: { ip, ativo: true }, select: { nome: true, funcao: true, ip: true } })
    return { terminal: t ?? (ehOProprioHost(ip) ? { nome: 'Host', funcao: 'caixa', ip } : null) }
  })

  app.get('/', admin, async (request) =>
    prisma.terminal.findMany({ where: { tenantId: request.tenantId! }, orderBy: { ip: 'asc' } }))

  app.post('/', admin, async (request, reply) => {
    const b = terminalBody.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    const existe = await prisma.terminal.findFirst({ where: { tenantId: request.tenantId!, ip: b.data.ip }, select: { id: true } })
    if (existe) return reply.status(409).send({ error: `O IP ${b.data.ip} já está cadastrado` })
    const t = await prisma.terminal.create({ data: { tenantId: request.tenantId!, ...b.data } })
    await recarregarRede()
    return reply.status(201).send(t)
  })

  app.put('/:id', admin, async (request, reply) => {
    const b = terminalBody.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    const { id } = request.params as { id: string }
    const outro = await prisma.terminal.findFirst({ where: { tenantId: request.tenantId!, ip: b.data.ip, NOT: { id } }, select: { id: true } })
    if (outro) return reply.status(409).send({ error: `O IP ${b.data.ip} já está cadastrado` })
    const r = await prisma.terminal.updateMany({ where: { id, tenantId: request.tenantId! }, data: b.data })
    if (!r.count) return reply.status(404).send({ error: 'Terminal não encontrado' })
    await recarregarRede()
    return { ok: true }
  })

  app.delete('/:id', admin, async (request, reply) => {
    const { id } = request.params as { id: string }
    const r = await prisma.terminal.deleteMany({ where: { id, tenantId: request.tenantId! } })
    if (!r.count) return reply.status(404).send({ error: 'Terminal não encontrado' })
    await recarregarRede()
    return { ok: true }
  })

  // IP do Host: só pode ser definido no próprio Host (nunca por um terminal)
  app.put('/host', admin, async (request, reply) => {
    if (!ehOProprioHost(normalizarIp(request.ip))) return reply.status(403).send({ error: 'O IP do Host só pode ser configurado no próprio Host' })
    const ip = String((request.body as any)?.ip ?? '').trim()
    if (!ipValido(ip)) return reply.status(400).send({ error: 'IP inválido (ex.: 10.0.0.2)' })
    const cfg = await prisma.configuracoes.findFirst({ where: { tenantId: request.tenantId! }, select: { id: true } })
    if (cfg) await prisma.configuracoes.update({ where: { id: cfg.id }, data: { hostIp: ip } })
    else await prisma.configuracoes.create({ data: { tenantId: request.tenantId!, hostIp: ip } as any })
    await recarregarRede()
    return estadoRede()
  })
}
