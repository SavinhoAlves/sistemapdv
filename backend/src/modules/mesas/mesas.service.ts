import { prisma } from '../../lib/prisma'
import { EVENTOS, type PayloadComanda } from '../../lib/eventos'
import { emitir } from '../../sockets/socket'
import { paraReais } from '../../lib/money'
import { calcularConta, includeParaConta, contaParaJson } from '../comandas/conta'
import { proximoNumero } from '../comandas/sequencia'
import { registrarAuditoria } from '../../lib/auditoria'

/**
 * Comandas.
 *
 * Nomenclatura: a tabela se chama `mesas` por herança, mas a entidade é uma
 * COMANDA — uma linha nova é criada a cada atendimento e nunca é reaproveitada.
 * Era o que o código já fazia; agora está assumido, e o enum perdeu os quatro
 * estados que nunca eram atribuídos.
 *
 * Correções:
 * - `encerrar()` não deixa mais a dívida sumir. Antes bastava um PATCH para a
 *   comanda com R$ 300 em aberto sair da tela do caixa, com o pedido preso em
 *   `aberto` para sempre.
 * - A numeração usa a tabela de sequência. Antes era `max(numero) + 1`, que
 *   sob concorrência gera número duplicado e bate no unique.
 * - `listar()` devolve o que a tela de salão precisa: total, tempo aberto,
 *   quantidade de itens e quantos estão prontos aguardando entrega. Antes
 *   devolvia só o registro cru da mesa, e o card do salão não tinha como
 *   mostrar o valor da conta.
 * - Existe transferência entre garçons.
 */

const STATUS_ABERTOS = ['aberto', 'preparando', 'pronto'] as const

// ── Abertura ───────────────────────────────────────────────────────────────

interface AbrirInput {
  nomeMesa?: string
  cliente?: string
  garcomId?: string
  observacoes?: string
  usuarioId: string
}

export async function abrir(tenantId: string, data: AbrirInput) {
  const caixa = await prisma.caixa.findFirst({ where: { status: 'aberto' } })
  if (!caixa) {
    throw erro(409, 'Abra o caixa antes de iniciar atendimentos')
  }

  const mesa = await prisma.$transaction(async (tx) => {
    return tx.mesa.create({
      data: {
        numero: await proximoNumero(tx, tenantId, 'mesa'),
        nomeMesa: data.nomeMesa?.trim() || null,
        cliente: data.cliente?.trim() || null,
        garcomId: data.garcomId || data.usuarioId,
        caixaId: caixa.id,
        observacoes: data.observacoes?.trim() || null,
        status: 'aberta',
        dataAbertura: new Date(),
      } as any,
    })
  })

  const resumo = await resumoDaComanda(tenantId, mesa.id)
  if (resumo) emitir(tenantId).comanda(EVENTOS.comanda.aberta, resumo)
  return mesa
}

// ── Listagem para o salão ──────────────────────────────────────────────────

/**
 * Uma query só. Antes o caixa fazia N+1 (uma busca de pedido por mesa) e o
 * salão nem trazia a conta — o card mostrava a inicial do cliente e o nome do
 * garçom, e nenhum dado operacional.
 *
 * `cargo === 'garcom'` não filtra mais por dono: na troca de turno o garçom
 * que entra precisa enxergar as comandas do salão. Quem lançou cada item já
 * fica registrado em `PedidoItem.lancadoPor`.
 */
export async function listar(tenantId: string, _cargo: string, _userId: string) {
  const mesas = await prisma.mesa.findMany({
    where: { status: { in: ['aberta', 'fechando'] } },
    orderBy: { dataAbertura: 'asc' },
    include: {
      garcom: { select: { id: true, nome: true } },
      pedidos: {
        where: { status: { in: [...STATUS_ABERTOS] } },
        include: {
          ...includeParaConta,
          itens: { select: { precoTotal: true, status: true, createdAt: true } },
        },
      },
    },
  })

  return mesas.map((mesa) => montarResumo(mesa))
}

/** Resumo de uma comanda só — usado nos eventos de socket. */
export async function resumoDaComanda(
  _tenantId: string,
  mesaId: string,
): Promise<PayloadComanda | null> {
  const mesa = await prisma.mesa.findFirst({
    where: { id: mesaId },
    include: {
      garcom: { select: { id: true, nome: true } },
      pedidos: {
        where: { status: { in: [...STATUS_ABERTOS] } },
        include: {
          ...includeParaConta,
          itens: { select: { precoTotal: true, status: true, createdAt: true } },
        },
      },
    },
  })
  if (!mesa) return null

  const r = montarResumo(mesa)
  return {
    comandaId: r.id,
    numero: r.numero,
    status: r.status,
    pedidoId: r.pedido_id,
    totalCentavos: r.centavos.total,
    pagoCentavos: r.centavos.pago,
    restanteCentavos: r.centavos.restante,
    qtdItens: r.qtd_itens,
    qtdProntos: r.qtd_prontos,
    atualizadoEm: new Date().toISOString(),
  }
}

