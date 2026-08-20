import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
  slug: z.string().min(1, 'Slug do restaurante obrigatório'),
})

export const loginRfidSchema = z.object({
  cartaoRfid: z.string().optional(),
  rfid:       z.string().optional(),
  slug: z.string().min(1, 'Slug do restaurante obrigatório'),
}).transform(d => ({
  cartaoRfid: d.cartaoRfid || d.rfid || '',
  slug: d.slug,
}))

export const loginPinSchema = z.object({
  pin: z.string().min(4, 'PIN deve ter pelo menos 4 dígitos'),
  slug: z.string().min(1, 'Slug do restaurante obrigatório'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export type LoginInput    = z.infer<typeof loginSchema>
export type LoginRfidInput = z.infer<typeof loginRfidSchema>
export type LoginPinInput  = z.infer<typeof loginPinSchema>
