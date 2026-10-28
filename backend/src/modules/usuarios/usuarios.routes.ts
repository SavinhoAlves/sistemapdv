import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import * as Service from './usuarios.service'
import { permissoesMudaram } from '../../lib/permissoesAtuais'

function loginInvalido(login: unknown) {
  if (login === undefined || login === null || login === '') return false
  return typeof login !== 'string' || !Service.LOGIN_REGEX.test(login.trim().toLowerCase())
}
const MSG_LOGIN = 'Nome de usuário deve ter de 3 a 30 caracteres, começar com letra e usar só letras, números, ponto, hífen ou sublinhado'
const MSG_DUPLICADO = 'Nome de usuário, e-mail ou cartão RFID já em uso'

/** PIN do celular: 4 a 6 dígitos. Vazio ou null apaga; ausente não mexe. */
function pinDoCorpo(pin: unknown): { pin?: string | null; erro?: string } {
  if (pin === undefined) return {}
  if (pin === null || pin === '') return { pin: null }
  if (typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) return { erro: 'O PIN deve ter de 4 a 6 números' }
  return { pin }
}

export async function usuariosRoutes(app: FastifyInstance) {
  // GET /api/usuarios
  app.get('/', { preHandler: [requireTenant, requirePermissao('gerenciarUsuarios')] }, async (request, reply) => {
    return Service.listar(request.tenantId!)
  })

  // POST /api/usuarios
  app.post('/', { preHandler: [requireTenant, requirePermissao('gerenciarUsuarios')] }, async (request, reply) => {
    const body = request.body as any
    if (!body.nome?.trim()) return reply.status(400).send({ error: 'nome é obrigatório' })
    if (!body.cargo) return reply.status(400).send({ error: 'cargo é obrigatório' })

    const cargosValidos = ['administrador', 'garcom', 'caixa', 'cozinha', 'entregador']
    if (!cargosValidos.includes(body.cargo))
      return reply.status(400).send({ error: `cargo deve ser um de: ${cargosValidos.join(', ')}` })
    if (loginInvalido(body.login)) return reply.status(400).send({ error: MSG_LOGIN })
    const pin = pinDoCorpo(body.pin)
    if (pin.erro) return reply.status(400).send({ error: pin.erro })

    try {
      const usuario = await Service.criar(request.tenantId!, {
        nome: body.nome,
        login: body.login,
        email: body.email,
        senha: body.senha,
        cartaoRfid: body.cartaoRfid,
        cargo: body.cargo,
        pin: pin.pin,
        perfilId: body.perfilId,
        ativo: body.ativo,
      })
      return reply.status(201).send(usuario)
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: MSG_DUPLICADO })
      throw err
    }
  })

  // PUT /api/usuarios/:id
  app.put('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarUsuarios')] }, async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any

    if (body.cargo) {
      const cargosValidos = ['administrador', 'garcom', 'caixa', 'cozinha', 'entregador']
      if (!cargosValidos.includes(body.cargo))
        return reply.status(400).send({ error: `cargo deve ser um de: ${cargosValidos.join(', ')}` })
    }
    if (loginInvalido(body.login)) return reply.status(400).send({ error: MSG_LOGIN })
    const pin = pinDoCorpo(body.pin)
    if (pin.erro) return reply.status(400).send({ error: pin.erro })

    try {
      const usuario = await Service.atualizar(request.tenantId!, id, {
        nome: body.nome,
        login: body.login,
        email: body.email,
        senha: body.senha,
        cartaoRfid: body.cartaoRfid,
        cargo: body.cargo,
        pin: pin.pin,
        perfilId: body.perfilId,
        ativo: body.ativo,
      })
      permissoesMudaram(request.tenantId!)
      return usuario
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: MSG_DUPLICADO })
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Usuário não encontrado' })
      throw err
    }
  })

  // PATCH /api/usuarios/:id/ativo
  app.patch('/:id/ativo', { preHandler: [requireTenant, requirePermissao('gerenciarUsuarios')] }, async (request, reply) => {
    const { id } = request.params as any
    const { ativo } = request.body as any
    try {
      const usuario = await Service.toggleAtivo(request.tenantId!, id, Boolean(ativo))
      permissoesMudaram(request.tenantId!)
      return usuario
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Usuário não encontrado' })
      throw err
    }
  })

  // DELETE /api/usuarios/:id — soft delete
  app.delete('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarUsuarios')] }, async (request, reply) => {
    const { id } = request.params as any
    try {
      await Service.toggleAtivo(request.tenantId!, id, false)
      return { success: true }
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Usuário não encontrado' })
      throw err
    }
  })

  // POST /api/usuarios/:id/mobile-token
  app.post('/:id/mobile-token', { preHandler: [requireTenant, requirePermissao('gerenciarUsuarios')] }, async (request, reply) => {
    const { id } = request.params as any
    try {
      const result = await Service.gerarMobileToken(request.tenantId!, id)
      return result
    } catch (err: any) {
      if (err.status === 404 || err.status === 409) return reply.status(err.status).send({ error: err.message })
      throw err
    }
  })
}
