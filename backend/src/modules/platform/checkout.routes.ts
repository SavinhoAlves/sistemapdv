import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { contratar, CheckoutErro } from './checkout.service'

const corpo = z.object({
  planoId:     z.string().min(1, 'Escolha o plano'),
  ciclo:       z.enum(['mensal', 'anual']).default('mensal'),
  restaurante: z.string().trim().min(2, 'Informe o nome do restaurante').max(80),
  documento:   z.string().trim().min(11, 'Informe o CNPJ ou CPF').max(20),
  responsavel: z.string().trim().min(3, 'Informe o nome do responsável').max(80),
  email:       z.string().trim().email('E-mail inválido').max(120),
  telefone:    z.string().trim().min(10, 'Informe o WhatsApp com DDD').max(20),
  senha:       z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres').max(100),
})

/** POST /api/publico/assinar — contratação pelo site (cria o restaurante e devolve o link de pagamento). */
export async function checkoutRoutes(app: FastifyInstance) {
  app.post('/assinar', { config: { public: true, rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (request, reply) => {
    const parsed = corpo.safeParse(request.body ?? {})
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' })
    try {
      return await contratar(parsed.data)
    } catch (e: any) {
      if (e instanceof CheckoutErro) return reply.status(e.status).send({ error: e.message })
      if (e?.code === 'P2002') return reply.status(409).send({ error: 'Já existe um cadastro com estes dados. Fale com a equipe de vendas.' })
      request.log.error({ err: e }, 'checkout')
      return reply.status(500).send({ error: 'Não deu para concluir agora. Tente de novo ou fale com a equipe de vendas.' })
    }
  })
}
