import { prisma } from '../../lib/prisma'
import { EVENTOS } from '../../lib/eventos'
import { emitir } from '../../sockets/socket'
import { paraDecimal, paraCentavos, centavosDoCliente } from '../../lib/money'
import { calcularConta, includeParaConta, contaParaJson } from '../comandas/conta'
import { proximoNumero } from '../comandas/sequencia'
import { registrarAuditoria } from '../../lib/auditoria'

/**
 * Pedidos — lançamento de itens na comanda.
 *
 * Mudanças em relação à versão anterior:
 *
 * - Cada lançamento cria uma linha nova, agrupada por RODADA. Antes o service
 *   fazia `increment` num item já em status `preparando`: a cozinha estava
 *   fazendo 2, virava 3, sem ficha nova e sem aviso nenhum.
 * - O estoque baixa NO LANÇAMENTO, com decremento condicional atômico. Antes
 *   validava aqui e só decrementava na quitação, então duas mesas passavam na
 *   mesma validação da última unidade.
 * - `precoTotal` é sempre `precoUnitario × quantidade`. Antes o increment
 *   usava o preço ATUAL do produto enquanto o unitário guardava o antigo.
 * - Nenhum total materializado. A conta vem sempre de `calcularConta()`.
 * - Todos os caminhos emitem evento com o total novo, incluindo remoção.
 */

const STATUS_ABERTOS = ['aberto', 'preparando', 'pronto'] as const

// ── Lançamento ─────────────────────────────────────────────────────────────

interface LancarItemInput {
  mesaId: string
  produtoId: string
  quantidade: number
  usuarioId: string
  garcomId?: string
  observacao?: string
}

export async function lancarItem(tenantId: string, input: LancarItemInput) {
  const { mesaId, produtoId, usuarioId, observacao } = input

  const quantidade = Math.trunc(Number(input.quantidade))
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 999) {
    throw erro(400, 'Quantidade deve ser um número inteiro entre 1 e 999')
  }

  const resultado = await prisma.$transaction(async (tx) => {
    // A comanda precisa aceitar lançamento. `fechando` significa conta já
    // impressa — antes não havia essa verificação e dava para lançar item
    // depois de o cliente ter recebido a conta.
    const mesa = await tx.mesa.findFirst({ where: { id: mesaId } })
    if (!mesa) throw erro(404, 'Comanda não encontrada')
    if (mesa.status === 'fechada') throw erro(409, 'Comanda já encerrada')
    if (mesa.status === 'fechando') {
      throw erro(409, 'Conta já foi impressa. Reabra a comanda para lançar mais itens.')
    }

    const produto = await tx.produto.findFirst({
      where: { id: produtoId, ativo: true },
      include: { categoria: { select: { vaiCozinha: true, nome: true } } },
    })
    if (!produto) throw erro(404, 'Produto não encontrado ou inativo')

    // ── Estoque: decremento condicional atômico ──
    // O UPDATE ... WHERE estoque_atual >= qtd resolve a corrida no banco.
    // Se afetar 0 linhas, outra transação levou a última unidade.
    if (produto.gerenciarEstoque) {
      const afetadas = await tx.$executeRaw`
        UPDATE produtos
           SET estoque_atual = estoque_atual - ${quantidade}
         WHERE id = ${produtoId}
           AND tenant_id = ${tenantId}
           AND gerenciar_estoque = true
           AND estoque_atual >= ${quantidade}
      `
      if (afetadas === 0) {
        throw erro(409, `Estoque insuficiente de ${produto.nome}. Disponível: ${produto.estoqueAtual}`)
      }
      await tx.movimentacaoEstoque.create({
        data: {
          produtoId,
          tipo: 'saida',
          quantidade,
          motivo: `Lançamento · comanda ${mesa.nomeMesa || mesa.numero}`,
          usuarioId,
        } as any,
      })
    }

    // ── Pedido aberto da comanda ──
    // O índice único parcial `pedido_um_aberto_por_mesa` garante que o
    // create concorrente falha em vez de criar um segundo pedido.
    let pedido = await tx.pedido.findFirst({
      where: { mesaId, status: { in: [...STATUS_ABERTOS] } },
    })
    if (!pedido) {
      pedido = await tx.pedido.create({
        data: {
          mesaId,
          garcomId: input.garcomId || mesa.garcomId || usuarioId,
          status: 'aberto',
          taxaPct: 0,
          numero: await proximoNumero(tx, tenantId, 'pedido'),
        } as any,
      })
    }

    // ── Rodada ──
    // Itens lançados juntos saem na mesma ficha da cozinha.
    const ultima = await tx.pedidoItem.aggregate({
      where: { pedidoId: pedido.id },
      _max: { rodada: true },
    })
    const rodada = (ultima._max.rodada ?? 0) + 1

    const vaiCozinha = produto.categoria?.vaiCozinha ?? true
    const precoUnitario = produto.preco
    const precoTotalCent = paraCentavos(precoUnitario) * quantidade

    const item = await tx.pedidoItem.create({
      data: {
        pedidoId: pedido.id,
        produtoId,
        rodada,
        quantidade,
        precoUnitario,
        // Sempre unitário × quantidade. Sem increment sobre preço atual.
        precoTotal: paraDecimal(precoTotalCent),
        status: vaiCozinha ? 'pendente' : 'pronto',
        observacao: observacao?.trim() || null,
        lancadoPorId: usuarioId,
      } as any,
    })

    const conta = await contaDoPedido(tx, pedido.id)

    return {
      pedido,
      item,
      rodada,
      vaiCozinha,
      produtoNome: produto.nome,
      categoriaNome: produto.categoria?.nome ?? null,
      mesa,
      conta,
    }
  })

  emitir(tenantId).item(EVENTOS.item.lancado, {
    comandaId: mesaId,
    pedidoId: resultado.pedido.id,
    itemId: resultado.item.id,
    produtoId,
    produtoNome: resultado.produtoNome,
    quantidade,
    status: resultado.item.status,
    vaiCozinha: resultado.vaiCozinha,
    rodada: resultado.rodada,
    totalCentavos: resultado.conta.totalCentavos,
  })

  return {
    pedido_id: resultado.pedido.id,
    item_id: resultado.item.id,
    rodada: resultado.rodada,
    vai_cozinha: resultado.vaiCozinha,
    conta: contaParaJson(resultado.conta),
  }
}

