import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AsaasErro, asaasConfigurado } from '../../lib/asaas'
import { tipoValido, aplicarPadraoComercio } from '../../lib/tipoComercio'
import { garantirMetodosPadrao } from '../../lib/metodosPadrao'
import { cpfValido, cnpjValido, cpfFormatado, cnpjFormatado, soDigitos } from '../../lib/documento'
import { aplicarRecursos, sincronizarLicenca, contratoAtual, hojeBR, dataDe } from '../platform/assinatura'
import { registrarVersao } from '../platform/contrato'
import { cobrancaDaAssinaturaOnline, atualizarSeAtiva } from '../platform/asaas.service'
import { emailConfigurado } from '../../lib/email'
import { enviarConfirmacao, confirmarEmail } from '../auth/confirmar-email.service'

/**
 * Assinatura pelo site: plano → cadastro do responsável e da empresa →
 * pagamento (Pix ou cartão, no Asaas) → acesso liberado.
 *
 * O restaurante nasce com o contrato sem vencimento, ou seja, licença
 * "pendente": não entra no sistema. O primeiro pagamento confirmado chega pelo
 * webhook do Asaas e libera o acesso por um ciclo (registrarPagamento).
 *
 * Quem fecha o pagamento sem pagar pode voltar: o mesmo documento com o mesmo
 * e-mail e senha reaproveita o cadastro e gera o link de novo.
 *
 * O administrador também precisa confirmar o e-mail (link enviado no cadastro)
 * antes de entrar. Sem SMTP configurado, a confirmação não é exigida.
 */

const texto = (min: number, max: number, campo: string) => z.string().trim().min(min, `Informe ${campo}`).max(max)

const corpo = z.object({
  planoId: z.string().uuid('Plano inválido'),
  ciclo: z.enum(['mensal', 'anual']),
  forma: z.enum(['PIX', 'CREDIT_CARD']),
  aceite: z.literal(true, { errorMap: () => ({ message: 'Aceite os termos de uso para continuar' }) }),
  responsavel: z.object({
    nome: texto(3, 80, 'o nome completo do responsável'),
    cpf: z.string().refine(cpfValido, 'CPF do responsável inválido'),
    email: z.string().trim().toLowerCase().email('E-mail inválido').max(120),
    celular: z.string().refine((v) => [10, 11].includes(soDigitos(v).length), 'Celular inválido (com DDD)'),
    senha: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres').max(72),
  }),
  empresa: z.object({
    nome: texto(2, 80, 'o nome do restaurante'),
    razaoSocial: z.string().trim().max(120).optional().default(''),
    /** Vazio: a empresa ainda não tem CNPJ e contrata no CPF do responsável */
    cnpj: z.string().optional().default('').refine((v) => !soDigitos(v) || cnpjValido(v), 'CNPJ inválido'),
    cep: z.string().refine((v) => soDigitos(v).length === 8, 'CEP inválido'),
    logradouro: texto(3, 120, 'o endereço'),
    numero: texto(1, 20, 'o número'),
    bairro: z.string().trim().max(60).optional().default(''),
    cidade: texto(2, 60, 'a cidade'),
    uf: z.string().trim().toUpperCase().length(2, 'UF inválida'),
    tipoComercio: z.string().optional(),
  }),
})

type Corpo = z.infer<typeof corpo>

const primeiro = (e: z.ZodError) => e.issues[0]?.message ?? 'Dados inválidos'

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'restaurante'
}

async function slugLivre(nome: string) {
  const base = slugify(nome)
  if (!(await prisma.tenant.findUnique({ where: { slug: base }, select: { id: true } }))) return base
  return `${base}-${crypto.randomBytes(2).toString('hex')}`
}

