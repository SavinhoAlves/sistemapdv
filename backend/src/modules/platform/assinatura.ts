import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { invalidateTenantCache } from '../../middlewares/tenant.middleware'

/**
 * Assinatura do restaurante: plano + contrato + pagamentos. A licença deixa de
 * ser editada à mão e passa a ser consequência disto:
 *
 * - O contrato guarda o próximo vencimento. Registrar um pagamento cobre um
 *   ciclo a partir dele e empurra o vencimento um ciclo para frente.
 * - Depois do vencimento há TOLERANCIA_DIAS de tolerância (o PDV avisa);
 *   passou disso, a licença bloqueia. Pagou, libera na hora.
 * - Teste grátis: liberado até o fim de `testeAte`, sem tolerância.
 * - Isento: sempre liberado. Contrato rescindido: bloqueado.
 *
 * O bloqueio em si continua sendo feito pela tabela `licencas` (middleware e
 * job de licenças): `sincronizarLicenca` grava nela o "liberado até".
 */

export const TOLERANCIA_DIAS = 5
export const TESTE_DIAS = 7

export const MESES_CICLO: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 }

export type Situacao = 'teste' | 'em_dia' | 'tolerancia' | 'bloqueado' | 'isento' | 'suspenso' | 'cancelado' | 'pendente'

/** Cliente do projeto (estendido com o escopo de tenant) ou a transação dele. */
export type Db = Omit<typeof prisma, '$extends' | '$transaction' | '$disconnect' | '$connect' | '$on' | '$use'>

// ── Datas ────────────────────────────────────────────────────────────────────
// Colunas DATE chegam como meia-noite UTC; trabalhamos com 'AAAA-MM-DD' para
// não escorregar um dia no fuso de Brasília.

export const ymd = (d: Date) => d.toISOString().slice(0, 10)
export const dataDe = (s: string) => new Date(`${s}T00:00:00.000Z`)

/** Hoje em Brasília, como 'AAAA-MM-DD'. */
export function hojeBR(agora = new Date()) {
  return new Date(agora.getTime() - 3 * 3_600_000).toISOString().slice(0, 10)
}

/** Fim do dia (23:59:59) em Brasília. */
export function fimDoDia(s: string) {
  return new Date(`${s}T23:59:59.999-03:00`)
}

export function somarDias(s: string, dias: number) {
  const d = dataDe(s)
  d.setUTCDate(d.getUTCDate() + dias)
  return ymd(d)
}

/** Soma meses mantendo o dia de vencimento (31 vira o último dia em meses curtos). */
export function somarMeses(s: string, meses: number, dia: number) {
  const [a, m] = s.split('-').map(Number)
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1))
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
  alvo.setUTCDate(Math.min(dia, ultimo))
  return ymd(alvo)
}

/** Primeira data com o dia `dia` em `aPartirDe` ou depois. */
export function proximaDataComDia(aPartirDe: string, dia: number) {
  const mesmoMes = somarMeses(aPartirDe, 0, dia)
  return mesmoMes >= aPartirDe ? mesmoMes : somarMeses(aPartirDe, 1, dia)
}

/** Dias de `de` até `ate` (datas AAAA-MM-DD). */
export function diasEntre(de: string, ate: string) {
  return Math.round((dataDe(ate).getTime() - dataDe(de).getTime()) / 86_400_000)
}

// ── Situação ─────────────────────────────────────────────────────────────────

interface ContratoBase {
  status: string
  ciclo: string
  valor: Prisma.Decimal | number | null
  diaVencimento: number
  proximoVencimento: Date | null
  testeAte: Date | null
  isento: boolean
}

export interface Resumo {
  situacao: Situacao
  /** Até quando o restaurante entra no sistema (fim do dia), null = sem limite */
  liberadoAte: string | null
  proximoVencimento: string | null
  /** Dias até o vencimento (negativo = atrasado) */
  diasParaVencer: number | null
  /** Em tolerância: dias que faltam para bloquear */
  diasParaBloquear: number | null
  testeAte: string | null
  valor: number | null
  ciclo: string
  diaVencimento: number
  isento: boolean
}

