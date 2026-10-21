import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma, comTenant, semEscopoDeTenant } from '../../lib/prisma'
import { EVENTOS } from '../../lib/eventos'
import { emitir } from '../../sockets/socket'
import { paraCentavos, paraDecimal, paraReais, centavosDoCliente } from '../../lib/money'
import { proximoNumero } from '../comandas/sequencia'
import { calcularConta, includeParaConta } from '../comandas/conta'
import { verificarAcessoTenant } from '../../middlewares/tenant.middleware'
import { registrarPagamento } from '../pagamentos/pagamentos.service'

/**
 * Delivery pelo cardápio online.
 *
 *   cliente monta o pedido no cardápio  →  PedidoOnline `recebido`
 *   caixa aceita                        →  vira Pedido (sem mesa); itens de
 *                                          categoria "vai cozinha" entram na fila
 *   cozinha termina                     →  `pronto` (derivado dos itens)
 *   saiu para entrega                   →  `em_rota`
 *   entregue/retirado e pago            →  `entregue` (pagamento no caixa)
 *
 * O cardápio só recebe pedidos com o recurso no plano (Plano.delivery), o
 * delivery ligado em Configurações e o caixa aberto.
 */

export type ItemPedidoOnline = { produtoId: string; nome: string; quantidade: number; preco: number; observacao?: string | null }

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function novoCodigo() {
  const b = crypto.randomBytes(6)
  return [...b].map((x) => ALFABETO[x % ALFABETO.length]).join('')
}

const erro = (status: number, mensagem: string) => Object.assign(new Error(mensagem), { status })

// ─── Situação do cardápio ──────────────────────────────────────────────────────

async function tenantPorSlug(slug: string) {
  return semEscopoDeTenant(async () => await prisma.tenant.findUnique({
    where: { slug: slug.trim().toLowerCase() },
    select: { id: true, nome: true, slug: true, status: true, plano: { select: { delivery: true } } },
  }))
}

/** Aberto para pedidos agora? Devolve o motivo quando não. */
async function situacao(tenant: { id: string; status: string; plano: { delivery: boolean } | null }) {
  const acesso = await verificarAcessoTenant(tenant.id)
  const [cfg, caixa] = await comTenant(tenant.id, async () => Promise.all([
    prisma.configuracoes.findFirst({ where: { tenantId: tenant.id } }),
    prisma.caixa.findFirst({ where: { tenantId: tenant.id, status: 'aberto' }, select: { id: true } }),
  ]))
  let motivo: string | null = null
  if (!tenant.plano?.delivery || !acesso.ok) motivo = 'Este restaurante não está recebendo pedidos online.'
  else if (!cfg?.deliveryAtivo) motivo = 'O restaurante pausou os pedidos online.'
  else if (!caixa) motivo = 'O restaurante está fechado agora. Tente mais tarde.'
  return { aberto: !motivo, motivo, cfg }
}

// ─── Público: cardápio, pedido e acompanhamento ────────────────────────────────

