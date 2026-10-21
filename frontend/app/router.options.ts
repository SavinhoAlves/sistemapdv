import type { RouterConfig } from '@nuxt/schema'
import { semPlatform } from '~/lib/hosts'

/**
 * No painel.<domínio> as telas da Central ficam na raiz: /restaurantes em vez
 * de /platform/restaurantes. As rotas /platform continuam existindo (links
 * internos e acesso por IP); o middleware do painel tira o prefixo da barra.
 */
export default <RouterConfig>{
  routes: (rotas) => {
    if (typeof window === 'undefined' || !window.location.hostname.startsWith('painel.')) return rotas
    const doPainel = rotas
      .filter((r) => r.path.startsWith('/platform') && r.path !== '/platform/login')
      .map((r) => ({ ...r, name: `painel-${String(r.name)}`, path: semPlatform(r.path) }))
    const ocupadas = new Set(doPainel.map((r) => r.path))
    return [...doPainel, ...rotas.filter((r) => !ocupadas.has(r.path))]
  },
}
