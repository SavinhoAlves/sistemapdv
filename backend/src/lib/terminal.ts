import crypto from 'crypto'
import type { FastifyRequest } from 'fastify'
import { prisma, semEscopoDeTenant } from './prisma'
import { modoLocal, normalizarIp } from './redeLocal'

/**
 * Terminal de onde veio a requisição. Dois jeitos de reconhecer:
 *  - chave do aparelho (cabeçalho X-Terminal): gerada quando o administrador
 *    autoriza o aparelho em Admin › Terminais; vale na nuvem e no Host;
 *  - IP fixo, só no modo local (terminais cadastrados por IP).
 * O banco guarda só o hash da chave.
 */
export const CABECALHO_TERMINAL = 'x-terminal'

export const novaChaveTerminal = () => crypto.randomBytes(32).toString('base64url')
export const hashChaveTerminal = (chave: string) => crypto.createHash('sha256').update(chave).digest('hex')

const campos = { id: true, tenantId: true, nome: true, funcao: true, ip: true, cracha: true, tenant: { select: { slug: true } } } as const

export async function terminalDaRequisicao(request: FastifyRequest) {
  const chave = String(request.headers[CABECALHO_TERMINAL] ?? '').trim()
  return semEscopoDeTenant(async () => {
    if (chave) {
      const t = await prisma.terminal.findFirst({ where: { tokenHash: hashChaveTerminal(chave), ativo: true }, select: campos })
      if (t) return t
    }
    if (!modoLocal()) return null
    const ip = normalizarIp(request.ip)
    return prisma.terminal.findFirst({ where: { ip, ativo: true }, select: campos })
  })
}
