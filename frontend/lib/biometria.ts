/**
 * Face ID / digital do celular no lugar do PIN (passkey WebAuthn). O aparelho
 * confere a pessoa; o servidor só recebe a assinatura. Ativado por usuário e
 * por aparelho: o id da chave fica guardado aqui para saber que este celular
 * já tem.
 */
import { ref } from 'vue'

const CHAVE = (usuarioId: string) => `pdv_biometria_${usuarioId}`
const RECUSOU = (usuarioId: string) => `pdv_biometria_recusou_${usuarioId}`

const ler = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const gravar = (k: string, v: string | null) => {
  try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* sem armazenamento */ }
}

/** Id da chave deste celular para o usuário (ou null se não ativou aqui) */
export const biometriaDoAparelho = (usuarioId: string) => ler(CHAVE(usuarioId))
export const lembrarBiometria = (usuarioId: string, credentialId: string | null) => gravar(CHAVE(usuarioId), credentialId)

export const recusouBiometria = (usuarioId: string) => ler(RECUSOU(usuarioId)) === '1'
export const marcarRecusa = (usuarioId: string, recusou: boolean) => gravar(RECUSOU(usuarioId), recusou ? '1' : null)

/** O aparelho tem Face ID / digital utilizável pelo navegador (e o endereço permite) */
export async function biometriaSuportada() {
  if (!process.client || !window.isSecureContext || !window.PublicKeyCredential) return false
  // Passkey precisa de domínio; pelo IP (modo local) não funciona
  if (/^[\d.]+$/.test(location.hostname)) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

// ── Conversão JSON <-> WebAuthn (base64url) ─────────────────────────────────
const deB64 = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}
const paraB64 = (buf: ArrayBuffer | null | undefined) => {
  if (!buf) return undefined
  let s = ''
  for (const byte of new Uint8Array(buf)) s += String.fromCharCode(byte)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const credenciais = (lista?: { id: string; transports?: string[] }[]) =>
  lista?.map((c) => ({ type: 'public-key' as const, id: deB64(c.id), transports: c.transports as AuthenticatorTransport[] | undefined }))

/** Cria a chave neste celular (pede o rosto/digital) */
export async function criarBiometria(opcoes: any) {
  const cred = (await navigator.credentials.create({
    publicKey: {
      ...opcoes,
      challenge: deB64(opcoes.challenge),
      user: { ...opcoes.user, id: deB64(opcoes.user.id) },
      excludeCredentials: credenciais(opcoes.excludeCredentials),
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('Cancelado')
  const r = cred.response as AuthenticatorAttestationResponse
  return {
    id: cred.id,
    rawId: paraB64(cred.rawId),
    type: cred.type,
    clientExtensionResults: cred.getClientExtensionResults(),
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    response: {
      clientDataJSON: paraB64(r.clientDataJSON),
      attestationObject: paraB64(r.attestationObject),
      transports: r.getTransports?.() ?? [],
    },
  }
}

/** Confirma a pessoa com a chave deste celular (pede o rosto/digital) */
export async function usarBiometria(opcoes: any) {
  const cred = (await navigator.credentials.get({
    publicKey: { ...opcoes, challenge: deB64(opcoes.challenge), allowCredentials: credenciais(opcoes.allowCredentials) },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('Cancelado')
  const r = cred.response as AuthenticatorAssertionResponse
  return {
    id: cred.id,
    rawId: paraB64(cred.rawId),
    type: cred.type,
    clientExtensionResults: cred.getClientExtensionResults(),
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    response: {
      clientDataJSON: paraB64(r.clientDataJSON),
      authenticatorData: paraB64(r.authenticatorData),
      signature: paraB64(r.signature),
      userHandle: paraB64(r.userHandle),
    },
  }
}

/** Mensagem para quando o navegador recusa/cancela */
export function mensagemDoErro(e: any) {
  if (e?.name === 'NotAllowedError' || e?.name === 'AbortError') return 'Face ID / digital não confirmado. Tente de novo ou use o PIN'
  return e?.data?.error || e?.message || 'Não foi possível usar o Face ID / digital'
}

/** Depois de um PIN certo, oferece ativar o Face ID / digital (OfertaBiometria.vue) */
export const ofertaBiometria = ref(false)
