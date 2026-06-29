import { defineStore } from 'pinia'
import { useApi } from '~/services/api'

interface Config {
  nome_restaurante: string
  logo_base64: string | null
  mensagem_ficha: string
  impressora_largura: number
  impressora_copias: number
  impressora_auto_imprimir: boolean
}

export const useConfigStore = defineStore('configuracoes', {
  state: (): Config & { carregado: boolean } => ({
    nome_restaurante:         'Restaurante PDV',
    logo_base64:              null,
    mensagem_ficha:           'Obrigado pela preferência!',
    impressora_largura:       80,
    impressora_copias:        1,
    impressora_auto_imprimir: false,
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
