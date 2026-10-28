import { prisma } from './prisma'
import { getPermissoes } from '../modules/auth/auth.service'
import { emitir } from '../sockets/socket'

/**
 * Permissões que valem AGORA para um usuário, lidas do banco.
 *
 * O token de acesso dura até 8h e leva as permissões do momento do login.
 * Quando o administrador muda uma função, um perfil ou o cargo de alguém, a
 * mudança precisa valer na hora — não só no próximo login. Por isso a API
 * confere por aqui, com um cache curto que é limpo a cada mudança.
 */
type Atuais = { cargo: string; perfilId: string | null; permissoes: Record<string, boolean> }

const TTL_MS = 30_000
const cache = new Map<string, { exp: number; valor: Atuais | null }>()

export async function permissoesAtuais(tenantId: string, usuarioId: string): Promise<Atuais | null> {
  const chave = `${tenantId}:${usuarioId}`
  const hit = cache.get(chave)
  if (hit && hit.exp > Date.now()) return hit.valor

  const u = await prisma.usuario.findFirst({
    where: { id: usuarioId, tenantId },
    select: { cargo: true, perfilId: true, ativo: true },
  })
  const valor = u && u.ativo
    ? { cargo: u.cargo, perfilId: u.perfilId, permissoes: await getPermissoes(u.cargo, u.perfilId, tenantId) }
    : null
  cache.set(chave, { exp: Date.now() + TTL_MS, valor })
  return valor
}

/** Limpa o cache do restaurante e avisa os apps abertos para relerem as permissões. */
export function permissoesMudaram(tenantId: string) {
  for (const k of cache.keys()) if (k.startsWith(tenantId + ':')) cache.delete(k)
  emitir(tenantId).permissoes()
}
