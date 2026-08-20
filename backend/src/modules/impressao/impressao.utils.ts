import path from 'path'
import { prisma } from '../../lib/prisma'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const impressaoSvc: any = require(path.resolve(__dirname, '../../../src/services/impressao.service'))

export const { montarCupomTeste, montarFichas, montarConta, montarFechamento,
               enviarParaImpressora, logoParaRasterEscPos, LOGO_LARGURAS } = impressaoSvc

export async function carregarConfig(tenantId: string) {
  return prisma.configuracoes.findFirst({ where: { tenantId } })
}

export function tamanhoLogo(cfg: any): number {
  if (cfg?.logoTamanho === 'personalizado') {
    return Math.max(50, Math.min(600, Number(cfg.logoAlturaCustom) || 320))
  }
  return LOGO_LARGURAS?.[cfg?.logoTamanho] ?? 0.60
}

export function cfgToLegacy(cfg: any) {
  return {
    nome_restaurante:         cfg?.nomeRestaurante ?? 'Restaurante PDV',
    logo_base64:              cfg?.logoBase64 ?? null,
    logo_tamanho:             cfg?.logoTamanho ?? 'media',
    logo_altura_custom:       cfg?.logoAlturaCustom ?? 320,
    mensagem_ficha:           cfg?.mensagemFicha ?? 'Obrigado pela preferência!',
    impressora_largura:       cfg?.impressoraLargura ?? 80,
    impressora_copias:        cfg?.impressoraCopias ?? 1,
    impressora_auto_imprimir: cfg?.impressoraAutoImprimir ?? false,
    impressora_tipo:          cfg?.impressoraTipo ?? 'navegador',
    impressora_host:          cfg?.impressoraHost ?? '',
    impressora_porta:         cfg?.impressoraPorta ?? 9100,
  }
}
