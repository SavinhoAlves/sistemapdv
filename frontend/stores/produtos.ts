import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Formato de GET /api/produtos (produtos.service.ts → listar). */
export interface Produto {
  id: string
  nome: string
  preco: number
  categoria: string | null
  categoriaId: string | null
  ativo: boolean
  gerenciarEstoque: boolean
  estoqueAtual: number
  estoqueMinimo: number
  imagemUrl?: string | null
}

export const useProdutosStore = defineStore('produtos', () => {
  const lista = ref<Produto[]>([])
  return { lista }
})
