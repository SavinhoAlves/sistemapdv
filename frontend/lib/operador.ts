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
