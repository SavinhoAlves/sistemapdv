import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { EVENTOS } from '../../lib/eventos'
import { emitir } from '../../sockets/socket'
import { paraCentavos, paraDecimal, paraReais, centavosDoCliente } from '../../lib/money'
import { calcularConta, includeParaConta } from '../comandas/conta'
import { registrarAuditoria } from '../../lib/auditoria'

/**
 * Caixa.
 *
 * A correção mais importante está em `resumoCaixa`. A versão anterior fazia:
 *
 *     pagamentosDinheiro += Number(p.valor) - Number(p.troco)
 *
 * `Pagamento.valor` já é o valor APLICADO à conta; o troco já foi devolvido
 * daquela mesma cédula. Conta de R$50, cliente entrega R$100, troco R$50:
 * a gaveta ganha R$50, e o cálculo dava R$0. Todo pagamento em dinheiro com
 * troco sumia do esperado, aparecia como sobra no fechamento, e o operador
 * fazia sangria de um dinheiro que a conferência não explicava.
 *
 * Além disso o esperado misturava duas fontes de verdade: `totalVendas` vinha
 * de MovimentoCaixa e `pagamentosDinheiro` da tabela Pagamento. Agora a
 * conferência da gaveta usa exclusivamente Pagamento (é o registro do que
 * entrou), e MovimentoCaixa serve só para sangria e suprimento.
 */

// ── Abertura ───────────────────────────────────────────────────────────────

export async function caixaAtual(_tenantId: string) {
  const caixa = await prisma.caixa.findFirst({
    where: { status: 'aberto' },
    include: { funcionario: { select: { id: true, nome: true } } },
  })
  if (!caixa) return { aberto: false, caixa: null, resumo: null }
  return {
    aberto: true,
    caixa: serializarCaixa(caixa),
    resumo: await resumoCaixa(_tenantId, caixa.id),
  }
}

export async function abrirCaixa(
  tenantId: string,
  data: { funcionarioId: string; valorInicial: number },
) {
  const valorInicialCent = centavosDoCliente(data.valorInicial, 'Valor inicial')

  let caixa
  try {
    // Antes: findFirst seguido de create. Duas requisições simultâneas
    // passavam pela mesma verificação e criavam dois caixas abertos.
    // O índice único parcial `caixa_um_aberto_por_tenant` resolve no banco.
    caixa = await prisma.caixa.create({
      data: {
        funcionarioId: data.funcionarioId,
        valorInicial: paraDecimal(valorInicialCent),
        status: 'aberto',
        dataAbertura: new Date(),
      } as any,
    })
  } catch (e: any) {
    if (e?.code === 'P2002') throw erro(409, 'Já existe um caixa aberto')
    throw e
  }

  emitir(tenantId).caixa(EVENTOS.caixa.aberto, {
    caixaId: caixa.id,
    status: 'aberto',
    esperadoDinheiroCentavos: valorInicialCent,
  })

  return serializarCaixa(caixa)
}

// ── Fechamento ─────────────────────────────────────────────────────────────

interface FecharInput {
  caixaId: string
  valorContado: number
  observacao?: string
  fechadoPorId: string
  /** Permite fechar mesmo com comandas abertas, com justificativa. */
  forcar?: boolean
}

