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
import { geocodificar, distancia, type Coordenadas } from '../../lib/geocodificar'
import { hojeLocal, inicioDoDia } from '../../lib/fuso'
import { vaiParaCozinha, camposCozinha } from '../../lib/cozinha'
import { enviarPush } from '../../lib/push'
import { registrarAuditoria } from '../../lib/auditoria'

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

/** Código de entrega: 4 dígitos que o cliente vê no acompanhamento e diz ao entregador. */
const codigoDeEntrega = () => String(crypto.randomInt(0, 10000)).padStart(4, '0')
const MAX_TENTATIVAS_CODIGO = 5

// ─── Situação do cardápio ──────────────────────────────────────────────────────

async function tenantPorSlug(slug: string) {
  return semEscopoDeTenant(async () => await prisma.tenant.findUnique({
    where: { slug: slug.trim().toLowerCase() },
    select: { id: true, nome: true, slug: true, status: true, deliveryDisponivel: true },
  }))
}

/** Aberto para pedidos agora? Devolve o motivo quando não. */
async function situacao(tenant: { id: string; status: string; deliveryDisponivel: boolean }) {
  const acesso = await verificarAcessoTenant(tenant.id)
  const [cfg, caixa] = await comTenant(tenant.id, async () => Promise.all([
    prisma.configuracoes.findFirst({ where: { tenantId: tenant.id } }),
    prisma.caixa.findFirst({ where: { tenantId: tenant.id, status: 'aberto' }, select: { id: true } }),
  ]))
  let motivo: string | null = null
  if (!tenant.deliveryDisponivel || !acesso.ok) motivo = 'Este restaurante não está recebendo pedidos online.'
  else if (!cfg?.deliveryAtivo) motivo = 'O restaurante pausou os pedidos online.'
  else if (!caixa) motivo = 'O restaurante está fechado agora. Tente mais tarde.'
  return { aberto: !motivo, motivo, cfg }
}

// ─── Público: cardápio, pedido e acompanhamento ────────────────────────────────

export async function cardapio(slug: string) {
  const tenant = await tenantPorSlug(slug)
  if (!tenant || !tenant.deliveryDisponivel) throw erro(404, 'Cardápio não encontrado')
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
  formaPagamento: 'dinheiro' | 'credito' | 'debito' | 'pix' | 'cartao'
  trocoPara?: number | null
  observacao?: string
  itens: { produtoId: string; quantidade: number; observacao?: string }[]
}

export async function criarPedido(slug: string, d: NovoPedidoOnline) {
  const tenant = await tenantPorSlug(slug)
  if (!tenant || !tenant.deliveryDisponivel) throw erro(404, 'Cardápio não encontrado')
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
          codigoEntrega: d.tipo === 'entrega' ? codigoDeEntrega() : null,
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
  if (criado.tipo === 'entrega') void localizarDestino(tenant.id, criado.id)
  return { codigo: criado.codigo }
}

