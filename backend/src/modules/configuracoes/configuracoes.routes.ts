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

// Frontend envia snake_case; aceita também camelCase para compatibilidade futura.
const configBody = z.object({
  nome_restaurante: z.string().trim().min(1).max(80).optional(),

  // ~700 KB de imagem. Acima disso a impressora térmica não aproveita, e o
  // payload passa a pesar em toda leitura de configuração.
  logo_base64: z.string().max(950_000, 'Logo acima de 700 KB').nullable().optional(),
  logo_tamanho: z.string().optional(),
  logo_altura_custom: z.number().int().min(10).max(400).optional(),

  mensagem_ficha: z.string().max(300).optional(),

  impressora_largura: z.number().int().min(32).max(96).optional(),
  impressora_copias: z.number().int().min(1).max(5).optional(),
  impressora_auto_imprimir: z.boolean().optional(),
  // 'usb' é o valor legado no banco; 'windows' é o valor enviado pelo frontend atual
  impressora_tipo: z.enum(['navegador', 'rede', 'windows', 'usb']).optional(),
  impressora_host: z.string().trim().max(120).nullable().optional(),
  impressora_porta: z.number().int().min(1).max(65535).optional(),

  // O teto real. Acima de 30% não é taxa de serviço, é erro de digitação.
  taxa_servico_pct: z.number().min(0).max(30, 'Taxa de serviço acima de 30%').optional(),

  modo_venda: z.string().optional(),
  rfid_ativo: z.boolean().optional(),
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
      const d = body.data
      return Service.atualizar(request.tenantId!, {
        nomeRestaurante:       d.nome_restaurante,
        logoBase64:            d.logo_base64,
        logoTamanho:           d.logo_tamanho,
        logoAlturaCustom:      d.logo_altura_custom,
        mensagemFicha:         d.mensagem_ficha,
        impressoraLargura:     d.impressora_largura,
        impressoraCopias:      d.impressora_copias,
        impressoraAutoImprimir: d.impressora_auto_imprimir,
        impressoraTipo:        d.impressora_tipo,
        impressoraHost:        d.impressora_host,
        impressoraPorta:       d.impressora_porta,
        taxaServicoPct:        d.taxa_servico_pct,
        modoVenda:             d.modo_venda,
        rfidAtivo:             d.rfid_ativo,
      })
    },
  )
}
