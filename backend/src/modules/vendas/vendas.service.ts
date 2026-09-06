import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { EVENTOS } from '../../lib/eventos'
import { emitir } from '../../sockets/socket'
import { paraDecimal, paraCentavos, paraReais, centavosDoCliente } from '../../lib/money'
import { calcularConta, includeParaConta, contaParaJson } from '../comandas/conta'
import { proximoNumero } from '../comandas/sequencia'

/**
 * Venda direta (balcão).
 *
 * A versão anterior vivia inteira dentro do arquivo de rota, quebrando o
 * padrão routes/service usado nos outros 15 módulos, e tinha três defeitos
 * sérios:
 *
 * 1. PREÇO VINDO DO CLIENTE.
 *        const subtotal = itens.reduce((s,i) => s + Number(i.precoUnit) * i.quantidade, 0)
 *    Os itens eram gravados com `produto.preco` do banco, mas o valor cobrado,
 *    o pagamento e o movimento de caixa usavam o subtotal enviado pelo
 *    navegador. Um POST manipulado cobrava R$ 1,00 por um prato de R$ 80,00 e
 *    ainda assim gravava a linha do item corretamente — a divergência só
 *    aparecia somando os itens contra o pagamento.
 *
 * 2. NÚMERO DE FICHA EFÊMERO.
 *        const numero = `F${Date.now()}`
 *    Não era persistido em lugar nenhum. Não havia como reimprimir nem
 *    localizar a venda pelo número entregue ao cliente. Agora usa a sequência
 *    por tenant, a mesma dos pedidos de mesa.
 *
 * 3. SEM IDEMPOTÊNCIA. Mesmo problema de /pagamentos: duplo toque gravava
 *    duas vendas e dois movimentos de caixa.
 *
 * Também passa a aplicar taxa de serviço quando configurada e a baixar
 * estoque com decremento condicional atômico, igual ao lançamento em mesa.
 */

interface ItemEntrada {
  produtoId: string
  quantidade: number
  observacao?: string
}

interface VendaInput {
  idempotencyKey: string
  itens: ItemEntrada[]
  metodoId: string
  valorRecebido?: number
  cliente?: string
  usuarioId: string
}

