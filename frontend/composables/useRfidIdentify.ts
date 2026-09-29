import { ref, computed } from 'vue'
import { useConfigStore } from '~/stores/configuracoes'
import { useRuntimeConfig } from '#imports'
import { getTenantSlug } from '~/composables/useTenantSlug'

export interface UsuarioRfid {
  id: string
  nome: string
  cargo: string
  permissoes: Record<string, boolean> | null
}

export interface MesaVinculada {
  id: string
  numero: number
  nome_mesa: string | null
  cliente: string | null
  total: number
  n_itens: number
}

export interface RfidIdentificado {
  usuario: UsuarioRfid
  mesas: MesaVinculada[]
}

export function useRfidIdentify() {
  const configStore = useConfigStore()
  const config      = useRuntimeConfig()

  const rfidAtivo = computed(() => configStore.rfid_ativo)

  const modalAberto    = ref(false)
  const mensagemModal  = ref('Passe o cartão RFID para continuar')
  const erroModal      = ref('')
  const identificado   = ref<RfidIdentificado | null>(null)
  const carregandoRfid = ref(false)

  let _resolve:         ((u: UsuarioRfid) => void) | null = null
  let _reject:          ((e: Error) => void) | null = null
  let _comConfirmacao = false   // quando true exige clique em "Confirmar" (fase 2)

  async function identificarViaRfid(mensagem?: string, comConfirmacao = false): Promise<UsuarioRfid | null> {
    if (!configStore.carregado) await configStore.carregar().catch(() => {})

    // Retorna null silenciosamente se RFID não está ativo — evita verificação duplicada nos callers
    if (!configStore.rfid_ativo) return null

    if (modalAberto.value) return Promise.reject(new Error('RFID já aguardando'))

    return new Promise((resolve, reject) => {
      _resolve          = resolve
      _reject           = reject
      _comConfirmacao   = comConfirmacao
      erroModal.value   = ''
      identificado.value = null
      mensagemModal.value = mensagem ?? 'Passe o cartão RFID para continuar'
      modalAberto.value = true
    })
  }

  async function onRfidSuccess(codigo: string) {
    erroModal.value      = ''
    carregandoRfid.value = true
    try {
      const slug = getTenantSlug()
      const resp = await $fetch<{ usuario: UsuarioRfid; mesas: MesaVinculada[] }>(
        `${config.public.apiUrl}/api/auth/rfid-identify`,
        { method: 'POST', body: { rfid: codigo, slug } }
      )

      if (_comConfirmacao) {
        // Fase 2: exibe garçom + vendas e aguarda confirmação manual
        identificado.value = resp
      } else {
        // Fluxo simples: resolve imediatamente e fecha o modal
        modalAberto.value = false
        _resolve?.(resp.usuario)
        _resolve = null
        _reject  = null
      }
    } catch (err: any) {
      erroModal.value = err?.data?.error || 'Cartão não reconhecido'
    } finally {
      carregandoRfid.value = false
    }
  }

  function onRfidConfirmar() {
    const usuario = identificado.value?.usuario ?? null
    modalAberto.value  = false
    identificado.value = null
    erroModal.value    = ''
    if (usuario) {
      _resolve?.(usuario)
    } else {
      _reject?.(new Error('Cancelado'))
    }
    _resolve = null
    _reject  = null
  }

  function onRfidCancelar() {
    modalAberto.value  = false
    erroModal.value    = ''
    identificado.value = null
    _reject?.(new Error('Cancelado'))
    _resolve = null
    _reject  = null
  }

  return {
    rfidAtivo,
    modalAberto,
    mensagemModal,
    erroModal,
    identificado,
    carregandoRfid,
    identificarViaRfid,
    onRfidSuccess,
    onRfidConfirmar,
    onRfidCancelar,
  }
}
