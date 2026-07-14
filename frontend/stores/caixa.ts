import { defineStore } from 'pinia'

// Status do caixa é sempre buscado via useApi().get('/caixa/atual') nas
// páginas que precisam dele (mesma chamada autenticada em todo lugar) e
// gravado direto no state — essa store guarda só o resultado compartilhado.
export const useCaixaStore = defineStore('caixa', {
  state: () => ({
    aberto: false,
    loading: false,
    caixaAtual: null as any
  })
})
