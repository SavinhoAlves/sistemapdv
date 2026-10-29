import { ref, watch } from 'vue'

// Estado global da sidebar (persiste entre trocas de página). Começa aberta;
// se a pessoa recolher, fica recolhida neste aparelho.
const CHAVE = 'sidebar:recolhida'
function inicial() {
  try { return localStorage.getItem(CHAVE) !== '1' } catch { return true }
}
export const sidebarExpandida = ref(typeof window === 'undefined' ? true : inicial())

if (typeof window !== 'undefined') {
  watch(sidebarExpandida, aberta => {
    try { localStorage.setItem(CHAVE, aberta ? '0' : '1') } catch {}
  })
}
