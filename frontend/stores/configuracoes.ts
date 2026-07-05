import { defineStore } from 'pinia'
import { useApi } from '~/services/api'

interface Config {
  nome_restaurante: string
  logo_base64: string | null
  mensagem_ficha: string
  impressora_largura: number
  impressora_copias: number
  impressora_auto_imprimir: boolean
  impressora_tipo: 'navegador' | 'rede' | 'windows'
  impressora_host: string
  impressora_porta: number
  taxa_servico_pct: number
}

export const useConfigStore = defineStore('configuracoes', {
  state: (): Config & { carregado: boolean } => ({
    nome_restaurante:         'Restaurante PDV',
    logo_base64:              null,
    mensagem_ficha:           'Obrigado pela preferência!',
    impressora_largura:       80,
    impressora_copias:        1,
    impressora_auto_imprimir: false,
    impressora_tipo:          'navegador',
    impressora_host:          '',
    impressora_porta:         9100,
    taxa_servico_pct:         10,
    carregado: false
  }),

  actions: {
    async carregar() {
      if (this.carregado) return
      try {
        const api = useApi()
        const data = await api.get<Config>('/configuracoes')
        this.nome_restaurante         = data.nome_restaurante         || 'Restaurante PDV'
        this.logo_base64              = data.logo_base64              || null
        this.mensagem_ficha           = data.mensagem_ficha           || 'Obrigado pela preferência!'
        this.impressora_largura       = Number(data.impressora_largura)       || 80
        this.impressora_copias        = Number(data.impressora_copias)        || 1
        this.impressora_auto_imprimir = Boolean(data.impressora_auto_imprimir)
        this.impressora_tipo          = data.impressora_tipo                  || 'navegador'
        this.impressora_host          = data.impressora_host                  || ''
        this.impressora_porta         = Number(data.impressora_porta)         || 9100
        this.taxa_servico_pct         = Number(data.taxa_servico_pct ?? 10)
        this.carregado = true
      } catch {}
    },

    async salvar(dados: Config) {
      const api = useApi()
      await api.put('/configuracoes', dados)
      Object.assign(this, dados)
    }
  }
})
