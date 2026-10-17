import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requirePlatform } from '../../middlewares/tenant.middleware'
import { prisma } from '../../lib/prisma'

/**
 * Mensalidades: o que cada restaurante paga à plataforma, mês a mês.
 *
 * Valor do mês, nesta ordem:
 *   1. valor combinado no restaurante (cobrancaValor);
 *   2. contrato assinado ou em assinatura, convertido para o mês pelo ciclo
 *      (mesma conta da receita mensal da Visão geral);
 *   3. preço do plano.
 *
 * Situação no mês de referência: isento > em dia (tem pagamento) > sem valor
 * (nada a cobrar definido) > atrasado (já passou do dia de vencimento) >
 * pendente. Restaurantes cadastrados depois do mês consultado não entram.
 * Atraso não bloqueia o restaurante — o bloqueio continua sendo pela licença.
 */

export const FATOR_MENSAL: Record<string, number> = { mensal: 1, trimestral: 1 / 3, semestral: 1 / 6, anual: 1 / 12 }

const COMPETENCIA_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export type Situacao = 'isento' | 'em_dia' | 'sem_valor' | 'atrasado' | 'pendente'

export function competenciaAtual(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Valor mensal e de onde ele veio. */
export function valorMensal(t: {
  cobrancaValor: any
  plano: { valor: any } | null
  contratos: { valor: any; ciclo: string; status: string }[]
}): { valor: number; origem: 'combinado' | 'contrato' | 'plano' | 'nenhum' } {
  if (t.cobrancaValor != null) return { valor: Number(t.cobrancaValor), origem: 'combinado' }
  const con = t.contratos.find(c => (c.status === 'ativo' || c.status === 'trial') && c.valor != null)
  if (con) return { valor: Math.round(Number(con.valor) * (FATOR_MENSAL[con.ciclo] ?? 1) * 100) / 100, origem: 'contrato' }
  if (t.plano) return { valor: Number(t.plano.valor), origem: 'plano' }
  return { valor: 0, origem: 'nenhum' }
}

/**
 * Situação de uma competência. Meses passados sem pagamento estão atrasados;
 * meses futuros ficam pendentes; no mês corrente vale o dia de vencimento.
 */
export function situacao(isento: boolean, pago: boolean, competencia: string, diaVencimento: number, hoje = new Date(), valor = 1): Situacao {
  if (isento) return 'isento'
  if (pago) return 'em_dia'
  if (valor <= 0) return 'sem_valor'
  const atual = competenciaAtual(hoje)
  if (competencia < atual) return 'atrasado'
  if (competencia > atual) return 'pendente'
  return hoje.getDate() > diaVencimento ? 'atrasado' : 'pendente'
}

const configBody = z.object({
  diaVencimento: z.coerce.number().int().min(1, 'Dia entre 1 e 28').max(28, 'Dia entre 1 e 28'),
  valor:         z.coerce.number().min(0, 'Valor não pode ser negativo').max(1_000_000).nullable(),
  isento:        z.boolean(),
  observacao:    z.string().trim().max(300).nullish(),
})

const pagamentoBody = z.object({
  tenantId:    z.string().min(1),
  competencia: z.string().regex(COMPETENCIA_RE, 'Mês inválido (use AAAA-MM)'),
  valor:       z.coerce.number().positive('Informe o valor recebido').max(1_000_000),
  pagoEm:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  forma:       z.enum(['pix', 'dinheiro', 'cartao', 'boleto', 'transferencia']).nullish(),
  observacao:  z.string().trim().max(300).nullish(),
})

export async function platformCobrancaRoutes(app: FastifyInstance) {
  // GET /?competencia=AAAA-MM — situação de todos os restaurantes no mês
  app.get('/', { preHandler: requirePlatform }, async (request, reply) => {
    const { competencia = competenciaAtual() } = request.query as { competencia?: string }
    if (!COMPETENCIA_RE.test(competencia)) return reply.status(400).send({ error: 'Mês inválido (use AAAA-MM)' })

    const tenants = await prisma.tenant.findMany({
      orderBy: { nome: 'asc' },
      select: {
        id: true, nome: true, slug: true, status: true, createdAt: true,
        cobrancaDiaVencimento: true, cobrancaValor: true, cobrancaIsento: true, cobrancaObs: true,
        plano: { select: { nome: true, valor: true } },
        contratos: { orderBy: { createdAt: 'desc' }, take: 1, select: { plano: true, valor: true, ciclo: true, status: true } },
        pagamentosMensalidade: { where: { competencia }, take: 1 },
      },
    })

    const linhas = tenants.filter(t => competenciaAtual(t.createdAt) <= competencia).map(t => {
      const { valor, origem } = valorMensal(t)
      const pagamento = t.pagamentosMensalidade[0] ?? null
      return {
        tenantId: t.id,
        nome: t.nome,
        slug: t.slug,
        status: t.status,
        plano: t.plano?.nome ?? t.contratos[0]?.plano ?? null,
        diaVencimento: t.cobrancaDiaVencimento,
        isento: t.cobrancaIsento,
        observacao: t.cobrancaObs,
        valor,
        valorCombinado: t.cobrancaValor != null ? Number(t.cobrancaValor) : null,
        origemValor: origem,
        situacao: situacao(t.cobrancaIsento, !!pagamento, competencia, t.cobrancaDiaVencimento, new Date(), valor),
        pagamento: pagamento && { id: pagamento.id, valor: Number(pagamento.valor), pagoEm: pagamento.pagoEm, forma: pagamento.forma, observacao: pagamento.observacao },
      }
    })

    const soma = (f: (l: typeof linhas[number]) => boolean, campo: (l: typeof linhas[number]) => number = l => l.valor) =>
      Math.round(linhas.filter(f).reduce((s, l) => s + campo(l), 0) * 100) / 100

    return reply.send({
      competencia,
      totais: {
        previsto:  soma(l => !l.isento),
        recebido:  soma(l => !!l.pagamento, l => l.pagamento!.valor),
        pendente:  soma(l => l.situacao === 'pendente'),
        atrasado:  soma(l => l.situacao === 'atrasado'),
        qtd: {
          em_dia:   linhas.filter(l => l.situacao === 'em_dia').length,
          pendente: linhas.filter(l => l.situacao === 'pendente').length,
          atrasado: linhas.filter(l => l.situacao === 'atrasado').length,
          isento:   linhas.filter(l => l.situacao === 'isento').length,
          sem_valor: linhas.filter(l => l.situacao === 'sem_valor').length,
        },
      },
      restaurantes: linhas,
    })
  })

  // PUT /tenants/:id — dia de vencimento, valor combinado, isenção
  app.put('/tenants/:id', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = configBody.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
    const { diaVencimento, valor, isento, observacao } = parsed.data
    try {
      const t = await prisma.tenant.update({
        where: { id },
        data: { cobrancaDiaVencimento: diaVencimento, cobrancaValor: valor, cobrancaIsento: isento, cobrancaObs: observacao || null },
        select: { id: true, cobrancaDiaVencimento: true, cobrancaValor: true, cobrancaIsento: true, cobrancaObs: true },
      })
      return reply.send({ ...t, cobrancaValor: t.cobrancaValor != null ? Number(t.cobrancaValor) : null })
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Restaurante não encontrado' })
      throw err
    }
  })

  // POST /pagamentos — registra (ou corrige) o pagamento de um mês
  app.post('/pagamentos', { preHandler: requirePlatform }, async (request, reply) => {
    const parsed = pagamentoBody.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
    const { tenantId, competencia, valor, pagoEm, forma, observacao } = parsed.data

    const existe = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })
    if (!existe) return reply.status(404).send({ error: 'Restaurante não encontrado' })

    const dados = { valor, pagoEm: new Date(`${pagoEm}T12:00:00`), forma: forma ?? null, observacao: observacao || null }
    const pagamento = await prisma.pagamentoMensalidade.upsert({
      where: { tenantId_competencia: { tenantId, competencia } },
      create: { tenantId, competencia, ...dados },
      update: dados,
    })
    return reply.status(201).send({ ...pagamento, valor: Number(pagamento.valor) })
  })

  // DELETE /pagamentos/:id — desfaz um pagamento lançado por engano
  app.delete('/pagamentos/:id', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await prisma.pagamentoMensalidade.delete({ where: { id } })
      return reply.send({ success: true })
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Pagamento não encontrado' })
      throw err
    }
  })

  // GET /tenants/:id/historico — pagamentos do restaurante, do mais recente
  app.get('/tenants/:id/historico', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const pagamentos = await prisma.pagamentoMensalidade.findMany({
      where: { tenantId: id },
      orderBy: { competencia: 'desc' },
      take: 24,
    })
    return reply.send(pagamentos.map(p => ({ ...p, valor: Number(p.valor) })))
  })
}
