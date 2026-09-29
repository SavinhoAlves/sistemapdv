import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { EVENTOS } from '../../lib/eventos'
import { emitir } from '../../sockets/socket'
import { paraDecimal, paraReais, centavosDoCliente } from '../../lib/money'
import { calcularConta, includeParaConta, contaParaJson } from '../comandas/conta'
import { registrarAuditoria } from '../../lib/auditoria'

/**
 * Pagamentos.
 *
 * Correções em relação à versão anterior:
 *
 * - IDEMPOTÊNCIA. Antes, duplo toque no tablet ou retry após timeout gravava
 *   dois Pagamento + dois MovimentoCaixa, e o segundo entrava como parcial
 *   silencioso por causa do `Math.min(valorPago, restante)`. Agora a chave
 *   enviada pelo cliente é unique por tenant e o retry devolve o mesmo
 *   pagamento.
 * - Cálculo da conta vem de `calcularConta()`, em centavos inteiros. Antes a
 *   fórmula estava duplicada aqui em float e divergia da usada pelo frontend.
 * - `pedidoId` é respeitado. Antes era recebido e ignorado — o service refazia
 *   findFirst por mesa e, com dois pedidos abertos, pagava o errado.
 * - Aceita pedido sem mesa (balcão). Antes `mesaId` era obrigatório e vendas
 *   diretas não podiam receber pagamento por esta rota.
 * - Estoque NÃO é mexido aqui. Ele baixa no lançamento do item.
 * - Existe estorno.
 */

interface RegistrarPagamentoInput {
  /** Obrigatória. Gerada pelo cliente (crypto.randomUUID) e reenviada no retry. */
  idempotencyKey: string
  pedidoId: string
  metodoId: string
  /** Em reais. Quanto abater da conta. */
  valorPago: number
  /** Em reais. Quanto o cliente entregou fisicamente (dinheiro). */
  valorRecebido?: number
  usuarioId: string
  ip?: string
}

