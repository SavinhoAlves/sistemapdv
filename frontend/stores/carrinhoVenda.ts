import { defineStore } from 'pinia'
import { ref } from 'vue'
import { novoUUID } from '~/lib/uuid'

export interface CartItem {
  produto_id: string
  nome_produto: string
  preco_unit: number
  quantidade: number
  observacao?: string
}

export const useCarrinhoVendaStore = defineStore('carrinhoVenda', () => {
  const itens             = ref<CartItem[]>([])
  const desconto          = ref('')
  const metodoSelecionado = ref<any>(null)
  const valorRecebido     = ref('')
  const idempotencyKey    = ref(novoUUID())

  function limpar() {
    itens.value             = []
    desconto.value          = ''
    metodoSelecionado.value = null
    valorRecebido.value     = ''
    idempotencyKey.value    = novoUUID()
  }

  return { itens, desconto, metodoSelecionado, valorRecebido, idempotencyKey, limpar }
})
