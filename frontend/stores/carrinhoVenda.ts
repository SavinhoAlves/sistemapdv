import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface CartItem {
  produto_id: string
  nome_produto: string
  preco_unit: number
  quantidade: number
  observacao?: string
}

/**
 * UUID v4 para a chave de idempotência da venda. crypto.randomUUID só existe
 * em HTTPS/localhost; no PDV aberto por HTTP (IP da rede local) ele não
 * existe e a página quebrava. getRandomValues funciona em qualquer origem.
 */
function novoUUID(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
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