/** Página de acompanhamento do cliente (pelo código). */
export async function acompanhar(codigo: string) {
  const po = await semEscopoDeTenant(async () => await prisma.pedidoOnline.findUnique({
    where: { codigo: codigo.trim().toUpperCase() },
    include: {
      entregador: { select: { id: true, nome: true } },
      tenant: { select: { nome: true, slug: true } },
      pedido: { select: { itens: { select: { status: true, produto: { select: camposCozinha } } } } },
    },
  }))
  if (!po) throw erro(404, 'Pedido não encontrado')
  const cfg = await comTenant(po.tenantId, async () => await prisma.configuracoes.findFirst({
    where: { tenantId: po.tenantId }, select: { nomeRestaurante: true, deliveryTempoMin: true, logoBase64: true, deliveryLat: true, deliveryLng: true },
  }))
  // Mapa do cliente: do aceite até a entrega. Em rota, onde está o entregador e
  // quantas entregas faltam antes desta (só a contagem: os endereços dos outros nunca saem daqui)
  let rota: any = null
  if (po.tipo === 'entrega' && ['aceito', 'pronto', 'em_rota'].includes(po.status) && !po.entregaConfirmadaEm) {
    const emRota = po.status === 'em_rota' && po.entregadorId
    const [posicao, antes] = emRota ? await comTenant(po.tenantId, async () => Promise.all([
      prisma.entregadorPosicao.findFirst({
        where: { tenantId: po.tenantId, usuarioId: po.entregadorId!, createdAt: { gte: new Date(Date.now() - 15 * 60000) } },
        orderBy: { createdAt: 'desc' }, select: { lat: true, lng: true, createdAt: true },
      }),
      prisma.pedidoOnline.count({
        where: { tenantId: po.tenantId, entregadorId: po.entregadorId, status: 'em_rota', entregaConfirmadaEm: null, ordemRota: { lt: po.ordemRota ?? 0 } },
      }),
    ])) : [null, 0]
    rota = {
      emRota: Boolean(emRota),
      entregador: emRota ? { nome: po.entregador?.nome.split(' ')[0] ?? 'Entregador', posicao: posicao ? { lat: posicao.lat, lng: posicao.lng, em: posicao.createdAt } : null } : null,
      paradasAntes: antes,
      destino: po.destinoLat != null ? { lat: po.destinoLat, lng: po.destinoLng } : null,
      restaurante: cfg?.deliveryLat != null ? { lat: cfg.deliveryLat, lng: cfg.deliveryLng } : null,
    }
  }
  return {
    codigo: po.codigo,
    status: po.entregaConfirmadaEm && po.status === 'em_rota' ? 'entregue' : etapa(po),
    rota,
    tipo: po.tipo,
    restaurante: { nome: cfg?.nomeRestaurante || po.tenant.nome, slug: po.tenant.slug, logo: cfg?.logoBase64 ?? null },
    tempoMin: cfg?.deliveryTempoMin ?? 40,
    clienteNome: po.clienteNome.split(' ')[0],
    itens: (po.itens as ItemPedidoOnline[]).map((i) => ({ nome: i.nome, quantidade: i.quantidade, preco: i.preco })),
    subtotal: Number(po.subtotal), taxaEntrega: Number(po.taxaEntrega), total: Number(po.total),
    formaPagamento: po.formaPagamento, trocoPara: po.trocoPara === null ? null : Number(po.trocoPara),
    motivoRecusa: po.motivoRecusa,
    // Só enquanto a entrega está em andamento: o cliente diz ao entregador
    codigoEntrega: ['aceito', 'pronto', 'em_rota'].includes(po.status) && !po.entregaConfirmadaEm ? po.codigoEntrega : null,
    linhaDoTempo: { recebido: po.createdAt, aceito: po.aceitoEm, pronto: po.prontoEm ?? prontoPelaCozinha(po), em_rota: po.saiuEm, entregue: po.entregaConfirmadaEm ?? po.entregueEm },
  }
}

// ─── Caixa ─────────────────────────────────────────────────────────────────────


/** Itens da cozinha todos prontos (ou não há cozinha): o pedido está pronto. */
function prontoPelaCozinha(po: { aceitoEm: Date | null; pedido?: { itens: { status: string; produto: { envioCozinha: string; categoria: { vaiCozinha: boolean } | null } }[] } | null }) {
  if (!po.pedido) return null
  const daCozinha = po.pedido.itens.filter((i) => i.status !== 'cancelado' && vaiParaCozinha(i.produto))
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
  pedido: { select: { numero: true, itens: { select: { status: true, produto: { select: camposCozinha } } } } },
  entregador: { select: { id: true, nome: true } },
} as const

type ComPedido = Prisma.PedidoOnlineGetPayload<{ include: typeof includeCaixa }>

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
    entregador: po.entregador, ordemRota: po.ordemRota, entregaConfirmadaEm: po.entregaConfirmadaEm,
    // O código em si só aparece para o cliente (acompanhamento)
    exigeCodigo: Boolean(po.codigoEntrega), codigoBloqueado: po.tentativasCodigo >= MAX_TENTATIVAS_CODIGO,
    destino: po.destinoLat != null && po.destinoLng != null ? { lat: po.destinoLat, lng: po.destinoLng } : null,
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
      select: { id: true, nome: true, gerenciarEstoque: true, ...camposCozinha },
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

    // Todos os itens na mesma rodada: o pedido vira UMA ficha na cozinha
    // (antes cada produto ganhava uma rodada e virava um cartão separado)
    const lancados: any[] = []
    const rodada = 1
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
      const vaiCozinha = vaiParaCozinha(p)
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

/**
 * Cancelar depois de aceito (cliente desistiu, não atendeu, endereço errado…):
 * devolve o estoque, cancela os itens (somem da cozinha) e o pedido, e o
 * cliente vê o motivo no acompanhamento. Com pagamento registrado, estorne antes.
 */
