import webpush from 'web-push'
import { prisma } from './prisma'

/**
 * Notificação push do navegador (Web Push), hoje usada no app do entregador.
 *
 * Chaves VAPID no .env (gere uma vez com `npx web-push generate-vapid-keys`):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT (mailto:… ou https://…).
 * Sem as chaves o push fica desligado e o resto do sistema segue normal.
 */
const PUBLICA = process.env.VAPID_PUBLIC_KEY ?? ''
const PRIVADA = process.env.VAPID_PRIVATE_KEY ?? ''
export const pushAtivo = Boolean(PUBLICA && PRIVADA)
if (pushAtivo) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:suporte@restaurantepdv.com.br', PUBLICA, PRIVADA)

export const chavePublicaPush = () => (pushAtivo ? PUBLICA : null)

export interface InscricaoPush { endpoint: string; keys: { p256dh: string; auth: string } }

/** Guarda o aparelho do usuário (o mesmo endpoint passa a ser dele, se era de outro login). */
export async function inscrever(tenantId: string, usuarioId: string, i: InscricaoPush) {
  await prisma.pushInscricao.deleteMany({ where: { endpoint: i.endpoint } })
  await prisma.pushInscricao.create({ data: { tenantId, usuarioId, endpoint: i.endpoint, p256dh: i.keys.p256dh, auth: i.keys.auth } })
}

export async function desinscrever(tenantId: string, usuarioId: string, endpoint: string) {
  await prisma.pushInscricao.deleteMany({ where: { tenantId, usuarioId, endpoint } })
}

export interface MensagemPush { titulo: string; corpo: string; url?: string; tag?: string }

/** Manda para todos os aparelhos do usuário; aparelho que não existe mais é apagado. Nunca lança. */
export async function enviarPush(tenantId: string, usuarioId: string, m: MensagemPush) {
  if (!pushAtivo) return
  try {
    const lista = await prisma.pushInscricao.findMany({ where: { tenantId, usuarioId } })
    await Promise.all(lista.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(m),
          { TTL: 15 * 60, urgency: 'high' },
        )
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await prisma.pushInscricao.delete({ where: { id: s.id } }).catch(() => {})
        else console.warn('[push] falhou:', e?.statusCode ?? e?.message)
      }
    }))
  } catch (e: any) {
    console.warn('[push] erro ao enviar:', e?.message)
  }
}
