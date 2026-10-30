/**
 * Executa no aparelho do cliente as ações que o suporte faz na Central
 * (components/EspelhoSuporte.vue). Coordenadas chegam na tela do cliente
 * (a Central reproduz a página no mesmo tamanho e converte a escala).
 *
 * Nada aqui acontece sem o controle permitido: o servidor só repassa clique,
 * tecla, texto, rolagem e opção de lista quando o cliente (ou o admin, no
 * acesso sem aceite) liberou.
 */

export interface AcaoRemota {
  tipo: 'cursor' | 'apontar' | 'clique' | 'tecla' | 'texto' | 'rolar' | 'selecionar'
  x: number; y: number; dx: number; dy: number
  tecla: string; texto: string; valor: string
  ctrl: boolean; shift: boolean; alt: boolean; meta: boolean
}

/** A faixa, o chat e o cursor do suporte: o próprio suporte não clica neles */
const UI_DO_ESPELHO = '[data-espelho-ui]'

function alvo(x: number, y: number): HTMLElement | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  return el && !el.closest(UI_DO_ESPELHO) ? el : null
}

const editavel = (el: Element | null): el is HTMLInputElement | HTMLTextAreaElement =>
  !!el && (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(el.type)))
  && !(el as HTMLInputElement).readOnly && !(el as HTMLInputElement).disabled

const ponteiro = (tipo: string, x: number, y: number) =>
  new PointerEvent(tipo, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: tipo.endsWith('down') ? 1 : 0 })
const mouse = (tipo: string, x: number, y: number) =>
  new MouseEvent(tipo, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: tipo === 'mousedown' ? 1 : 0, view: window })

function clicar(a: AcaoRemota) {
  const el = alvo(a.x, a.y)
  if (!el) return
  el.dispatchEvent(ponteiro('pointerdown', a.x, a.y))
  el.dispatchEvent(mouse('mousedown', a.x, a.y))
  // Foco como no clique de verdade (campo, botão ou o primeiro focável acima)
  const focavel = el.closest<HTMLElement>('input,textarea,select,button,a[href],[tabindex]:not([tabindex="-1"]),[contenteditable="true"]')
  focavel?.focus({ preventScroll: true })
  el.dispatchEvent(ponteiro('pointerup', a.x, a.y))
  el.dispatchEvent(mouse('mouseup', a.x, a.y))
  el.click()
}

/** Troca o texto selecionado do campo (ou insere no cursor) e avisa o Vue (v-model) */
function escrever(el: HTMLInputElement | HTMLTextAreaElement, novo: string, apagar: -1 | 0 | 1 = 0) {
  let ini: number | null = null
  let fim: number | null = null
  try { ini = el.selectionStart; fim = el.selectionEnd } catch { /* number/email não têm seleção */ }
  if (ini === null || fim === null) {
    // Campo sem seleção (number, email): edita no fim
    el.value = apagar ? el.value.slice(0, -1) : el.value + novo
  } else {
    if (apagar === -1 && ini === fim && ini > 0) ini--
    if (apagar === 1 && ini === fim) fim++
    el.setRangeText(novo, ini, fim, 'end')
  }
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: apagar ? 'deleteContentBackward' : 'insertText', data: novo || null }))
}

function proximoFocavel(de: Element | null, voltar: boolean) {
  const todos = [...document.querySelectorAll<HTMLElement>('input,textarea,select,button,a[href],[tabindex]:not([tabindex="-1"])')]
    .filter((e) => !e.closest(UI_DO_ESPELHO) && !(e as HTMLInputElement).disabled && e.offsetParent !== null)
  const i = de ? todos.indexOf(de as HTMLElement) : -1
  return todos[(i + (voltar ? -1 : 1) + todos.length) % todos.length]
}

function teclar(a: AcaoRemota) {
  const el = (document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body) as HTMLElement
  if (el.closest(UI_DO_ESPELHO)) return
  const opcoes = { key: a.tecla, bubbles: true, cancelable: true, composed: true, ctrlKey: a.ctrl, shiftKey: a.shift, altKey: a.alt, metaKey: a.meta }
  const seguiu = el.dispatchEvent(new KeyboardEvent('keydown', opcoes))
  if (seguiu) {
    // O que o navegador faria sozinho com a tecla (eventos sintéticos não fazem nada)
    if (editavel(el)) {
      if (a.tecla.length === 1 && !a.ctrl && !a.meta) escrever(el, a.tecla)
      else if (a.tecla === 'Backspace') escrever(el, '', -1)
      else if (a.tecla === 'Delete') escrever(el, '', 1)
      else if ((a.ctrl || a.meta) && a.tecla.toLowerCase() === 'a') el.select()
      else if (a.tecla === 'ArrowLeft' || a.tecla === 'ArrowRight') {
        try { const p = Math.max(0, (el.selectionStart ?? 0) + (a.tecla === 'ArrowLeft' ? -1 : 1)); el.setSelectionRange(p, p) } catch { /* sem seleção */ }
      } else if (a.tecla === 'Enter' && el instanceof HTMLInputElement) el.form?.requestSubmit()
      else if (a.tecla === 'Enter' && el instanceof HTMLTextAreaElement) escrever(el, '\n')
    } else if ((a.tecla === 'Enter' || a.tecla === ' ') && (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement)) {
      el.click()
    }
    if (a.tecla === 'Tab') proximoFocavel(el, a.shift)?.focus()
  }
  el.dispatchEvent(new KeyboardEvent('keyup', opcoes))
}

function colar(a: AcaoRemota) {
  const el = document.activeElement
  if (editavel(el) && !el.closest(UI_DO_ESPELHO)) escrever(el, a.texto)
}

function rolar(a: AcaoRemota) {
  let el = alvo(a.x, a.y)
  // Sobe até o primeiro elemento que rola naquela direção; senão, a página
  while (el && el !== document.body) {
    const st = getComputedStyle(el)
    const rolaY = /(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight
    const rolaX = /(auto|scroll)/.test(st.overflowX) && el.scrollWidth > el.clientWidth
    if ((a.dy && rolaY) || (a.dx && rolaX)) { el.scrollBy({ left: a.dx, top: a.dy }); return }
    el = el.parentElement
  }
  window.scrollBy({ left: a.dx, top: a.dy })
}

function selecionar(a: AcaoRemota) {
  const el = alvo(a.x, a.y)?.closest('select')
  if (!el || el.disabled) return
  el.value = a.valor
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Ações de controle (cursor e apontar são desenhados pelo componente) */
export function executarAcao(a: AcaoRemota) {
  if (a.tipo === 'clique') clicar(a)
  else if (a.tipo === 'tecla') teclar(a)
  else if (a.tipo === 'texto') colar(a)
  else if (a.tipo === 'rolar') rolar(a)
  else if (a.tipo === 'selecionar') selecionar(a)
}
