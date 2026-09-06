import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import * as Service from './configuracoes.service'

/**
 * Configurações do tenant.
 *
 * A versão anterior repassava o corpo inteiro para o service sem nenhuma
 * validação. Dois problemas concretos:
 *
 * - `taxaServicoPct` entrava sem limite. A coluna é Decimal(5,2), então
 *   qualquer valor acima de 999,99 estourava com erro cru do Prisma; e um
 *   valor como 300 era aceito e passava a multiplicar toda conta por quatro.
 * - `logoBase64` entrava sem limite de tamanho, encostando no bodyLimit de
 *   2 MB do Fastify e sendo devolvido inteiro em GET /configuracoes — que é
 *   chamado no boot de toda tela.
 */

const configBody = z.object({
  nomeRestaurante: z.string().trim().min(1).max(80).optional(),

  // ~700 KB de imagem. Acima disso a impressora térmica não aproveita, e o
  // payload passa a pesar em toda leitura de configuração.
  logoBase64: z.string().max(950_000, 'Logo acima de 700 KB').nullable().optional(),
  logoTamanho: z.enum(['pequeno', 'medio', 'grande', 'custom']).optional(),
  logoAlturaCustom: z.number().int().min(10).max(400).optional(),

  mensagemFicha: z.string().max(300).optional(),

  impressoraLargura: z.number().int().min(32).max(96).optional(),
  impressoraCopias: z.number().int().min(1).max(5).optional(),
  impressoraAutoImprimir: z.boolean().optional(),
  impressoraTipo: z.enum(['navegador', 'rede', 'usb']).optional(),
  impressoraHost: z.string().trim().max(120).optional(),
  impressoraPorta: z.number().int().min(1).max(65535).optional(),

  // O teto real. Acima de 30% não é taxa de serviço, é erro de digitação.
  taxaServicoPct: z.number().min(0).max(30, 'Taxa de serviço acima de 30%').optional(),

  modoVenda: z.enum(['mesa', 'balcao', 'ambos']).optional(),
  rfidAtivo: z.boolean().optional(),
})

export async function configuracoesRoutes(app: FastifyInstance) {
  // GET /api/configuracoes
  app.get('/', { preHandler: [requireTenant] }, async (request) =>
    Service.buscar(request.tenantId!),
  )

  // PUT /api/configuracoes
  app.put(
    '/',
    { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] },
    async (request, reply) => {
      const body = configBody.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.issues[0]?.message ?? 'Dados inválidos' })
      }
      return Service.atualizar(request.tenantId!, body.data)
    },
  )
}
