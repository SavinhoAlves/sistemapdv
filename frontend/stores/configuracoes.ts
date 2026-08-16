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
    rfid_ativo:               true,
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
        const data = await api.get<Config>('/configuracoes')
        this.nome_restaurante         = data.nome_restaurante         || 'Restaurante PDV'
        this.logo_base64              = data.logo_base64              || null
        this.logo_tamanho             = (['pequena','media','grande','personalizado'].includes(data.logo_tamanho) ? data.logo_tamanho : 'media') as 'pequena' | 'media' | 'grande' | 'personalizado'
        this.logo_altura_custom       = Math.max(50, Math.min(600, Number(data.logo_altura_custom) || 320))
        this.mensagem_ficha           = data.mensagem_ficha           || 'Obrigado pela preferência!'
        this.impressora_largura       = Number(data.impressora_largura)       || 80
        this.impressora_copias        = Number(data.impressora_copias)        || 1
        this.impressora_auto_imprimir = Boolean(data.impressora_auto_imprimir)
        this.impressora_tipo          = data.impressora_tipo                  || 'navegador'
        this.impressora_host          = data.impressora_host                  || ''
        this.impressora_porta         = Number(data.impressora_porta)         || 9100
        this.taxa_servico_pct         = Number(data.taxa_servico_pct ?? 10)
        this.modo_venda               = (['mesas','direta','ambos'].includes(data.modo_venda) ? data.modo_venda : 'mesas') as 'mesas' | 'direta' | 'ambos'
        this.rfid_ativo               = data.rfid_ativo ?? true
        this.venda_mobile_permitida   = data.venda_mobile_permitida ?? true
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
