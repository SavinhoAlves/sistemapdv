import { ref, computed } from 'vue'
import { useConfigStore } from '~/stores/configuracoes'
import { useRuntimeConfig } from '#imports'

export interface UsuarioRfid {
  id: number
  nome: string
  cargo: string
  permissoes: Record<string, boolean> | null
}

export function useRfidIdentify() {
  const configStore = useConfigStore()
  const config      = useRuntimeConfig()

  const rfidAtivo = computed(() => configStore.rfid_ativo)

  const modalAberto   = ref(false)
  const mensagemModal = ref('Passe o cartão RFID para continuar')
  const erroModal     = ref('')

  let _resolve: ((u: UsuarioRfid) => void) | null = null
  let _reject:  ((e: Error) => void) | null = null

  async function identificarViaRfid(mensagem?: string): Promise<UsuarioRfid | null> {
    if (!configStore.carregado) await configStore.carregar().catch(() => {})

    // Retorna null silenciosamente se RFID não está ativo — evita verificação duplicada nos callers
    if (!configStore.rfid_ativo) return null

    if (modalAberto.value) return Promise.reject(new Error('RFID já aguardando'))

    return new Promise((resolve, reject) => {
      _resolve = resolve
      _reject  = reject
      erroModal.value = ''
      mensagemModal.value = mensagem ?? 'Passe o cartão RFID para continuar'
      modalAberto.value = true
    })
  }

  async function onRfidSuccess(codigo: string) {
    erroModal.value = ''
    try {
      const resp = await $fetch<{ usuario: UsuarioRfid }>(
        `${config.public.apiUrl}/api/auth/rfid-identify`,
        { method: 'POST', body: { rfid: codigo } }
      )
      modalAberto.value = false
      _resolve?.(resp.usuario)
      _resolve = null
      _reject  = null
    } catch (err: any) {
      // Mantém modal aberto e exibe o erro — usuário pode tentar outro cartão
      erroModal.value = err?.data?.error || 'Cartão não reconhecido'
    }
  }

  function onRfidCancelar() {
    modalAberto.value = false
    erroModal.value   = ''
    _reject?.(new Error('Cancelado'))
    _resolve = null
    _reject  = null
  }

  return {
    rfidAtivo,
    modalAberto,
    mensagemModal,
    erroModal,
    identificarViaRfid,
    onRfidSuccess,
    onRfidCancelar,
  }
}