export async function registrarVenda(tenantId: string, input: VendaInput) {
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    throw erro(400, 'idempotencyKey ausente ou inválida')
  }
  if (!Array.isArray(input.itens) || input.itens.length === 0) {
    throw erro(400, 'Informe ao menos um item')
  }

  // Retry devolve a venda anterior em vez de criar outra.
  const anterior = await prisma.pagamento.findFirst({
    where: { idempotencyKey: input.idempotencyKey },
    include: { pedido: { include: includeParaConta } },
  })
  if (anterior) return montarResposta(anterior.pedido, anterior, true)

  let criado
  try {
    criado = await prisma.$transaction(
      async (tx) => {
        const caixa = await tx.caixa.findFirst({ where: { status: 'aberto' } })
        if (!caixa) throw erro(409, 'Nenhum caixa aberto')

        const metodo = await tx.metodoPagamento.findFirst({
          where: { id: input.metodoId, ativo: true },
        })
        if (!metodo) throw erro(400, 'Forma de pagamento inválida ou desativada')

        // Um único findMany para todos os produtos — a versão anterior
        // consultava dentro do loop.
        const ids = [...new Set(input.itens.map((i) => i.produtoId))]
        const produtos = await tx.produto.findMany({
          where: { id: { in: ids }, ativo: true },
          include: { categoria: { select: { vaiCozinha: true } } },
        })
        const porId = new Map(produtos.map((p) => [p.id, p]))

        for (const id of ids) {
          if (!porId.has(id)) throw erro(404, 'Produto não encontrado ou inativo')
        }

        const cfg = await tx.configuracoes.findFirst({ select: { taxaServicoPct: true } })

        const pedido = await tx.pedido.create({
          data: {
            mesaId: null,
            garcomId: input.usuarioId,
            status: 'aberto',
            // Taxa de serviço não se aplica a balcão por padrão. Se a casa
            // cobrar, troque por Number(cfg?.taxaServicoPct ?? 0).
            taxaPct: 0,
            numero: await proximoNumero(tx, tenantId, 'pedido'),
            observacoes: input.cliente?.trim() ? `Cliente: ${input.cliente.trim()}` : null,
          } as any,
        })

        let rodada = 1
        for (const item of input.itens) {
          const produto = porId.get(item.produtoId)!
          const qtd = Math.trunc(Number(item.quantidade))
          if (!Number.isInteger(qtd) || qtd < 1 || qtd > 999) {
            throw erro(400, `Quantidade inválida para ${produto.nome}`)
          }

          if (produto.gerenciarEstoque) {
            const afetadas = await tx.$executeRaw`
              UPDATE produtos
                 SET estoque_atual = estoque_atual - ${qtd}
               WHERE id = ${produto.id}
                 AND tenant_id = ${tenantId}
                 AND gerenciar_estoque = true
                 AND estoque_atual >= ${qtd}
            `
            if (afetadas === 0) {
              throw erro(409, `Estoque insuficiente de ${produto.nome}`)
            }
            await tx.movimentacaoEstoque.create({
              data: {
                produtoId: produto.id,
                tipo: 'saida',
                quantidade: qtd,
                motivo: `Venda balcão #${pedido.numero}`,
                usuarioId: input.usuarioId,
              } as any,
            })
          }

          // PREÇO DO BANCO. Nunca o que veio no corpo da requisição.
          const unitCent = paraCentavos(produto.preco)
          await tx.pedidoItem.create({
            data: {
              pedidoId: pedido.id,
              produtoId: produto.id,
              rodada,
              quantidade: qtd,
              precoUnitario: produto.preco,
              precoTotal: paraDecimal(unitCent * qtd),
              status: produto.categoria?.vaiCozinha ? 'pendente' : 'pronto',
              observacao: item.observacao?.trim() || null,
              lancadoPorId: input.usuarioId,
            } as any,
          })
          rodada++
        }

        // Total recalculado a partir do que foi efetivamente gravado.
        const comItens = await tx.pedido.findFirst({
          where: { id: pedido.id },
          include: includeParaConta,
        })
        const conta = calcularConta({
          itens: comItens!.itens,
          abatimentos: comItens!.abatimentos,
          pagamentos: comItens!.pagamentos,
          taxaPct: Number(comItens!.taxaPct),
        })

        const recebidoCent =
          input.valorRecebido !== undefined
            ? centavosDoCliente(input.valorRecebido, 'Valor recebido')
            : conta.totalCentavos

        const ehDinheiro = metodo.nome.toLowerCase().includes('dinheiro')
        if (recebidoCent < conta.totalCentavos) {
          throw erro(400, 'Valor recebido menor que o total da venda')
        }
        if (!ehDinheiro && recebidoCent !== conta.totalCentavos) {
          throw erro(400, `Troco só é possível em dinheiro. ${metodo.nome} exige valor exato.`)
        }

        const trocoCent = recebidoCent - conta.totalCentavos

        const pagamento = await tx.pagamento.create({
          data: {
            idempotencyKey: input.idempotencyKey,
            mesaId: null,
            pedidoId: pedido.id,
            metodoId: input.metodoId,
            valor: paraDecimal(conta.totalCentavos),
            valorRecebido: paraDecimal(recebidoCent),
            troco: paraDecimal(trocoCent),
            caixaId: caixa.id,
            usuarioId: input.usuarioId,
            status: 'confirmado',
          } as any,
        })

        await tx.movimentoCaixa.create({
          data: {
            caixaId: caixa.id,
            tipo: 'pagamento',
            valor: paraDecimal(conta.totalCentavos),
            descricao: `Balcão #${pedido.numero} · ${metodo.nome}`,
            usuarioId: input.usuarioId,
          } as any,
        })

        await tx.pedido.update({
          where: { id: pedido.id },
          data: { status: 'fechado', fechadoEm: new Date() },
        })

        return { pedido, pagamento, conta, trocoCent, temCozinha: comItens!.itens.length > 0, metodoNome: metodo.nome }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  } catch (e: any) {
    if (e?.code === 'P2002') {
      const existente = await prisma.pagamento.findFirst({
        where: { idempotencyKey: input.idempotencyKey },
        include: { pedido: { include: includeParaConta } },
      })
      if (existente) return montarResposta(existente.pedido, existente, true)
    }
    throw e
  }

  emitir(tenantId).pagamento(EVENTOS.pagamento.registrado, {
    comandaId: null,
    pedidoId: criado.pedido.id,
    pagamentoId: criado.pagamento.id,
    metodoNome: criado.metodoNome,
    valorCentavos: criado.conta.totalCentavos,
    restanteCentavos: 0,
    quitado: true,
  })

  return {
    pedido_id: criado.pedido.id,
    // Número sequencial persistido, não mais `F${Date.now()}` descartável.
    numero: criado.pedido.numero,
    ficha: `B${String(criado.pedido.numero).padStart(5, '0')}`,
    total: paraReais(criado.conta.totalCentavos),
    troco: paraReais(criado.trocoCent),
    conta: contaParaJson(criado.conta),
    repetido: false,
  }
}

function montarResposta(pedido: any, pagamento: any, repetido: boolean) {
  const conta = calcularConta({
    itens: pedido.itens,
    abatimentos: pedido.abatimentos,
    pagamentos: pedido.pagamentos,
    taxaPct: Number(pedido.taxaPct),
  })
  return {
    pedido_id: pedido.id,
    numero: pedido.numero,
    ficha: `B${String(pedido.numero).padStart(5, '0')}`,
    total: paraReais(conta.totalCentavos),
    troco: Number(pagamento.troco),
    conta: contaParaJson(conta),
    repetido,
  }
}

function erro(status: number, mensagem: string) {
  return Object.assign(new Error(mensagem), { status })
}
