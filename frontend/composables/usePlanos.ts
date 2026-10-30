import { ref } from 'vue'

export interface Plano {
  id: string
  nome: string
  descricao: string | null
  valor: number
  /** Valor do plano anual (por ano); vazio = não vende no anual */
  valorAnual: number | null
  rfid: boolean
  vendaMobile: boolean
  delivery: boolean
  nfce: boolean
  ativo: boolean
  qtdRestaurantes: number
}

export type ChaveRecurso = 'rfid' | 'vendaMobile' | 'delivery' | 'nfce'

/**
 * Recursos que um plano pode incluir. `noSistema` diz se o PDV já tem o
 * recurso: os que ainda não têm ficam registrados no plano, mas não liberam
 * nada até existirem.
 */
export const RECURSOS: { chave: ChaveRecurso; rotulo: string; descricao: string; noSistema: boolean }[] = [
  { chave: 'rfid',        rotulo: 'RFID',               descricao: 'Login e identificação por crachá', noSistema: true },
  { chave: 'vendaMobile', rotulo: 'Venda pelo celular', descricao: 'Acesso via QR Code',               noSistema: true },
  { chave: 'delivery',    rotulo: 'Delivery (entrega)', descricao: 'Entrega com app do entregador; o cardápio com retirada vale para todos',               noSistema: true },
  { chave: 'nfce',        rotulo: 'Nota fiscal',        descricao: 'Emissão de NFC-e',                 noSistema: false },
]

export function usePlanos() {
  const { platformFetch } = usePlatformFetch()
  const planos  = ref<Plano[]>([])
  const loading = ref(false)
  const erro    = ref('')

  async function carregar() {
    loading.value = true
    erro.value = ''
    try {
      planos.value = await platformFetch<Plano[]>('/platform/planos')
    } catch (e: any) {
      erro.value = e?.message || 'Erro ao carregar planos'
    } finally {
      loading.value = false
    }
  }

  async function salvar(dados: Omit<Plano, 'id' | 'qtdRestaurantes'>, id?: string) {
    return platformFetch<Plano>(id ? `/platform/planos/${id}` : '/platform/planos', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(dados),
    })
  }

  async function excluir(id: string) {
    await platformFetch(`/platform/planos/${id}`, { method: 'DELETE' })
  }

  return { planos, loading, erro, carregar, salvar, excluir }
}
