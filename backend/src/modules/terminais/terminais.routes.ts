import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import { prisma } from '../../lib/prisma'
import { estadoRede, recarregarRede, normalizarIp, ehOProprioHost, ipValido, modoLocal } from '../../lib/redeLocal'
import { terminalDaRequisicao, novaChaveTerminal, hashChaveTerminal } from '../../lib/terminal'

/**
 * Terminais: cada computador/celular do restaurante com nome, função e se aceita
 * login por crachá. No modo local (Host) são cadastrados por IP fixo, e só esses
 * IPs acessam o Host; em qualquer modo o administrador pode autorizar o próprio
 * aparelho, que passa a se identificar por uma chave (ver lib/terminal.ts).
 */
const FUNCOES = ['caixa', 'garcom', 'cozinha', 'app'] as const

const aparelhoBody = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do terminal').max(40),
  funcao: z.enum(FUNCOES),
  cracha: z.boolean().optional(),
  ativo: z.boolean().optional(),
})
const terminalBody = aparelhoBody.extend({
  ip: z.string().trim().refine(ipValido, 'IP inválido (ex.: 10.0.0.3)'),
})

// A chave do aparelho nunca sai do servidor depois de criada
const semChave = { id: true, nome: true, ip: true, funcao: true, cracha: true, ativo: true, tokenHash: true, createdAt: true } as const
const publico = ({ tokenHash, ...t }: { tokenHash: string | null } & Record<string, unknown>) => ({ ...t, aparelho: !!tokenHash })

const primeiro = (e: z.ZodError) => e.issues[0]?.message ?? 'Dados inválidos'

export async function terminaisRoutes(app: FastifyInstance) {
  const admin = { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }

  // Situação da rede local (aberta a qualquer terminal autorizado: diz se é modo local)
  app.get('/rede', { config: { public: true } }, async (request) => {
    // Na nuvem não há rede local: nada além disso (antes saíam os IPs do servidor)
    if (!modoLocal()) return { modoLocal: false }
    const e = estadoRede()
    const ip = normalizarIp(request.ip)
    // IPs e motivo só para o próprio Host (quem configura)
    return ehOProprioHost(ip)
      ? { ...e, noHost: true, meuIp: ip }
      : { modoLocal: true, bloqueado: e.bloqueado, noHost: false, meuIp: ip }
  })

  // Qual terminal sou eu (chave do aparelho ou IP): o frontend abre na tela da
  // função e só mostra o crachá no login se este terminal tiver crachá liberado
  app.get('/eu', { config: { public: true } }, async (request) => {
    const t = await terminalDaRequisicao(request)
    if (t) return { terminal: { id: t.id, nome: t.nome, funcao: t.funcao, ip: t.ip, cracha: t.cracha, slug: t.tenant.slug } }
    const ip = normalizarIp(request.ip)
    return { terminal: modoLocal() && ehOProprioHost(ip) ? { nome: 'Host', funcao: 'caixa', ip, cracha: false } : null }
  })

  app.get('/', admin, async (request) => {
    const lista = await prisma.terminal.findMany({ where: { tenantId: request.tenantId! }, orderBy: [{ ip: 'asc' }, { nome: 'asc' }], select: semChave })
    return lista.map(publico)
  })

  // Autoriza o aparelho de quem está logado: a chave volta uma única vez e
  // fica guardada no navegador
  app.post('/aparelho', admin, async (request, reply) => {
    const b = aparelhoBody.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    const chave = novaChaveTerminal()
    const t = await prisma.terminal.create({ data: { tenantId: request.tenantId!, ...b.data, tokenHash: hashChaveTerminal(chave) }, select: semChave })
    return reply.status(201).send({ terminal: publico(t), chave })
  })

  // Terminal por IP: só existe no modo local
  app.post('/', admin, async (request, reply) => {
    if (!modoLocal()) return reply.status(400).send({ error: 'Terminal por IP só no modo local. Autorize o aparelho.' })
    const b = terminalBody.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    const existe = await prisma.terminal.findFirst({ where: { tenantId: request.tenantId!, ip: b.data.ip }, select: { id: true } })
    if (existe) return reply.status(409).send({ error: `O IP ${b.data.ip} já está cadastrado` })
    const t = await prisma.terminal.create({ data: { tenantId: request.tenantId!, ...b.data }, select: semChave })
    await recarregarRede()
    return reply.status(201).send(publico(t))
  })

  app.put('/:id', admin, async (request, reply) => {
    const { id } = request.params as { id: string }
    const atual = await prisma.terminal.findFirst({ where: { id, tenantId: request.tenantId! }, select: { tokenHash: true } })
    if (!atual) return reply.status(404).send({ error: 'Terminal não encontrado' })
    // Aparelho autorizado não tem IP: muda só nome, função, crachá e ativo
    if (atual.tokenHash) {
      const b = aparelhoBody.safeParse(request.body)
      if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
      await prisma.terminal.updateMany({ where: { id, tenantId: request.tenantId! }, data: b.data })
      return { ok: true }
    }
    const b = terminalBody.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
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
