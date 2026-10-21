import { prisma } from '../../lib/prisma'

const DEFAULTS = {
  nomeRestaurante: 'Restaurante',
  impressoraLargura: 80,
  impressoraCopias: 1,
  impressoraAutoImprimir: false,
  impressoraTipo: 'usb',
  taxaServicoPct: 0,
  modoVenda: 'mesa',
  rfidAtivo: false,
}

/** Reclassifica o restaurante (não reaplica categorias: elas já podem estar em uso). */
export async function definirTipoComercio(tenantId: string, tipo: string | null) {
  await prisma.tenant.update({ where: { id: tenantId }, data: { tipoComercio: tipo } })
}

export async function buscar(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { tipoComercio: true } })
  const config = await prisma.configuracoes.upsert({
    where: { tenantId },
    update: {},
    create: {
      tenantId,
      ...DEFAULTS,
    },
  })

  return {
    id: config.id,
    tenantId: config.tenantId,
    tipoComercio: tenant?.tipoComercio ?? null,
    nomeRestaurante: config.nomeRestaurante,
    logoBase64: config.logoBase64,
    logoTamanho: config.logoTamanho,
    logoAlturaCustom: config.logoAlturaCustom,
    mensagemFicha: config.mensagemFicha,
    impressoraLargura: config.impressoraLargura,
    impressoraCopias: config.impressoraCopias,
    impressoraAutoImprimir: Boolean(config.impressoraAutoImprimir),
    impressoraTipo: config.impressoraTipo,
    impressoraHost: config.impressoraHost,
    impressoraPorta: config.impressoraPorta,
    taxaServicoPct: Number(config.taxaServicoPct),
    modoVenda: config.modoVenda,
    rfidAtivo: Boolean(config.rfidAtivo),
    vendaMobilePermitida: true, // fixo até integração com central
  }
}

interface AtualizarConfigData {
  nomeRestaurante?: string
  logoBase64?: string | null
  logoTamanho?: string | null
  logoAlturaCustom?: number | null
  mensagemFicha?: string | null
  impressoraLargura?: number
  impressoraCopias?: number
  impressoraAutoImprimir?: boolean
  impressoraTipo?: string
  impressoraHost?: string | null
  impressoraPorta?: number | null
  taxaServicoPct?: number
  modoVenda?: string
  rfidAtivo?: boolean
}

export async function atualizar(tenantId: string, data: AtualizarConfigData) {
  const sanitized: Record<string, unknown> = {}

  if (data.nomeRestaurante !== undefined) sanitized.nomeRestaurante = data.nomeRestaurante.trim() || DEFAULTS.nomeRestaurante
  if (data.logoBase64 !== undefined) sanitized.logoBase64 = data.logoBase64
  if (data.logoTamanho !== undefined) sanitized.logoTamanho = data.logoTamanho
  if (data.logoAlturaCustom !== undefined) sanitized.logoAlturaCustom = data.logoAlturaCustom
  if (data.mensagemFicha !== undefined) sanitized.mensagemFicha = data.mensagemFicha
  if (data.impressoraLargura !== undefined) sanitized.impressoraLargura = Number(data.impressoraLargura)
  if (data.impressoraCopias !== undefined) sanitized.impressoraCopias = Number(data.impressoraCopias)
  if (data.impressoraAutoImprimir !== undefined) sanitized.impressoraAutoImprimir = Boolean(data.impressoraAutoImprimir)
  if (data.impressoraTipo !== undefined) sanitized.impressoraTipo = data.impressoraTipo
  if (data.impressoraHost !== undefined) sanitized.impressoraHost = data.impressoraHost
  if (data.impressoraPorta !== undefined) sanitized.impressoraPorta = data.impressoraPorta
  if (data.taxaServicoPct !== undefined) sanitized.taxaServicoPct = Number(data.taxaServicoPct)
  if (data.modoVenda !== undefined) sanitized.modoVenda = data.modoVenda
  if (data.rfidAtivo !== undefined) sanitized.rfidAtivo = Boolean(data.rfidAtivo)

  const config = await prisma.configuracoes.upsert({
    where: { tenantId },
    update: sanitized,
    create: {
      tenantId,
      ...DEFAULTS,
      ...sanitized,
    },
  })

  return buscar(tenantId)
}

// ─── Acesso: recursos do plano que o administrador liga/desliga ────────────────

/**
 * RFID e venda pelo celular dependem do plano (tenant.rfidDisponivel /
 * vendaMobilePermitida, derivados do plano em platform/assinatura.ts). O
 * administrador decide se usa (rfidAtivo / vendaMobileAtiva). O QR do
 * celular só vale com caixa aberto.
 */
export async function acesso(tenantId: string) {
  const [tenant, cfg, caixa] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { rfidDisponivel: true, vendaMobilePermitida: true, plano: { select: { nome: true } } },
    }),
    buscar(tenantId).then(() => prisma.configuracoes.findFirst({ where: { tenantId } })),
    prisma.caixa.findFirst({ where: { tenantId, status: 'aberto' }, select: { id: true } }),
  ])
  return {
    plano: tenant?.plano?.nome ?? null,
    rfid:        { disponivel: Boolean(tenant?.rfidDisponivel),       ativo: Boolean(cfg?.rfidAtivo) },
    vendaMobile: { disponivel: Boolean(tenant?.vendaMobilePermitida), ativa: Boolean(cfg?.vendaMobileAtiva) },
    caixaAberto: Boolean(caixa),
  }
}

export async function atualizarAcesso(tenantId: string, data: { rfidAtivo?: boolean; vendaMobileAtiva?: boolean }) {
  const atual = await acesso(tenantId)
  if (data.rfidAtivo && !atual.rfid.disponivel)
    throw Object.assign(new Error('RFID não está incluído no seu plano'), { status: 403 })
  if (data.vendaMobileAtiva && !atual.vendaMobile.disponivel)
    throw Object.assign(new Error('Venda pelo celular não está incluída no seu plano'), { status: 403 })
  await prisma.configuracoes.updateMany({
    where: { tenantId },
    data: {
      ...(data.rfidAtivo !== undefined ? { rfidAtivo: data.rfidAtivo } : {}),
      ...(data.vendaMobileAtiva !== undefined ? { vendaMobileAtiva: data.vendaMobileAtiva } : {}),
    },
  })
  return acesso(tenantId)
}

/** Venda pelo celular liberada agora: plano + chave do admin + caixa aberto. Devolve o motivo quando não. */
export async function motivoSemCelular(tenantId: string): Promise<string | null> {
  const a = await acesso(tenantId)
  if (!a.vendaMobile.disponivel) return 'Venda pelo celular não está incluída no plano deste restaurante'
  if (!a.vendaMobile.ativa) return 'Venda pelo celular está desligada em Configurações → Acesso'
  if (!a.caixaAberto) return 'Abra o caixa antes: o acesso pelo celular só funciona com o caixa aberto'
  return null
}
