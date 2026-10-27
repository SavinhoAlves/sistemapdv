import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import type { TenantJwtPayload } from '../lib/jwt'
import { CABECALHO_OPERADOR, aplicarOperador } from './operador.middleware'

/**
 * Cartão RFID obrigatório nas ações do terminal.
 *
 * Em evento, vários garçons dividem terminais logados com uma conta só (em
 * geral a do administrador ou do caixa). O cartão diz de quem é cada ação.
 * Antes ele só era pedido na tela: sem o cabeçalho X-Operador, o servidor
 * aceitava a ação em nome da conta logada. Com RFID ligado, as rotas abaixo
 * passam a recusar a requisição sem cartão, e o garçom só mexe nas mesas
 * abertas por ele.
 *
 * Não se aplica a quem está logado com a própria conta de garçom nem à sessão
 * do QR no celular da pessoa (app da equipe): ali ela já está identificada, e
 * o celular não tem leitor.
 */

// Cache curto: ligar/desligar o RFID entra em vigor em poucos segundos
const cacheRfid = new Map<string, { ativo: boolean; ts: number }>()
const CACHE_TTL_MS = 15_000

export async function rfidAtivoNoTenant(tenantId: string): Promise<boolean> {
  const c = cacheRfid.get(tenantId)
  if (c && Date.now() - c.ts < CACHE_TTL_MS) return c.ativo
  const [tenant, cfg] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { rfidDisponivel: true } }),
    prisma.configuracoes.findFirst({ where: { tenantId }, select: { rfidAtivo: true } }),
  ])
  const ativo = Boolean(tenant?.rfidDisponivel) && Boolean(cfg?.rfidAtivo)
  cacheRfid.set(tenantId, { ativo, ts: Date.now() })
  return ativo
}

/** Chamado ao salvar a configuração, para valer na hora. */
export function esquecerRfidDoTenant(tenantId: string) {
  cacheRfid.delete(tenantId)
}

/**
 * preHandler: com RFID ligado, exige o cartão (X-Operador) e já troca a
 * identidade da requisição pela do dono do cartão. Vai antes de
 * requirePermissao, que então confere a permissão dele.
 */
export async function exigirCartao(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.auth as TenantJwtPayload | null
  if (!auth || auth.type !== 'tenant') return
  if (auth.cargo === 'garcom' || auth.pessoal) return
  if (!(await rfidAtivoNoTenant(auth.tenantId))) return

  if (!request.headers[CABECALHO_OPERADOR]) {
    return reply.status(403).send({ error: 'Passe o cartão para continuar', codigo: 'CARTAO_OBRIGATORIO' })
  }
  if (!aplicarOperador(request, reply)) return reply
}

/**
 * preHandler (depois de exigirCartao): o cartão de um garçom só vale nas mesas
 * abertas por ele. Administrador e caixa mexem em qualquer mesa.
 * Com RFID ligado vale também para o garçom logado com a própria conta, sem
 * cartão (celular): a conta dele faz o papel do cartão.
 */
export function exigirDonoDaMesa(mesaDaRequisicao: (request: FastifyRequest) => Promise<string | null | undefined>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = request.auth as TenantJwtPayload
    if (!auth || auth.type !== 'tenant' || auth.cargo !== 'garcom') return
    if (!request.operadorRfid && !(await rfidAtivoNoTenant(auth.tenantId))) return

    const mesaId = await mesaDaRequisicao(request)
    if (!mesaId) return
    const mesa = await prisma.mesa.findFirst({ where: { id: mesaId, tenantId: auth.tenantId }, select: { garcomId: true } })
    if (mesa?.garcomId && mesa.garcomId !== auth.sub) {
      return reply.status(403).send({ error: 'Esta mesa é de outro garçom', codigo: 'MESA_DE_OUTRO' })
    }
  }
}

/** Mesa do corpo da requisição (lançamento) */
export const mesaDoCorpo = async (request: FastifyRequest) =>
  (request.body as any)?.mesaId as string | undefined

/** Mesa do item da rota /itens/:itemId */
export const mesaDoItem = async (request: FastifyRequest) => {
  const itemId = (request.params as any)?.itemId
  if (typeof itemId !== 'string') return null
  const item = await prisma.pedidoItem.findFirst({
    where: { id: itemId, tenantId: request.tenantId! },
    select: { pedido: { select: { mesaId: true } } },
  }).catch(() => null)
  return item?.pedido?.mesaId ?? null
}