export async function cancelar(tenantId: string, id: string, motivo: string, usuarioId: string) {
  const texto = motivo.trim().slice(0, 200)
  const r = await prisma.$transaction(async (tx) => {
    const po = await tx.pedidoOnline.findFirst({ where: { tenantId, id } })
    if (!po) throw erro(404, 'Pedido não encontrado')
    // Entregue também pode ser cancelado depois que o pagamento foi estornado no
    // caixa (venda desfeita); a regra "sem pagamento confirmado" abaixo garante isso
    const entregue = po.status === 'entregue'
    if (!entregue && !ATIVOS_ROTA.includes(po.status as any)) throw erro(409, po.status === 'recebido' ? 'Pedido ainda não aceito: use Recusar' : 'Este pedido já foi finalizado')
    if (!entregue && po.entregaConfirmadaEm) throw erro(409, 'O entregador já confirmou a entrega. Acerte o pagamento no caixa.')

    let itens: any[] = []
    if (po.pedidoId) {
      const pagos = await tx.pagamento.count({ where: { tenantId, pedidoId: po.pedidoId, status: 'confirmado' } })
      if (pagos > 0) throw erro(409, 'Este pedido tem pagamento registrado. Estorne o pagamento antes de cancelar.')
      itens = await tx.pedidoItem.findMany({
        where: { pedidoId: po.pedidoId, status: { not: 'cancelado' } },
        include: { produto: { select: { id: true, nome: true, gerenciarEstoque: true } } },
      })
      for (const i of itens) {
        if (i.produto.gerenciarEstoque) {
          await tx.produto.update({ where: { id: i.produto.id }, data: { estoqueAtual: { increment: i.quantidade } } })
          await tx.movimentacaoEstoque.create({
            data: { produtoId: i.produto.id, tipo: 'entrada', quantidade: i.quantidade, motivo: `Delivery ${po.codigo} cancelado: ${texto}`, usuarioId } as any,
          })
        }
        await tx.pedidoItem.update({ where: { id: i.id }, data: { status: 'cancelado', canceladoPorId: usuarioId, motivoCancelamento: texto } as any })
      }
      await tx.pedido.update({ where: { id: po.pedidoId }, data: { status: 'cancelado', fechadoEm: new Date() } as any })
    }
    const atualizado = await tx.pedidoOnline.update({
      where: { id: po.id },
      data: { status: 'cancelado', motivoRecusa: texto, canceladoEm: new Date(), ordemRota: null },
      include: includeCaixa,
    })
    await registrarAuditoria(tx, {
      usuarioId, acao: 'delivery.cancelado', entidade: 'PedidoOnline', entidadeId: po.id,
      detalhes: { codigo: po.codigo, motivo: texto, itens: itens.map((i) => `${i.quantidade}x ${i.produto.nome}`) },
    })
    return { atualizado, itens, entregadorId: po.entregadorId }
  })

  if (r.entregadorId) await recalcularRota(tenantId, r.entregadorId)
  const e = emitir(tenantId)
  for (const i of r.itens) {
    e.item(EVENTOS.item.statusAlterado, {
      comandaId: i.pedidoId, pedidoId: i.pedidoId, itemId: i.id, produtoId: i.produto.id, produtoNome: i.produto.nome,
      quantidade: i.quantidade, status: 'cancelado', vaiCozinha: true, rodada: i.rodada, totalCentavos: 0,
    })
  }
  e.delivery(EVENTOS.delivery.atualizado, payload(r.atualizado))
  return paraCaixa(r.atualizado)
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
  // Caixa e entregador podem concluir quase juntos: quem chega depois só recebe o pedido pronto
  if (po.status === 'entregue') return paraCaixa(po)
  if (!['aceito', 'pronto', 'em_rota'].includes(po.status) || !po.pedidoId) throw erro(409, 'Pedido não está em andamento')

  const pedido = await prisma.pedido.findFirst({ where: { tenantId, id: po.pedidoId }, include: includeParaConta })
  const conta = calcularConta({ itens: pedido!.itens, abatimentos: pedido!.abatimentos, pagamentos: pedido!.pagamentos, taxaPct: Number(pedido!.taxaPct), taxaEntrega: pedido!.taxaEntrega })
  if (conta.restanteCentavos > 0) {
    try {
      await registrarPagamento(tenantId, {
        idempotencyKey: d.idempotencyKey, pedidoId: po.pedidoId, metodoId: d.metodoId,
        valorPago: paraReais(conta.restanteCentavos), valorRecebido: d.valorRecebido, usuarioId,
      } as any)
    } catch (e: any) {
      // O outro lado pagou entre a leitura e o registro: a conta está certa, segue
      if (!(e?.status === 409 && /quitada/i.test(e?.message ?? ''))) throw e
    }
  }
  await prisma.pedido.update({ where: { id: po.pedidoId }, data: { status: 'fechado', fechadoEm: new Date() } })
  // Entregue e pago: o que ainda estava na cozinha sai da tela (antes ficava "em preparo" para sempre)
  const naCozinha = await prisma.pedidoItem.findMany({
    where: { pedidoId: po.pedidoId, status: { notIn: ['cancelado', 'entregue'] } },
    select: { id: true, produtoId: true, quantidade: true, rodada: true, produto: { select: { nome: true } } },
  })
  if (naCozinha.length) {
    await prisma.pedidoItem.updateMany({ where: { id: { in: naCozinha.map((i) => i.id) } }, data: { status: 'entregue' } })
    const e = emitir(tenantId)
    for (const i of naCozinha) {
      e.item(EVENTOS.item.statusAlterado, {
        comandaId: po.pedidoId, pedidoId: po.pedidoId, itemId: i.id, produtoId: i.produtoId, produtoNome: i.produto.nome,
        quantidade: i.quantidade, status: 'entregue', vaiCozinha: true, rodada: i.rodada, totalCentavos: conta.totalCentavos,
      })
    }
  }
  const atualizado = await prisma.pedidoOnline.update({
    where: { id }, data: { status: 'entregue', entregueEm: new Date(), prontoEm: po.prontoEm ?? new Date(), ordemRota: null }, include: includeCaixa,
  })
  if (po.entregadorId) await recalcularRota(tenantId, po.entregadorId)
  emitir(tenantId).delivery(EVENTOS.delivery.atualizado, payload(atualizado))
  return paraCaixa(atualizado)
}

