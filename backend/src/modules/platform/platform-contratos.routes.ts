import type { FastifyInstance } from 'fastify'
import { requirePlatform } from '../../middlewares/tenant.middleware'
import { prisma } from '../../lib/prisma'
import { registrarVersao, type DadosContrato } from './contrato'
import { gerarContratoPdf } from './contrato-pdf'

/** Versões do contrato de cada restaurante e o PDF de cada uma. */
export async function platformContratosRoutes(app: FastifyInstance) {
  // GET /:tenantId/versoes — da mais nova para a mais antiga
  app.get('/:tenantId/versoes', { preHandler: requirePlatform }, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string }
    const listar = () => prisma.contratoVersao.findMany({
      where: { tenantId },
      orderBy: { numero: 'desc' },
      select: { id: true, numero: true, motivo: true, enviadoEm: true, createdAt: true },
    })
    let versoes = await listar()
    // Contratos de antes das versões ganham a versão 1 na primeira consulta
    if (!versoes.length && await registrarVersao(tenantId, 'Versão inicial')) versoes = await listar()
    return reply.send(versoes)
  })

  // GET /:tenantId/versoes/:numero/pdf — ?download=1 baixa em vez de abrir
  app.get('/:tenantId/versoes/:numero/pdf', { preHandler: requirePlatform }, async (request, reply) => {
    const { tenantId, numero } = request.params as { tenantId: string; numero: string }
    const { download } = request.query as { download?: string }
    const v = await prisma.contratoVersao.findUnique({
      where: { tenantId_numero: { tenantId, numero: Number(numero) || 0 } },
    })
    if (!v) return reply.status(404).send({ error: 'Versão do contrato não encontrada' })

    const dados = v.dados as unknown as DadosContrato
    const pdf = await gerarContratoPdf(dados, { numero: v.numero, criadaEm: v.createdAt })
    const nome = `Contrato-${dados.contratante.codigo}-v${v.numero}.pdf`
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${nome}"`)
      .header('Cache-Control', 'no-store')
      .send(pdf)
  })

  // POST /:tenantId/versoes/:numero/enviado — { enviado: boolean }
  app.post('/:tenantId/versoes/:numero/enviado', { preHandler: requirePlatform }, async (request, reply) => {
    const { tenantId, numero } = request.params as { tenantId: string; numero: string }
    const { enviado = true } = (request.body ?? {}) as { enviado?: boolean }
    try {
      const v = await prisma.contratoVersao.update({
        where: { tenantId_numero: { tenantId, numero: Number(numero) || 0 } },
        data: { enviadoEm: enviado ? new Date() : null },
        select: { id: true, numero: true, motivo: true, enviadoEm: true, createdAt: true },
      })
      return reply.send(v)
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Versão do contrato não encontrada' })
      throw err
    }
  })
}
