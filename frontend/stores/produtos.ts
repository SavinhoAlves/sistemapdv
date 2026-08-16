import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Produto {
  id: number
  nome: string
  preco: number
  categoria: string | null
  categoria_id: number | null
  ativo: number
  gerenciar_estoque: number
  estoque_atual: number
  estoque_minimo: number
}

export const useProdutosStore = defineStore('produtos', () => {
  const lista = ref<Produto[]>([])
  return { lista }
})
