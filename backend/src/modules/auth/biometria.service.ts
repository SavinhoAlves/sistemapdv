/**
 * Face ID / digital do celular no lugar do PIN (passkey WebAuthn). O celular
 * confere o rosto/digital e assina um desafio; aqui só guardamos a chave
 * pública de cada aparelho. Nenhum dado biométrico chega ao servidor.
 *
 * Cadastro: só logo depois de um PIN ou senha certos (quem pegar um aparelho
 * desbloqueado e logado não consegue cadastrar o próprio rosto sem saber).
 *
 * Também serve para entrar no sistema (loginComBiometria): a chave fica no
 * aparelho com o id do usuário (passkey), então não é preciso digitar nada.
 */
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import crypto from 'crypto'
import { prisma } from '../../lib/prisma'
import { getPermissoes } from './auth.service'

const erro = (status: number, mensagem: string) => Object.assign(new Error(mensagem), { status })

const origensPermitidas = () =>
  (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean)

/** Origem do navegador e o domínio (rpID) a que a passkey fica presa */
function origemDe(origin: string | undefined) {
  if (!origin || !origensPermitidas().includes(origin)) throw erro(400, 'Origem não permitida')
  const { hostname } = new URL(origin)
  // Passkey exige domínio: pelo IP (modo local) só dá para usar o PIN
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) {
    throw erro(409, 'Face ID e digital só funcionam pelo endereço do sistema (com domínio). Use o PIN')
  }
  return { origin, rpID: hostname }
}

// Desafio de cada cadastro/entrada: vale 2 minutos e uma vez só
const DESAFIO_MS = 2 * 60_000
const desafios = new Map<string, { desafio: string; ate: number }>()

function guardarDesafio(chave: string, desafio: string) {
  const agora = Date.now()
  for (const [k, v] of desafios) if (v.ate < agora) desafios.delete(k)
  desafios.set(chave, { desafio, ate: agora + DESAFIO_MS })
}

function usarDesafio(chave: string) {
  const d = desafios.get(chave)
  desafios.delete(chave)
  if (!d || d.ate < Date.now()) throw erro(400, 'Tempo esgotado. Tente de novo')
  return d.desafio
}

// PIN ou senha certos há pouco liberam o cadastro da biometria
const PIN_RECENTE_MS = 3 * 60_000
const pinRecente = new Map<string, number>()

export function marcarPinRecente(usuarioId: string) {
  pinRecente.set(usuarioId, Date.now() + PIN_RECENTE_MS)
}

export async function opcoesCadastro(usuarioId: string, tenantId: string, origin: string | undefined) {
  const { rpID } = origemDe(origin)
  if ((pinRecente.get(usuarioId) ?? 0) < Date.now()) {
    throw erro(403, 'Confirme seu PIN (ou entre com a senha) antes de ativar o Face ID / digital')
  }
  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId, tenantId, ativo: true },
    select: { id: true, nome: true, login: true, biometrias: { select: { credentialId: true, transportes: true } } },
  })
  if (!usuario) throw erro(404, 'Usuário não encontrado')

  const opcoes = await generateRegistrationOptions({
    rpName: 'RestaurantePDV',
    rpID,
    userID: new TextEncoder().encode(usuario.id),
    userName: usuario.login || usuario.nome,
    userDisplayName: usuario.nome,
    attestationType: 'none',
    // Do próprio aparelho (Face ID, digital, Windows Hello), conferindo a pessoa.
    // Guardada no aparelho (residentKey) para entrar sem digitar o usuário
    authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'required', userVerification: 'required' },
    excludeCredentials: usuario.biometrias.map((b) => ({ id: b.credentialId, transports: b.transportes as any })),
    timeout: 60_000,
  })
  guardarDesafio(`cadastro:${usuarioId}`, opcoes.challenge)
  return opcoes
}

export async function cadastrar(usuarioId: string, tenantId: string, resposta: any, origin: string | undefined, aparelho?: string) {
  const { origin: expectedOrigin, rpID } = origemDe(origin)
  const expectedChallenge = usarDesafio(`cadastro:${usuarioId}`)
  let verificado
  try {
    verificado = await verifyRegistrationResponse({ response: resposta, expectedChallenge, expectedOrigin, expectedRPID: rpID, requireUserVerification: true })
  } catch (e: any) {
    throw erro(400, 'Não foi possível ativar: ' + (e?.message ?? 'resposta inválida'))
  }
  if (!verificado.verified || !verificado.registrationInfo) throw erro(400, 'Não foi possível ativar o Face ID / digital')

  const { credential } = verificado.registrationInfo
  pinRecente.delete(usuarioId)
  await prisma.biometria.create({
    data: {
      tenantId,
      usuarioId,
      credentialId: credential.id,
      chavePublica: Buffer.from(credential.publicKey),
      contador: BigInt(credential.counter),
      transportes: credential.transports ?? [],
      aparelho: aparelho?.slice(0, 120) || null,
    },
  })
  return { credentialId: credential.id }
}