export function resumir(
  contrato: ContratoBase | null,
  tenantStatus: string,
  temPagamento: boolean,
  agora = new Date(),
): Resumo {
  const hoje = hojeBR(agora)
  const venc = contrato?.proximoVencimento ? ymd(contrato.proximoVencimento) : null
  const teste = contrato?.testeAte ? ymd(contrato.testeAte) : null
  const base = {
    proximoVencimento: venc,
    diasParaVencer: venc ? diasEntre(hoje, venc) : null,
    diasParaBloquear: null as number | null,
    testeAte: teste,
    valor: contrato?.valor != null ? Number(contrato.valor) : null,
    ciclo: contrato?.ciclo ?? 'mensal',
    diaVencimento: contrato?.diaVencimento ?? 10,
    isento: contrato?.isento ?? false,
  }

  if (tenantStatus === 'suspenso') return { ...base, situacao: 'suspenso', liberadoAte: null }
  if (tenantStatus === 'cancelado' || contrato?.status === 'cancelado') return { ...base, situacao: 'cancelado', liberadoAte: null }
  if (!contrato) return { ...base, situacao: 'pendente', liberadoAte: null }
  if (contrato.isento) return { ...base, situacao: 'isento', liberadoAte: null }

  // Teste sem pagamento: vale até o fim do último dia, sem tolerância
  if (teste && !temPagamento) {
    return { ...base, situacao: hoje <= teste ? 'teste' : 'bloqueado', liberadoAte: teste }
  }
  if (!venc) return { ...base, situacao: 'pendente', liberadoAte: null }

  const limite = somarDias(venc, TOLERANCIA_DIAS)
  if (hoje <= venc) return { ...base, situacao: 'em_dia', liberadoAte: limite }
  if (hoje <= limite) return { ...base, situacao: 'tolerancia', liberadoAte: limite, diasParaBloquear: diasEntre(hoje, limite) }
  return { ...base, situacao: 'bloqueado', liberadoAte: limite }
}

// ── Licença ──────────────────────────────────────────────────────────────────

/** Contrato vigente (o mais recente) do restaurante. */
export function contratoAtual(db: Db, tenantId: string) {
  return db.contrato.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
}

/** Recalcula a situação e grava o "liberado até" na licença, que é o que o bloqueio lê. */
export async function sincronizarLicenca(tenantId: string, db: Db = prisma) {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { status: true } })
  if (!tenant) return null
  const contrato = await contratoAtual(db, tenantId)
  const temPagamento = (await db.pagamentoMensalidade.count({ where: { tenantId } })) > 0
  const r = resumir(contrato, tenant.status, temPagamento)

  const liberado = r.situacao === 'isento' || (r.liberadoAte !== null && hojeBR() <= r.liberadoAte)
  const data = {
    status: (liberado ? 'ativado' : r.situacao === 'pendente' ? 'pendente' : 'bloqueado') as 'ativado' | 'pendente' | 'bloqueado',
    dataVencimento: r.situacao === 'isento' || !r.liberadoAte ? null : fimDoDia(r.liberadoAte),
  }

  const lic = await db.licenca.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } })
  if (lic) {
    await db.licenca.update({
      where: { id: lic.id },
      data: { ...data, ...(data.status === 'ativado' && !lic.dataAtivacao ? { dataAtivacao: new Date() } : {}) },
    })
  } else {
    await db.licenca.create({ data: { tenantId, ...data, dataAtivacao: data.status === 'ativado' ? new Date() : null } })
  }
  // Dentro de transação, quem chamou invalida depois do commit (senão o cache relê o dado antigo)
  if (db === prisma) invalidateTenantCache(tenantId)
  return r
}

// ── Pagamentos ───────────────────────────────────────────────────────────────

export class AssinaturaErro extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

interface NovoPagamento {
  valor: number
  pagoEm: string
  forma?: string | null
  observacao?: string | null
  /** Cobrança do Asaas (pagamento automático); repetida, não registra de novo */
  asaasPagamentoId?: string | null
}