// ─── Configurações do delivery ─────────────────────────────────────────────────

export async function config(tenantId: string) {
  const [tenant, cfg] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, deliveryDisponivel: true, plano: { select: { nome: true } } } }),
    prisma.configuracoes.findFirst({ where: { tenantId } }),
  ])
  return {
    nomeRestaurante: cfg?.nomeRestaurante ?? '',
    disponivel: Boolean(tenant?.deliveryDisponivel),
    plano: tenant?.plano?.nome ?? null,
    slug: tenant?.slug,
    ativo: cfg?.deliveryAtivo ?? false,
    entrega: cfg?.deliveryEntrega ?? true,
    retirada: cfg?.deliveryRetirada ?? true,
    taxaEntrega: Number(cfg?.deliveryTaxa ?? 0),
    pedidoMinimo: Number(cfg?.deliveryPedidoMinimo ?? 0),
    tempoMin: cfg?.deliveryTempoMin ?? 40,
    mensagem: cfg?.deliveryMensagem ?? '',
    mensagemWhatsapp: cfg?.deliveryMensagemWhatsapp ?? '',
    local: cfg?.deliveryLat != null && cfg?.deliveryLng != null ? { lat: cfg.deliveryLat, lng: cfg.deliveryLng } : null,
  }
}

export async function salvarConfig(tenantId: string, d: {
  ativo?: boolean; entrega?: boolean; retirada?: boolean; taxaEntrega?: number; pedidoMinimo?: number; tempoMin?: number; mensagem?: string | null
  mensagemWhatsapp?: string | null; local?: Coordenadas | null
}) {
  const atual = await config(tenantId)
  if (d.ativo && !atual.disponivel) throw erro(403, 'Delivery não está liberado para o seu restaurante')
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
      ...(d.mensagemWhatsapp !== undefined ? { deliveryMensagemWhatsapp: d.mensagemWhatsapp?.trim().slice(0, 1000) || null } : {}),
      ...(d.local !== undefined ? { deliveryLat: d.local?.lat ?? null, deliveryLng: d.local?.lng ?? null } : {}),
    },
  })
  return config(tenantId)
}

// ─── Etapa B: entregador, rota e mapa ──────────────────────────────────────────

const ATIVOS_ROTA = ['aceito', 'pronto', 'em_rota'] as const

/** Geocodifica o destino do pedido (em segundo plano, depois de criado). */
async function localizarDestino(tenantId: string, id: string) {
  try {
    const [po, tenant] = await comTenant(tenantId, async () => Promise.all([
      prisma.pedidoOnline.findFirst({ where: { tenantId, id }, select: { endereco: true, numero: true, bairro: true } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { cidade: true, uf: true } }),
    ]))
    if (!po?.endereco) return
    const c = await geocodificar({ rua: po.endereco, numero: po.numero, bairro: po.bairro, cidade: tenant?.cidade, uf: tenant?.uf })
    if (c) await comTenant(tenantId, async () => await prisma.pedidoOnline.update({ where: { id }, data: { destinoLat: c.lat, destinoLng: c.lng } }))
  } catch { /* sem pino no mapa; a entrega segue */ }
}

/** Ponto de partida do restaurante a partir do endereço cadastrado. */
export async function localizarRestaurante(tenantId: string) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { endereco: true, cidade: true, uf: true } })
  if (!t?.endereco && !t?.cidade) throw erro(400, 'Cadastre o endereço do restaurante (Platform) ou marque o ponto no mapa')
  const c = await geocodificar({ rua: t.endereco, cidade: t.cidade, uf: t.uf })
  if (!c) throw erro(404, 'Não achei o endereço no mapa. Marque o ponto manualmente.')
  return salvarConfig(tenantId, { local: c })
}

