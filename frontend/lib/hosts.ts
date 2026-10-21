/**
 * Um build só atende três endereços:
 *  - app.<domínio>     → sistema do restaurante (/caixa, /mesas…)
 *  - painel.<domínio>  → Central da plataforma na raiz (/restaurantes…), sem /platform
 *  - IP ou localhost   → tudo junto, com a Central em /platform (testes e acesso sem domínio)
 */
const host = () => (process.client ? location.hostname : '')

export const ehPainel = () => host().startsWith('painel.')
export const ehApp = () => host().startsWith('app.')

/** Mesmo domínio, outro subdomínio: app.x → painel.x (ou a raiz, com sub vazio). */
export function urlDoHost(sub: string, caminho = '/') {
  const base = host().replace(/^(app|painel)\./, '')
  return `${location.protocol}//${sub ? `${sub}.` : ''}${base}${caminho}`
}

/** /platform/restaurantes → /restaurantes (endereços do painel). */
export const semPlatform = (p: string) => p.replace(/^\/platform(?=\/|$)/, '') || '/'
