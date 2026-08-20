import { defineStore } from 'pinia'
import { useApi } from '~/services/api'

interface Config {
  nome_restaurante: string
  logo_base64: string | null
  logo_tamanho: 'pequena' | 'media' | 'grande' | 'personalizado'
  logo_altura_custom: number
  mensagem_ficha: string
  impressora_largura: number
  impressora_copias: number
  impressora_auto_imprimir: boolean
  impressora_tipo: 'navegador' | 'rede' | 'windows'
  impressora_host: string
  impressora_porta: number
  taxa_servico_pct: number
  modo_venda: 'mesas' | 'direta' | 'ambos'
  rfid_ativo: boolean
  venda_mobile_permitida: boolean
}

export const useConfigStore = defineStore('configuracoes', {
  state: (): Config & { carregado: boolean; ultimaCarregada: number } => ({
    nome_restaurante:         'Restaurante PDV',
    logo_base64:              null,
    logo_tamanho:             'media',
    logo_altura_custom:       320,
    mensagem_ficha:           'Obrigado pela preferência!',
    impressora_largura:       80,
    impressora_copias:        1,
    impressora_auto_imprimir: false,
    impressora_tipo:          'navegador',
    impressora_host:          '',
    impressora_porta:         9100,
    taxa_servico_pct:         10,
    modo_venda:               'mesas' as 'mesas' | 'direta' | 'ambos',
    rfid_ativo:               false,
    venda_mobile_permitida:   true,
    carregado:       false,
    ultimaCarregada: 0
  }),

  getters: {
    impressaoDireta: (state) => state.impressora_tipo !== 'navegador'
  },

  actions: {
    async carregar() {
      // Re-fetch se nunca carregou ou se passou mais de 45 segundos
      if (this.carregado && Date.now() - this.ultimaCarregada < 45_000) return
      try {
        const api = useApi()
        const raw = await api.get<any>('/configuracoes')

        // Nova API retorna camelCase; aceita ambos os formatos para compatibilidade
        const d = raw as any
        const nomeRestaurante       = d.nomeRestaurante       ?? d.nome_restaurante
        const logoBase64            = d.logoBase64            ?? d.logo_base64
        const logoTamanho           = d.logoTamanho           ?? d.logo_tamanho
        const logoAlturaCustom      = d.logoAlturaCustom      ?? d.logo_altura_custom
        const mensagemFicha         = d.mensagemFicha         ?? d.mensagem_ficha
        const impressoraLargura     = d.impressoraLargura     ?? d.impressora_largura
        const impressoraCopias      = d.impressoraCopias      ?? d.impressora_copias
        const impressoraAutoImprimir = d.impressoraAutoImprimir ?? d.impressora_auto_imprimir
        const impressoraTipo        = d.impressoraTipo        ?? d.impressora_tipo
        const impressoraHost        = d.impressoraHost        ?? d.impressora_host
        const impressoraPorta       = d.impressoraPorta       ?? d.impressora_porta
        const taxaServicoPct        = d.taxaServicoPct        ?? d.taxa_servico_pct
        const modoVenda             = d.modoVenda             ?? d.modo_venda
        const rfidAtivo             = d.rfidAtivo             ?? d.rfid_ativo
        const vendaMobilePermitida  = d.vendaMobilePermitida  ?? d.venda_mobile_permitida

        this.nome_restaurante         = nomeRestaurante         || 'Restaurante PDV'
        this.logo_base64              = logoBase64              || null
        this.logo_tamanho             = (['pequena','media','grande','personalizado'].includes(logoTamanho) ? logoTamanho : 'media') as 'pequena' | 'media' | 'grande' | 'personalizado'
        this.logo_altura_custom       = Math.max(50, Math.min(600, Number(logoAlturaCustom) || 320))
        this.mensagem_ficha           = mensagemFicha           || 'Obrigado pela preferência!'
        this.impressora_largura       = Number(impressoraLargura)     || 80
        this.impressora_copias        = Number(impressoraCopias)      || 1
        this.impressora_auto_imprimir = Boolean(impressoraAutoImprimir)
        this.impressora_tipo          = impressoraTipo                || 'navegador'
        this.impressora_host          = impressoraHost                || ''
        this.impressora_porta         = Number(impressoraPorta)       || 9100
        this.taxa_servico_pct         = Number(taxaServicoPct ?? 10)
        this.modo_venda               = (['mesas','direta','ambos'].includes(modoVenda) ? modoVenda : 'mesas') as 'mesas' | 'direta' | 'ambos'
        this.rfid_ativo               = rfidAtivo                    ?? false
        this.venda_mobile_permitida   = vendaMobilePermitida         ?? true
        this.carregado       = true
        this.ultimaCarregada = Date.now()
      } catch {}
    },

    async salvar(dados: Omit<Config, 'venda_mobile_permitida'>) {
      const api = useApi()
      await api.put('/configuracoes', dados)
      Object.assign(this, dados)
      this.ultimaCarregada = Date.now()
    },

    invalidar() {
      this.carregado       = false
      this.ultimaCarregada = 0
    }
  }
})
