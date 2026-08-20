import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import * as Service from './configuracoes.service'

export async function configuracoesRoutes(app: FastifyInstance) {
  // GET /api/configuracoes
  app.get('/', { preHandler: [requireTenant] }, async (request, reply) => {
    return Service.buscar(request.tenantId!)
  })

  // PUT /api/configuracoes
  app.put('/', { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }, async (request, reply) => {
    const body = request.body as any
    const result = await Service.atualizar(request.tenantId!, {
      nomeRestaurante: body.nomeRestaurante,
      logoBase64: body.logoBase64,
      logoTamanho: body.logoTamanho,
      logoAlturaCustom: body.logoAlturaCustom,
      mensagemFicha: body.mensagemFicha,
      impressoraLargura: body.impressoraLargura,
      impressoraCopias: body.impressoraCopias,
      impressoraAutoImprimir: body.impressoraAutoImprimir,
      impressoraTipo: body.impressoraTipo,
      impressoraHost: body.impressoraHost,
      impressoraPorta: body.impressoraPorta,
      taxaServicoPct: body.taxaServicoPct,
      modoVenda: body.modoVenda,
      rfidAtivo: body.rfidAtivo,
    })
    return result
  })
}
