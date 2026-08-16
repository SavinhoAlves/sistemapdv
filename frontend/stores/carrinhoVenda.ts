import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface CartItem {
  produto_id: number
  nome_produto: string
  preco_unit: number
  quantidade: number
}

export const useCarrinhoVendaStore = defineStore('carrinhoVenda', () => {
  const itens             = ref<CartItem[]>([])
  const desconto          = ref('')
  const metodoSelecionado = ref<any>(null)
  const valorRecebido     = ref('')

  function limpar() {
    itens.value             = []
    desconto.value          = ''
    metodoSelecionado.value = null
    valorRecebido.value     = ''
  }

  return { itens, desconto, metodoSelecionado, valorRecebido, limpar }
})