// ── Alteração de quantidade ────────────────────────────────────────────────

/**
 * Ajusta a quantidade de um item. Antes existiam `decrementarItem` e
 * `excluirItem` separados, nenhum dos dois devolvia estoque nem emitia evento,
 * e ambos buscavam o produto numa variável que nunca era usada.
 */
export async function ajustarQuantidade(
  tenantId: string,
  itemId: string,
  novaQuantidade: number,
  usuarioId: string,
) {
  const qtd = Math.trunc(Number(novaQuantidade))
  if (!Number.isInteger(qtd) || qtd < 0 || qtd > 999) {
    throw erro(400, 'Quantidade inválida')
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const item = await tx.pedidoItem.findFirst({
      where: { id: itemId },
      include: {
        produto: { select: { id: true, nome: true, gerenciarEstoque: true } },
        pedido: { select: { id: true, mesaId: true, status: true } },
      },
    })
    if (!item) throw erro(404, 'Item não encontrado')
    if (!STATUS_ABERTOS.includes(item.pedido.status as any)) {
      throw erro(409, 'Pedido já fechado. Use estorno para corrigir.')
    }
    if (item.status === 'entregue') {
      throw erro(409, 'Item já entregue ao cliente. Cancele com justificativa.')
    }

    const delta = qtd - item.quantidade

    // Devolve ou consome estoque conforme a direção do ajuste.
    if (item.produto.gerenciarEstoque && delta !== 0) {
      if (delta > 0) {
        const afetadas = await tx.$executeRaw`
          UPDATE produtos SET estoque_atual = estoque_atual - ${delta}
           WHERE id = ${item.produto.id} AND tenant_id = ${tenantId}
             AND estoque_atual >= ${delta}
        `
        if (afetadas === 0) throw erro(409, `Estoque insuficiente de ${item.produto.nome}`)
      } else {
        await tx.produto.update({
          where: { id: item.produto.id },
          data: { estoqueAtual: { increment: Math.abs(delta) } },
        })
      }
      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: item.produto.id,
          tipo: delta > 0 ? 'saida' : 'entrada',
          quantidade: Math.abs(delta),
          motivo: 'Ajuste de quantidade na comanda',
          usuarioId,
        } as any,
      })
    }

    if (qtd === 0) {
      await tx.pedidoItem.delete({ where: { id: itemId } })
    } else {
      await tx.pedidoItem.update({
        where: { id: itemId },
        data: {
          quantidade: qtd,
          precoTotal: paraDecimal(paraCentavos(item.precoUnitario) * qtd),
        },
      })
    }

    const conta = await contaDoPedido(tx, item.pedido.id)
    return { item, conta, removido: qtd === 0 }
  })

  emitir(tenantId).item(
    resultado.removido ? EVENTOS.item.removido : EVENTOS.item.statusAlterado,
    {
      comandaId: resultado.item.pedido.mesaId!,
      pedidoId: resultado.item.pedido.id,
      itemId,
      produtoId: resultado.item.produto.id,
      produtoNome: resultado.item.produto.nome,
      quantidade: qtd,
      status: resultado.item.status,
      vaiCozinha: false,
      rodada: resultado.item.rodada,
      totalCentavos: resultado.conta.totalCentavos,
    },
  )

  return { conta: contaParaJson(resultado.conta) }
}

