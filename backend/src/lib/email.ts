import nodemailer from 'nodemailer'

/**
 * Envio de e-mail por SMTP. Hoje sai pelo Gmail (senha de app); para trocar
 * pelo e-mail da plataforma basta mudar as variáveis SMTP_* e EMAIL_REMETENTE.
 * Sem SMTP_HOST o envio fica desligado e quem chama segue sem e-mail.
 */

const porta = Number(process.env.SMTP_PORT || 465)

const transporte = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: porta,
      secure: porta === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null

export const emailConfigurado = () => !!transporte

/** Endereço do sistema usado nos links dos e-mails */
export const urlDoApp = () => (process.env.APP_URL || 'https://app.restaurantepdv.com.br').replace(/\/$/, '')

export async function enviarEmail(para: string, assunto: string, html: string, texto: string) {
  if (!transporte) throw new Error('Envio de e-mail não configurado (SMTP_HOST)')
  await transporte.sendMail({
    from: process.env.EMAIL_REMETENTE || `RestaurantePDV <${process.env.SMTP_USER}>`,
    to: para,
    subject: assunto,
    html,
    text: texto,
  })
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Corpo padrão: título, parágrafos e um botão (cores da marca, tema claro) */
export function modeloEmail(o: { titulo: string; paragrafos: string[]; botao: string; link: string; rodape?: string }) {
  const ps = o.paragrafos.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#3f3f46">${esc(p)}</p>`).join('')
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:800;color:#18181b;padding-bottom:24px">Restaurante<span style="color:#f97316">PDV</span></td></tr>
<tr><td><h1 style="margin:0 0 16px;font-size:22px;color:#18181b">${esc(o.titulo)}</h1>${ps}
<p style="margin:24px 0"><a href="${esc(o.link)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 26px;border-radius:12px">${esc(o.botao)}</a></p>
<p style="margin:0 0 6px;font-size:13px;color:#71717a">Se o botão não abrir, copie este endereço no navegador:</p>
<p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${esc(o.link)}" style="color:#ea580c">${esc(o.link)}</a></p>
${o.rodape ? `<p style="margin:0;font-size:13px;color:#a1a1aa">${esc(o.rodape)}</p>` : ''}
</td></tr></table></td></tr></table></body></html>`
  const texto = [o.titulo, '', ...o.paragrafos, '', `${o.botao}: ${o.link}`, ...(o.rodape ? ['', o.rodape] : [])].join('\n')
  return { html, texto }
}
