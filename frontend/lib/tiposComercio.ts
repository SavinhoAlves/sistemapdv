/** Tipos de comércio (mesmas chaves de backend/src/lib/tipoComercio.ts). */
export const TIPOS_COMERCIO = [
  { id: 'restaurante',  rotulo: 'Restaurante' },
  { id: 'bar',          rotulo: 'Bar' },
  { id: 'lanchonete',   rotulo: 'Lanchonete' },
  { id: 'hamburgueria', rotulo: 'Hamburgueria' },
  { id: 'pizzaria',     rotulo: 'Pizzaria' },
  { id: 'cafeteria',    rotulo: 'Cafeteria' },
  { id: 'padaria',      rotulo: 'Padaria' },
  { id: 'sorveteria',   rotulo: 'Sorveteria / açaí' },
  { id: 'food_truck',   rotulo: 'Food truck' },
  { id: 'outro',        rotulo: 'Outro' },
] as const
export const rotuloTipoComercio = (id?: string | null) => TIPOS_COMERCIO.find(t => t.id === id)?.rotulo ?? null
