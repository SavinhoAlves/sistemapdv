import { defineStore } from 'pinia'
import { useApi } from '~/services/api'

export const useCaixaStore = defineStore('caixa', {
  state: () => ({
    aberto: false,
    loading: false,
    inicializado: false,
    caixaAtual: null as any
  }),

  actions: {

    async carregarStatus() {
      try {
        this.loading = true
        const api = useApi()
        const resposta = await api.get<any>('/caixa/atual')
        this.aberto     = resposta?.aberto || false
        this.caixaAtual = resposta?.caixa  || null
      } catch {
        this.aberto     = false
        this.caixaAtual = null
      } finally {
        this.loading      = false
        this.inicializado = true
      }
    },

    async abrir(usuarioId: number) {
      try {
        this.loading = true
        const api = useApi()
        const resposta = await api.post<any>('/caixa/abrir', { usuario_id: usuarioId })
        await this.carregarStatus()
        return resposta
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    async fechar(caixaId: number) {
      try {
        this.loading = true
        const api = useApi()
        const resposta = await api.post<any>('/caixa/fechar', { caixa_id: caixaId })
        this.aberto     = false
        this.caixaAtual = null
        return resposta
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    // ======================
    // RESET
    // ======================
    reset() {
      this.aberto = false
      this.caixaAtual = null
      this.loading = false
    }
  }
})