async function ultimaPosicao(tenantId: string, usuarioId: string, minutos = 15) {
  return prisma.entregadorPosicao.findFirst({
    where: { tenantId, usuarioId, createdAt: { gte: new Date(Date.now() - minutos * 60000) } },
    orderBy: { createdAt: 'desc' }, select: { lat: true, lng: true, createdAt: true },
  })
}

/**
 * Ordem das paradas: vizinho mais próximo a partir de onde o entregador
 * está (ou do restaurante). Sem coordenadas, vai para o fim na ordem de
 * chegada. Recalculada a cada atribuição, início de rota e entrega.
 */
export async function recalcularRota(tenantId: string, entregadorId: string) {
  const [entregas, pos, cfg] = await Promise.all([
    prisma.pedidoOnline.findMany({
      where: { tenantId, entregadorId, status: { in: [...ATIVOS_ROTA] }, entregaConfirmadaEm: null },
      select: { id: true, destinoLat: true, destinoLng: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    ultimaPosicao(tenantId, entregadorId),
    prisma.configuracoes.findFirst({ where: { tenantId }, select: { deliveryLat: true, deliveryLng: true } }),
  ])
  let atual: Coordenadas | null = pos ? { lat: pos.lat, lng: pos.lng } : cfg?.deliveryLat != null ? { lat: cfg.deliveryLat, lng: cfg.deliveryLng! } : null
  const comCoord = entregas.filter((e) => e.destinoLat != null && e.destinoLng != null)
  const semCoord = entregas.filter((e) => e.destinoLat == null || e.destinoLng == null)
  const ordem: string[] = []
  while (comCoord.length) {
    let melhor = 0
    if (atual) {
      let menor = Infinity
      comCoord.forEach((e, i) => { const d = distancia(atual!, { lat: e.destinoLat!, lng: e.destinoLng! }); if (d < menor) { menor = d; melhor = i } })
    }
    const [e] = comCoord.splice(melhor, 1)
    ordem.push(e.id)
    atual = { lat: e.destinoLat!, lng: e.destinoLng! }
  }
  ordem.push(...semCoord.map((e) => e.id))
  await prisma.$transaction(ordem.map((id, i) => prisma.pedidoOnline.update({ where: { id }, data: { ordemRota: i + 1 } })))
}

/** Entregadores ativos, onde estão e quantas entregas têm. */
export async function entregadores(tenantId: string) {
  const lista = await prisma.usuario.findMany({
    where: { tenantId, cargo: 'entregador' as any, ativo: true },
    select: { id: true, nome: true, entregas: { where: { status: { in: [...ATIVOS_ROTA] }, entregaConfirmadaEm: null }, select: { id: true, status: true } } },
    orderBy: { nome: 'asc' },
  })
  return Promise.all(lista.map(async (u) => {
    const pos = await ultimaPosicao(tenantId, u.id)
    return {
      id: u.id, nome: u.nome,
      entregas: u.entregas.length,
      emRota: u.entregas.some((e) => e.status === 'em_rota'),
      posicao: pos ? { lat: pos.lat, lng: pos.lng, em: pos.createdAt } : null,
    }
  }))
}

/** Caixa escolhe (ou tira) o entregador de um pedido de entrega. */
export async function atribuir(tenantId: string, id: string, entregadorId: string | null) {
  const po = await buscar(tenantId, id)
  if (po.tipo !== 'entrega') throw erro(400, 'Pedido para retirada não tem entregador')
  if (!ATIVOS_ROTA.includes(po.status as any)) throw erro(409, 'Aceite o pedido antes de escolher o entregador')
  if (po.entregaConfirmadaEm) throw erro(409, 'Este pedido já foi entregue')
  if (entregadorId) {
    const u = await prisma.usuario.findFirst({ where: { tenantId, id: entregadorId, cargo: 'entregador' as any, ativo: true } })
    if (!u) throw erro(404, 'Entregador não encontrado')
  }
  const anterior = po.entregadorId
  // Sem pino ainda (o geocodificador falhou na chegada): tenta de novo antes de montar a rota
  if (entregadorId && po.destinoLat == null) await localizarDestino(tenantId, id)
  await prisma.pedidoOnline.update({ where: { id }, data: { entregadorId, ordemRota: null } })
  if (anterior && anterior !== entregadorId) await recalcularRota(tenantId, anterior)
  if (entregadorId) await recalcularRota(tenantId, entregadorId)
  const atualizado = await buscar(tenantId, id)
  emitir(tenantId).delivery(EVENTOS.delivery.atualizado, payload(atualizado))
  // Avisa o celular do entregador, mesmo com o app fechado
  if (entregadorId && entregadorId !== anterior) {
    void enviarPush(tenantId, entregadorId, {
      titulo: 'Nova entrega para você',
      corpo: `${atualizado.clienteNome.split(' ')[0]} · ${atualizado.bairro || atualizado.endereco || 'endereço no app'}`,
      url: '/entregador', tag: `entrega-${id}`,
    })
  }
  return paraCaixa(atualizado)
}

/** Mapa do caixa: restaurante, entregadores (com o rastro dos últimos 30 min) e entregas em andamento. */
export async function mapa(tenantId: string) {
  const [cfg, ents, pedidos] = await Promise.all([
    prisma.configuracoes.findFirst({ where: { tenantId }, select: { deliveryLat: true, deliveryLng: true, nomeRestaurante: true } }),
    entregadores(tenantId),
    prisma.pedidoOnline.findMany({
      where: { tenantId, tipo: 'entrega', status: { in: [...ATIVOS_ROTA] }, entregaConfirmadaEm: null },
      select: { id: true, codigo: true, clienteNome: true, status: true, destinoLat: true, destinoLng: true, entregadorId: true, ordemRota: true, bairro: true },
    }),
  ])
  const desde = new Date(Date.now() - 30 * 60000)
  const rastros = await Promise.all(ents.filter((e) => e.posicao).map(async (e) => ({
    entregadorId: e.id,
    pontos: (await prisma.entregadorPosicao.findMany({
      where: { tenantId, usuarioId: e.id, createdAt: { gte: desde } }, orderBy: { createdAt: 'asc' }, select: { lat: true, lng: true },
    })).map((p) => [p.lat, p.lng]),
  })))
  return {
    restaurante: cfg?.deliveryLat != null ? { lat: cfg.deliveryLat, lng: cfg.deliveryLng, nome: cfg.nomeRestaurante } : null,
    entregadores: ents,
    rastros,
    entregas: pedidos.map((p) => ({ ...p, destino: p.destinoLat != null ? { lat: p.destinoLat, lng: p.destinoLng } : null })),
  }
}

// ── App do entregador ──

/** As entregas do entregador, na ordem da rota. */
export async function minhaRota(tenantId: string, usuarioId: string) {
  const [cfg, lista] = await Promise.all([
    prisma.configuracoes.findFirst({ where: { tenantId }, select: { deliveryLat: true, deliveryLng: true, nomeRestaurante: true } }),
    prisma.pedidoOnline.findMany({
      where: { tenantId, entregadorId: usuarioId, OR: [{ status: { in: [...ATIVOS_ROTA] }, entregaConfirmadaEm: null }, { entregaConfirmadaEm: { gte: new Date(Date.now() - 12 * 3600_000) } }] },
      include: includeCaixa,
      orderBy: [{ ordemRota: 'asc' }, { createdAt: 'asc' }],
    }),
  ])
  return {
    restaurante: { nome: cfg?.nomeRestaurante ?? 'Restaurante', local: cfg?.deliveryLat != null ? { lat: cfg.deliveryLat, lng: cfg.deliveryLng } : null },
    pendentes: lista.filter((p) => !p.entregaConfirmadaEm).map(paraCaixa),
    feitas: lista.filter((p) => p.entregaConfirmadaEm).map(paraCaixa),
  }
}

/** Saiu: tudo o que está com ele vai para "em rota" (o cliente passa a ver o mapa). */
export async function iniciarRota(tenantId: string, usuarioId: string) {
  const prontos = await prisma.pedidoOnline.findMany({
    where: { tenantId, entregadorId: usuarioId, status: { in: ['aceito', 'pronto'] }, entregaConfirmadaEm: null }, select: { id: true },
  })
  if (!prontos.length) throw erro(409, 'Nenhuma entrega esperando para sair')
  const agora = new Date()
  await prisma.pedidoOnline.updateMany({ where: { id: { in: prontos.map((p) => p.id) } }, data: { status: 'em_rota', saiuEm: agora, prontoEm: agora } })
  await recalcularRota(tenantId, usuarioId)
  for (const p of prontos) emitir(tenantId).delivery(EVENTOS.delivery.atualizado, payload(await buscar(tenantId, p.id)))
  return minhaRota(tenantId, usuarioId)
}

/** O entregador confirmou a entrega. O pagamento é acertado no caixa (concluir). */
export async function confirmarEntrega(tenantId: string, usuarioId: string, id: string, codigo?: string) {
  const po = await buscar(tenantId, id)
  if (po.entregadorId !== usuarioId) throw erro(403, 'Esta entrega não está com você')
  if (po.status !== 'em_rota') throw erro(409, 'Inicie a rota antes de confirmar a entrega')
  if (po.entregaConfirmadaEm) return minhaRota(tenantId, usuarioId)

  // Pedido com código: só conclui com o código que o cliente informa
  if (po.codigoEntrega) {
    if (po.tentativasCodigo >= MAX_TENTATIVAS_CODIGO) throw erro(423, 'Código bloqueado por tentativas erradas. Peça ao caixa para concluir a entrega.')
    if ((codigo ?? '').replace(/\D/g, '') !== po.codigoEntrega) {
      const { tentativasCodigo } = await prisma.pedidoOnline.update({ where: { id }, data: { tentativasCodigo: { increment: 1 } } })
      const restam = MAX_TENTATIVAS_CODIGO - tentativasCodigo
      throw erro(400, restam > 0 ? `Código incorreto. Confira com o cliente (${restam} ${restam === 1 ? 'tentativa' : 'tentativas'}).` : 'Código bloqueado por tentativas erradas. Peça ao caixa para concluir a entrega.')
    }
  }

  // Código conferido: primeiro registra o pagamento na forma que o cliente escolheu
  // (e o pedido vira entregue). Se não der (caixa fechado, forma sem correspondente),
  // a entrega é confirmada mesmo assim — o cliente recebeu — e o caixa acerta depois.
  let aviso: string | null = null
  if (po.codigoEntrega) {
    const metodo = await metodoDaForma(po.formaPagamento)
    if (!metodo) aviso = 'Entrega confirmada. Acerte o pagamento no caixa ao voltar.'
    else {
      try {
        await concluir(tenantId, id, {
          metodoId: metodo.id, idempotencyKey: `entrega-${id}`,
          valorRecebido: po.formaPagamento === 'dinheiro' && po.trocoPara != null ? Number(po.trocoPara) : undefined,
        }, usuarioId)
      } catch (e: any) {
        aviso = `Entrega confirmada, mas o pagamento não foi registrado (${e?.message ?? 'erro'}). Acerte no caixa ao voltar.`
      }
    }
  } else {
    aviso = 'Entrega confirmada. Acerte o pagamento no caixa ao voltar.'
  }

  await prisma.pedidoOnline.update({ where: { id }, data: { entregaConfirmadaEm: new Date(), ordemRota: null } })
  await recalcularRota(tenantId, usuarioId)
  emitir(tenantId).delivery(EVENTOS.delivery.atualizado, payload(await buscar(tenantId, id)))
  return { ...(await minhaRota(tenantId, usuarioId)), aviso }
}

/** Forma de pagamento do cardápio (dinheiro, pix, crédito, débito) → forma ativa do restaurante. */
async function metodoDaForma(forma: string) {
  const ativos = await prisma.metodoPagamento.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } })
  const tem = (m: { nome: string }, t: string) => m.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(t)
  if (forma === 'dinheiro') return ativos.find((m) => tem(m, 'dinheiro')) ?? null
  if (forma === 'pix') return ativos.find((m) => tem(m, 'pix')) ?? null
  if (forma === 'credito') return ativos.find((m) => tem(m, 'credito')) ?? null
  if (forma === 'debito') return ativos.find((m) => tem(m, 'debito')) ?? null
  // 'cartao' (pedidos antigos, sem crédito/débito): o caixa confirma qual foi
  return null
}

