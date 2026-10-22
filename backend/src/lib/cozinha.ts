/**
 * Regra única de "vai para a cozinha?": o produto pode ser exceção
 * (sempre/nunca); senão segue a categoria. Sem categoria, vai.
 */
export function vaiParaCozinha(produto: { envioCozinha?: string | null; categoria?: { vaiCozinha: boolean } | null }) {
  if (produto.envioCozinha === 'sempre') return true
  if (produto.envioCozinha === 'nunca') return false
  return produto.categoria?.vaiCozinha ?? true
}

/** O mesmo, como filtro do Prisma sobre pedidoItem → produto. */
export const produtoDaCozinha = {
  OR: [
    { envioCozinha: 'sempre' as const },
    { envioCozinha: 'categoria' as const, OR: [{ categoria: { vaiCozinha: true } }, { categoriaId: null }] },
  ],
}

/** Campos do produto que a regra precisa (para os selects/includes). */
export const camposCozinha = { envioCozinha: true, categoria: { select: { vaiCozinha: true } } } as const
