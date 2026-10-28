import { useAuthStore } from '~/stores/auth'
import { useSocket } from '~/services/socket'
import { EVENTOS } from '~/shared/eventos'
import { noApp, destinoNoCelular } from '~/lib/app'
import { PERMISSAO_POR_ROTA, DESTINO_PADRAO } from '~/lib/rotasPermissao'

/**
 * Quando o administrador muda as permissões de uma função, de um perfil ou de
 * uma pessoa, a API avisa pelo socket. Aqui o app relê as permissões na hora:
 * o menu se ajusta sozinho (é calculado delas) e, se a tela aberta deixou de
 * ser permitida, a pessoa vai para a tela inicial do cargo.
 *
 * Rede de segurança para quem estava sem conexão: relê também ao voltar para
 * o app e a cada minuto.
 */
export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  const socket = useSocket()
  const router = useRouter()

  function conferirRotaAtual() {
    const u = auth.usuario
    if (!u) return
    const path = router.currentRoute.value.path
    // App da equipe (celular): sem lançar pedidos, as telas de venda não servem
    if (path.startsWith('/m/') && !auth.temPermissao('adicionarPedido')) return navigateTo('/m')
    const base = '/' + path.split('/')[1]
    const perm = PERMISSAO_POR_ROTA[base]
    if (perm && !auth.temPermissao(perm)) {
      const destino = noApp() ? destinoNoCelular(u.cargo) : (DESTINO_PADRAO[u.cargo] ?? '/mesas')
      if (destino !== path) navigateTo(destino)
    }
  }

  async function atualizar(forcar: boolean) {
    if (!auth.token) return
    if (await auth.refreshUsuario(forcar)) conferirRotaAtual()
  }

  // A instância do socket muda quando o login muda: confere e registra de novo
  let registradoEm: any = null
  const aoMudar = () => atualizar(true)
  setInterval(() => {
    const s = socket.getSocket()
    if (s && s !== registradoEm) {
      s.on(EVENTOS.equipe.permissoesAtualizadas, aoMudar)
      registradoEm = s
    }
  }, 1000)

  document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizar(false) })
  setInterval(() => { if (!document.hidden) atualizar(false) }, 60_000)
})
