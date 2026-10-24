import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { verifyClienteToken } from '../../lib/jwt'
import * as Service from './clientes.service'

// Mesmo formato de resposta das rotas do delivery (sem importar delas: evita ciclo)
const responder = async (reply: any, fn: () => Promise<any>) => {
  try { return await fn() } catch (e: any) {
    if (e?.status) return reply.status(e.status).send({ error: e.message })
    throw e
  }
}
const primeiro = (e: z.ZodError) => e.issues[0]?.message ?? 'Dados inválidos'

/** Cliente logado no cardápio deste restaurante (token próprio, nunca o da equipe). */
export async function clienteDaRequisicao(request: FastifyRequest, slug: string) {
  const h = request.headers.authorization
  if (!h?.startsWith('Bearer ')) return null
  const p = verifyClienteToken(h.slice(7))
  if (!p) return null
  const t = await Service.tenantDoSlug(slug)
  return p.tid === t.id ? { clienteId: p.sub, tenantId: t.id } : null
}

const telefone = z.string().transform((t) => t.replace(/\D/g, '')).pipe(z.string().min(10, 'Informe o celular com DDD').max(13))
const senha = z.string().min(6, 'A senha precisa de pelo menos 6 caracteres').max(72)
const endereco = z.object({
  apelido: z.string().max(30).nullable().optional(),
  endereco: z.string().trim().min(2, 'Informe a rua').max(140),
  numero: z.string().trim().min(1, 'Informe o número').max(20),
  bairro: z.string().trim().min(2, 'Informe o bairro').max(80),
  complemento: z.string().max(80).nullable().optional(),
  referencia: z.string().max(140).nullable().optional(),
  cep: z.string().max(9).nullable().optional(),
  cidade: z.string().max(80).nullable().optional(),
  uf: z.string().max(2).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
})
// Campo opcional: texto vazio vira null (apaga o valor)
const vazioNulo = (s: z.ZodTypeAny) => z.preprocess((v) => (v === '' ? null : v), s.nullable().optional())
const soDigitos = (t: string) => t.replace(/\D/g, '')
const perfil = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome').max(80),
  email: vazioNulo(z.string().trim().email('E-mail inválido').max(120)),
  nascimento: vazioNulo(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida')),
  cpf: vazioNulo(z.string().transform(soDigitos).pipe(z.string().length(11, 'O CPF tem 11 dígitos'))),
  telefone2: vazioNulo(z.string().transform(soDigitos).pipe(z.string().min(10, 'Telefone alternativo com DDD').max(13))),
  contatoPreferido: z.enum(['whatsapp', 'ligacao', 'email']).optional(),
})

/** Rotas públicas (/api/publico/cardapio/:slug/conta): cadastro, login e dados do cliente. */
export async function contaClienteRoutes(app: FastifyInstance) {
  const slug = (r: any) => (r.params as { slug: string }).slug
  // Cadastro e login: limite apertado por IP contra tentativa de senha
  const tentativa = { config: { public: true, rateLimit: { max: 10, timeWindow: '10 minutes' } } }
  const publico = { config: { public: true } }

  async function logado(request: FastifyRequest, reply: any) {
    const c = await clienteDaRequisicao(request, slug(request)).catch(() => null)
    if (!c) { reply.status(401).send({ error: 'Entre na sua conta para continuar' }); return null }
    return c
  }

  app.post('/cardapio/:slug/conta/cadastro', tentativa, async (request, reply) => {
    const b = z.object({ nome: z.string().trim().min(2, 'Informe seu nome').max(80), telefone, senha }).safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, async () => reply.status(201).send(await Service.cadastrar(slug(request), b.data)))
  })

  app.post('/cardapio/:slug/conta/entrar', tentativa, async (request, reply) => {
    const b = z.object({ telefone, senha: z.string().min(1, 'Informe a senha').max(72) }).safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, () => Service.entrar(slug(request), b.data))
  })

  app.get('/cardapio/:slug/conta', publico, async (request, reply) => {
    const c = await logado(request, reply); if (!c) return
    return responder(reply, () => Service.perfil(c.tenantId, c.clienteId))
  })

  app.put('/cardapio/:slug/conta', publico, async (request, reply) => {
    const c = await logado(request, reply); if (!c) return
    const b = perfil.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, () => Service.atualizarPerfil(c.tenantId, c.clienteId, b.data as Service.DadosPerfil))
  })

  app.post('/cardapio/:slug/conta/enderecos', publico, async (request, reply) => {
    const c = await logado(request, reply); if (!c) return
    const b = endereco.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, () => Service.salvarEndereco(c.tenantId, c.clienteId, b.data))
  })

  app.put('/cardapio/:slug/conta/enderecos/:id', publico, async (request, reply) => {
    const c = await logado(request, reply); if (!c) return
    const b = endereco.safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, () => Service.editarEndereco(c.tenantId, c.clienteId, (request.params as any).id, b.data))
  })

  app.post('/cardapio/:slug/conta/enderecos/:id/padrao', publico, async (request, reply) => {
    const c = await logado(request, reply); if (!c) return
    return responder(reply, () => Service.definirPadrao(c.tenantId, c.clienteId, (request.params as any).id))
  })

  app.delete('/cardapio/:slug/conta/enderecos/:id', publico, async (request, reply) => {
    const c = await logado(request, reply); if (!c) return
    return responder(reply, () => Service.removerEndereco(c.tenantId, c.clienteId, (request.params as any).id))
  })

  // LGPD: apagar a conta pede a senha de novo
  app.post('/cardapio/:slug/conta/apagar', tentativa, async (request, reply) => {
    const c = await logado(request, reply); if (!c) return
    const b = z.object({ senha: z.string().min(1, 'Informe a senha').max(72) }).safeParse(request.body)
    if (!b.success) return reply.status(400).send({ error: primeiro(b.error) })
    return responder(reply, () => Service.apagarConta(c.tenantId, c.clienteId, b.data.senha))
  })
}
