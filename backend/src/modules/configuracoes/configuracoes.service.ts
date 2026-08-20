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

export async function buscar(tenantId: string) {
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