export async function opcoesEntrada(usuarioId: string, tenantId: string, origin: string | undefined) {
  const { rpID } = origemDe(origin)
  const biometrias = await prisma.biometria.findMany({
    where: { usuarioId, tenantId },
    select: { credentialId: true, transportes: true },
  })
  if (!biometrias.length) throw erro(404, 'Face ID / digital não está ativo para você')
  const opcoes = await generateAuthenticationOptions({
    rpID,
    allowCredentials: biometrias.map((b) => ({ id: b.credentialId, transports: b.transportes as any })),
    userVerification: 'required',
    timeout: 60_000,
  })
  guardarDesafio(`entrada:${usuarioId}`, opcoes.challenge)
  return opcoes
}

/** Confere o Face ID / digital de quem está logado e devolve o mesmo que o cartão dele */
export async function identificarBiometria(usuarioId: string, tenantId: string, resposta: any, origin: string | undefined) {
  const { origin: expectedOrigin, rpID } = origemDe(origin)
  const expectedChallenge = usarDesafio(`entrada:${usuarioId}`)
  const bio = await prisma.biometria.findFirst({ where: { credentialId: String(resposta?.id ?? ''), usuarioId, tenantId } })
  if (!bio) throw erro(404, 'Este Face ID / digital não está mais ativo. Use o PIN')

  let verificado
  try {
    verificado = await verifyAuthenticationResponse({
      response: resposta,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: { id: bio.credentialId, publicKey: new Uint8Array(bio.chavePublica), counter: Number(bio.contador), transports: bio.transportes as any },
      requireUserVerification: true,
    })
  } catch (e: any) {
    throw erro(400, 'Face ID / digital não confirmado. Tente de novo ou use o PIN')
  }
  if (!verificado.verified) throw erro(400, 'Face ID / digital não confirmado. Tente de novo ou use o PIN')

  await prisma.biometria.update({
    where: { id: bio.id },
    data: { contador: BigInt(verificado.authenticationInfo.newCounter), usadoEm: new Date() },
  })
  return usuarioLiberado(usuarioId, tenantId)
}

/** Entrar no sistema: o aparelho escolhe a chave (sem usuário digitado) */
export async function opcoesLogin(origin: string | undefined) {
  const { rpID } = origemDe(origin)
  const opcoes = await generateAuthenticationOptions({ rpID, userVerification: 'required', timeout: 60_000 })
  const desafioId = crypto.randomUUID()
  guardarDesafio(`login:${desafioId}`, opcoes.challenge)
  return { ...opcoes, desafioId }
}

/** Confere a chave escolhida pelo aparelho e devolve de quem ela é */
export async function loginComBiometria(desafioId: string, resposta: any, origin: string | undefined) {
  const { origin: expectedOrigin, rpID } = origemDe(origin)
  const expectedChallenge = usarDesafio(`login:${desafioId}`)
  const bio = await prisma.biometria.findFirst({
    where: { credentialId: String(resposta?.id ?? '') },
    include: { usuario: { include: { tenant: true } } },
  })
  if (!bio || !bio.usuario.ativo) throw erro(401, 'Esta biometria não está ativa. Entre com usuário e senha')
  // A chave guarda o id do usuário (userHandle): tem de ser o mesmo do cadastro
  const dono = resposta?.response?.userHandle ? Buffer.from(String(resposta.response.userHandle), 'base64url').toString() : bio.usuarioId
  if (dono !== bio.usuarioId) throw erro(401, 'Biometria não confere. Entre com usuário e senha')

  let verificado
  try {
    verificado = await verifyAuthenticationResponse({
      response: resposta,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: { id: bio.credentialId, publicKey: new Uint8Array(bio.chavePublica), counter: Number(bio.contador), transports: bio.transportes as any },
      requireUserVerification: true,
    })
  } catch {
    throw erro(401, 'Biometria não confirmada. Tente de novo ou entre com a senha')
  }
  if (!verificado.verified) throw erro(401, 'Biometria não confirmada. Tente de novo ou entre com a senha')

  await prisma.biometria.update({
    where: { id: bio.id },
    data: { contador: BigInt(verificado.authenticationInfo.newCounter), usadoEm: new Date() },
  })
  return bio.usuario
}

/** Quem está logado, com as permissões atuais (para a liberação renovada) */
export async function usuarioLiberado(usuarioId: string, tenantId: string) {
  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId, tenantId, ativo: true },
    select: { id: true, nome: true, cargo: true, perfilId: true },
  })
  if (!usuario) return null
  const permissoes = await getPermissoes(usuario.cargo, usuario.perfilId, tenantId)
  return { ...usuario, permissoes }
}

/** "Desativar neste celular" */
export async function remover(usuarioId: string, tenantId: string, credentialId: string) {
  await prisma.biometria.deleteMany({ where: { usuarioId, tenantId, credentialId } })
}
