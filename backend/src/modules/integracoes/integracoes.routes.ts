import path from 'path'
import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import { prisma } from '../../lib/prisma'

const mp: any = require(path.resolve(__dirname, '../../../src/services/mercadopago.service'))

async function getCfg(tenantId: string) {
  return prisma.configuracoes.findFirst({ where: { tenantId } })
}

export async function integracoesRoutes(app: FastifyInstance) {
  // GET /api/integracoes/mp — retorna config (token mascarado)
  app.get('/mp', { preHandler: [requireTenant] }, async (request, reply) => {
    try {
      const cfg = await getCfg(request.tenantId!)
      return {
        ativado:      cfg?.mpAtivado ?? false,
        token_salvo:  !!cfg?.mpAccessToken,
        token_sufixo: cfg?.mpAccessToken ? cfg.mpAccessToken.slice(-4) : null,
        device_id:    cfg?.mpDeviceId ?? null,
      }
    } catch (e: any) {
      return reply.status(500).send({ error: e.message })
    }
  })

  // PUT /api/integracoes/mp — salva config (admin)
  app.put('/mp', { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }, async (request, reply) => {
    try {
      const { ativado, access_token, accessToken, device_id, deviceId } = request.body as any
      const token  = access_token ?? accessToken
      const device = device_id ?? deviceId

      const data: any = { mpAtivado: !!ativado, mpDeviceId: device ?? null }
      if (token?.trim()) data.mpAccessToken = token.trim()

      await prisma.configuracoes.updateMany({
        where: { tenantId: request.tenantId! },
        data,
      })
      return { success: true }
    } catch (e: any) {
      return reply.status(500).send({ error: e.message })
    }
  })

  // GET /api/integracoes/mp/dispositivos
  app.get('/mp/dispositivos', { preHandler: [requireTenant] }, async (request, reply) => {
    try {
      const cfg = await getCfg(request.tenantId!)
      if (!cfg?.mpAccessToken) return reply.status(400).send({ error: 'Token MP não configurado' })
      const data = await mp.listarDispositivos(cfg.mpAccessToken)
      return data
    } catch (e: any) {
      return reply.status(502).send({ error: e.message })
    }
  })

  // POST /api/integracoes/mp/pagamento
  app.post('/mp/pagamento', { preHandler: [requireTenant] }, async (request, reply) => {
    try {
      const cfg = await getCfg(request.tenantId!)
      if (!cfg?.mpAtivado)      return reply.status(400).send({ error: 'Integração MP desativada' })
      if (!cfg?.mpAccessToken)  return reply.status(400).send({ error: 'Token MP não configurado' })
      if (!cfg?.mpDeviceId)     return reply.status(400).send({ error: 'Dispositivo MP não selecionado' })

      const { valor, tipo, descricao, referencia } = request.body as any
      if (!valor || !tipo) return reply.status(400).send({ error: 'valor e tipo são obrigatórios' })

      const data = await mp.criarIntencao(cfg.mpAccessToken, cfg.mpDeviceId, { valor, tipo, descricao, referencia })
      return data
    } catch (e: any) {
      return reply.status(502).send({ error: e.message })
    }
  })

  // GET /api/integracoes/mp/pagamento/:id
  app.get('/mp/pagamento/:id', { preHandler: [requireTenant] }, async (request, reply) => {
    try {
      const cfg = await getCfg(request.tenantId!)
      if (!cfg?.mpAccessToken) return reply.status(400).send({ error: 'Token MP não configurado' })
      const { id } = request.params as any
      const data = await mp.verificarIntencao(cfg.mpAccessToken, id)
      return data
    } catch (e: any) {
      return reply.status(502).send({ error: e.message })
    }
  })

  // DELETE /api/integracoes/mp/pagamento/:id
  app.delete('/mp/pagamento/:id', { preHandler: [requireTenant] }, async (request, reply) => {
    try {
      const cfg = await getCfg(request.tenantId!)
      if (!cfg?.mpAccessToken || !cfg?.mpDeviceId) return reply.status(400).send({ error: 'MP não configurado' })
      const { id } = request.params as any
      await mp.cancelarIntencao(cfg.mpAccessToken, cfg.mpDeviceId, id)
      return { success: true }
    } catch (e: any) {
      return reply.status(502).send({ error: e.message })
    }
  })
}
