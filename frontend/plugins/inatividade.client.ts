import { useAuthStore } from '~/stores/auth'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { noApp } from '~/lib/app'
import { LIMITE_INATIVIDADE_MS as LIMITE_MS, CHAVE_ULTIMO_USO as CHAVE, AVISO_INATIVIDADE } from '~/lib/inatividade'

/**
 * Logout por inatividade: 8 horas sem clique, tecla ou toque encerram a sessão
 * (restaurante e Central). O último uso fica no localStorage, então vale para
 * todas as abas e também para quem fechou o navegador e voltou no outro dia.
 */

export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  const plataforma = usePlatformAuthStore()
  plataforma.restore()

  const logado = () => !!auth.token || !!plataforma.token
  const ultima = () => { try { return Number(localStorage.getItem(CHAVE)) || 0 } catch { return 0 } }
  let gravadoEm = 0
  function marcarJa() { gravadoEm = 0; marcar() }
  function marcar() {
    const agora = Date.now()
    if (agora - gravadoEm < 30_000) return
    gravadoEm = agora
    try { localStorage.setItem(CHAVE, String(agora)) } catch { /* sem armazenamento: não controla */ }
  }
  // Sessão aberta antes desta versão não tem registro: conta a partir de agora
  if (logado() && !ultima()) marcar()
  // Recém-logado (login, QR, suporte): o uso antigo não conta
  auth.$subscribe((_m, st) => { if (st.token) marcarJa() })
  plataforma.$subscribe((_m, st) => { if (st.token) marcarJa() })

  const expirou = () => logado() && ultima() > 0 && Date.now() - ultima() > LIMITE_MS

  function encerrar(avisar = true) {
    if (avisar) try { sessionStorage.setItem(AVISO_INATIVIDADE, '1') } catch { /* só o aviso se perde */ }
    try { localStorage.removeItem(CHAVE) } catch { /* idem */ }
    if (auth.token) auth.logout(false)
    if (plataforma.token) plataforma.logout()
    return noApp() ? '/acesso' : '/login'
  }

  // Telas que abrem uma sessão nova: o QR do celular (/m?t=…), o login, a
  // entrada do app e o cadastro. Com a sessão velha vencida, só limpa e segue
  // (antes mandava para o login e o token do QR se perdia)
  const abreSessaoNova = (to: { path: string; query: Record<string, unknown> }) =>
    (to.path.replace(/\/$/, '') === '/m' && !!to.query.t) || ['/login', '/acesso', '/assinar'].includes(to.path)

  // Antes de abrir qualquer tela (inclusive a primeira)
  addRouteMiddleware('inatividade', (to) => {
    if (!expirou()) return
    if (abreSessaoNova(to)) { encerrar(false); return }
    const destino = encerrar()
    if (to.path !== destino) return navigateTo(destino, { replace: true })
  }, { global: true })

  // Com a tela aberta e parada
  const conferir = () => { if (expirou()) navigateTo(encerrar(), { replace: true }) }
  setInterval(conferir, 60_000)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') conferir() })

  for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const) {
    // Marca também deslogado: o uso na tela de login vale para a sessão que vai abrir
    window.addEventListener(ev, marcar, { passive: true, capture: true })
  }
})
