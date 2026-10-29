import { ref, watch } from 'vue'

export type Visao = 'grade' | 'lista'

/**
 * Grade ou lista de uma tela de cartões, lembrada por aparelho.
 * `chave` separa cada tela (ex.: 'cozinha', 'admin-metodos').
 */
export function useVisao(chave: string, padrao: Visao = 'grade') {
  const k = `visao:${chave}`
  let inicial = padrao
  try { const s = localStorage.getItem(k); if (s === 'grade' || s === 'lista') inicial = s } catch {}
  const visao = ref<Visao>(inicial)
  watch(visao, v => { try { localStorage.setItem(k, v) } catch {} })
  return visao
}
