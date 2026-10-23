import {
  Utensils, Sandwich, CupSoda, Beer, Wine, Coffee, Pizza, IceCreamCone, CakeSlice,
  Croissant, Salad, Soup, Fish, Beef,
} from 'lucide-vue-next'

/**
 * Ícone de reserva para produto sem foto: sai do nome da categoria.
 * Comida/prato é o padrão; lanche usa o sanduíche (o Lucide não tem ícone de
 * hambúrguer). Compara sem acento e em minúsculas.
 */
const REGRAS: Array<[RegExp, object]> = [
  [/lanche|hamb|burger|sanduiche|sanduíche|wrap/, Sandwich],
  [/pizza/, Pizza],
  [/cerveja|chopp|choop|birita/, Beer],
  [/vinho/, Wine],
  [/cafe|café|cappuccino|cha |chá/, Coffee],
  [/bebida|suco|refri|agua|água|drink|refrigerante|energetico|energético/, CupSoda],
  [/acai|açaí|sorvete|sobremesa|doce/, IceCreamCone],
  [/bolo|torta|pudim/, CakeSlice],
  [/salgado|pastel|coxinha|empada|quibe/, Croissant],
  [/salada|vegano|vegetar/, Salad],
  [/sopa|caldo/, Soup],
  [/peixe|frutos do mar|camarao|camarão/, Fish],
  [/carne|churrasco|espeto/, Beef],
]

export function iconeDaCategoria(nomeCategoria?: string | null) {
  const n = (nomeCategoria ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  for (const [re, icone] of REGRAS) {
    if (re.test(n) || re.test(nomeCategoria?.toLowerCase() ?? '')) return icone
  }
  return Utensils
}