export async function cardapio(slug: string) {
  const tenant = await tenantPorSlug(slug)
  if (!tenant || !tenant.plano?.delivery) throw erro(404, 'Cardápio não encontrado')
  const { aberto, motivo, cfg } = await situacao(tenant)

  const produtos = await comTenant(tenant.id, async () => await prisma.produto.findMany({
    where: { tenantId: tenant.id, ativo: true },
    orderBy: [{ nome: 'asc' }],
    select: {
      id: true, nome: true, descricao: true, preco: true, imagemUrl: true,
      gerenciarEstoque: true, estoqueAtual: true,
      categoria: { select: { id: true, nome: true } },
    },
  }))

  const porCategoria = new Map<string, { id: string; nome: string; produtos: any[] }>()
  for (const p of produtos) {
    const cat = p.categoria ?? { id: 'outros', nome: 'Outros' }
    if (!porCategoria.has(cat.id)) porCategoria.set(cat.id, { ...cat, produtos: [] })
    porCategoria.get(cat.id)!.produtos.push({
      id: p.id, nome: p.nome, descricao: p.descricao, preco: Number(p.preco), imagemUrl: p.imagemUrl,
      esgotado: p.gerenciarEstoque && Number(p.estoqueAtual) <= 0,
    })
  }

  return {
    restaurante: { nome: cfg?.nomeRestaurante || tenant.nome, slug: tenant.slug, logo: cfg?.logoBase64 ?? null },
    aberto, motivo,
    entrega: cfg?.deliveryEntrega ?? true,
    retirada: cfg?.deliveryRetirada ?? true,
    taxaEntrega: Number(cfg?.deliveryTaxa ?? 0),
    pedidoMinimo: Number(cfg?.deliveryPedidoMinimo ?? 0),
    tempoMin: cfg?.deliveryTempoMin ?? 40,
    mensagem: cfg?.deliveryMensagem ?? null,
    categorias: [...porCategoria.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  }
}

export interface NovoPedidoOnline {
  tipo: 'entrega' | 'retirada'
  clienteNome: string
  clienteTelefone: string
  endereco?: string; numero?: string; bairro?: string; complemento?: string; referencia?: string
  formaPagamento: 'dinheiro' | 'cartao' | 'pix'
  trocoPara?: number | null
  observacao?: string
  itens: { produtoId: string; quantidade: number; observacao?: string }[]
}

export async function criarPedido(slug: string, d: NovoPedidoOnline) {
  const tenant = await tenantPorSlug(slug)
  if (!tenant || !tenant.plano?.delivery) throw erro(404, 'Cardápio não encontrado')
  const { aberto, motivo, cfg } = await situacao(tenant)
  if (!aberto) throw erro(409, motivo!)
  if (d.tipo === 'entrega' && cfg?.deliveryEntrega === false) throw erro(400, 'Este restaurante não faz entregas')
  if (d.tipo === 'retirada' && cfg?.deliveryRetirada === false) throw erro(400, 'Este restaurante não aceita retirada')
  if (d.tipo === 'entrega' && (!d.endereco?.trim() || !d.numero?.trim() || !d.bairro?.trim()))
    throw erro(400, 'Informe rua, número e bairro para a entrega')

  const ids = [...new Set(d.itens.map((i) => i.produtoId))]
  const produtos = await comTenant(tenant.id, async () => await prisma.produto.findMany({
    where: { tenantId: tenant.id, id: { in: ids }, ativo: true },
    select: { id: true, nome: true, preco: true, gerenciarEstoque: true, estoqueAtual: true },
  }))
  const porId = new Map(produtos.map((p) => [p.id, p]))

  // Preço SEMPRE do banco — nunca o que o navegador mandou
  const itens: ItemPedidoOnline[] = d.itens.map((i) => {
    const p = porId.get(i.produtoId)
    if (!p) throw erro(409, 'Um dos produtos não está mais disponível. Atualize o cardápio.')
    const qtd = Math.trunc(Number(i.quantidade))
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 99) throw erro(400, `Quantidade inválida de ${p.nome}`)
    if (p.gerenciarEstoque && Number(p.estoqueAtual) < qtd) throw erro(409, `${p.nome} esgotou ou tem menos unidades que o pedido`)
    return { produtoId: p.id, nome: p.nome, quantidade: qtd, preco: Number(p.preco), observacao: i.observacao?.trim().slice(0, 140) || null }
  })
  const subtotalCent = itens.reduce((s, i) => s + paraCentavos(i.preco) * i.quantidade, 0)
  const minimoCent = paraCentavos(cfg?.deliveryPedidoMinimo ?? 0)
  if (subtotalCent < minimoCent) throw erro(400, `Pedido mínimo de R$ ${paraReais(minimoCent).toFixed(2).replace('.', ',')}`)
  const entregaCent = d.tipo === 'entrega' ? paraCentavos(cfg?.deliveryTaxa ?? 0) : 0
  const totalCent = subtotalCent + entregaCent

  let trocoPara: Prisma.Decimal | null = null
  if (d.formaPagamento === 'dinheiro' && d.trocoPara != null && d.trocoPara !== 0) {
    const t = centavosDoCliente(d.trocoPara, 'Troco para')
    if (t < totalCent) throw erro(400, 'O valor para troco precisa ser maior que o total')
    trocoPara = paraDecimal(t)
  }

  let criado: any = null
  for (let tentativa = 0; tentativa < 5 && !criado; tentativa++) {
    try {
      criado = await comTenant(tenant.id, async () => await prisma.pedidoOnline.create({
        data: {
          tenantId: tenant.id,
          codigo: novoCodigo(),
          tipo: d.tipo,
          clienteNome: d.clienteNome.trim().slice(0, 80),
          clienteTelefone: d.clienteTelefone.replace(/\D/g, '').slice(0, 13),
          endereco: d.tipo === 'entrega' ? d.endereco!.trim().slice(0, 140) : null,
          numero: d.tipo === 'entrega' ? d.numero!.trim().slice(0, 20) : null,
          bairro: d.tipo === 'entrega' ? d.bairro!.trim().slice(0, 80) : null,
          complemento: d.complemento?.trim().slice(0, 80) || null,
          referencia: d.referencia?.trim().slice(0, 140) || null,
          itens: itens as any,
          subtotal: paraDecimal(subtotalCent),
          taxaEntrega: paraDecimal(entregaCent),
          total: paraDecimal(totalCent),
          formaPagamento: d.formaPagamento,
          trocoPara,
          observacao: d.observacao?.trim().slice(0, 300) || null,
        },
      }))
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e // colisão de código: tenta outro
    }
  }
  if (!criado) throw erro(500, 'Não foi possível registrar o pedido. Tente de novo.')

  emitir(tenant.id).delivery(EVENTOS.delivery.recebido, payload(criado))
  return { codigo: criado.codigo }
}

