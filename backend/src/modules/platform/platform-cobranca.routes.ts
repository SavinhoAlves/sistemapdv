import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requirePlatform } from '../../middlewares/tenant.middleware'
import { prisma } from '../../lib/prisma'
import {
  AssinaturaErro, MESES_CICLO, ajustarVencimento, desfazerPagamento, hojeBR, registrarPagamento, resumir,
  somarDias, type Situacao,
} from './assinatura'

/**
 * Cobrança: situação da assinatura de cada restaurante e os pagamentos.
 * As regras (vencimento, tolerância, teste, licença) ficam em ./assinatura.
 */

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/

const pagamentoBody = z.object({
  tenantId:   z.string().min(1),
  valor:      z.coerce.number().positive('Informe o valor recebido').max(1_000_000),
  pagoEm:     z.string().regex(DATA_RE, 'Data inválida'),
  forma:      z.enum(['pix', 'dinheiro', 'cartao', 'boleto', 'transferencia']).nullish(),
  observacao: z.string().trim().max(300).nullish(),
})

const ajusteBody = z.object({
  vencimento: z.string().regex(DATA_RE, 'Data inválida'),
  motivo:     z.string().trim().min(3, 'Informe o motivo do ajuste').max(300),
})

/** Valor do ciclo convertido para o mês (receita mensal). */
export function valorMensalDoCiclo(valor: number | null, ciclo: string) {
  return valor ? Math.round((valor / (MESES_CICLO[ciclo] ?? 1)) * 100) / 100 : 0
}

function responderErro(reply: any, err: unknown) {
  if (err instanceof AssinaturaErro) return reply.status(err.status).send({ error: err.message })
  throw err
}

export async function platformCobrancaRoutes(app: FastifyInstance) {
  // GET / — situação da assinatura de todos os restaurantes
  app.get('/', { preHandler: requirePlatform }, async (_request, reply) => {
    const tenants = await prisma.tenant.findMany({
      where: { status: { not: 'cancelado' } },
      orderBy: { nome: 'asc' },
      select: {
        id: true, codigo: true, nome: true, slug: true, status: true,
        plano: { select: { nome: true } },
        contratos: { orderBy: { createdAt: 'desc' }, take: 1 },
        pagamentosMensalidade: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    const hoje = hojeBR()
    const mes = hoje.slice(0, 7)
    const em30d = somarDias(hoje, 30)

    const linhas = tenants.map(t => {
      const contrato = t.contratos[0] ?? null
      const ultimo = t.pagamentosMensalidade[0] ?? null
      const r = resumir(contrato, t.status, !!ultimo)
      return {
        tenantId: t.id,
        codigo: t.codigo,
        nome: t.nome,
        slug: t.slug,
        plano: t.plano?.nome ?? contrato?.plano ?? null,
        ...r,
        observacao: contrato?.observacoes ?? null,
        ultimoPagamento: ultimo && {
          id: ultimo.id, valor: Number(ultimo.valor), pagoEm: ultimo.pagoEm, forma: ultimo.forma,
          periodoInicio: ultimo.periodoInicio, periodoFim: ultimo.periodoFim,
        },
      }
    })

    const recebidosNoMes = await prisma.pagamentoMensalidade.aggregate({
      where: { pagoEm: { gte: new Date(`${mes}-01T00:00:00.000Z`), lte: new Date(`${hoje}T00:00:00.000Z`) } },
      _sum: { valor: true },
    })

    const cobraveis = linhas.filter(l => !['isento', 'cancelado', 'suspenso'].includes(l.situacao))
    const soma = (ls: typeof linhas) => Math.round(ls.reduce((s, l) => s + (l.valor ?? 0), 0) * 100) / 100
    const qtd = (s: Situacao) => linhas.filter(l => l.situacao === s).length

    return reply.send({
      hoje,
      totais: {
        receitaMensal: Math.round(cobraveis.filter(l => l.situacao !== 'teste').reduce((s, l) => s + valorMensalDoCiclo(l.valor, l.ciclo), 0) * 100) / 100,
        recebidoNoMes: Number(recebidosNoMes._sum.valor ?? 0),
        aReceber30d:   soma(cobraveis.filter(l => l.proximoVencimento && l.proximoVencimento >= hoje && l.proximoVencimento <= em30d && l.situacao === 'em_dia')),
        emAtraso:      soma(linhas.filter(l => l.situacao === 'tolerancia' || (l.situacao === 'bloqueado' && l.proximoVencimento))),
        qtd: {
          teste: qtd('teste'), em_dia: qtd('em_dia'), tolerancia: qtd('tolerancia'), bloqueado: qtd('bloqueado'),
          isento: qtd('isento'), suspenso: qtd('suspenso'), pendente: qtd('pendente'),
        },
      },
      restaurantes: linhas,
    })
  })

  // POST /pagamentos — registra o pagamento do ciclo em aberto (empurra o vencimento)
  app.post('/pagamentos', { preHandler: requirePlatform }, async (request, reply) => {
    const parsed = pagamentoBody.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
    const { tenantId, ...dados } = parsed.data
    try {
      const pagamento = await registrarPagamento(tenantId, dados)
      return reply.status(201).send({ ...pagamento, valor: Number(pagamento.valor) })
    } catch (err) {
      return responderErro(reply, err)
    }
  })

  // DELETE /pagamentos/:id — desfaz o pagamento mais recente (o vencimento volta)
  app.delete('/pagamentos/:id', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await desfazerPagamento(id)
      return reply.send({ success: true })
    } catch (err) {
      return responderErro(reply, err)
    }
  })

  // POST /tenants/:id/vencimento — ajuste manual do vencimento (cortesia, negociação)
  app.post('/tenants/:id/vencimento', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = ajusteBody.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
    try {
      return reply.send(await ajustarVencimento(id, parsed.data.vencimento, parsed.data.motivo))
    } catch (err) {
      return responderErro(reply, err)
    }
  })

  // GET /tenants/:id/historico — pagamentos do restaurante, do mais recente
  app.get('/tenants/:id/historico', { preHandler: requirePlatform }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const pagamentos = await prisma.pagamentoMensalidade.findMany({
      where: { tenantId: id },
      orderBy: [{ periodoInicio: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 24,
    })
    return reply.send(pagamentos.map(p => ({ ...p, valor: Number(p.valor) })))
  })
}
