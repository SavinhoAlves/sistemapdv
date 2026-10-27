/**
 * Operador do cartão RFID: depois de passar o cartão, as ações dos próximos
 * instantes vão com o cabeçalho X-Operador, e o servidor confere a permissão
 * e registra a ação em nome do dono do cartão (não da conta logada no caixa).
 * O token do cartão vale 2 minutos no servidor; o do celular (PIN ou Face ID /
 * digital), 5. Aqui ele é descartado um pouco antes.
 */
const VALIDADE_CARTAO_S = 120
const FOLGA_MS = 10_000

let token: string | null = null
let expiraEm = 0
let doCelular = false

export function definirOperador(t: string | null | undefined, validadeS = VALIDADE_CARTAO_S) {
  token = t || null
  expiraEm = t ? Date.now() + validadeS * 1000 - FOLGA_MS : 0
  doCelular = !!t && validadeS > VALIDADE_CARTAO_S
}

/**
 * Liberação do celular ainda válida: o modal a renova sem pedir nada (cada uso
 * empurra os 5 minutos). Tela apagada ou app em segundo plano trava na hora.
 */
export function liberacaoDoCelular(): string | null {
  return doCelular ? tokenOperador() : null
}

if (process.client) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && doCelular) definirOperador(null)
  })
}

export function tokenOperador(): string | null {
  if (token && Date.now() < expiraEm) return token
  token = null
  return null
}

export function limparOperador() { definirOperador(null) }

/**
 * Modal de cartão global (CartaoGlobal.vue). Quando o servidor recusa uma ação
 * por falta de cartão (ex.: venceu enquanto o caixa contava a gaveta), a API
 * pede o cartão por ele e repete a ação uma vez.
 */
let pedirCartao: ((mensagem: string) => Promise<unknown>) | null = null

export function registrarPedidoDeCartao(fn: typeof pedirCartao) { pedirCartao = fn }

/** true se um cartão válido foi passado (o token novo já está definido) */
export async function pedirCartaoDeNovo(mensagem: string): Promise<boolean> {
  if (!pedirCartao) return false
  try {
    return !!(await pedirCartao(mensagem))
  } catch {
    return false
  }
}
