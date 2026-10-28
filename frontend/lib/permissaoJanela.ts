import { watch } from 'vue'
import { useToastStore } from '~/stores/toast'

/**
 * Fecha uma janela aberta quando a permissão dela é revogada.
 *
 * O administrador pode tirar uma permissão com a janela já aberta na tela de
 * alguém (desconto, cancelamento, estorno…). A API já recusa a ação, mas a
 * janela ficava ali com os botões ativos; aqui ela fecha na hora e avisa.
 */
export function fecharAoPerderPermissao(opcoes: {
  aberta: () => boolean
  permitido: () => boolean
  fechar: () => void
  /** Completa a frase "removeu sua permissão para …" */
  acao: string
}) {
  const toast = useToastStore()
  watch(opcoes.permitido, (ok, antes) => {
    if (antes && !ok && opcoes.aberta()) {
      opcoes.fechar()
      toast.warning('Permissão removida', `O administrador removeu sua permissão para ${opcoes.acao}.`)
    }
  })
}

/** Avisa o app (plugin permissoes-ao-vivo) para reler as permissões agora. */
export function avisarPermissoesMudaram() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('pdv:permissoes'))
}