/** Restaurante já cadastrado com este documento (CNPJ, ou o CPF de quem não tem CNPJ) */
function cadastroDoDocumento(b: Corpo) {
  const cnpj = soDigitos(b.empresa.cnpj)
  if (cnpj) return prisma.tenant.findFirst({ where: { cnpj: { in: [cnpj, cnpjFormatado(cnpj)] } }, select: { id: true } })
  const cpf = soDigitos(b.responsavel.cpf)
  return prisma.tenant.findFirst({ where: { cnpj: null, cpfResponsavel: { in: [cpf, cpfFormatado(cpf)] } }, select: { id: true } })
}

const dadosDaEmpresa = (b: Corpo) => {
  const e = b.empresa
  const cep = soDigitos(e.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2')
  return {
    nome: e.nome,
    cnpj: soDigitos(e.cnpj) ? cnpjFormatado(e.cnpj) : null,
    cpfResponsavel: cpfFormatado(b.responsavel.cpf),
    responsavel: b.responsavel.nome,
    contato: b.responsavel.email,
    telefone: soDigitos(b.responsavel.celular),
    endereco: [`${e.logradouro}, ${e.numero}`, e.bairro, `CEP ${cep}`].filter(Boolean).join(' · '),
    cidade: e.cidade,
    uf: e.uf,
  }
}

export async function assinaturaOnlineRoutes(app: FastifyInstance) {
  // POST /api/publico/assinar — cria o cadastro (ou retoma o pendente) e devolve o link de pagamento
  app.post('/assinar', { config: { public: true, rateLimit: { max: 6, timeWindow: '10 minutes' } } }, async (request, reply) => {
    if (!asaasConfigurado()) return reply.status(503).send({ error: 'Contratação online indisponível no momento. Fale com a equipe de vendas.' })
    const p = corpo.safeParse(request.body)
    if (!p.success) return reply.status(400).send({ error: primeiro(p.error) })
    const b = p.data

    const plano = await prisma.plano.findFirst({ where: { id: b.planoId, ativo: true } })
    const valor = Number(b.ciclo === 'anual' ? plano?.valorAnual ?? 0 : plano?.valor ?? 0)
    if (!plano || !(valor > 0)) return reply.status(400).send({ error: 'Este plano não está disponível para contratação online' })
    const condicoes = { plano: plano.nome, valor, ciclo: b.ciclo } as const

    let tenantId: string
    let adminId: string
    let pedirConfirmacao = false
    const existente = await cadastroDoDocumento(b)
    if (existente) {
      // Retoma só cadastro sem nenhum pagamento, e só com o mesmo e-mail e senha
      const pagos = await prisma.pagamentoMensalidade.count({ where: { tenantId: existente.id } })
      const admin = await prisma.usuario.findFirst({ where: { tenantId: existente.id, cargo: 'administrador', email: b.responsavel.email }, select: { id: true, senhaHash: true, emailPendente: true } })
      const confere = !!admin?.senhaHash && (await bcrypt.compare(b.responsavel.senha, admin.senhaHash))
      if (pagos > 0 || !confere) {
        return reply.status(409).send({ error: 'Já existe um restaurante cadastrado com este documento. Entre no sistema ou fale com o suporte.' })
      }
      tenantId = existente.id
      adminId = admin!.id
      pedirConfirmacao = admin!.emailPendente
      // Pode ter trocado de plano, ciclo ou dados antes de pagar
      const contrato = await contratoAtual(prisma, tenantId)
      await prisma.tenant.update({ where: { id: tenantId }, data: { ...dadosDaEmpresa(b), planoId: plano.id } })
      if (contrato) await prisma.contrato.update({ where: { id: contrato.id }, data: condicoes })
      await aplicarRecursos(tenantId)
      const aviso = await atualizarSeAtiva(tenantId)
      if (aviso) request.log.warn({ tenantId }, aviso)
    } else {
      const senhaHash = await bcrypt.hash(b.responsavel.senha, 12)
      const slug = await slugLivre(b.empresa.nome)
      const tipo = b.empresa.tipoComercio && tipoValido(b.empresa.tipoComercio) ? b.empresa.tipoComercio : null
      try {
        const criado = await prisma.$transaction(async (tx) => {
          const t = await tx.tenant.create({
            data: {
              ...dadosDaEmpresa(b), slug, planoId: plano.id, tipoComercio: tipo,
              observacoes: [b.empresa.razaoSocial && `Razão social: ${b.empresa.razaoSocial}`, 'Contratado pelo site'].filter(Boolean).join('\n'),
            },
          })
          if (tipo) await aplicarPadraoComercio(tx, t.id, tipo, b.empresa.nome)
          await garantirMetodosPadrao(tx, t.id)
          // Sem vencimento: licença pendente até o primeiro pagamento
          await tx.contrato.create({
            data: { tenantId: t.id, ...condicoes, dataInicio: dataDe(hojeBR()), diaVencimento: Math.min(Number(hojeBR().slice(8, 10)), 28), observacoes: 'Contratado pelo site' },
          })
          const admin = await tx.usuario.create({
            data: {
              tenantId: t.id, nome: b.responsavel.nome, email: b.responsavel.email, senhaHash, cargo: 'administrador', ativo: true,
              emailPendente: emailConfigurado(),
            },
          })
          await aplicarRecursos(t.id, tx)
          await sincronizarLicenca(t.id, tx)
          return { t, admin }
        })
        tenantId = criado.t.id
        adminId = criado.admin.id
        pedirConfirmacao = criado.admin.emailPendente
      } catch (e: any) {
        if (e?.code === 'P2002') return reply.status(409).send({ error: 'Já existe um restaurante cadastrado com este documento. Entre no sistema ou fale com o suporte.' })
        throw e
      }
      await registrarVersao(tenantId, 'Assinatura pelo site')
    }

    // Em segundo plano, sem atrasar o pagamento; se falhar, o login oferece reenviar o link
    if (pedirConfirmacao) {
      enviarConfirmacao(adminId).catch((e) => request.log.error({ err: e, tenantId }, 'assinatura online: e-mail de confirmação'))
    }

    try {
      const link = await cobrancaDaAssinaturaOnline(tenantId, b.forma)
      return reply.send({ id: tenantId, link, confirmarEmail: pedirConfirmacao })
    } catch (e: any) {
      // O cadastro fica salvo: enviar de novo (mesmo documento, e-mail e senha) gera o link
      request.log.error({ err: e, tenantId }, 'assinatura online: cobrança')
      const msg = e instanceof AsaasErro ? e.message : 'Falha ao gerar a cobrança'
      return reply.status(502).send({ error: `Cadastro salvo, mas não deu para gerar o pagamento: ${msg}. Tente de novo.`, id: tenantId })
    }
  })

  // POST /api/publico/confirmar-email — link do e-mail enviado no cadastro
  app.post('/confirmar-email', { config: { public: true, rateLimit: { max: 20, timeWindow: '10 minutes' } } }, async (request, reply) => {
    const token = String((request.body as any)?.token ?? '')
    try {
      return await confirmarEmail(token)
    } catch (e: any) {
      return reply.status(e.status ?? 400).send({ error: e.message })
    }
  })

  // GET /api/publico/assinatura/:id — a página espera o pagamento: liberado ou não
  app.get('/assinatura/:id', { config: { public: true } }, async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!z.string().uuid().safeParse(id).success) return reply.status(404).send({ error: 'Assinatura não encontrada' })
    const t = await prisma.tenant.findUnique({ where: { id }, select: { codigo: true, nome: true } })
    if (!t) return reply.status(404).send({ error: 'Assinatura não encontrada' })
    const lic = await prisma.licenca.findFirst({ where: { tenantId: id }, orderBy: { createdAt: 'desc' }, select: { status: true } })
    if (lic?.status !== 'ativado') return { liberado: false, restaurante: t.nome }
    const admin = await prisma.usuario.findFirst({ where: { tenantId: id, cargo: 'administrador' }, orderBy: { createdAt: 'asc' }, select: { codigo: true } })
    return { liberado: true, restaurante: t.nome, codigoAcesso: admin ? `${t.codigo}-${admin.codigo}` : null }
  })
}