export async function fecharCaixa(tenantId: string, data: FecharInput) {
  const valorContadoCent = centavosDoCliente(data.valorContado, 'Valor contado')

  const resultado = await prisma.$transaction(async (tx) => {
    const caixa = await tx.caixa.findFirst({ where: { id: data.caixaId, status: 'aberto' } })
    if (!caixa) throw erro(404, 'Caixa não encontrado ou já fechado')

    // Antes não havia esta verificação: dava para fechar o caixa com 8
    // comandas em aberto, e os pagamentos seguintes travavam em
    // "nenhum caixa aberto" no meio do serviço.
    const pendentes = await comandasComSaldo(tx)
    if (pendentes.length > 0 && !data.forcar) {
      throw Object.assign(
        new Error(
          `${pendentes.length} comanda(s) com saldo em aberto. ` +
            `Receba ou encerre antes de fechar o caixa.`,
        ),
        { status: 409, comandas: pendentes },
      )
    }

    const resumo = await resumoCaixa(tenantId, data.caixaId, tx)
    const diferencaCent = valorContadoCent - resumo.centavos.esperadoDinheiro

    const fechado = await tx.caixa.update({
      where: { id: data.caixaId },
      data: {
        status: 'fechado',
        fechadoEm: new Date(),
        valorContado: paraDecimal(valorContadoCent),
        // Antes este campo recebia `resumo.totalVendas` — semântica trocada.
        // Valor de fechamento é o saldo final esperado na gaveta.
        valorFechamento: paraDecimal(resumo.centavos.esperadoDinheiro),
        diferenca: paraDecimal(diferencaCent),
        observacaoFechamento: data.observacao?.trim() || null,
        fechadoPorId: data.fechadoPorId,
      },
    })

    await registrarAuditoria(tx, {
      usuarioId: data.fechadoPorId,
      acao: 'caixa.fechado',
      entidade: 'Caixa',
      entidadeId: data.caixaId,
      detalhes: {
        esperado_centavos: resumo.centavos.esperadoDinheiro,
        contado_centavos: valorContadoCent,
        diferenca_centavos: diferencaCent,
        comandas_abertas: pendentes.length,
        forcado: Boolean(data.forcar),
      },
    })

    return { fechado, resumo, diferencaCent }
  })

  emitir(tenantId).caixa(EVENTOS.caixa.fechado, {
    caixaId: data.caixaId,
    status: 'fechado',
    esperadoDinheiroCentavos: resultado.resumo.centavos.esperadoDinheiro,
  })

  return {
    ...serializarCaixa(resultado.fechado),
    resumo: resultado.resumo,
    diferenca: paraReais(resultado.diferencaCent),
  }
}

// ── Sangria e suprimento ───────────────────────────────────────────────────