/** Usado pela rota de compatibilidade `/decrementar`, que não informa o alvo. */
export async function quantidadeDoItem(_tenantId: string, itemId: string): Promise<number> {
  const item = await prisma.pedidoItem.findFirst({
    where: { id: itemId },
    select: { quantidade: true },
  })
  if (!item) throw erro(404, 'Item não encontrado')
  return item.quantidade
}

/**
 * Cancela um item já enviado para a cozinha. Exige motivo — antes a exclusão
 * era livre, sem rastro, e a cozinha não recebia aviso nenhum.
 */
export async function cancelarItem(
  tenantId: string,
  itemId: string,
  motivo: string,
  usuarioId: string,
) {
  if (!motivo?.trim() || motivo.trim().length < 3) {
    throw erro(400, 'Informe o motivo do cancelamento')
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const item = await tx.pedidoItem.findFirst({
      where: { id: itemId },
      include: {
        produto: { select: { id: true, nome: true, gerenciarEstoque: true } },
        pedido: { select: { id: true, mesaId: true, status: true } },
      },
    })
    if (!item) throw erro(404, 'Item não encontrado')
    if (item.status === 'cancelado') throw erro(409, 'Item já cancelado')

    if (item.produto.gerenciarEstoque) {
      await tx.produto.update({
        where: { id: item.produto.id },
        data: { estoqueAtual: { increment: item.quantidade } },
      })
      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: item.produto.id,
          tipo: 'entrada',
          quantidade: item.quantidade,
          motivo: `Cancelamento: ${motivo.trim()}`,
          usuarioId,
        } as any,
      })
    }

    await tx.pedidoItem.update({
      where: { id: itemId },
      data: {
        status: 'cancelado',
        canceladoPorId: usuarioId,
        motivoCancelamento: motivo.trim(),
      },
    })

    await registrarAuditoria(tx, {
      usuarioId,
      acao: 'item.cancelado',
      entidade: 'PedidoItem',
      entidadeId: itemId,
      detalhes: { produto: item.produto.nome, quantidade: item.quantidade, motivo: motivo.trim() },
    })

    const conta = await contaDoPedido(tx, item.pedido.id)
    return { item, conta }
  })

  emitir(tenantId).item(EVENTOS.item.statusAlterado, {
    comandaId: resultado.item.pedido.mesaId!,
    pedidoId: resultado.item.pedido.id,
    itemId,
    produtoId: resultado.item.produto.id,
    produtoNome: resultado.item.produto.nome,
    quantidade: resultado.item.quantidade,
    status: 'cancelado',
    vaiCozinha: true,
    rodada: resultado.item.rodada,
    totalCentavos: resultado.conta.totalCentavos,
  })

  return { conta: contaParaJson(resultado.conta) }
}

// ── Taxa de serviço e abatimentos ──────────────────────────────────────────

