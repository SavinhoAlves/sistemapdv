import { z } from 'zod'

// identificador: código completo (1001-3), nome de usuário (joao) ou e-mail.
// `email` e `slug` continuam aceitos para clientes antigos do app.
export const loginSchema = z.object({
  identificador: z.string().optional(),
  email:         z.string().optional(),
  senha: z.string().min(1, 'Senha obrigatória'),
  slug: z.string().optional(),
}).transform((d, ctx) => {
  const identificador = (d.identificador || d.email || '').trim()
  if (!identificador) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o código ou o nome de usuário' })
    return z.NEVER
  }
  return { identificador, senha: d.senha, slug: d.slug }
})

export const loginRfidSchema = z.object({
  cartaoRfid: z.string().optional(),
  rfid:       z.string().optional(),
  // Ignorado: o restaurante é o do terminal (ver /auth/rfid)
  slug: z.string().optional(),
}).transform((d, ctx) => {
  const cartaoRfid = d.cartaoRfid || d.rfid || ''
  if (!cartaoRfid) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'RFID obrigatório' })
    return z.NEVER
  }
  return { cartaoRfid, slug: d.slug }
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export type LoginInput    = z.infer<typeof loginSchema>
export type LoginRfidInput = z.infer<typeof loginRfidSchema>
