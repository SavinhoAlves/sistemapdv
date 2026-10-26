import type { FastifyInstance } from 'fastify'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { createSign } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import { prisma } from '../../lib/prisma'
import {
  carregarConfig, cfgToLegacy, tamanhoLogo,
  montarCupomTeste, enviarParaImpressora, logoParaRasterEscPos,
} from '../impressao/impressao.utils'

const execFileAsync = promisify(execFile)

const DESTINOS_VALIDOS = ['caixa', 'cozinha', 'bar']
// qz: USB do computador do caixa pelo QZ Tray (o navegador manda os bytes)
const TIPOS_VALIDOS    = ['navegador', 'rede', 'windows', 'qz']

function normalizar(body: any) {
  return {
    nome:    String(body.nome || 'Impressora').slice(0, 100),
    destino: DESTINOS_VALIDOS.includes(body.destino) ? body.destino : 'caixa',
    tipo:    TIPOS_VALIDOS.includes(body.tipo) ? body.tipo : 'navegador',
    host:    body.host || null,
    porta:   Number(body.porta) || 9100,
    largura: [58, 80].includes(Number(body.largura)) ? Number(body.largura) : 80,
    copias:  Math.min(5, Math.max(1, Number(body.copias) || 1)),
    ativo:   body.ativo !== false && body.ativo !== 0,
  }
}

/**
 * Impressão direta (USB pelo Windows e rede pela porta 9100) só funciona com o
 * servidor dentro do restaurante. Na nuvem (VPS Linux) ele não alcança essas
 * impressoras: aí vale o tipo Navegador. IMPRESSAO_DIRETA=1 força ligar.
 */
const impressaoDireta = () => process.platform === 'win32' || process.env.IMPRESSAO_DIRETA === '1'

/**
 * Assinatura do QZ Tray: com certificado, o QZ Tray pergunta uma vez se confia
 * no RestaurantePDV e lembra a resposta (pedido anônimo pergunta toda vez).
 * Vêm de QZ_CERT_B64 / QZ_KEY_B64 (base64 do PEM) ou dos arquivos
 * certificado.pem e chave.pem em QZ_DIR (padrão /srv/restaurantepdv/qz).
 * A chave privada nunca sai daqui: o navegador só recebe a assinatura.
 */
const QZ_DIR = process.env.QZ_DIR || '/srv/restaurantepdv/qz'
function lerPem(env: string, arquivo: string) {
  const v = process.env[env]
  if (v) return Buffer.from(v, 'base64').toString('utf8')
  try { return readFileSync(join(QZ_DIR, arquivo), 'utf8') } catch { return null }
}
const QZ_CERT = lerPem('QZ_CERT_B64', 'certificado.pem')
const QZ_KEY  = lerPem('QZ_KEY_B64', 'chave.pem')

export async function impressorasRoutes(app: FastifyInstance) {
  // Certificado público (vazio = QZ Tray em modo anônimo)
  app.get('/qz/certificado', { preHandler: [requireTenant] }, async () => ({ certificado: QZ_CERT && QZ_KEY ? QZ_CERT : '' }))

  // Assina o pedido do QZ Tray (SHA512, como configurado no navegador)
  app.post('/qz/assinar', { preHandler: [requireTenant] }, async (request, reply) => {
    const dados = (request.body as any)?.dados
    if (!QZ_KEY) return reply.status(404).send({ error: 'Assinatura do QZ Tray não configurada' })
    if (typeof dados !== 'string' || !dados || dados.length > 20000) return reply.status(400).send({ error: 'Pedido inválido' })
    const assinatura = createSign('RSA-SHA512').update(dados).sign(QZ_KEY, 'base64')
    return { assinatura }
  })

  app.get('/ambiente', { preHandler: [requireTenant] }, async () => ({ impressaoDireta: impressaoDireta() }))

  // Lista impressoras instaladas no Windows via Get-Printer (PowerShell)
  app.get('/instaladas', { preHandler: [requireTenant] }, async (_request, reply) => {
    if (process.platform !== 'win32') return reply.send({ impressoras: [], disponivel: false })
    try {
      const { stdout } = await execFileAsync('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-Command', '(Get-Printer | Select-Object -ExpandProperty Name) -join "|"',
      ], { timeout: 6000 })
      const nomes = stdout.trim().split('|').map(s => s.trim()).filter(Boolean)
      return reply.send({ impressoras: nomes })
    } catch {
      return reply.send({ impressoras: [] })
    }
  })

  app.get('/', { preHandler: [requireTenant] }, async (request) => {
    return prisma.impressora.findMany({
      where: { tenantId: request.tenantId! },
      orderBy: [{ destino: 'asc' }, { createdAt: 'asc' }],
    })
  })

  app.post('/', { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }, async (request, reply) => {
    const dados = normalizar(request.body as any)
    const nova = await prisma.impressora.create({
      data: { tenantId: request.tenantId!, ...dados },
    })
    return reply.status(201).send(nova)
  })

  app.put('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }, async (request, reply) => {
    const { id } = request.params as any
    const dados  = normalizar(request.body as any)
    try {
      const atualizada = await prisma.impressora.update({
        where: { id, tenantId: request.tenantId! },
        data: dados,
      })
      return reply.send(atualizada)
    } catch {
      return reply.status(404).send({ error: 'Impressora não encontrada' })
    }
  })

  app.delete('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }, async (request, reply) => {
    const { id } = request.params as any
    try {
      await prisma.impressora.delete({ where: { id, tenantId: request.tenantId! } })
      return reply.send({ success: true })
    } catch {
      return reply.status(404).send({ error: 'Impressora não encontrada' })
    }
  })

  app.post('/:id/teste', { preHandler: [requireTenant, requirePermissao('gerenciarConfiguracoes')] }, async (request, reply) => {
    const { id } = request.params as any
    const impressora = await prisma.impressora.findFirst({ where: { id, tenantId: request.tenantId! } })
    if (!impressora) return reply.status(404).send({ error: 'Impressora não encontrada' })
    if (impressora.tipo === 'navegador') {
      return reply.status(400).send({ error: 'Impressão via navegador não suporta teste direto' })
    }
    try {
      const cfg    = await carregarConfig(request.tenantId!)
      const config = {
        ...cfgToLegacy(cfg),
        impressora_tipo:    impressora.tipo,
        impressora_host:    impressora.host,
        impressora_porta:   impressora.porta,
        impressora_largura: impressora.largura,
        impressora_copias:  impressora.copias,
      }
      const logo  = await logoParaRasterEscPos(config.logo_base64, config.impressora_largura, tamanhoLogo(cfg))
      const cupom = montarCupomTeste(config, logo)
      await enviarParaImpressora(cupom, config)
      return reply.send({ success: true, message: 'Cupom de teste enviado' })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}
