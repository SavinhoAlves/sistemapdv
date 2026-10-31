import { prisma } from '../../lib/prisma'
import { enviarEmail, modeloEmail, urlDoApp } from '../../lib/email'
import { signConfirmarEmailToken, verifyConfirmarEmailToken } from '../../lib/jwt'

/**
 * Confirmação do e-mail de quem assina pelo site. O administrador nasce com
 * emailPendente e só entra no sistema depois de abrir o link (abrirSessao).
 */

export async function enviarConfirmacao(usuarioId: string) {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId }, include: { tenant: { select: { nome: true } } } })
  if (!u?.email) throw new Error('Usuário sem e-mail')
  const link = `${urlDoApp()}/confirmar-email?token=${encodeURIComponent(signConfirmarEmailToken(u.id, u.email))}`
  const { html, texto } = modeloEmail({
    titulo: 'Confirme o seu e-mail',
    paragrafos: [
      `Olá, ${u.nome.split(' ')[0]}!`,
      `Recebemos o cadastro do restaurante ${u.tenant.nome} no RestaurantePDV. Para liberar o seu acesso ao sistema, confirme que este e-mail é seu.`,
    ],
    botao: 'Confirmar e-mail',
    link,
    rodape: 'O link vale por 7 dias. Se você não fez este cadastro, ignore esta mensagem.',
  })
  await enviarEmail(u.email, 'Confirme o seu e-mail · RestaurantePDV', html, texto)
  return u.email
}

export async function confirmarEmail(token: string) {
  const p = verifyConfirmarEmailToken(token)
  if (!p) throw Object.assign(new Error('Este link é inválido ou já expirou. Entre no sistema para receber um novo.'), { status: 400 })
  const u = await prisma.usuario.findFirst({
    where: { id: p.sub, email: { equals: p.email, mode: 'insensitive' } },
    include: { tenant: { select: { nome: true } } },
  })
  if (!u) throw Object.assign(new Error('Este link não vale mais: o e-mail da conta mudou.'), { status: 400 })
  if (u.emailPendente) {
    await prisma.usuario.update({ where: { id: u.id }, data: { emailPendente: false, emailConfirmadoEm: new Date() } })
  }
  return { restaurante: u.tenant.nome, email: u.email, jaConfirmado: !u.emailPendente }
}