export async function registrarPagamento(tenantId: string, input: RegistrarPagamentoInput) {
  const { idempotencyKey, pedidoId, metodoId, usuarioId } = input

  if (!idempotencyKey || idempotencyKey.length < 8) {
    throw erro(400, 'idempotency_key ausente ou inválida')
  }

  // Caminho rápido: se a chave já foi usada, devolve o resultado anterior sem
  // tocar no banco de escrita.
  const anterior = await prisma.pagamento.findFirst({
    where: { idempotencyKey },
    include: { metodo: { select: { nome: true } } },
  })
  if (anterior) return await respostaDePagamento(tenantId, anterior, true)

  const valorPagoCent = centavosDoCliente(input.valorPago, 'Valor do pagamento')
  if (valorPagoCent <= 0) throw erro(400, 'Valor do pagamento deve ser maior que zero')

  let criado: any
  try {
    criado = await prisma.$transaction(
      async (tx) => {
        const caixa = await tx.caixa.findFirst({ where: { status: 'aberto' } })
        if (!caixa) throw erro(409, 'Nenhum caixa aberto. Abra o caixa antes de receber pagamentos.')

        const metodo = await tx.metodoPagamento.findFirst({ where: { id: metodoId, ativo: true } })
        if (!metodo) throw erro(400, 'Forma de pagamento inválida ou desativada')

        const pedido = await tx.pedido.findFirst({
          where: { id: pedidoId },
          include: { ...includeParaConta, mesa: { select: { id: true, numero: true, nomeMesa: true } } },
        })
        if (!pedido) throw erro(404, 'Pedido não encontrado')
        if (pedido.status === 'cancelado') throw erro(409, 'Pedido cancelado')

        const conta = calcularConta({
          itens: pedido.itens,
          abatimentos: pedido.abatimentos,
          pagamentos: pedido.pagamentos,
          taxaPct: Number(pedido.taxaPct),
        })

        if (conta.restanteCentavos === 0) {
          throw erro(409, 'Conta já está quitada')
        }

        // Nunca aplica mais que o restante. O excedente em dinheiro vira troco;
        // em cartão/pix, é rejeitado — não faz sentido "troco" de PIX.
        const aplicadoCent = Math.min(valorPagoCent, conta.restanteCentavos)
        const ehDinheiro = metodo.nome.toLowerCase().includes('dinheiro')

        const recebidoCent =
          input.valorRecebido !== undefined
            ? centavosDoCliente(input.valorRecebido, 'Valor recebido')
            : aplicadoCent

        if (!ehDinheiro && recebidoCent !== aplicadoCent) {
          throw erro(400, `Troco só é possível em dinheiro. ${metodo.nome} exige valor exato.`)
        }
        if (recebidoCent < aplicadoCent) {
          throw erro(400, 'Valor recebido menor que o valor do pagamento')
        }

        const trocoCent = recebidoCent - aplicadoCent

        const pagamento = await tx.pagamento.create({
          data: {
            idempotencyKey,
            mesaId: pedido.mesaId,
            pedidoId: pedido.id,
            metodoId,
            valor: paraDecimal(aplicadoCent),
            valorRecebido: paraDecimal(recebidoCent),
            troco: paraDecimal(trocoCent),
            caixaId: caixa.id,
            usuarioId,
            status: 'confirmado',
          } as any,
          include: { metodo: { select: { nome: true } } },
        })

        const identificacao = pedido.mesa
          ? pedido.mesa.nomeMesa || `Mesa ${pedido.mesa.numero}`
          : `Balcão #${pedido.numero}`

        await tx.movimentoCaixa.create({
          data: {
            caixaId: caixa.id,
            tipo: 'pagamento',
            pagamentoId: pagamento.id,
            valor: paraDecimal(aplicadoCent),
            descricao: `${identificacao} · ${metodo.nome}`,
            usuarioId,
          } as any,
        })

        const restanteCent = conta.restanteCentavos - aplicadoCent
        const quitado = restanteCent === 0

        if (quitado) {
          await tx.pedido.update({
            where: { id: pedido.id },
            data: { status: 'fechado', fechadoEm: new Date() },
          })
          if (pedido.mesaId) {
            await tx.mesa.update({
              where: { id: pedido.mesaId },
              data: { status: 'fechada', dataFechamento: new Date() },
            })
          }
        } else if (pedido.mesaId) {
          // Conta parcialmente paga trava novos lançamentos.
          await tx.mesa.update({
            where: { id: pedido.mesaId },
            data: { status: 'fechando' },
          })
        }

        return { pagamento, quitado, restanteCent, aplicadoCent, trocoCent, mesaId: pedido.mesaId }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  } catch (e: any) {
    // Corrida na chave de idempotência: outra requisição idêntica venceu.
    // Devolve o pagamento dela em vez de propagar o erro de unique.
    if (e?.code === 'P2002') {
      const existente = await prisma.pagamento.findFirst({
        where: { idempotencyKey },
        include: { metodo: { select: { nome: true } } },
      })
      if (existente) return await respostaDePagamento(tenantId, existente, true)
    }
    throw e
  }

  emitir(tenantId).pagamento(EVENTOS.pagamento.registrado, {
    comandaId: criado.mesaId,
    pedidoId,
    pagamentoId: criado.pagamento.id,
    metodoNome: criado.pagamento.metodo.nome,
    valorCentavos: criado.aplicadoCent,
    restanteCentavos: criado.restanteCent,
    quitado: criado.quitado,
  })

  return {
    pagamento_id: criado.pagamento.id,
    quitado: criado.quitado,
    valor_aplicado: paraReais(criado.aplicadoCent),
    troco: paraReais(criado.trocoCent),
    restante: paraReais(criado.restanteCent),
    repetido: false,
  }
}

// ── Estorno ────────────────────────────────────────────────────────────────

/**
 * `MovimentoCaixaTipo.estorno`, `PagamentoStatus.estornado` e a permissão
 * `estornarPagamento` existiam no código sem nenhuma implementação por trás.
 */
export async function estornarPagamento(
  tenantId: string,
  pagamentoId: string,
  motivo: string,
  usuarioId: string,
) {
  if (!motivo?.trim() || motivo.trim().length < 5) {
    throw erro(400, 'Informe o motivo do estorno')
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const pagamento = await tx.pagamento.findFirst({
      where: { id: pagamentoId },
      include: { metodo: { select: { nome: true } }, pedido: { select: { id: true, mesaId: true } } },
    })
    if (!pagamento) throw erro(404, 'Pagamento não encontrado')
    if (pagamento.status === 'estornado') throw erro(409, 'Pagamento já estornado')

    const caixa = await tx.caixa.findFirst({ where: { status: 'aberto' } })
    if (!caixa) throw erro(409, 'Abra o caixa para registrar o estorno')

    // O estorno sai do caixa aberto AGORA, que pode não ser o caixa original.
    // Estornar contra um caixa já fechado reescreveria uma conferência
    // encerrada; o movimento fica no caixa corrente e a origem vai no motivo.
    if (pagamento.caixaId !== caixa.id) {
      motivo = `${motivo.trim()} (pagamento originado em caixa anterior)`
    }

    await tx.pagamento.update({
      where: { id: pagamentoId },
      data: {
        status: 'estornado',
        estornadoEm: new Date(),
        estornadoPorId: usuarioId,
        motivoEstorno: motivo.trim(),
      },
    })

    await tx.movimentoCaixa.create({
      data: {
        caixaId: caixa.id,
        tipo: 'estorno',
        pagamentoId: pagamento.id,
        valor: pagamento.valor,
        descricao: `Estorno ${(pagamento as any).metodo?.nome ?? ''} · ${motivo.trim()}`.slice(0, 250),
        usuarioId,
      } as any,
    })

    // Reabre pedido e comanda: a conta voltou a ter saldo.
    await tx.pedido.update({
      where: { id: pagamento.pedidoId },
      data: { status: 'aberto', fechadoEm: null },
    })
    if (pagamento.pedido.mesaId) {
      await tx.mesa.update({
        where: { id: pagamento.pedido.mesaId },
        data: { status: 'fechando', dataFechamento: null },
      })
    }

    await registrarAuditoria(tx, {
      usuarioId,
      acao: 'pagamento.estornado',
      entidade: 'Pagamento',
      entidadeId: pagamentoId,
      detalhes: {
        valor: String(pagamento.valor),
        metodo: pagamento.metodo.nome,
        motivo: motivo.trim(),
        caixa_original: pagamento.caixaId,
        caixa_estorno: caixa.id,
      },
    })

    return { pagamento }
  })

  emitir(tenantId).pagamento(EVENTOS.pagamento.estornado, {
    comandaId: resultado.pagamento.pedido.mesaId,
    pedidoId: resultado.pagamento.pedidoId,
    pagamentoId,
    metodoNome: resultado.pagamento.metodo.nome,
    valorCentavos: 0,
    restanteCentavos: 0,
    quitado: false,
  })

  return { success: true }
}

// ── Métodos de pagamento ───────────────────────────────────────────────────

export async function listarMetodos(_tenantId: string) {
  return prisma.metodoPagamento.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } })
}

