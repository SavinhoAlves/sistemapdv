/**
 * Operador do cartão RFID: depois de passar o cartão, as ações dos próximos
 * instantes vão com o cabeçalho X-Operador, e o servidor confere a permissão
 * e registra a ação em nome do dono do cartão (não da conta logada no caixa).
 * O token vale 2 minutos no servidor; aqui ele é descartado um pouco antes.
 */
const VALIDADE_MS = 110_000

let token: string | null = null
let expiraEm = 0

export function definirOperador(t: string | null | undefined) {
  token = t || null
  expiraEm = t ? Date.now() + VALIDADE_MS : 0
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
