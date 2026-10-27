/**
 * Celular não tem leitor de cartão. Nele o garçom logado com a própria conta
 * age em nome dele (a conta faz o papel do cartão) e os demais confirmam cada
 * ação com Face ID / digital ou o PIN pessoal no lugar do cartão. Depois de
 * confirmar, fica liberado por 5 minutos, renovados a cada uso (lib/operador.ts).
 * Terminais seguem com o cartão.
 */

/** Toque e tela pequena: celular */
export const semLeitorDeCartao = () =>
  process.client && window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600

/** O modal entrega o que leu com estes prefixos; o leitor de cartão só digita o código */
export const PREFIXO_PIN = 'pin:'
export const PREFIXO_BIO = 'bio:'
export const PREFIXO_RENOVAR = 'renovar:'

/** Confirmação do próprio usuário no celular (não é um cartão) */
export const viaCelular = (codigo: string) =>
  [PREFIXO_PIN, PREFIXO_BIO, PREFIXO_RENOVAR].some((p) => codigo.startsWith(p))

/** Corpo de POST /auth/rfid-identify para o que o modal leu */
export function corpoDaIdentificacao(codigo: string) {
  if (codigo.startsWith(PREFIXO_PIN)) return { pin: codigo.slice(PREFIXO_PIN.length) }
  if (codigo.startsWith(PREFIXO_BIO)) return { biometria: JSON.parse(codigo.slice(PREFIXO_BIO.length)) }
  if (codigo.startsWith(PREFIXO_RENOVAR)) return { renovar: codigo.slice(PREFIXO_RENOVAR.length) }
  return { rfid: codigo }
}