/** Posição do GPS (o app manda a cada ~15 s com a rota em andamento). */
export async function registrarPosicao(tenantId: string, usuarioId: string, d: { lat: number; lng: number; precisao?: number; velocidade?: number }) {
  const p = await prisma.entregadorPosicao.create({
    data: { tenantId, usuarioId, lat: d.lat, lng: d.lng, precisao: d.precisao ?? null, velocidade: d.velocidade ?? null },
  })
  // Limpeza preguiçosa: de vez em quando apaga o que tem mais de 3 dias
  if (Math.random() < 0.01) {
    void prisma.entregadorPosicao.deleteMany({ where: { tenantId, createdAt: { lt: new Date(Date.now() - 3 * 86400_000) } } }).catch(() => {})
  }
  emitir(tenantId).posicao({ usuarioId, lat: p.lat, lng: p.lng, em: p.createdAt.toISOString() })
  return { ok: true }
}

// ─── Platform: visão geral do delivery em todos os restaurantes ────────────────

const EM_ANDAMENTO = ['recebido', 'aceito', 'pronto', 'em_rota'] as const

/**
 * Restaurantes com delivery no plano ou ligado, com os números do dia e do
 * mês. Cruza tenants: chamada só pelas rotas do Platform (sem escopo).
 */
export async function visaoGeralPlatform() {
  return semEscopoDeTenant(async () => {
    const hoje = hojeLocal()
    const inicioHoje = inicioDoDia(hoje)
    const inicioMes = inicioDoDia(`${hoje.slice(0, 7)}-01`)

    const tenants = await prisma.tenant.findMany({
      where: { OR: [{ deliveryDisponivel: true }, { configuracoes: { deliveryAtivo: true } }] },
      select: {
        id: true, nome: true, slug: true, cidade: true, uf: true, status: true,
        deliveryDisponivel: true,
        plano: { select: { nome: true } },
        configuracoes: { select: { deliveryAtivo: true, deliveryLat: true, deliveryTaxa: true } },
      },
      orderBy: { nome: 'asc' },
    })
    const ids = tenants.map((t) => t.id)

    const [hojeG, mesG, recusadosG, andamentoG, ultimoG, posicoes, cadastrados] = await Promise.all([
      prisma.pedidoOnline.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids }, status: 'entregue', createdAt: { gte: inicioHoje } }, _count: { _all: true }, _sum: { total: true } }),
      prisma.pedidoOnline.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids }, status: 'entregue', createdAt: { gte: inicioMes } }, _count: { _all: true }, _sum: { total: true } }),
      prisma.pedidoOnline.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids }, status: { in: ['recusado', 'cancelado'] }, createdAt: { gte: inicioMes } }, _count: { _all: true } }),
      prisma.pedidoOnline.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids }, status: { in: [...EM_ANDAMENTO] } }, _count: { _all: true } }),
      prisma.pedidoOnline.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids } }, _max: { createdAt: true } }),
      prisma.entregadorPosicao.groupBy({ by: ['tenantId', 'usuarioId'], where: { tenantId: { in: ids }, createdAt: { gte: new Date(Date.now() - 15 * 60000) } } }),
      prisma.usuario.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids }, cargo: 'entregador', ativo: true }, _count: { _all: true } }),
    ])
    const por = <T extends { tenantId: string }>(l: T[]) => new Map(l.map((x) => [x.tenantId, x]))
    const mHoje = por(hojeG), mMes = por(mesG), mRec = por(recusadosG), mAnd = por(andamentoG), mUlt = por(ultimoG), mCad = por(cadastrados)
    const ativosPor = new Map<string, number>()
    for (const p of posicoes) ativosPor.set(p.tenantId, (ativosPor.get(p.tenantId) ?? 0) + 1)

    const restaurantes = tenants.map((t) => {
      const mes = mMes.get(t.id), dia = mHoje.get(t.id)
      const pedidosMes = mes?._count._all ?? 0
      const valorMes = Number(mes?._sum.total ?? 0)
      return {
        id: t.id, nome: t.nome, slug: t.slug, cidade: t.cidade, uf: t.uf, status: t.status,
        plano: t.plano?.nome ?? null,
        disponivel: t.deliveryDisponivel,
        ativo: t.configuracoes?.deliveryAtivo ?? false,
        localDefinido: t.configuracoes?.deliveryLat != null,
        taxaEntrega: Number(t.configuracoes?.deliveryTaxa ?? 0),
        pedidosHoje: dia?._count._all ?? 0,
        valorHoje: Number(dia?._sum.total ?? 0),
        pedidosMes,
        valorMes,
        ticketMedio: pedidosMes ? valorMes / pedidosMes : 0,
        recusadosMes: mRec.get(t.id)?._count._all ?? 0,
        emAndamento: mAnd.get(t.id)?._count._all ?? 0,
        entregadoresAtivos: ativosPor.get(t.id) ?? 0,
        entregadoresCadastrados: mCad.get(t.id)?._count._all ?? 0,
        ultimoPedidoEm: mUlt.get(t.id)?._max.createdAt ?? null,
      }
    })
    const soma = (k: 'pedidosHoje' | 'valorHoje' | 'pedidosMes' | 'valorMes' | 'emAndamento' | 'entregadoresAtivos') =>
      restaurantes.reduce((s, r) => s + r[k], 0)
    return {
      resumo: {
        restaurantes: restaurantes.length,
        recebendo: restaurantes.filter((r) => r.disponivel && r.ativo).length,
        pedidosHoje: soma('pedidosHoje'), valorHoje: soma('valorHoje'),
        pedidosMes: soma('pedidosMes'), valorMes: soma('valorMes'),
        emAndamento: soma('emAndamento'), entregadoresAtivos: soma('entregadoresAtivos'),
      },
      restaurantes,
    }
  })
}
