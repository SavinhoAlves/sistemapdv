/**
 * App Android (Capacitor) da equipe: o mesmo app serve garçom e entregador.
 * Abre /acesso, entra pelo QR ou por código e senha, e cada cargo cai na
 * sua tela de celular.
 */
export const noApp = () => process.client && Boolean((window as any).Capacitor?.isNativePlatform?.())

/** Tela do celular de cada cargo. */
export const destinoNoCelular = (cargo?: string | null) => (cargo === 'entregador' ? '/entregador' : '/m/mesas')

/** Token de acesso dentro do QR (…/m?t=TOKEN), seja qual for o endereço impresso nele. */
export function tokenDoQr(texto: string): string | null {
  try {
    const t = new URL(texto.trim()).searchParams.get('t')
    return t && t.split('.').length === 3 ? t : null
  } catch {
    return null
  }
}
