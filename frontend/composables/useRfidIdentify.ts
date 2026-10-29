import { ref, computed } from 'vue'
import { useConfigStore } from '~/stores/configuracoes'
import { useRuntimeConfig } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { definirOperador, limparOperador, mostrarNaTela } from '~/lib/operador'
import { semLeitorDeCartao, corpoDaIdentificacao, viaCelular } from '~/lib/identificacao'

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

/**
 * O cartão é de um garçom e a mesa é de outro: a ação não acontece.
 * Quem chamou recebe o dono do cartão (ex.: para mostrar as mesas dele).
 */
export class ErroMesaDeOutro extends Error {
  constructor(public usuario: UsuarioRfid) { super('Esta mesa é de outro garçom') }
}

/** Garçom só mexe nas mesas abertas por ele; administrador e caixa, em todas. */
export function podeMexerNaMesa(usuario: UsuarioRfid, donoMesa: string | number | null | undefined) {
  if (usuario.cargo !== 'garcom' || donoMesa == null) return true
  return String(usuario.id) === String(donoMesa)
}

export function useRfidIdentify() {
  const configStore = useConfigStore()
  const config      = useRuntimeConfig()
  const authStore   = useAuthStore()

  const rfidAtivo = computed(() => configStore.rfid_ativo)

  const modalAberto    = ref(false)
  const mensagemModal  = ref('Passe o cartão RFID para continuar')
  const erroModal      = ref('')
  const identificado   = ref<RfidIdentificado | null>(null)
  const carregandoRfid = ref(false)

  let _resolve:         ((u: UsuarioRfid) => void) | null = null
  let _reject:          ((e: Error) => void) | null = null
  let _comConfirmacao = false   // quando true exige clique em "Confirmar" (fase 2)
  let _donoMesa: string | number | null | undefined

  /**
   * Abre o modal e espera o cartão. Não há Cancelar: só resolve com um cartão
   * válido. Com `donoMesa`, o cartão de um garçom que não é o dono da mesa
   * rejeita com ErroMesaDeOutro.
   */
  async function identificarViaRfid(
    mensagem?: string,
    comConfirmacao = false,
    opcoes: { donoMesa?: string | number | null } = {},
  ): Promise<UsuarioRfid | null> {
    if (!configStore.carregado) await configStore.carregar().catch(() => {})

    // Retorna null silenciosamente se RFID não está ativo — evita verificação duplicada nos callers
    if (!configStore.rfid_ativo) return null

    // Garçom no celular com a própria conta: ele mesmo, sem cartão (o servidor
    // dispensa o cartão e confere as mesas pela conta)
    const sessao = authStore.usuario
    if (sessao?.cargo === 'garcom' && semLeitorDeCartao()) {
      const eu: UsuarioRfid = { id: sessao.id, nome: sessao.nome, cargo: sessao.cargo, permissoes: sessao.permissoes ?? null }
      if (!podeMexerNaMesa(eu, opcoes.donoMesa)) throw new ErroMesaDeOutro(eu)
      return eu
    }

    if (modalAberto.value) return Promise.reject(new Error('RFID já aguardando'))

    return new Promise((resolve, reject) => {
      _resolve          = resolve
      _reject           = reject
      _comConfirmacao   = comConfirmacao
      _donoMesa         = opcoes.donoMesa
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
      // Com a sessão do caixa; devolve o token curto do dono do cartão (X-Operador)
      const resp = await $fetch<{ usuario: UsuarioRfid; mesas: MesaVinculada[]; operadorToken?: string; operadorValidadeS?: number }>(
        `${config.public.apiUrl}/api/auth/rfid-identify`,
        { method: 'POST', body: corpoDaIdentificacao(codigo), headers: authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {} }
      )
      if (!podeMexerNaMesa(resp.usuario, _donoMesa)) {
        // Nada é feito no nome dele nesta mesa
        definirOperador(null)
        modalAberto.value = false
        _reject?.(new ErroMesaDeOutro(resp.usuario))
        _resolve = null
        _reject  = null
        return
      }
      definirOperador(resp.operadorToken, resp.operadorValidadeS)
      mostrarNaTela(resp.usuario)

      // No celular (PIN, Face ID / digital ou liberação ativa) a pessoa é a própria conta: não pede confirmação
      if (_comConfirmacao && !viaCelular(codigo)) {
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
      limparOperador()
      _reject?.(new Error('Cancelado'))
    }
    _resolve = null
    _reject  = null
  }

  function onRfidCancelar() {
    // Cancelou depois de passar o cartão: as próximas ações não vão no nome dele
    limparOperador()
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
