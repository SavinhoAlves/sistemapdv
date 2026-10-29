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

const so = (v: unknown) => String(v ?? '').replace(/\D/g, '')

function cpfValido(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  for (const n of [9, 10]) {
    let soma = 0
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i)
    if (((soma * 10) % 11) % 10 !== Number(cpf[n])) return false
  }
  return true
}

/**
 * Dados pessoais (CPF, telefone, nascimento, endereço). Campo ausente não
 * mexe; vazio apaga. CPF, telefone e CEP são guardados só com os números.
 */
export function dadosPessoaisDoCorpo(body: any): { dados: Service.DadosPessoais; erro?: string } {
  const dados: Service.DadosPessoais = {}
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null)
  if (body.cpf !== undefined) {
    const cpf = so(body.cpf)
    if (cpf && !cpfValido(cpf)) return { dados, erro: 'CPF inválido' }
    dados.cpf = cpf || null
  }
  if (body.telefone !== undefined) {
    const tel = so(body.telefone)
    if (tel && !/^\d{10,11}$/.test(tel)) return { dados, erro: 'Telefone deve ter DDD e 8 ou 9 números' }
    dados.telefone = tel || null
  }
  if (body.cep !== undefined) {
    const cep = so(body.cep)
    if (cep && cep.length !== 8) return { dados, erro: 'CEP deve ter 8 números' }
    dados.cep = cep || null
  }
  if (body.nascimento !== undefined) {
    if (!body.nascimento) dados.nascimento = null
    else {
      const d = new Date(`${String(body.nascimento).slice(0, 10)}T00:00:00Z`)
      if (isNaN(d.getTime()) || d > new Date() || d.getUTCFullYear() < 1900) return { dados, erro: 'Data de nascimento inválida' }
      dados.nascimento = d
    }
  }
  if (body.endereco !== undefined) dados.endereco = texto(body.endereco)
  if (body.cidade !== undefined) dados.cidade = texto(body.cidade)
  if (body.uf !== undefined) {
    const uf = String(body.uf ?? '').trim().toUpperCase()
    if (uf && !/^[A-Z]{2}$/.test(uf)) return { dados, erro: 'UF deve ter 2 letras' }
    dados.uf = uf || null
  }
  return { dados }
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
    const pessoais = dadosPessoaisDoCorpo(body)
    if (pessoais.erro) return reply.status(400).send({ error: pessoais.erro })

    try {
      const usuario = await Service.criar(request.tenantId!, {
        ...pessoais.dados,
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
    const pessoais = dadosPessoaisDoCorpo(body)
    if (pessoais.erro) return reply.status(400).send({ error: pessoais.erro })

    try {
      const usuario = await Service.atualizar(request.tenantId!, id, {
        ...pessoais.dados,
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