/** Página de acompanhamento do cliente (pelo código). */
export async function acompanhar(codigo: string) {
  const po = await semEscopoDeTenant(async () => await prisma.pedidoOnline.findUnique({
    where: { codigo: codigo.trim().toUpperCase() },
    include: {
      tenant: { select: { nome: true, slug: true } },
      pedido: { select: { itens: { select: { status: true, produto: { select: { categoria: { select: { vaiCozinha: true } } } } } } } },
    },
  }))
  if (!po) throw erro(404, 'Pedido não encontrado')
  const cfg = await comTenant(po.tenantId, async () => await prisma.configuracoes.findFirst({
    where: { tenantId: po.tenantId }, select: { nomeRestaurante: true, deliveryTempoMin: true, logoBase64: true },
  }))
  return {
    codigo: po.codigo,
    status: etapa(po),
    tipo: po.tipo,
    restaurante: { nome: cfg?.nomeRestaurante || po.tenant.nome, slug: po.tenant.slug, logo: cfg?.logoBase64 ?? null },
    tempoMin: cfg?.deliveryTempoMin ?? 40,
    clienteNome: po.clienteNome.split(' ')[0],
    itens: (po.itens as ItemPedidoOnline[]).map((i) => ({ nome: i.nome, quantidade: i.quantidade, preco: i.preco })),
    subtotal: Number(po.subtotal), taxaEntrega: Number(po.taxaEntrega), total: Number(po.total),
    formaPagamento: po.formaPagamento, trocoPara: po.trocoPara === null ? null : Number(po.trocoPara),
    motivoRecusa: po.motivoRecusa,
    linhaDoTempo: { recebido: po.createdAt, aceito: po.aceitoEm, pronto: po.prontoEm ?? prontoPelaCozinha(po), em_rota: po.saiuEm, entregue: po.entregueEm },
  }
}

// ─── Caixa ─────────────────────────────────────────────────────────────────────

type ComPedido = Prisma.PedidoOnlineGetPayload<{ include: { pedido: { select: { numero: true; itens: { select: { status: true; produto: { select: { categoria: { select: { vaiCozinha: true } } } } } } } } } }>

/** Itens da cozinha todos prontos (ou não há cozinha): o pedido está pronto. */
function prontoPelaCozinha(po: { aceitoEm: Date | null; pedido?: { itens: { status: string; produto: { categoria: { vaiCozinha: boolean } | null } }[] } | null }) {
  if (!po.pedido) return null
  const daCozinha = po.pedido.itens.filter((i) => i.status !== 'cancelado' && i.produto.categoria?.vaiCozinha)
  return daCozinha.every((i) => i.status === 'pronto' || i.status === 'entregue') ? po.aceitoEm : null
}

