/**
 * Tipo de comércio do restaurante. Classifica o cliente na plataforma e,
 * na criação, define o ponto de partida: categorias (e quais vão para a
 * cozinha), taxa de serviço e modo de venda. Tudo pode ser mudado depois.
 */
export interface PadraoComercio {
  rotulo: string
  taxaServicoPct: number
  modoVenda: 'mesa' | 'direta' | 'ambos'
  categorias: { nome: string; vaiCozinha: boolean }[]
}

const BEBIDAS = { nome: 'Bebidas', vaiCozinha: false }
const SOBREMESAS = { nome: 'Sobremesas', vaiCozinha: true }

export const TIPOS_COMERCIO: Record<string, PadraoComercio> = {
  restaurante: { rotulo: 'Restaurante', taxaServicoPct: 10, modoVenda: 'ambos',
    categorias: [{ nome: 'Entradas', vaiCozinha: true }, { nome: 'Pratos principais', vaiCozinha: true }, { nome: 'Porções', vaiCozinha: true }, BEBIDAS, SOBREMESAS] },
  bar: { rotulo: 'Bar', taxaServicoPct: 10, modoVenda: 'ambos',
    categorias: [{ nome: 'Cervejas', vaiCozinha: false }, { nome: 'Drinks', vaiCozinha: false }, { nome: 'Doses', vaiCozinha: false }, { nome: 'Petiscos', vaiCozinha: true }, { nome: 'Sem álcool', vaiCozinha: false }] },
  lanchonete: { rotulo: 'Lanchonete', taxaServicoPct: 0, modoVenda: 'direta',
    categorias: [{ nome: 'Lanches', vaiCozinha: true }, { nome: 'Salgados', vaiCozinha: false }, { nome: 'Porções', vaiCozinha: true }, BEBIDAS, SOBREMESAS] },
  hamburgueria: { rotulo: 'Hamburgueria', taxaServicoPct: 10, modoVenda: 'ambos',
    categorias: [{ nome: 'Hambúrgueres', vaiCozinha: true }, { nome: 'Combos', vaiCozinha: true }, { nome: 'Acompanhamentos', vaiCozinha: true }, BEBIDAS, SOBREMESAS] },
  pizzaria: { rotulo: 'Pizzaria', taxaServicoPct: 10, modoVenda: 'ambos',
    categorias: [{ nome: 'Pizzas', vaiCozinha: true }, { nome: 'Pizzas doces', vaiCozinha: true }, { nome: 'Esfihas e calzones', vaiCozinha: true }, BEBIDAS] },
  cafeteria: { rotulo: 'Cafeteria', taxaServicoPct: 0, modoVenda: 'direta',
    categorias: [{ nome: 'Cafés', vaiCozinha: false }, { nome: 'Chás e bebidas quentes', vaiCozinha: false }, { nome: 'Salgados', vaiCozinha: false }, { nome: 'Doces e bolos', vaiCozinha: false }, { nome: 'Bebidas geladas', vaiCozinha: false }] },
  padaria: { rotulo: 'Padaria', taxaServicoPct: 0, modoVenda: 'direta',
    categorias: [{ nome: 'Pães', vaiCozinha: false }, { nome: 'Salgados', vaiCozinha: false }, { nome: 'Doces e bolos', vaiCozinha: false }, { nome: 'Lanches na chapa', vaiCozinha: true }, BEBIDAS] },
  sorveteria: { rotulo: 'Sorveteria / açaí', taxaServicoPct: 0, modoVenda: 'direta',
    categorias: [{ nome: 'Sorvetes', vaiCozinha: false }, { nome: 'Açaí', vaiCozinha: false }, { nome: 'Adicionais', vaiCozinha: false }, BEBIDAS] },
  food_truck: { rotulo: 'Food truck', taxaServicoPct: 0, modoVenda: 'direta',
    categorias: [{ nome: 'Lanches', vaiCozinha: true }, { nome: 'Porções', vaiCozinha: true }, BEBIDAS] },
  outro: { rotulo: 'Outro', taxaServicoPct: 0, modoVenda: 'ambos', categorias: [] },
}

export const tipoValido = (t: unknown): t is string => typeof t === 'string' && t in TIPOS_COMERCIO

/** Aplica o ponto de partida do tipo num restaurante recém-criado (dentro da transação de criação). */
export async function aplicarPadraoComercio(tx: any, tenantId: string, tipo: string, nomeRestaurante: string) {
  const p = TIPOS_COMERCIO[tipo]
  if (!p) return
  await tx.configuracoes.upsert({
    where: { tenantId },
    update: { taxaServicoPct: p.taxaServicoPct, modoVenda: p.modoVenda },
    create: { tenantId, nomeRestaurante, taxaServicoPct: p.taxaServicoPct, modoVenda: p.modoVenda },
  })
  if (p.categorias.length) {
    await tx.categoria.createMany({
      data: p.categorias.map((c) => ({ tenantId, nome: c.nome, vaiCozinha: c.vaiCozinha })),
      skipDuplicates: true,
    })
  }
}
