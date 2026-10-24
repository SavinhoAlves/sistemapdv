import { onMounted, onUnmounted, watch, type Ref } from 'vue'

/**
 * Páginas do cliente final (cardápio, acompanhamento): seguem o tema claro/
 * escuro do aparelho, não o tema salvo do PDV (que abre escuro por padrão).
 * Não grava nada: ao sair da página, o tema do sistema volta.
 * escolha: tema escolhido pelo cliente na página (null = o do aparelho).
 */
export function useTemaDoAparelho(escolha?: Ref<'claro' | 'escuro' | null>) {
  let mq: MediaQueryList | null = null
  let anterior: { dark: boolean; light: boolean } | null = null
  const aplicar = () => {
    const escuro = escolha?.value ? escolha.value === 'escuro' : !!mq?.matches
    document.documentElement.classList.toggle('dark', escuro)
    document.documentElement.classList.toggle('light', !escuro)
  }
  onMounted(() => {
    const c = document.documentElement.classList
    anterior = { dark: c.contains('dark'), light: c.contains('light') }
    mq = window.matchMedia('(prefers-color-scheme: dark)')
    aplicar()
    mq.addEventListener('change', aplicar)
  })
  if (escolha) watch(escolha, aplicar)
  onUnmounted(() => {
    mq?.removeEventListener('change', aplicar)
    if (anterior) {
      document.documentElement.classList.toggle('dark', anterior.dark)
      document.documentElement.classList.toggle('light', anterior.light)
    }
  })
}