/** Etapa mostrada: `aceito` vira `pronto` quando a cozinha termina. */
function etapa(po: any): string {
  if (po.status === 'aceito' && prontoPelaCozinha(po)) return 'pronto'
  if (po.status === 'aceito' && po.pedido?.itens?.some((i: any) => i.status === 'preparando')) return 'preparando'
  return po.status
}

const payload = (po: any) => ({
  id: po.id, codigo: po.codigo, status: po.status, tipo: po.tipo, clienteNome: po.clienteNome, totalCentavos: paraCentavos(po.total),
})

const includeCaixa = {
  pedido: { select: { numero: true, itens: { select: { status: true, produto: { select: { categoria: { select: { vaiCozinha: true } } } } } } } },
} as const

function paraCaixa(po: ComPedido) {
  return {
    id: po.id, codigo: po.codigo, status: po.status, etapa: etapa(po), tipo: po.tipo,
    clienteNome: po.clienteNome, clienteTelefone: po.clienteTelefone,
    endereco: po.endereco, numero: po.numero, bairro: po.bairro, complemento: po.complemento, referencia: po.referencia,
    itens: po.itens, subtotal: Number(po.subtotal), taxaEntrega: Number(po.taxaEntrega), total: Number(po.total),
    formaPagamento: po.formaPagamento, trocoPara: po.trocoPara === null ? null : Number(po.trocoPara),
    observacao: po.observacao, motivoRecusa: po.motivoRecusa,
    pedidoNumero: po.pedido?.numero ?? null,
    criadoEm: po.createdAt, aceitoEm: po.aceitoEm, saiuEm: po.saiuEm, entregueEm: po.entregueEm,
  }
}