// ── Conta impressa ─────────────────────────────────────────────────────────

/**
 * Marca a comanda como `fechando`: a conta foi impressa e a mesa para de
 * aceitar lançamentos. Antes esse estado existia no enum e nunca era atribuído,
 * então dava para lançar item depois de o cliente receber a conta.
 */
export async function pedirConta(tenantId: string, mesaId: string) {
  const mesa = await prisma.mesa.update({
    where: { id: mesaId },
    data: { status: 'fechando' },
  })
  const resumo = await resumoDaComanda(tenantId, mesaId)
  if (resumo) emitir(tenantId).comanda(EVENTOS.comanda.atualizada, resumo)
  return mesa
}

/** Volta para `aberta` — cliente pediu mais alguma coisa depois da conta. */
export async function reabrir(tenantId: string, mesaId: string, usuarioId: string) {
  const mesa = await prisma.mesa.findFirst({ where: { id: mesaId } })
  if (!mesa) throw erro(404, 'Comanda não encontrada')
  if (mesa.status === 'fechada') {
    throw erro(409, 'Comanda já encerrada. Abra uma nova.')
  }

  const atualizada = await prisma.$transaction(async (tx) => {
    await registrarAuditoria(tx, {
      usuarioId,
      acao: 'comanda.reaberta',
      entidade: 'Mesa',
      entidadeId: mesaId,
    })
    return tx.mesa.update({ where: { id: mesaId }, data: { status: 'aberta' } })
  })

  const resumo = await resumoDaComanda(tenantId, mesaId)
  if (resumo) emitir(tenantId).comanda(EVENTOS.comanda.atualizada, resumo)
  return atualizada
}

// ── Encerramento ───────────────────────────────────────────────────────────

interface EncerrarInput {
  usuarioId: string
  /** Obrigatório quando ainda há saldo. */
  motivo?: string
}

/**
 * Encerra a comanda.
 *
 * Antes:
 *
 *     const mesa = await prisma.mesa.update({ data: { status: 'fechada' } })
 *
 * Sem nenhuma verificação de saldo. Fechar uma comanda com R$ 300 em aberto
 * a removia de `listar()` e de `mesasAbertas()`; a dívida sumia da operação e
 * o pedido ficava `aberto` para sempre. O caminho normal é a quitação, que
 * acontece em `registrarPagamento`. Este método é a saída de exceção — e agora
 * exige motivo, grava o responsável e cai na auditoria.
 */
export async function encerrar(tenantId: string, mesaId: string, input: EncerrarInput) {
  const resultado = await prisma.$transaction(async (tx) => {
    const mesa = await tx.mesa.findFirst({
      where: { id: mesaId },
      include: {
        pedidos: {
          where: { status: { in: [...STATUS_ABERTOS] } },
          include: includeParaConta,
        },
      },
    })
    if (!mesa) throw erro(404, 'Comanda não encontrada')
    if (mesa.status === 'fechada') throw erro(409, 'Comanda já encerrada')

    const pedido = mesa.pedidos[0]
    const conta = pedido
      ? calcularConta({
          itens: pedido.itens,
          abatimentos: pedido.abatimentos,
          pagamentos: pedido.pagamentos,
          taxaPct: Number(pedido.taxaPct),
        })
      : null

    const temSaldo = (conta?.restanteCentavos ?? 0) > 0

    if (temSaldo) {
      if (!input.motivo?.trim() || input.motivo.trim().length < 5) {
        throw Object.assign(
          new Error(
            `Comanda com ${paraReais(conta!.restanteCentavos).toFixed(2)} em aberto. ` +
              `Informe o motivo para encerrar sem receber.`,
          ),
          { status: 409, restante: paraReais(conta!.restanteCentavos) },
        )
      }
    }

    if (pedido) {
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { status: 'fechado', fechadoEm: new Date() },
      })
    }

    const atualizada = await tx.mesa.update({
      where: { id: mesaId },
      data: {
        status: 'fechada',
        dataFechamento: new Date(),
        encerradaSemPagamento: temSaldo,
        motivoEncerramento: temSaldo ? input.motivo!.trim() : null,
        encerradaPorId: input.usuarioId,
      },
    })

    if (temSaldo) {
      await registrarAuditoria(tx, {
        usuarioId: input.usuarioId,
        acao: 'comanda.encerrada_sem_pagamento',
        entidade: 'Mesa',
        entidadeId: mesaId,
        detalhes: {
          restante_centavos: conta!.restanteCentavos,
          total_centavos: conta!.totalCentavos,
          motivo: input.motivo!.trim(),
        },
      })
    }

    return { mesa: atualizada, temSaldo, conta }
  })

  emitir(tenantId).comanda(EVENTOS.comanda.fechada, {
    comandaId: mesaId,
    numero: resultado.mesa.numero,
    status: 'fechada',
    pedidoId: null,
    totalCentavos: resultado.conta?.totalCentavos ?? 0,
    pagoCentavos: resultado.conta?.pagoCentavos ?? 0,
    restanteCentavos: 0,
    qtdItens: 0,
    qtdProntos: 0,
    atualizadoEm: new Date().toISOString(),
  })

  return { ...resultado.mesa, encerrada_sem_pagamento: resultado.temSaldo }
}

