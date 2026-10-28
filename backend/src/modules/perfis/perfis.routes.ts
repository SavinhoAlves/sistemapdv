import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao, PERMISSOES_CARGO } from '../../middlewares/permission.middleware'
import * as Service from './perfis.service'
import { permissoesMudaram } from '../../lib/permissoesAtuais'

export async function perfisRoutes(app: FastifyInstance) {
  // GET /api/perfis
  app.get('/', { preHandler: [requireTenant] }, async (request, reply) => {
    return Service.listar(request.tenantId!)
  })

  // POST /api/perfis
  app.post('/', { preHandler: [requireTenant, requirePermissao('gerenciarPerfis')] }, async (request, reply) => {
    const body = request.body as any
    if (typeof body.nome !== 'string' || !body.nome.trim()) return reply.status(400).send({ error: 'nome é obrigatório' })
    try {
      const perfil = await Service.criar(request.tenantId!, {
        nome: body.nome,
        descricao: body.descricao,
        permissoes: body.permissoes,
      })
      permissoesMudaram(request.tenantId!)
      return reply.status(201).send(perfil)
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: 'Já existe um perfil com esse nome' })
      throw err
    }
  })

  // PUT /api/perfis/:id
  app.put('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarPerfis')] }, async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    try {
      const perfil = await Service.atualizar(request.tenantId!, id, {
        nome: body.nome,
        descricao: body.descricao,
        permissoes: body.permissoes,
      })
      permissoesMudaram(request.tenantId!)
      return perfil
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: 'Já existe um perfil com esse nome' })
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Perfil não encontrado' })
      throw err
    }
  })

  // GET /api/perfis/funcoes — permissões de cada função (cargo) neste restaurante, base dos perfis
  app.get('/funcoes', { preHandler: [requireTenant] }, async (request) => Service.padroesFuncoes(request.tenantId!))

  // GET /api/perfis/funcoes/detalhes — padrão do sistema e quais funções o restaurante alterou
  app.get('/funcoes/detalhes', { preHandler: [requireTenant] }, async (request) => ({
    sistema: PERMISSOES_CARGO,
    personalizadas: await Service.funcoesPersonalizadas(request.tenantId!),
  }))

  // PUT /api/perfis/funcoes/:cargo — edita as permissões de uma função; { permissoes: null } restaura o padrão
  app.put('/funcoes/:cargo', { preHandler: [requireTenant, requirePermissao('gerenciarPerfis')] }, async (request, reply) => {
    const { cargo } = request.params as { cargo: string }
    if (!(Service.FUNCOES_EDITAVEIS as readonly string[]).includes(cargo)) {
      return reply.status(400).send({ error: 'Essa função não pode ser editada' })
    }
    const { permissoes } = (request.body ?? {}) as { permissoes?: Record<string, unknown> | null }
    if (permissoes !== null && (typeof permissoes !== 'object' || Array.isArray(permissoes))) {
      return reply.status(400).send({ error: 'permissoes inválidas' })
    }
    const r = await Service.salvarFuncao(request.tenantId!, cargo, permissoes)
    permissoesMudaram(request.tenantId!)
    return r
  })

  // DELETE /api/perfis/:id — quem usava o perfil volta ao padrão da função
  app.delete('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarPerfis')] }, async (request, reply) => {
    const { id } = request.params as any
    const ok = await Service.excluir(request.tenantId!, id)
    if (!ok) return reply.status(404).send({ error: 'Perfil não encontrado' })
    permissoesMudaram(request.tenantId!)
    return { success: true }
  })

  // POST /api/perfis/seed
  app.post('/seed', { preHandler: [requireTenant, requirePermissao('gerenciarPerfis')] }, async (request, reply) => {
    const result = await Service.seed(request.tenantId!)
    permissoesMudaram(request.tenantId!)
    return { success: true, perfis: result }
  })

  // POST /api/perfis/auto-atribuir
  app.post('/auto-atribuir', { preHandler: [requireTenant, requirePermissao('gerenciarPerfis')] }, async (request) => {
    const r = await Service.autoAtribuir(request.tenantId!)
    permissoesMudaram(request.tenantId!)
    return r
  })
}
