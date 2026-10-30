import { prisma } from '../../lib/prisma'
import { asaas, asaasConfigurado, asaasAmbiente, AsaasErro } from '../../lib/asaas'
import { contratoAtual, registrarPagamento, desfazerPagamento, hojeBR, ymd } from './assinatura'

/**
 * Cobrança automática da mensalidade pelo Asaas.
 *
 * Cada restaurante vira um cliente no Asaas e o contrato vira uma assinatura
 * (valor, ciclo e próximo vencimento do contrato). O Asaas gera as cobranças
 * (Pix, boleto ou cartão: o cliente escolhe) e avisa pelo webhook; o pagamento
 * recebido entra como o "Registrar pagamento" do painel: empurra o vencimento
 * um ciclo e libera o acesso. Atraso e bloqueio seguem a tolerância de hoje.
 */

const CICLO_ASAAS: Record<string, string> = { mensal: 'MONTHLY', trimestral: 'QUARTERLY', semestral: 'SEMIANNUALLY', anual: 'YEARLY' }
const FORMA: Record<string, string> = { PIX: 'Pix', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão de crédito', DEBIT_CARD: 'Cartão de débito' }

const soDigitos = (s?: string | null) => (s ?? '').replace(/\D/g, '')

async function dadosDoRestaurante(tenantId: string) {
  const [tenant, contrato, admin] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    contratoAtual(prisma, tenantId),
    prisma.usuario.findFirst({ where: { tenantId, cargo: 'administrador', ativo: true }, orderBy: { createdAt: 'asc' }, select: { email: true } }),
  ])
  if (!tenant) throw new AsaasErro('Restaurante não encontrado', 404)
  if (!contrato) throw new AsaasErro('Restaurante sem contrato', 404)
  return { tenant, contrato, email: admin?.email ?? null }
}

/** Cria o cliente no Asaas (uma vez) e devolve o id. */
async function garantirCliente(t: Awaited<ReturnType<typeof dadosDoRestaurante>>) {
  // Cliente salvo de outra conta/ambiente (ex.: criado no sandbox): confere se existe nesta conta
  if (t.tenant.asaasClienteId) {
    const existe = await asaas(`/customers/${t.tenant.asaasClienteId}`).then((c: any) => !c?.deleted).catch((e: AsaasErro) => {
      if (e.status === 404) return false
      throw e
    })
    if (existe) return t.tenant.asaasClienteId
  }
  const cpfCnpj = soDigitos(t.tenant.cnpj) || soDigitos(t.tenant.cpfResponsavel)
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    throw new AsaasErro('Cadastre o CNPJ ou o CPF do responsável do restaurante (Editar dados) antes de ativar a cobrança', 400)
  }
  const cliente = await asaas<{ id: string }>('/customers', {
    method: 'POST',
    body: {
      name: t.tenant.nome,
      cpfCnpj,
      email: t.email ?? undefined,
      mobilePhone: soDigitos(t.tenant.telefone) || undefined,
      externalReference: t.tenant.id,
      notificationDisabled: false,
    },
  })
  await prisma.tenant.update({ where: { id: t.tenant.id }, data: { asaasClienteId: cliente.id } })
  return cliente.id
}

function corpoAssinatura(c: NonNullable<Awaited<ReturnType<typeof contratoAtual>>>, nomeRestaurante: string) {
  const valor = Number(c.valor ?? 0)
  if (!(valor > 0)) throw new AsaasErro('Defina o valor do contrato antes de ativar a cobrança', 400)
  if (c.isento) throw new AsaasErro('Restaurante isento não tem cobrança', 400)
  // Vencimento no passado não é aceito: a próxima cobrança vai para hoje
  const venc = c.proximoVencimento ? ymd(c.proximoVencimento) : hojeBR()
  return {
    billingType: 'UNDEFINED', // o cliente escolhe Pix, boleto ou cartão
    value: valor,
    cycle: CICLO_ASAAS[c.ciclo] ?? 'MONTHLY',
    nextDueDate: venc < hojeBR() ? hojeBR() : venc,
    description: `RestaurantePDV · plano ${c.plano} · ${nomeRestaurante}`,
    externalReference: c.id,
  }
}

/** Liga a cobrança automática: cria cliente e assinatura (ou atualiza a assinatura). */
export async function ativarCobranca(tenantId: string) {
  const t = await dadosDoRestaurante(tenantId)
  const customer = await garantirCliente(t)
  const corpo = corpoAssinatura(t.contrato, t.tenant.nome)
  if (t.contrato.asaasAssinaturaId) {
    await asaas(`/subscriptions/${t.contrato.asaasAssinaturaId}`, { method: 'POST', body: { ...corpo, updatePendingPayments: true } })
  } else {
    const ass = await asaas<{ id: string }>('/subscriptions', { method: 'POST', body: { ...corpo, customer } })
    await prisma.contrato.update({ where: { id: t.contrato.id }, data: { asaasAssinaturaId: ass.id } })
  }
  return situacaoCobranca(tenantId)
}

