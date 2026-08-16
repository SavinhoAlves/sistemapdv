import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '~/services/api'
import { useConfigStore } from '~/stores/configuracoes'

export interface Impressora {
  id: number
  nome: string
  destino: 'caixa' | 'cozinha' | 'bar'
  tipo: 'navegador' | 'rede' | 'windows'
  host: string | null
  porta: number
  largura: number
  copias: number
  ativo: number
}

export const useImpressorasStore = defineStore('impressoras', () => {
  const lista    = ref<Impressora[]>([])
  const carregado = ref(false)

  async function carregar() {
    if (carregado.value) return
    const api = useApi()
    try {
      lista.value = await api.get<Impressora[]>('/impressoras')
      carregado.value = true
    } catch {}
  }

  async function recarregar() {
    carregado.value = false
    await carregar()
  }

  // Retorna true se o destino tem uma impressora direta (não-navegador) configurada.
  // Fallback: usa a config global do configStore se não houver impressora específica.
  function impressaoDiretaPara(destino: 'caixa' | 'cozinha' | 'bar'): boolean {
    const imp = lista.value.find(i => i.destino === destino && i.ativo)
    if (imp) return imp.tipo !== 'navegador'
    return useConfigStore().impressaoDireta
  }

  return { lista, carregado, carregar, recarregar, impressaoDiretaPara }
})