export async function definirTaxaServico(tenantId: string, pedidoId: string, aplicar: boolean) {
  const cfg = await prisma.configuracoes.findFirst({ select: { taxaServicoPct: true } })
  const pct = aplicar ? Number(cfg?.taxaServicoPct ?? 0) : 0

  const pedido = await prisma.pedido.update({
    where: { id: pedidoId },
    data: { taxaPct: pct },
  })

  const conta = await contaDoPedido(prisma, pedidoId)
  await notificarComanda(tenantId, pedido.mesaId)
  return { taxa_pct: pct, conta: contaParaJson(conta) }
}

interface AbaterInput {
  tipo: 'valor' | 'percentual' | 'cortesia'
  valor?: number
  percentual?: number
  motivo: string
  usuarioId: string
}

/**
 * Registra um abatimento como LINHA, com motivo e autor.
 *
 * Antes: `Pedido.desconto` era um escalar somado a cada chamada, motivo e
 * usuário eram ignorados (`_motivo`, `_usuarioId`), e o frontend mantinha uma
 * lista puramente local que sumia ao recarregar a tela.
 */
export async function abater(tenantId: string, pedidoId: string, input: AbaterInput) {
  if (!input.motivo?.trim() || input.motivo.trim().length < 3) {
    throw erro(400, 'Informe o motivo do desconto')
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findFirst({ where: { id: pedidoId } })
    if (!pedido) throw erro(404, 'Pedido não encontrado')
    if (!STATUS_ABERTOS.includes(pedido.status as any)) {
      throw erro(409, 'Pedido já fechado')
    }

    const antes = await contaDoPedido(tx, pedidoId)

    let valorCent: number
    let pctGravado: number | null = null

    if (input.tipo === 'percentual') {
      const pct = Number(input.percentual)
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        throw erro(400, 'Percentual deve estar entre 0 e 100')
      }
      valorCent = Math.round((antes.liquidoCentavos * pct) / 100)
      pctGravado = pct
    } else if (input.tipo === 'cortesia') {
      valorCent = antes.liquidoCentavos
    } else {
      valorCent = centavosDoCliente(input.valor, 'Valor do desconto')
    }

    if (valorCent <= 0) throw erro(400, 'Desconto precisa ser maior que zero')
    if (valorCent > antes.liquidoCentavos) {
      throw erro(400, 'Desconto maior que o valor da conta')
    }

    const abatimento = await tx.abatimento.create({
      data: {
        pedidoId,
        tipo: input.tipo,
        valor: paraDecimal(valorCent),
        percentual: pctGravado,
        motivo: input.motivo.trim(),
        usuarioId: input.usuarioId,
      } as any,
    })

    await registrarAuditoria(tx, {
      usuarioId: input.usuarioId,
      acao: 'pedido.abatimento',
      entidade: 'Pedido',
      entidadeId: pedidoId,
      detalhes: {
        tipo: input.tipo,
        valor_centavos: valorCent,
        percentual: pctGravado,
        motivo: input.motivo.trim(),
        liquido_antes: antes.liquidoCentavos,
      },
    })

    const conta = await contaDoPedido(tx, pedidoId)
    return { abatimento, conta, mesaId: pedido.mesaId }
  })

  await notificarComanda(tenantId, resultado.mesaId)
  return {
    abatimento_id: resultado.abatimento.id,
    conta: contaParaJson(resultado.conta),
  }
}

export async function cancelarAbatimento(
  tenantId: string,
  abatimentoId: string,
  usuarioId: string,
) {
  const resultado = await prisma.$transaction(async (tx) => {
    const ab = await tx.abatimento.findFirst({ where: { id: abatimentoId } })
    if (!ab) throw erro(404, 'Abatimento não encontrado')
    if (ab.cancelado) throw erro(409, 'Abatimento já cancelado')

    await tx.abatimento.update({
      where: { id: abatimentoId },
      data: { cancelado: true, canceladoEm: new Date(), canceladoPorId: usuarioId },
    })

    await registrarAuditoria(tx, {
      usuarioId,
      acao: 'pedido.abatimento_cancelado',
      entidade: 'Abatimento',
      entidadeId: abatimentoId,
      detalhes: { valor: String(ab.valor), motivo_original: ab.motivo },
    })

    const pedido = await tx.pedido.findFirst({ where: { id: ab.pedidoId } })
    const conta = await contaDoPedido(tx, ab.pedidoId)
    return { conta, mesaId: pedido?.mesaId ?? null }
  })

  await notificarComanda(tenantId, resultado.mesaId)
  return { conta: contaParaJson(resultado.conta) }
}