/**
 * Contrato editado (valor, ciclo, vencimento): leva a mudança para a assinatura.
 * Sem assinatura ou sem Asaas configurado, não faz nada. Erro vira aviso.
 */
export async function atualizarSeAtiva(tenantId: string): Promise<string | null> {
  if (!asaasConfigurado()) return null
  const c = await contratoAtual(prisma, tenantId)
  if (!c?.asaasAssinaturaId) return null
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { nome: true } })
    await asaas(`/subscriptions/${c.asaasAssinaturaId}`, { method: 'POST', body: { ...corpoAssinatura(c, tenant?.nome ?? ''), updatePendingPayments: true } })
    return null
  } catch (e: any) {
    return `Contrato salvo, mas o Asaas não foi atualizado: ${e.message}`
  }
}

/** Desliga a cobrança automática (cancela a assinatura no Asaas). */
export async function desativarCobranca(tenantId: string) {
  const c = await contratoAtual(prisma, tenantId)
  if (c?.asaasAssinaturaId) {
    await asaas(`/subscriptions/${c.asaasAssinaturaId}`, { method: 'DELETE' }).catch((e: AsaasErro) => {
      if (e.status !== 404) throw e
    })
    await prisma.contrato.update({ where: { id: c.id }, data: { asaasAssinaturaId: null } })
  }
  return situacaoCobranca(tenantId)
}

/** Para o painel: ligada ou não e as últimas cobranças com o link de pagamento. */
export async function situacaoCobranca(tenantId: string) {
  const configurado = asaasConfigurado()
  const c = await contratoAtual(prisma, tenantId)
  const base = { configurado, ambiente: asaasAmbiente(), ativa: Boolean(c?.asaasAssinaturaId), cobrancas: [] as any[] }
  if (!configurado || !c?.asaasAssinaturaId) return base
  try {
    const r = await asaas<{ data: any[] }>(`/subscriptions/${c.asaasAssinaturaId}/payments?limit=6`)
    base.cobrancas = (r.data ?? []).map((p) => ({
      id: p.id, valor: p.value, vencimento: p.dueDate, status: p.status,
      forma: FORMA[p.billingType] ?? null, link: p.invoiceUrl, pagoEm: p.paymentDate ?? p.clientPaymentDate ?? null,
    }))
  } catch (e: any) {
    return { ...base, erro: e.message }
  }
  return base
}

/**
 * Webhook do Asaas. Pagamento recebido/confirmado de uma assinatura nossa vira
 * pagamento da mensalidade (uma vez só por cobrança).
 */
export async function processarEvento(evento: { event?: string; payment?: any }) {
  const tipo = evento.event
  const p = evento.payment
  if (!p?.id || !p.subscription) return { ignorado: true }
  if (tipo && ESTORNO.has(tipo)) return estornar(p.id, tipo)
  if (tipo !== 'PAYMENT_RECEIVED' && tipo !== 'PAYMENT_CONFIRMED') return { ignorado: true }

  const ja = await prisma.pagamentoMensalidade.findUnique({ where: { asaasPagamentoId: p.id }, select: { id: true } })
  if (ja) return { repetido: true }

  const contrato = await prisma.contrato.findUnique({ where: { asaasAssinaturaId: p.subscription }, select: { tenantId: true } })
  if (!contrato) return { ignorado: true }

  const pagoEm = String(p.paymentDate || p.clientPaymentDate || p.confirmedDate || hojeBR()).slice(0, 10)
  try {
    await registrarPagamento(contrato.tenantId, {
      valor: Number(p.value),
      pagoEm,
      forma: FORMA[p.billingType] ?? 'Asaas',
      observacao: `Asaas · cobrança ${p.id}`,
      asaasPagamentoId: p.id,
    })
  } catch (e: any) {
    // Dois avisos ao mesmo tempo: o segundo bate no índice único e é ignorado
    if (e?.code === 'P2002') return { repetido: true }
    throw e
  }
  return { registrado: true }
}

/** Eventos do Asaas que tiram o dinheiro de um pagamento já registrado. */
const ESTORNO = new Set(['PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE', 'PAYMENT_RECEIVED_IN_CASH_UNDONE', 'PAYMENT_DELETED'])

/**
 * Estorno ou contestação de uma cobrança já registrada: desfaz o pagamento.
 * O vencimento volta e o acesso segue a regra de sempre (tolerância e bloqueio).
 * Só dá para desfazer o pagamento mais recente; se não for, fica registrado no log
 * para acertar à mão no painel.
 */
async function estornar(asaasPagamentoId: string, tipo: string) {
  const pag = await prisma.pagamentoMensalidade.findUnique({ where: { asaasPagamentoId }, select: { id: true, tenantId: true } })
  if (!pag) return { ignorado: true }
  try {
    await desfazerPagamento(pag.id)
    return { desfeito: true, motivo: tipo }
  } catch (e: any) {
    console.warn(`[asaas] ${tipo} da cobrança ${asaasPagamentoId} (restaurante ${pag.tenantId}) não desfeito sozinho: ${e.message}`)
    return { pendente: true, motivo: e.message }
  }
}
