/**
 * Celular não tem leitor de cartão. Nele o garçom logado com a própria conta
 * age em nome dele (a conta faz o papel do cartão) e os demais confirmam cada
 * ação com o PIN pessoal no lugar do cartão. Terminais seguem com o cartão.
 */

/** Toque e tela pequena: celular */
export const semLeitorDeCartao = () =>
  process.client && window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600

/** O modal entrega o PIN com este prefixo; o leitor de cartão só digita o código */
export const PREFIXO_PIN = 'pin:'

/** Corpo de POST /auth/rfid-identify para o que o modal leu */
export const corpoDaIdentificacao = (codigo: string) =>
  codigo.startsWith(PREFIXO_PIN) ? { pin: codigo.slice(PREFIXO_PIN.length) } : { rfid: codigo }