// ── Leitura ────────────────────────────────────────────────────────────────

/** Comanda completa: itens agrupados por rodada + conta calculada. */
export async function comandaDaMesa(tenantId: string, mesaId: string) {
  const pedido = await prisma.pedido.findFirst({
    where: { mesaId, status: { in: [...STATUS_ABERTOS] } },
    include: {
      itens: {
        include: {
          produto: { select: { id: true, nome: true } },
          lancadoPor: { select: { id: true, nome: true } },
        },
        orderBy: [{ rodada: 'asc' }, { createdAt: 'asc' }],
      },
      abatimentos: {
        where: { cancelado: false },
        include: { usuario: { select: { id: true, nome: true } } },
        orderBy: { createdAt: 'asc' },
      },
      pagamentos: {
        where: { status: 'confirmado' },
        include: { metodo: { select: { nome: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!pedido) return null

  const conta = calcularConta({
    itens: pedido.itens,
    abatimentos: pedido.abatimentos,
    pagamentos: pedido.pagamentos,
    taxaPct: Number(pedido.taxaPct),
  })

  // Agrupa por rodada — é assim que a cozinha vê e é assim que o cupom imprime.
  const rodadas = new Map<number, typeof pedido.itens>()
  for (const item of pedido.itens) {
    if (!rodadas.has(item.rodada)) rodadas.set(item.rodada, [])
    rodadas.get(item.rodada)!.push(item)
  }

  return {
    pedido_id: pedido.id,
    numero: pedido.numero,
    status: pedido.status,
    conta: contaParaJson(conta),
    rodadas: [...rodadas.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([numero, itens]) => ({
        numero,
        aberta_em: itens[0].createdAt,
        lancada_por: itens[0].lancadoPor?.nome ?? null,
        itens: itens.map((i) => ({
          id: i.id,
          produto_id: i.produtoId,
          nome: i.produto.nome,
          quantidade: i.quantidade,
          preco_unitario: Number(i.precoUnitario),
          total: Number(i.precoTotal),
          status: i.status,
          observacao: i.observacao,
        })),
      })),
    abatimentos: pedido.abatimentos.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      valor: Number(a.valor),
      percentual: a.percentual ? Number(a.percentual) : null,
      motivo: a.motivo,
      por: a.usuario.nome,
      em: a.createdAt,
    })),
    pagamentos: pedido.pagamentos.map((p) => ({
      id: p.id,
      metodo: p.metodo.nome,
      valor: Number(p.valor),
      troco: Number(p.troco),
      em: p.createdAt,
    })),
  }
}

/**
 * Fila da cozinha, agrupada por rodada em vez de por mesa.
 *
 * Antes agrupava por mesa e trazia uma janela fixa de 12 h, então itens
 * marcados `pronto` mas nunca `entregue` ficavam na tela até completar 12 h.
 * Agora `pronto` sai da fila assim que é entregue, e a janela é configurável.
 */
export async function filaCozinha(tenantId: string, horas = 6) {
  const desde = new Date(Date.now() - horas * 3600_000)

  const itens = await prisma.pedidoItem.findMany({
    where: {
      status: { in: ['pendente', 'preparando', 'pronto'] },
      createdAt: { gte: desde },
      produto: { categoria: { vaiCozinha: true } },
    },
    include: {
      produto: { select: { nome: true, categoria: { select: { nome: true } } } },
      lancadoPor: { select: { nome: true } },
      pedido: {
        select: {
          id: true,
          numero: true,
          mesaId: true,
          mesa: { select: { numero: true, nomeMesa: true, cliente: true } },
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  })

  const chave = (i: (typeof itens)[number]) => `${i.pedidoId}:${i.rodada}`
  const fichas = new Map<string, any>()

  for (const item of itens) {
    const k = chave(item)
    if (!fichas.has(k)) {
      const mesa = item.pedido.mesa
      fichas.set(k, {
        id: k,
        pedido_id: item.pedidoId,
        pedido_numero: item.pedido.numero,
        rodada: item.rodada,
        comanda_id: item.pedido.mesaId,
        comanda_nome: mesa?.nomeMesa || (mesa ? `Mesa ${mesa.numero}` : 'Balcão'),
        cliente: mesa?.cliente ?? null,
        lancada_por: item.lancadoPor?.nome ?? null,
        aberta_em: item.createdAt,
        itens: [],
      })
    }
    fichas.get(k).itens.push({
      id: item.id,
      nome: item.produto.nome,
      categoria: item.produto.categoria?.nome ?? null,
      quantidade: item.quantidade,
      status: item.status,
      observacao: item.observacao,
    })
  }

  return [...fichas.values()]
}

// ── Status de item (cozinha) ───────────────────────────────────────────────

const TRANSICOES: Record<string, string[]> = {
  pendente: ['preparando', 'cancelado'],
  preparando: ['pronto', 'cancelado'],
  pronto: ['entregue'],
  entregue: [],
  cancelado: [],
}

/**
 * Antes: aceitava qualquer status para qualquer status, não checava se o
 * pedido ainda estava aberto, e só emitia evento quando ia para `pronto`.
 */
export async function atualizarStatusItem(tenantId: string, itemId: string, destino: string) {
  const resultado = await prisma.$transaction(async (tx) => {
    const item = await tx.pedidoItem.findFirst({
      where: { id: itemId },
      include: {
        produto: { select: { id: true, nome: true } },
        pedido: { select: { id: true, mesaId: true, status: true } },
      },
    })
    if (!item) throw erro(404, 'Item não encontrado')

    const permitidos = TRANSICOES[item.status] ?? []
    if (!permitidos.includes(destino)) {
      throw erro(409, `Não é possível mudar de "${item.status}" para "${destino}"`)
    }

    const atualizado = await tx.pedidoItem.update({
      where: { id: itemId },
      data: { status: destino as any },
    })

    // Promove o pedido conforme o andamento dos itens.
    const contagem = await tx.pedidoItem.groupBy({
      by: ['status'],
      where: { pedidoId: item.pedido.id },
      _count: true,
    })
    const por = Object.fromEntries(contagem.map((c) => [c.status, c._count]))
    const ativos = (por.pendente ?? 0) + (por.preparando ?? 0)
    const novoStatus =
      ativos > 0 ? (por.preparando ? 'preparando' : 'aberto') : por.pronto ? 'pronto' : 'aberto'

    if (novoStatus !== item.pedido.status && STATUS_ABERTOS.includes(item.pedido.status as any)) {
      await tx.pedido.update({ where: { id: item.pedido.id }, data: { status: novoStatus as any } })
    }

    const conta = await contaDoPedido(tx, item.pedido.id)
    return { item, atualizado, conta }
  })

  emitir(tenantId).item(EVENTOS.item.statusAlterado, {
    comandaId: resultado.item.pedido.mesaId!,
    pedidoId: resultado.item.pedido.id,
    itemId,
    produtoId: resultado.item.produto.id,
    produtoNome: resultado.item.produto.nome,
    quantidade: resultado.item.quantidade,
    status: destino,
    vaiCozinha: true,
    rodada: resultado.item.rodada,
    totalCentavos: resultado.conta.totalCentavos,
  })

  return resultado.atualizado
}

// ── Internos ───────────────────────────────────────────────────────────────

async function contaDoPedido(tx: any, pedidoId: string) {
  const pedido = await tx.pedido.findFirst({
    where: { id: pedidoId },
    include: includeParaConta,
  })
  if (!pedido) throw erro(404, 'Pedido não encontrado')
  return calcularConta({
    itens: pedido.itens,
    abatimentos: pedido.abatimentos,
    pagamentos: pedido.pagamentos,
    taxaPct: Number(pedido.taxaPct),
  })
}

async function notificarComanda(tenantId: string, mesaId: string | null) {
  if (!mesaId) return
  const { resumoDaComanda } = await import('../mesas/mesas.service')
  const resumo = await resumoDaComanda(tenantId, mesaId)
  if (resumo) emitir(tenantId).comanda(EVENTOS.comanda.atualizada, resumo)
}

function erro(status: number, mensagem: string) {
  return Object.assign(new Error(mensagem), { status })
}
