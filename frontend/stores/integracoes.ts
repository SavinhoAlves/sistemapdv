import { defineStore } from 'pinia'
import { useApi } from '~/services/api'

interface MpConfig {
  ativado: boolean
  token_salvo: boolean
  token_sufixo: string | null
  device_id: string | null
}

export const useIntegracoesStore = defineStore('integracoes', {
  state: () => ({
    mp: {
      ativado:      false,
      token_salvo:  false,
      token_sufixo: null as string | null,
      device_id:    null as string | null
    } as MpConfig,
    carregado: false
  }),

  getters: {
    mpAtivo: (state) => state.mp.ativado && state.mp.token_salvo && !!state.mp.device_id
  },

  actions: {
    async carregar() {
      if (this.carregado) return
      try {
        const api = useApi()
        const data = await api.get<MpConfig>('/integracoes/mp')
        Object.assign(this.mp, data)
        this.carregado = true
      } catch {}
    },

    async salvar(dados: { ativado: boolean; access_token?: string; device_id: string | null }) {
      const api = useApi()
      await api.put('/integracoes/mp', dados)
      this.mp.ativado   = dados.ativado
      this.mp.device_id = dados.device_id
      if (dados.access_token) {
        this.mp.token_salvo  = true
        this.mp.token_sufixo = dados.access_token.slice(-4)
      }
    },

    async listarDispositivos() {
      const api = useApi()
      return api.get<{ devices: any[] }>('/integracoes/mp/dispositivos')
    },

    async criarPagamento(dados: { valor: number; tipo: string; descricao?: string; referencia?: string }) {
      const api = useApi()
      return api.post<any>('/integracoes/mp/pagamento', dados)
    },

    async verificarPagamento(intentId: string) {
      const api = useApi()
      return api.get<any>(`/integracoes/mp/pagamento/${intentId}`)
    },

    async cancelarPagamento(intentId: string) {
      const api = useApi()
      return api.delete(`/integracoes/mp/pagamento/${intentId}`)
    }
  }
})
