import { useAuthStore } from '../stores/auth'
import { terminalLocal, TELA_DA_FUNCAO } from '../composables/useTerminalLocal'

/**
 * Modo local: cada terminal abre direto na tela da sua função (caixa → Vendas,
 * garçom → Mesas, cozinha → Cozinha). Só na entrada (/), depois do login; o
 * acesso às telas continua decidido pelas permissões do usuário.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!process.client || to.path !== '/') return
  const auth = useAuthStore()
  if (!auth.token) return
  const t = await terminalLocal()
  if (!t || t.nome === 'Host') return
  const destino = TELA_DA_FUNCAO[t.funcao]
  if (destino && destino !== '/') return navigateTo(destino, { replace: true })
})
