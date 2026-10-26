import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyOperadorToken, type TenantJwtPayload } from '../lib/jwt'

/**
 * Operador identificado pelo cartão RFID.
 *
 * No caixa, o computador fica logado com uma conta (em geral a do
 * administrador) e cada ação sensível pede o cartão de quem está fazendo.
 * Antes, o cartão só era conferido na tela: o servidor checava a permissão da
 * conta logada, então qualquer cartão cadastrado liberava desconto, taxa,
 * pagamento ou exclusão de item, e a ação ficava no nome da conta logada.
 *
 * Agora, ao passar o cartão, o servidor devolve um token curto (2 min) do dono
 * do cartão. Com o cabeçalho X-Operador, a requisição passa a valer em nome
 * dele: a permissão conferida e o usuário registrado são os do cartão.
 */
export const CABECALHO_OPERADOR = 'x-operador'

/**
 * Troca a identidade da requisição pela do dono do cartão, se o cabeçalho
 * vier. Devolve false (e já respondeu 403) se o token for inválido/expirado.
 */
export function aplicarOperador(request: FastifyRequest, reply: FastifyReply): boolean {
  const bruto = request.headers[CABECALHO_OPERADOR]
  const token = Array.isArray(bruto) ? bruto[0] : bruto
  if (!token) return true
  const auth = request.auth as TenantJwtPayload | null
  if (!auth || auth.type !== 'tenant') return true

  const op = verifyOperadorToken(token)
  // 403 (e não 401): 401 derrubaria a sessão do caixa no navegador
  if (!op || op.tid !== auth.tenantId) {
    reply.status(403).send({ error: 'Cartão expirado. Passe o cartão de novo.' })
    return false
  }
  request.auth = {
    ...auth,
    sub: op.sub,
    nome: op.nome,
    cargo: op.cargo,
    perfilId: op.perfilId,
    permissoes: op.permissoes,
  }
  request.operadorRfid = true
  return true
}

/** preHandler para rotas sem permissão específica (ex.: registrar pagamento). */
export async function usarOperador(request: FastifyRequest, reply: FastifyReply) {
  aplicarOperador(request, reply)
}
