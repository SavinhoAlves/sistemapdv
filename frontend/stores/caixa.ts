import { defineStore } from 'pinia'

export const useCaixaStore = defineStore('caixa', {
  state: () => ({
    aberto: false,

    loading: false,

    caixaAtual: null as any
  }),

  actions: {

    // ======================
    // CARREGAR STATUS
    // ======================
    async carregarStatus() {
      const config = useRuntimeConfig()

      try {

        this.loading = true

        const resposta = await $fetch<any>(
          `${config.public.apiUrl}/api/caixa/atual`
        )

        this.aberto = resposta?.aberto || false

        this.caixaAtual = resposta?.caixa || null

      } catch (error) {

        console.error(
          'Erro ao carregar status do caixa:',
          error
        )

        this.aberto = false
        this.caixaAtual = null

      } finally {
        this.loading = false
      }
    },

    // ======================
    // ABRIR CAIXA
    // ======================
    async abrir(usuarioId: number) {
      const config = useRuntimeConfig()

      try {

        this.loading = true

        const resposta = await $fetch<any>(
          `${config.public.apiUrl}/api/caixa/abrir`,
          {
            method: 'POST',

            body: {
              usuario_id: usuarioId
            }
          }
        )

        await this.carregarStatus()

        return resposta

      } catch (error) {

        console.error(
          'Erro ao abrir caixa:',
          error
        )

        throw error

      } finally {
        this.loading = false
      }
    },

    // ======================
    // FECHAR CAIXA
    // ======================
    async fechar(caixaId: number) {
      const config = useRuntimeConfig()

      try {

        this.loading = true

        const resposta = await $fetch<any>(
          `${config.public.apiUrl}/api/caixa/fechar`,
          {
            method: 'POST',

            body: {
              caixa_id: caixaId
            }
          }
        )

        this.aberto = false
        this.caixaAtual = null

        return resposta

      } catch (error) {

        console.error(
          'Erro ao fechar caixa:',
          error
        )

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