export async function registrarMovimento(
  tenantId: string,
  data: { tipo: 'suprimento' | 'sangria'; valor: number; descricao?: string; usuarioId: string },
) {
  const valorCent = centavosDoCliente(data.valor, 'Valor')
  if (valorCent <= 0) throw erro(400, 'Valor deve ser maior que zero')

  const movimento = await prisma.$transaction(
    async (tx) => {
      const caixa = await tx.caixa.findFirst({ where: { status: 'aberto' } })
      if (!caixa) throw erro(409, 'Nenhum caixa aberto')

      if (data.tipo === 'sangria') {
        // Antes esta validação rodava fora da transação: duas sangrias
        // simultâneas liam o mesmo saldo e ambas passavam.
        const resumo = await resumoCaixa(tenantId, caixa.id, tx)
        if (valorCent > resumo.centavos.esperadoDinheiro) {
          throw erro(
            409,
            `Saldo insuficiente. Disponível em espécie: ${paraReais(resumo.centavos.esperadoDinheiro).toFixed(2)}`,
          )
        }
      }

      const mov = await tx.movimentoCaixa.create({
        data: {
          caixaId: caixa.id,
          tipo: data.tipo,
          valor: paraDecimal(valorCent),
          descricao: data.descricao?.trim() || null,
          usuarioId: data.usuarioId,
        } as any,
      })

      await registrarAuditoria(tx, {
        usuarioId: data.usuarioId,
        acao: `caixa.${data.tipo}`,
        entidade: 'MovimentoCaixa',
        entidadeId: mov.id,
        detalhes: { valor_centavos: valorCent, descricao: data.descricao ?? null },
      })

      return mov
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )

  const resumo = await resumoCaixa(tenantId, movimento.caixaId)
  emitir(tenantId).caixa(EVENTOS.caixa.movimentado, {
    caixaId: movimento.caixaId,
    status: 'aberto',
    esperadoDinheiroCentavos: resumo.centavos.esperadoDinheiro,
  })

  return { ...movimento, valor: Number(movimento.valor) }
}

// ── Conferência ────────────────────────────────────────────────────────────

/**
 * Fonte única da conferência do caixa.
 *
 *   esperado em espécie = inicial + suprimentos − sangrias
 *                       + recebimentos em dinheiro − estornos em dinheiro
 *
 * Recebimento em dinheiro é `Pagamento.valor` (o que ficou na gaveta),
 * NÃO `valor − troco`. O troco já saiu do `valorRecebido`, não do `valor`.
 */
export async function resumoCaixa(_tenantId: string, caixaId: string, tx: any = prisma) {
  const caixa = await tx.caixa.findFirst({ where: { id: caixaId } })
  if (!caixa) throw erro(404, 'Caixa não encontrado')

  const movimentos = await tx.movimentoCaixa.findMany({ where: { caixaId } })

  let suprimentos = 0
  let sangrias = 0
  for (const m of movimentos) {
    const v = paraCentavos(m.valor)
    if (m.tipo === 'suprimento') suprimentos += v
    if (m.tipo === 'sangria') sangrias += v
  }

  const pagamentos = await tx.pagamento.findMany({
    where: { caixaId },
    include: { metodo: { select: { nome: true } } },
  })

  const porMetodo: Record<string, { recebido: number; estornado: number; liquido: number }> = {}
  let dinheiroRecebido = 0
  let dinheiroEstornado = 0
  let vendasLiquidas = 0
  let trocoDado = 0

  for (const p of pagamentos) {
    const nome = p.metodo.nome
    const valor = paraCentavos(p.valor)
    const estornado = p.status === 'estornado'
    const ehDinheiro = nome.toLowerCase().includes('dinheiro')

    porMetodo[nome] ??= { recebido: 0, estornado: 0, liquido: 0 }
    if (estornado) {
      porMetodo[nome].estornado += valor
      if (ehDinheiro) dinheiroEstornado += valor
    } else {
      porMetodo[nome].recebido += valor
      vendasLiquidas += valor
      if (ehDinheiro) {
        // CORRETO: o valor aplicado é o que ficou na gaveta.
        dinheiroRecebido += valor
        trocoDado += paraCentavos(p.troco)
      }
    }
    porMetodo[nome].liquido = porMetodo[nome].recebido - porMetodo[nome].estornado
  }

  const inicial = paraCentavos(caixa.valorInicial)
  const esperadoDinheiro =
    inicial + suprimentos - sangrias + dinheiroRecebido - dinheiroEstornado

  return {
    esperado_dinheiro: paraReais(esperadoDinheiro),
    total_vendas: paraReais(vendasLiquidas),
    valor_inicial: paraReais(inicial),
    suprimentos: paraReais(suprimentos),
    sangrias: paraReais(sangrias),
    dinheiro_recebido: paraReais(dinheiroRecebido),
    dinheiro_estornado: paraReais(dinheiroEstornado),
    /** Informativo: quanto de troco saiu. Não entra na conta do esperado. */
    troco_dado: paraReais(trocoDado),
    por_metodo: Object.fromEntries(
      Object.entries(porMetodo).map(([k, v]) => [
        k,
        {
          recebido: paraReais(v.recebido),
          estornado: paraReais(v.estornado),
          liquido: paraReais(v.liquido),
        },
      ]),
    ),
    centavos: {
      esperadoDinheiro,
      vendasLiquidas,
      inicial,
      suprimentos,
      sangrias,
      dinheiroRecebido,
    },
  }
}

// ── Comandas em aberto ─────────────────────────────────────────────────────

/**
 * Antes era N+1: um findMany de mesas e um findFirst de pedido por mesa
 * dentro de Promise.all. Com 40 comandas eram 41 queries a cada 30 s de
 * polling, multiplicado pelo número de dispositivos.
 */
async function comandasComSaldo(tx: any) {
  const mesas = await tx.mesa.findMany({
    where: { status: { in: ['aberta', 'fechando'] }, dataFechamento: null },
    orderBy: { numero: 'asc' },
    include: {
      garcom: { select: { id: true, nome: true } },
      pedidos: {
        where: { status: { in: ['aberto', 'preparando', 'pronto'] } },
        include: includeParaConta,
      },
    },
  })

  return mesas
    .map((mesa: any) => {
      const pedido = mesa.pedidos[0]
      if (!pedido) {
        return {
          id: mesa.id,
          numero: mesa.numero,
          nome: mesa.nomeMesa || `Mesa ${mesa.numero}`,
          cliente: mesa.cliente,
          garcom: mesa.garcom?.nome ?? null,
          status: mesa.status,
          pedido_id: null,
          total: 0,
          pago: 0,
          restante: 0,
          aberta_em: mesa.dataAbertura,
        }
      }
      const conta = calcularConta({
        itens: pedido.itens,
        abatimentos: pedido.abatimentos,
        pagamentos: pedido.pagamentos,
        taxaPct: Number(pedido.taxaPct),
      })
      return {
        id: mesa.id,
        numero: mesa.numero,
        nome: mesa.nomeMesa || `Mesa ${mesa.numero}`,
        cliente: mesa.cliente,
        garcom: mesa.garcom?.nome ?? null,
        status: mesa.status,
        pedido_id: pedido.id,
        total: paraReais(conta.totalCentavos),
        pago: paraReais(conta.pagoCentavos),
        restante: paraReais(conta.restanteCentavos),
        aberta_em: mesa.dataAbertura,
      }
    })
    .filter((c: any) => c.restante > 0 || c.total > 0)
}

export async function mesasAbertas(_tenantId: string) {
  return comandasComSaldo(prisma)
}

// ── Histórico ──────────────────────────────────────────────────────────────

export async function movimentos(_tenantId: string) {
  const caixa = await prisma.caixa.findFirst({ where: { status: 'aberto' } })
  if (!caixa) return { caixa: null, movimentos: [], resumo: null }

  const movs = await prisma.movimentoCaixa.findMany({
    where: { caixaId: caixa.id },
    orderBy: { createdAt: 'desc' },
    include: { usuario: { select: { id: true, nome: true } } },
  })

  return {
    caixa: serializarCaixa(caixa),
    movimentos: movs.map((m) => ({ ...m, valor: Number(m.valor) })),
    resumo: await resumoCaixa(_tenantId, caixa.id),
  }
}

export async function historico(_tenantId: string, pagina = 1, porPagina = 20) {
  const skip = Math.max(0, (pagina - 1) * porPagina)
  const [caixas, total] = await Promise.all([
    prisma.caixa.findMany({
      orderBy: { dataAbertura: 'desc' },
      skip,
      take: porPagina,
      include: {
        funcionario: { select: { id: true, nome: true } },
        fechadoPor: { select: { id: true, nome: true } },
      },
    }),
    prisma.caixa.count(),
  ])
  return { itens: caixas.map(serializarCaixa), total, pagina, por_pagina: porPagina }
}

export async function historicoDetalhe(tenantId: string, caixaId: string) {
  const caixa = await prisma.caixa.findFirst({
    where: { id: caixaId },
    include: {
      funcionario: { select: { id: true, nome: true } },
      fechadoPor: { select: { id: true, nome: true } },
    },
  })
  if (!caixa) throw erro(404, 'Caixa não encontrado')

  const movs = await prisma.movimentoCaixa.findMany({
    where: { caixaId },
    orderBy: { createdAt: 'desc' },
    include: { usuario: { select: { id: true, nome: true } } },
  })

  return {
    caixa: serializarCaixa(caixa),
    movimentos: movs.map((m) => ({ ...m, valor: Number(m.valor) })),
    resumo: await resumoCaixa(tenantId, caixaId),
  }
}

// ── Internos ───────────────────────────────────────────────────────────────

function serializarCaixa(c: any) {
  return {
    ...c,
    valorInicial: Number(c.valorInicial),
    valorFechamento: c.valorFechamento === null ? null : Number(c.valorFechamento),
    valorContado: c.valorContado === null ? null : Number(c.valorContado),
    diferenca: c.diferenca === null ? null : Number(c.diferenca),
  }
}

function erro(status: number, mensagem: string) {
  return Object.assign(new Error(mensagem), { status })
}