/** Em andamento (todos) + finalizados das últimas 12 h. */
export async function listar(tenantId: string) {
  const desde = new Date(Date.now() - 12 * 3600_000)
  const lista = await prisma.pedidoOnline.findMany({
    where: {
      tenantId,
      OR: [
        { status: { in: ['recebido', 'aceito', 'pronto', 'em_rota'] } },
        { updatedAt: { gte: desde } },
      ],
    },
    include: includeCaixa,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return lista.map(paraCaixa)
}

async function buscar(tenantId: string, id: string) {
  const po = await prisma.pedidoOnline.findFirst({ where: { tenantId, id }, include: includeCaixa })
  if (!po) throw erro(404, 'Pedido não encontrado')
  return po
}

/** Aceitar: cria o Pedido (sem mesa) com os preços do momento do pedido; a cozinha recebe os itens. */
export async function aceitar(tenantId: string, id: string, usuarioId: string) {
  const resultado = await prisma.$transaction(async (tx) => {
    const po = await tx.pedidoOnline.findFirst({ where: { tenantId, id } })
    if (!po) throw erro(404, 'Pedido não encontrado')
    if (po.status !== 'recebido') throw erro(409, 'Este pedido já foi respondido')
    const caixa = await tx.caixa.findFirst({ where: { tenantId, status: 'aberto' }, select: { id: true } })
    if (!caixa) throw erro(409, 'Abra o caixa para aceitar pedidos')

    const itens = po.itens as ItemPedidoOnline[]
    const produtos = await tx.produto.findMany({
      where: { tenantId, id: { in: itens.map((i) => i.produtoId) } },
      select: { id: true, nome: true, gerenciarEstoque: true, categoria: { select: { vaiCozinha: true } } },
    })
    const porId = new Map(produtos.map((p) => [p.id, p]))

    const pedido = await tx.pedido.create({
      data: {
        mesaId: null,
        garcomId: usuarioId,
        status: 'aberto',
        taxaPct: 0,
        taxaEntrega: po.taxaEntrega,
        numero: await proximoNumero(tx, tenantId, 'pedido'),
        observacoes: `${po.tipo === 'entrega' ? 'Delivery' : 'Retirada'} ${po.codigo} · ${po.clienteNome}`,
      } as any,
    })

    const lancados: any[] = []
    let rodada = 1
    for (const i of itens) {
      const p = porId.get(i.produtoId)
      if (!p) throw erro(409, `${i.nome} não existe mais no cardápio`)
      if (p.gerenciarEstoque) {
        const afetadas = await tx.$executeRaw`
          UPDATE produtos SET estoque_atual = estoque_atual - ${i.quantidade}
           WHERE id = ${p.id} AND tenant_id = ${tenantId} AND gerenciar_estoque = true AND estoque_atual >= ${i.quantidade}`
        if (afetadas === 0) throw erro(409, `Estoque insuficiente de ${i.nome}`)
        await tx.movimentacaoEstoque.create({
          data: { produtoId: p.id, tipo: 'saida', quantidade: i.quantidade, motivo: `Delivery ${po.codigo}`, usuarioId } as any,
        })
      }
      const vaiCozinha = Boolean(p.categoria?.vaiCozinha)
      const item = await tx.pedidoItem.create({
        data: {
          pedidoId: pedido.id, produtoId: p.id, rodada, quantidade: i.quantidade,
          // Preço que o cliente viu no cardápio
          precoUnitario: new Prisma.Decimal(i.preco),
          precoTotal: paraDecimal(paraCentavos(i.preco) * i.quantidade),
          status: vaiCozinha ? 'pendente' : 'pronto',
          observacao: i.observacao || null,
          lancadoPorId: usuarioId,
        } as any,
      })
      lancados.push({ item, produtoNome: p.nome, vaiCozinha, rodada })
      rodada++
    }

    const atualizado = await tx.pedidoOnline.update({
      where: { id: po.id },
      data: { status: 'aceito', pedidoId: pedido.id, aceitoPorId: usuarioId, aceitoEm: new Date() },
      include: includeCaixa,
    })
    return { atualizado, pedido, lancados }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  const e = emitir(tenantId)
  const totalCentavos = paraCentavos(resultado.atualizado.total)
  for (const l of resultado.lancados) {
    e.item(EVENTOS.item.lancado, {
      comandaId: resultado.pedido.id, pedidoId: resultado.pedido.id, itemId: l.item.id, produtoId: l.item.produtoId,
      produtoNome: l.produtoNome, quantidade: l.item.quantidade, status: l.item.status, vaiCozinha: l.vaiCozinha,
      rodada: l.rodada, totalCentavos,
    })
  }
  e.delivery(EVENTOS.delivery.atualizado, payload(resultado.atualizado))
  return paraCaixa(resultado.atualizado)
}

export async function recusar(tenantId: string, id: string, motivo: string) {
  const po = await buscar(tenantId, id)
  if (po.status !== 'recebido') throw erro(409, 'Só dá para recusar antes de aceitar')
  const atualizado = await prisma.pedidoOnline.update({
    where: { id }, data: { status: 'recusado', motivoRecusa: motivo.trim().slice(0, 200), canceladoEm: new Date() }, include: includeCaixa,
  })
  emitir(tenantId).delivery(EVENTOS.delivery.atualizado, payload(atualizado))
  return paraCaixa(atualizado)
}

/** Saiu para entrega (só entrega; retirada vai direto para concluir). */
export async function saiu(tenantId: string, id: string) {
  const po = await buscar(tenantId, id)
  if (po.tipo !== 'entrega') throw erro(400, 'Pedido para retirada não sai para entrega')
  if (po.status !== 'aceito' && po.status !== 'pronto') throw erro(409, 'Aceite o pedido antes')
  const atualizado = await prisma.pedidoOnline.update({
    where: { id }, data: { status: 'em_rota', saiuEm: new Date(), prontoEm: po.prontoEm ?? new Date() }, include: includeCaixa,
  })
  emitir(tenantId).delivery(EVENTOS.delivery.atualizado, payload(atualizado))
  return paraCaixa(atualizado)
}

/**
 * Entregue/retirado: registra o pagamento do total no caixa (mesma regra de
 * /pagamentos: troco só em dinheiro) e fecha o pedido.
 */
export async function concluir(tenantId: string, id: string, d: { metodoId: string; valorRecebido?: number; idempotencyKey: string }, usuarioId: string) {
  const po = await buscar(tenantId, id)
  if (!['aceito', 'pronto', 'em_rota'].includes(po.status) || !po.pedidoId) throw erro(409, 'Pedido não está em andamento')

  const pedido = await prisma.pedido.findFirst({ where: { tenantId, id: po.pedidoId }, include: includeParaConta })
  const conta = calcularConta({ itens: pedido!.itens, abatimentos: pedido!.abatimentos, pagamentos: pedido!.pagamentos, taxaPct: Number(pedido!.taxaPct), taxaEntrega: pedido!.taxaEntrega })
  if (conta.restanteCentavos > 0) {
    await registrarPagamento(tenantId, {
      idempotencyKey: d.idempotencyKey, pedidoId: po.pedidoId, metodoId: d.metodoId,
      valorPago: paraReais(conta.restanteCentavos), valorRecebido: d.valorRecebido, usuarioId,
    } as any)
  }
  await prisma.pedido.update({ where: { id: po.pedidoId }, data: { status: 'fechado', fechadoEm: new Date() } })
  const atualizado = await prisma.pedidoOnline.update({
    where: { id }, data: { status: 'entregue', entregueEm: new Date(), prontoEm: po.prontoEm ?? new Date() }, include: includeCaixa,
  })
  emitir(tenantId).delivery(EVENTOS.delivery.atualizado, payload(atualizado))
  return paraCaixa(atualizado)
}

// ─── Configurações do delivery ─────────────────────────────────────────────────

export async function config(tenantId: string) {
  const [tenant, cfg] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, plano: { select: { nome: true, delivery: true } } } }),
    prisma.configuracoes.findFirst({ where: { tenantId } }),
  ])
  return {
    disponivel: Boolean(tenant?.plano?.delivery),
    plano: tenant?.plano?.nome ?? null,
    slug: tenant?.slug,
    ativo: cfg?.deliveryAtivo ?? false,
    entrega: cfg?.deliveryEntrega ?? true,
    retirada: cfg?.deliveryRetirada ?? true,
    taxaEntrega: Number(cfg?.deliveryTaxa ?? 0),
    pedidoMinimo: Number(cfg?.deliveryPedidoMinimo ?? 0),
    tempoMin: cfg?.deliveryTempoMin ?? 40,
    mensagem: cfg?.deliveryMensagem ?? '',
  }
}

