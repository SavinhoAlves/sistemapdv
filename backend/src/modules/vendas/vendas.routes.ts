import type { FastifyInstance } from 'fastify'
import type { TenantJwtPayload } from '../../lib/jwt'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import { prisma } from '../../lib/prisma'
import { emitParaTenant } from '../../sockets/socket'

export async function vendasRoutes(app: FastifyInstance) {
  // POST /api/vendas — venda direta (balcão, sem mesa)
  app.post('/', { preHandler: [requireTenant, requirePermissao('abrirCaixa')] }, async (request, reply) => {
    const auth   = request.auth as TenantJwtPayload
    const tenantId = request.tenantId!
    const body   = request.body as any
    const { itens, metodoId, desconto = 0, valorPago } = body

    if (!Array.isArray(itens) || !itens.length) {
      return reply.status(400).send({ error: 'Adicione pelo menos um produto' })
    }
    if (!metodoId) {
      return reply.status(400).send({ error: 'Selecione a forma de pagamento' })
    }

    try {
      const ficha = await prisma.$transaction(async (tx) => {
        // 1. Verifica caixa aberto
        const caixa = await tx.caixa.findFirst({ where: { tenantId, status: 'aberto' } })
        if (!caixa) throw Object.assign(new Error('Caixa fechado — abra o caixa antes de registrar vendas'), { status: 400 })

        // 2. Método de pagamento
        const metodo = await tx.metodoPagamento.findFirst({ where: { id: metodoId, tenantId } })
        if (!metodo) throw Object.assign(new Error('Método de pagamento inválido'), { status: 400 })

        // 3. Calcula totais
        const subtotal = itens.reduce((s: number, i: any) => s + Number(i.precoUnit) * Number(i.quantidade), 0)
        const desc     = Math.min(Math.max(Number(desconto) || 0, 0), subtotal)
        const liquido  = subtotal - desc
        const pago     = Number(valorPago) || liquido
        const troco    = Math.max(0, pago - liquido)
        const numero   = `F${Date.now()}`

        // 4. Cria pedido (mesaId = null = venda direta, já fechado)
        const pedido = await tx.pedido.create({
          data: {
            tenantId,
            mesaId:  null,
            garcomId: auth.sub,
            status:  'fechado',
            total:   subtotal,
            desconto: desc,
            taxaPct: 0,
          },
        })

        // 5. Insere itens
        for (const item of itens) {
          const produto = await tx.produto.findFirst({
            where: { id: item.produtoId || item.produto_id, tenantId, ativo: true },
          })
          if (!produto) throw Object.assign(new Error(`Produto não encontrado`), { status: 400 })

          const qtd = Number(item.quantidade)
          if (produto.gerenciarEstoque && Number(produto.estoqueAtual) < qtd) {
            throw Object.assign(new Error(`Estoque insuficiente: ${produto.nome}`), { status: 400 })
          }

          await tx.pedidoItem.create({
            data: {
              tenantId,
              pedidoId: pedido.id,
              produtoId: produto.id,
              quantidade: qtd,
              precoUnitario: produto.preco,
              precoTotal: Number(produto.preco) * qtd,
              status: 'pronto',
            },
          })

          if (produto.gerenciarEstoque) {
            await tx.produto.update({
              where: { id: produto.id, tenantId },
              data: { estoqueAtual: { decrement: qtd } },
            })
            await tx.movimentacaoEstoque.create({
              data: {
                tenantId,
                produtoId: produto.id,
                tipo: 'saida',
                quantidade: qtd,
                motivo: `Venda direta ${numero}`,
                usuarioId: auth.sub,
              },
            })
          }
        }

        // 6. Registra pagamento
        const pagamento = await tx.pagamento.create({
          data: {
            tenantId,
            mesaId:   null,
            pedidoId: pedido.id,
            metodoId,
            valor:    liquido,
            troco,
            caixaId:  caixa.id,
            usuarioId: auth.sub,
            status:   'confirmado',
          },
        })

        // 7. Movimento de caixa
        const nomesItens = itens.map((i: any) => `${i.quantidade}x ${i.nomeProduto || i.nome_produto || ''}`).join(', ')
        await tx.movimentoCaixa.create({
          data: {
            tenantId,
            caixaId:   caixa.id,
            tipo:      'pagamento',
            valor:     liquido,
            descricao: `${metodo.nome} · ${numero} · ${nomesItens}`.substring(0, 254),
            usuarioId: auth.sub,
          },
        })

        return {
          id:           numero,
          numero,
          pedidoId:     pedido.id,
          pagamentoId:  pagamento.id,
          itens,
          total:        subtotal,
          desconto:     desc,
          totalLiquido: liquido,
          valorPago:    pago,
          troco,
          metodo:       metodo.nome,
          operador:     auth.nome,
          createdAt:    new Date().toISOString(),
        }
      })

      emitParaTenant(tenantId).pagamentoRegistrado({ tipo: 'venda_direta', ficha })

      return reply.status(201).send({ success: true, ficha })
    } catch (err: any) {
      return reply.status(err.status || 500).send({ error: err.message })
    }
  })
}