// ── Transferência ──────────────────────────────────────────────────────────

/** O README documentava `PATCH /mesas/:id/transferir`; a rota não existia. */
export async function transferir(
  tenantId: string,
  mesaId: string,
  novoGarcomId: string,
  usuarioId: string,
) {
  const resultado = await prisma.$transaction(async (tx) => {
    const mesa = await tx.mesa.findFirst({ where: { id: mesaId } })
    if (!mesa) throw erro(404, 'Comanda não encontrada')
    if (mesa.status === 'fechada') throw erro(409, 'Comanda já encerrada')

    const garcom = await tx.usuario.findFirst({ where: { id: novoGarcomId, ativo: true } })
    if (!garcom) throw erro(404, 'Garçom não encontrado')

    await registrarAuditoria(tx, {
      usuarioId,
      acao: 'comanda.transferida',
      entidade: 'Mesa',
      entidadeId: mesaId,
      detalhes: { de: mesa.garcomId, para: novoGarcomId },
    })

    return tx.mesa.update({ where: { id: mesaId }, data: { garcomId: novoGarcomId } })
  })

  const resumo = await resumoDaComanda(tenantId, mesaId)
  if (resumo) emitir(tenantId).comanda(EVENTOS.comanda.atualizada, resumo)
  return resultado
}

// ── Internos ───────────────────────────────────────────────────────────────

function montarResumo(mesa: any) {
  const pedido = mesa.pedidos?.[0] ?? null

  const conta = pedido
    ? calcularConta({
        itens: pedido.itens,
        abatimentos: pedido.abatimentos,
        pagamentos: pedido.pagamentos,
        taxaPct: Number(pedido.taxaPct),
      })
    : calcularConta({ itens: [], abatimentos: [], pagamentos: [], taxaPct: 0 })

  const itens = pedido?.itens ?? []
  const ativos = itens.filter((i: any) => i.status !== 'cancelado')
  const prontos = ativos.filter((i: any) => i.status === 'pronto')
  const naCozinha = ativos.filter(
    (i: any) => i.status === 'pendente' || i.status === 'preparando',
  )

  // Momento do último lançamento — é o que diz se a mesa está parada.
  const ultimoLancamento = ativos.reduce(
    (max: Date | null, i: any) => (!max || i.createdAt > max ? i.createdAt : max),
    null as Date | null,
  )

  return {
    id: mesa.id,
    numero: mesa.numero,
    nome: mesa.nomeMesa || `Mesa ${mesa.numero}`,
    cliente: mesa.cliente,
    status: mesa.status,
    garcom: mesa.garcom ? { id: mesa.garcom.id, nome: mesa.garcom.nome } : null,
    pedido_id: pedido?.id ?? null,

    // Os dados que o card do salão precisa e não tinha.
    total: paraReais(conta.totalCentavos),
    pago: paraReais(conta.pagoCentavos),
    restante: paraReais(conta.restanteCentavos),
    qtd_itens: ativos.reduce((s: number, i: any) => s + (i.quantidade ?? 1), 0),
    qtd_prontos: prontos.length,
    qtd_na_cozinha: naCozinha.length,

    aberta_em: mesa.dataAbertura,
    ultimo_lancamento_em: ultimoLancamento,

    conta: contaParaJson(conta),
    centavos: {
      total: conta.totalCentavos,
      pago: conta.pagoCentavos,
      restante: conta.restanteCentavos,
    },
  }
}

function erro(status: number, mensagem: string) {
  return Object.assign(new Error(mensagem), { status })
}
