import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { garantirMetodosPadrao } from '../../lib/metodosPadrao'
import { asaasConfigurado, AsaasErro } from '../../lib/asaas'
import { aplicarRecursos } from './assinatura'
import { dataDe, hojeBR, somarDias, sincronizarLicenca } from './assinatura'
import { registrarVersao } from './contrato'
import { ativarCobranca, situacaoCobranca } from './asaas.service'

/**
 * Contratação pelo site: "Quero este plano" cria o restaurante, o administrador,
 * o contrato e a assinatura no Asaas, e devolve o link da primeira cobrança.
 *
 * O restaurante nasce bloqueado: o "teste" termina ontem, então sem pagamento
 * não há acesso. O pagamento confirmado (webhook) registra a mensalidade e libera.
 */

export class CheckoutErro extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export interface DadosCheckout {
  planoId: string
  ciclo: 'mensal' | 'anual'
  restaurante: string
  documento: string    // CNPJ ou CPF do responsável
  responsavel: string
  email: string
  telefone: string
  senha: string
}

const soDigitos = (s: string) => s.replace(/\D/g, '')

function slugBase(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'restaurante'
}

async function slugLivre(nome: string) {
  const base = slugBase(nome)
  for (let i = 0; i < 50; i++) {
    const s = i ? `${base}-${i + 1}` : base
    if (!(await prisma.tenant.findUnique({ where: { slug: s }, select: { id: true } }))) return s
  }
  return `${base}-${Date.now().toString(36)}`
}

/** Link da cobrança em aberto mais recente do restaurante. */
async function linkDaCobranca(tenantId: string) {
  const s = await situacaoCobranca(tenantId)
  const aberta = s.cobrancas.find((c) => c.status === 'PENDING' || c.status === 'OVERDUE') ?? s.cobrancas[0]
  return aberta?.link ?? null
}

export async function contratar(d: DadosCheckout) {
  if (!asaasConfigurado()) throw new CheckoutErro('A contratação pelo site está indisponível no momento. Fale com a equipe de vendas.', 503)

  const doc = soDigitos(d.documento)
  if (doc.length !== 11 && doc.length !== 14) throw new CheckoutErro('Informe um CNPJ (14 números) ou CPF (11 números) válido')
  const email = d.email.trim().toLowerCase()
  const cnpj = doc.length === 14 ? doc : null
  const cpf = doc.length === 11 ? doc : null

  const plano = await prisma.plano.findUnique({ where: { id: d.planoId } })
  if (!plano || !plano.ativo) throw new CheckoutErro('Plano indisponível', 404)
  const valor = d.ciclo === 'anual' ? Number(plano.valorAnual ?? 0) : Number(plano.valor)
  if (!(valor > 0)) throw new CheckoutErro(d.ciclo === 'anual' ? 'Este plano não tem opção anual' : 'Plano sem valor')

  // Mesmo documento já contratado pelo site e ainda sem pagamento: devolve o link de novo
  const existente = await prisma.tenant.findFirst({
    where: cnpj ? { cnpj } : { cpfResponsavel: cpf },
    select: { id: true, codigo: true, _count: { select: { pagamentosMensalidade: true } } },
  })
  if (existente) {
    if (existente._count.pagamentosMensalidade > 0) throw new CheckoutErro('Já existe um restaurante com este documento. Entre no sistema ou fale com a equipe.', 409)
    const link = await linkDaCobranca(existente.id)
    if (!link) throw new CheckoutErro('Já existe um cadastro com este documento. Fale com a equipe de vendas.', 409)
    return { link, retomado: true }
  }

  const hoje = hojeBR()
  const slug = await slugLivre(d.restaurante)
  const tenant = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.create({
      data: {
        nome: d.restaurante.trim(), slug, cnpj, cpfResponsavel: cpf,
        responsavel: d.responsavel.trim(), contato: email, telefone: soDigitos(d.telefone),
        planoId: plano.id,
        observacoes: `Contratado pelo site em ${hoje.split('-').reverse().join('/')} (${d.ciclo})`,
      },
    })
    await garantirMetodosPadrao(tx, t.id)
    await tx.contrato.create({
      data: {
        tenantId: t.id, plano: plano.nome, valor, ciclo: d.ciclo, dataInicio: dataDe(hoje), status: 'ativo',
        diaVencimento: Math.min(28, Number(hoje.slice(8, 10))),
        // Acesso só depois de pagar: teste "acabou ontem" e o 1º vencimento é hoje
        testeAte: dataDe(somarDias(hoje, -1)),
        proximoVencimento: dataDe(hoje),
      },
    })
    const usuario = await tx.usuario.create({
      data: { tenantId: t.id, nome: d.responsavel.trim(), email, senhaHash: await bcrypt.hash(d.senha, 12), cargo: 'administrador', ativo: true },
      select: { codigo: true },
    })
    await aplicarRecursos(t.id, tx)
    await sincronizarLicenca(t.id, tx)
    return { ...t, codigoUsuario: usuario.codigo }
  })
  await registrarVersao(tenant.id, 'Contratado pelo site').catch(() => null)

  try {
    await ativarCobranca(tenant.id)
  } catch (e: any) {
    const msg = e instanceof AsaasErro ? e.message : 'falha ao gerar a cobrança'
    throw new CheckoutErro(`Cadastro feito, mas não deu para gerar a cobrança agora (${msg}). Tente de novo em instantes com o mesmo CNPJ/CPF.`, 502)
  }
  const link = await linkDaCobranca(tenant.id)
  if (!link) throw new CheckoutErro('Cadastro feito, mas a cobrança ainda não ficou pronta. Tente de novo em instantes com o mesmo CNPJ/CPF.', 502)

  return { link, codigoAcesso: `${tenant.codigo}-${tenant.codigoUsuario}`, email }
}