export async function todosMetodos(_tenantId: string) {
  return prisma.metodoPagamento.findMany({ orderBy: { nome: 'asc' } })
}

export async function criarMetodo(_tenantId: string, nome: string) {
  const limpo = nome?.trim()
  if (!limpo) throw erro(400, 'Informe o nome da forma de pagamento')
  return prisma.metodoPagamento.create({ data: { nome: limpo, ativo: true } as any })
}

export async function toggleMetodo(_tenantId: string, id: string, ativo: boolean) {
  return prisma.metodoPagamento.update({ where: { id }, data: { ativo } })
}

// ── Internos ───────────────────────────────────────────────────────────────

async function respostaDePagamento(_tenantId: string, pagamento: any, repetido: boolean) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: pagamento.pedidoId },
    include: includeParaConta,
  })
  const conta = pedido
    ? calcularConta({
        itens: pedido.itens,
        abatimentos: pedido.abatimentos,
        pagamentos: pedido.pagamentos,
        taxaPct: Number(pedido.taxaPct),
      })
    : null

  return {
    pagamento_id: pagamento.id,
    quitado: conta?.quitada ?? false,
    valor_aplicado: Number(pagamento.valor),
    troco: Number(pagamento.troco),
    restante: conta ? paraReais(conta.restanteCentavos) : 0,
    repetido,
  }
}

function erro(status: number, mensagem: string) {
  return Object.assign(new Error(mensagem), { status })
}