export async function salvarConfig(tenantId: string, d: {
  ativo?: boolean; entrega?: boolean; retirada?: boolean; taxaEntrega?: number; pedidoMinimo?: number; tempoMin?: number; mensagem?: string | null
}) {
  const atual = await config(tenantId)
  if (d.ativo && !atual.disponivel) throw erro(403, 'Delivery não está incluído no seu plano')
  if (d.entrega === false && d.retirada === false) throw erro(400, 'Deixe ao menos entrega ou retirada')
  await prisma.configuracoes.updateMany({
    where: { tenantId },
    data: {
      ...(d.ativo !== undefined ? { deliveryAtivo: d.ativo } : {}),
      ...(d.entrega !== undefined ? { deliveryEntrega: d.entrega } : {}),
      ...(d.retirada !== undefined ? { deliveryRetirada: d.retirada } : {}),
      ...(d.taxaEntrega !== undefined ? { deliveryTaxa: paraDecimal(centavosDoCliente(d.taxaEntrega, 'Taxa de entrega')) } : {}),
      ...(d.pedidoMinimo !== undefined ? { deliveryPedidoMinimo: paraDecimal(centavosDoCliente(d.pedidoMinimo, 'Pedido mínimo')) } : {}),
      ...(d.tempoMin !== undefined ? { deliveryTempoMin: Math.min(240, Math.max(5, Math.trunc(d.tempoMin))) } : {}),
      ...(d.mensagem !== undefined ? { deliveryMensagem: d.mensagem?.trim().slice(0, 200) || null } : {}),
    },
  })
  return config(tenantId)
}