/** Registra o pagamento do ciclo em aberto e empurra o vencimento um ciclo. */
export async function registrarPagamento(tenantId: string, p: NovoPagamento) {
  const pagamento = await prisma.$transaction(async tx => {
    const contrato = await contratoAtual(tx, tenantId)
    if (!contrato) throw new AssinaturaErro('Restaurante sem contrato', 404)
    if (contrato.isento) throw new AssinaturaErro('Restaurante isento não tem cobrança')

    // Sem vencimento definido (contrato antigo), o ciclo começa hoje
    const inicio = contrato.proximoVencimento ? ymd(contrato.proximoVencimento) : hojeBR()
    const fim = somarMeses(inicio, MESES_CICLO[contrato.ciclo] ?? 1, contrato.diaVencimento)

    const pagamento = await tx.pagamentoMensalidade.create({
      data: {
        tenantId,
        competencia: inicio.slice(0, 7),
        valor: p.valor,
        pagoEm: dataDe(p.pagoEm),
        forma: p.forma ?? null,
        observacao: p.observacao || null,
        asaasPagamentoId: p.asaasPagamentoId ?? null,
        periodoInicio: dataDe(inicio),
        periodoFim: dataDe(fim),
      },
    })
    await tx.contrato.update({ where: { id: contrato.id }, data: { proximoVencimento: dataDe(fim) } })
    await sincronizarLicenca(tenantId, tx)
    return pagamento
  })
  invalidateTenantCache(tenantId)
  return pagamento
}

/** Desfaz o último pagamento: o vencimento volta para o início do período dele. */
export async function desfazerPagamento(pagamentoId: string) {
  const tenantId = await prisma.$transaction(async tx => {
    const pag = await tx.pagamentoMensalidade.findUnique({ where: { id: pagamentoId } })
    if (!pag) throw new AssinaturaErro('Pagamento não encontrado', 404)
    const ultimo = await tx.pagamentoMensalidade.findFirst({
      where: { tenantId: pag.tenantId },
      orderBy: [{ periodoInicio: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    })
    if (ultimo?.id !== pag.id) throw new AssinaturaErro('Só dá para desfazer o pagamento mais recente', 409)

    await tx.pagamentoMensalidade.delete({ where: { id: pag.id } })
    if (pag.periodoInicio) {
      const contrato = await contratoAtual(tx, pag.tenantId)
      if (contrato) await tx.contrato.update({ where: { id: contrato.id }, data: { proximoVencimento: pag.periodoInicio } })
    }
    await sincronizarLicenca(pag.tenantId, tx)
    return pag.tenantId
  })
  invalidateTenantCache(tenantId)
}

/** Exceção (cortesia, negociação): define o próximo vencimento à mão, com motivo. */
export async function ajustarVencimento(tenantId: string, vencimento: string, motivo: string) {
  const r = await prisma.$transaction(async tx => {
    const contrato = await contratoAtual(tx, tenantId)
    if (!contrato) throw new AssinaturaErro('Restaurante sem contrato', 404)
    await tx.contrato.update({
      where: { id: contrato.id },
      data: { proximoVencimento: dataDe(vencimento), ajusteMotivo: motivo, ajusteEm: new Date() },
    })
    return sincronizarLicenca(tenantId, tx)
  })
  invalidateTenantCache(tenantId)
  return r
}

// ── Recursos ─────────────────────────────────────────────────────────────────

/**
 * Recursos efetivos: a exceção do superadmin vale sobre o plano; sem plano e
 * sem exceção, mantém o que já está. Grava nos campos que o PDV lê.
 */
export async function aplicarRecursos(tenantId: string, db: Db = prisma) {
  const t = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { rfidManual: true, vendaMobileManual: true, deliveryManual: true, rfidDisponivel: true, vendaMobilePermitida: true, deliveryDisponivel: true, plano: { select: { rfid: true, vendaMobile: true, delivery: true } } },
  })
  if (!t) return null
  const r = await db.tenant.update({
    where: { id: tenantId },
    data: {
      rfidDisponivel:       t.rfidManual ?? t.plano?.rfid ?? t.rfidDisponivel,
      vendaMobilePermitida: t.vendaMobileManual ?? t.plano?.vendaMobile ?? t.vendaMobilePermitida,
      deliveryDisponivel:   t.deliveryManual ?? t.plano?.delivery ?? t.deliveryDisponivel,
    },
    select: { rfidDisponivel: true, vendaMobilePermitida: true, deliveryDisponivel: true, rfidManual: true, vendaMobileManual: true, deliveryManual: true },
  })
  if (db === prisma) invalidateTenantCache(tenantId)
  return r
}
