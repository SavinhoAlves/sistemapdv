import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { requireTenant } from '../../middlewares/tenant.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import { prisma } from '../../lib/prisma'
import { CAMPOS_PESSOAIS } from './usuarios.service'

/**
 * Meu perfil: o próprio usuário vê os seus dados e troca senha e PIN.
 * Sempre o usuário da sessão (request.auth.sub), nunca outro id. Trocar a
 * senha ou o PIN pede a senha atual.
 */
const SALT_ROUNDS = 10

export async function perfilRoutes(app: FastifyInstance) {
  // GET /api/perfil
  app.get('/', { preHandler: [requireTenant] }, async (request, reply) => {
    const auth = request.auth as TenantJwtPayload
    const u = await prisma.usuario.findFirst({
      where: { id: auth.sub, tenantId: request.tenantId! },
      select: {
        nome: true, login: true, email: true, codigo: true, cargo: true, ultimoLogin: true, createdAt: true,
        senhaHash: true, pin: true, cartaoRfid: true,
        ...CAMPOS_PESSOAIS,
        perfil: { select: { nome: true } },
        tenant: {
          select: {
            nome: true, codigo: true, cnpj: true, responsavel: true, telefone: true, endereco: true, cidade: true, uf: true,
            tipoComercio: true, status: true, createdAt: true,
            rfidDisponivel: true, vendaMobilePermitida: true, deliveryDisponivel: true,
            cobrancaDiaVencimento: true, cobrancaValor: true, cobrancaIsento: true,
            plano: { select: { nome: true, descricao: true, valor: true, nfce: true } },
          },
        },
        biometrias: { select: { id: true, aparelho: true, createdAt: true, usadoEm: true }, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!u) return reply.status(404).send({ error: 'Usuário não encontrado' })
    const t = u.tenant
    return {
      nome: u.nome,
      login: u.login,
      email: u.email,
      // Código de entrada: <código do restaurante>-<código do usuário>, como no login
      codigoAcesso: `${u.tenant.codigo}-${u.codigo}`,
      restaurante: u.tenant.nome,
      cargo: u.cargo,
      funcao: u.perfil?.nome ?? null,
      ultimoLogin: u.ultimoLogin,
      desde: u.createdAt,
      temSenha: !!u.senhaHash,
      temPin: !!u.pin,
      temCartao: !!u.cartaoRfid,
      biometrias: u.biometrias,
      cpf: u.cpf, telefone: u.telefone, nascimento: u.nascimento,
      cep: u.cep, endereco: u.endereco, cidade: u.cidade, uf: u.uf,
      // Cadastro do restaurante e o plano: só para o administrador
      empresa: u.cargo === 'administrador' ? {
        cnpj: t.cnpj, responsavel: t.responsavel, telefone: t.telefone,
        endereco: t.endereco, cidade: t.cidade, uf: t.uf, tipoComercio: t.tipoComercio,
        situacao: t.status, clienteDesde: t.createdAt,
        plano: t.plano ? { nome: t.plano.nome, descricao: t.plano.descricao } : null,
        mensalidade: t.cobrancaIsento ? 0 : Number(t.cobrancaValor ?? t.plano?.valor ?? 0),
        isento: t.cobrancaIsento,
        diaVencimento: t.cobrancaDiaVencimento,
        recursos: { rfid: t.rfidDisponivel, celular: t.vendaMobilePermitida, delivery: t.deliveryDisponivel, nfce: !!t.plano?.nfce },
      } : null,
    }
  })

  // POST /api/perfil/senha  { senhaAtual, novaSenha }
  app.post('/senha', { preHandler: [requireTenant] }, async (request, reply) => {
    const auth = request.auth as TenantJwtPayload
    const { senhaAtual, novaSenha } = (request.body ?? {}) as Record<string, unknown>
    if (typeof novaSenha !== 'string' || novaSenha.length < 6) return reply.status(400).send({ error: 'A nova senha precisa ter pelo menos 6 caracteres' })
    if (novaSenha.length > 100) return reply.status(400).send({ error: 'Senha muito longa' })
    const erro = await conferirSenha(auth.sub, request.tenantId!, senhaAtual)
    if (erro) return reply.status(erro.status).send({ error: erro.msg })
    await prisma.usuario.update({ where: { id: auth.sub }, data: { senhaHash: await bcrypt.hash(novaSenha, SALT_ROUNDS) } })
    return { ok: true }
  })

  // POST /api/perfil/pin  { senhaAtual, pin }  (pin vazio remove)
  app.post('/pin', { preHandler: [requireTenant] }, async (request, reply) => {
    const auth = request.auth as TenantJwtPayload
    const { senhaAtual, pin } = (request.body ?? {}) as Record<string, unknown>
    const remover = pin === '' || pin === null
    if (!remover && (typeof pin !== 'string' || !/^\d{4,6}$/.test(pin))) return reply.status(400).send({ error: 'O PIN deve ter de 4 a 6 números' })
    const erro = await conferirSenha(auth.sub, request.tenantId!, senhaAtual)
    if (erro) return reply.status(erro.status).send({ error: erro.msg })
    await prisma.usuario.update({ where: { id: auth.sub }, data: { pin: remover ? null : await bcrypt.hash(pin as string, SALT_ROUNDS) } })
    return { ok: true }
  })
}

// 403 (e não 401) na senha errada: 401 derrubaria a sessão no navegador
async function conferirSenha(id: string, tenantId: string, senha: unknown) {
  const u = await prisma.usuario.findFirst({ where: { id, tenantId }, select: { senhaHash: true } })
  if (!u) return { status: 404, msg: 'Usuário não encontrado' }
  if (!u.senhaHash) return { status: 400, msg: 'Seu usuário entra sem senha. Peça ao administrador para cadastrar uma.' }
  if (typeof senha !== 'string' || !(await bcrypt.compare(senha, u.senhaHash))) return { status: 403, msg: 'Senha atual incorreta' }
  return null
}
