import crypto from 'crypto'
import type { Server, Socket } from 'socket.io'
import { EVENTOS, salas } from '../lib/eventos'
import { prisma, semEscopoDeTenant } from '../lib/prisma'

/**
 * Acesso remoto (como o AnyDesk, dentro do navegador): o suporte (Central) vê e,
 * com permissão, controla a tela de um aparelho do restaurante.
 *
 * 1. a Central lista os aparelhos logados (espelho:aparelhos) e pede um deles
 *    (ou todos); com "acesso sem aceite" ligado pelo admin, começa direto;
 *    senão o aparelho pergunta e o primeiro que responde decide;
 * 2. aceito, o aparelho grava a página com rrweb (senhas mascaradas) e manda os
 *    eventos; o servidor repassa para a Central, que reproduz ao vivo;
 * 3. o suporte pode apontar (sempre) e, com o controle permitido, clicar,
 *    digitar e rolar; o cliente retoma o controle quando quiser; chat nos dois
 *    sentidos.
 *
 * As sessões vivem em memória; cada sessão aceita vira uma linha em
 * sessoes_remotas (quem, quando, se controlou, quantas mensagens).
 */

const ESPERA_RESPOSTA_MS = 60_000
/** Pedido de tela inteira: no máximo um a cada 3 s por sessão */
const INTERVALO_QUADRO_MS = 3_000
/** Ações que só passam com o controle permitido */
const ACOES_DE_CONTROLE = new Set(['clique', 'tecla', 'texto', 'rolar', 'selecionar'])
const ACOES = new Set([...ACOES_DE_CONTROLE, 'cursor', 'apontar'])

interface Sessao {
  id: string
  tenantId: string
  suporte: string
  suporteId: string | null
  centralSocketId: string
  clienteSocketId: string | null
  timer: ReturnType<typeof setTimeout> | null
  ultimoQuadro: number
  semAceite: boolean
  controle: boolean
  usouControle: boolean
  mensagens: number
  registroId: string | null
}

/** Dados do aparelho guardados no socket (fetchSockets só enxerga socket.data) */
interface DadosAparelho { nome: string; cargo: string; tela: string; desde: number }

const sessoes = new Map<string, Sessao>()
const salaDaSessao = (id: string) => `espelho:${id}`
const texto = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

async function semAceiteLigado(tenantId: string) {
  const cfg = await semEscopoDeTenant(() => prisma.configuracoes.findFirst({ where: { tenantId }, select: { suporteSemAceite: true } }))
  return Boolean(cfg?.suporteSemAceite)
}

async function registrarInicio(s: Sessao, usuario: string, tela: string) {
  try {
    const r = await semEscopoDeTenant(() => prisma.sessaoRemota.create({
      data: { tenantId: s.tenantId, suporteId: s.suporteId, suporteNome: s.suporte, usuarioNome: usuario || null, tela: tela || null, semAceite: s.semAceite, controle: s.controle },
      select: { id: true },
    }))
    s.registroId = r.id
  } catch (e) {
    console.warn('[espelho] registro não gravado:', (e as Error).message)
  }
}

function registrarFim(s: Sessao, motivo: string) {
  if (!s.registroId) return
  const data = { fim: new Date(), motivoFim: motivo, controle: s.usouControle, mensagens: s.mensagens }
  semEscopoDeTenant(() => prisma.sessaoRemota.update({ where: { id: s.registroId! }, data }))
    .catch((e) => console.warn('[espelho] fim não gravado:', e.message))
}

function encerrar(io: Server, s: Sessao, motivo: string) {
  if (!sessoes.has(s.id)) return
  sessoes.delete(s.id)
  if (s.timer) clearTimeout(s.timer)
  registrarFim(s, motivo)
  io.to(salaDaSessao(s.id)).emit(EVENTOS.espelho.encerrado, { sessao: s.id, motivo })
  if (s.clienteSocketId) io.to(s.clienteSocketId).emit(EVENTOS.espelho.encerrado, { sessao: s.id, motivo })
  // Aviso ainda aberto nos aparelhos (ninguém respondeu)
  else io.to(salas.todos(s.tenantId)).emit(EVENTOS.espelho.atendido, { sessao: s.id })
  io.in(salaDaSessao(s.id)).socketsLeave(salaDaSessao(s.id))
}

/** Sessão começou num aparelho (aceite na tela ou acesso sem aceite) */
async function comecar(io: Server, s: Sessao, clienteSocketId: string, usuario: string, tela: string) {
  s.clienteSocketId = clienteSocketId
  if (s.timer) { clearTimeout(s.timer); s.timer = null }
  await registrarInicio(s, usuario, tela)
  io.to(salaDaSessao(s.id)).emit(EVENTOS.espelho.aceito, { sessao: s.id, usuario, tela, semAceite: s.semAceite, controle: s.controle })
}

/** Lado da Central (socket com token da plataforma) */
export function espelhoDaCentral(io: Server, socket: Socket, user: { nome?: string; id?: string }) {
  const daCentral = (id: unknown) => {
    const s = sessoes.get(String(id))
    return s && s.centralSocketId === socket.id ? s : null
  }

  socket.on(EVENTOS.espelho.aparelhos, async (dados: { tenantId?: string }, ack?: (r: any) => void) => {
    const tenantId = texto(dados?.tenantId, 64)
    if (!tenantId || typeof ack !== 'function') return
    const conectados = await io.in(salas.todos(tenantId)).fetchSockets()
    const aparelhos = conectados
      .filter((c) => c.data?.aparelho)
      .map((c) => ({ id: c.id, ...(c.data.aparelho as DadosAparelho) }))
    ack({ aparelhos, semAceite: await semAceiteLigado(tenantId) })
  })

  socket.on(EVENTOS.espelho.pedir, async (dados: { tenantId?: string; aparelho?: string }, ack?: (r: any) => void) => {
    const tenantId = texto(dados?.tenantId, 64)
    if (!tenantId) return ack?.({ erro: 'Restaurante não informado' })
    // Aparelho escolhido: tem de estar logado neste restaurante agora
    let alvo: { id: string; dados: DadosAparelho } | null = null
    if (dados?.aparelho) {
      const conectados = await io.in(salas.todos(tenantId)).fetchSockets()
      const c = conectados.find((x) => x.id === dados.aparelho && x.data?.aparelho)
      if (!c) return ack?.({ erro: 'Esse aparelho saiu do sistema. Atualize a lista.' })
      alvo = { id: c.id, dados: c.data.aparelho as DadosAparelho }
    }
    const semAceite = Boolean(alvo) && (await semAceiteLigado(tenantId))
    const s: Sessao = {
      id: crypto.randomUUID(), tenantId, suporte: user.nome || 'Suporte', suporteId: user.id ?? null,
      centralSocketId: socket.id, clienteSocketId: null, timer: null, ultimoQuadro: 0,
      semAceite, controle: semAceite, usouControle: false, mensagens: 0, registroId: null,
    }
    sessoes.set(s.id, s)
    socket.join(salaDaSessao(s.id))
    ack?.({ sessao: s.id, semAceite })

    if (semAceite && alvo) {
      io.to(alvo.id).emit(EVENTOS.espelho.iniciar, { sessao: s.id, suporte: s.suporte, controle: true })
      return comecar(io, s, alvo.id, alvo.dados.nome, alvo.dados.tela)
    }
    s.timer = setTimeout(() => encerrar(io, s, 'Ninguém respondeu no restaurante'), ESPERA_RESPOSTA_MS)
    io.to(alvo ? alvo.id : salas.todos(tenantId)).emit(EVENTOS.espelho.pedido, { sessao: s.id, suporte: s.suporte })
  })

  socket.on(EVENTOS.espelho.quadroCompleto, (dados: { sessao?: string }) => {
    const s = daCentral(dados?.sessao)
    if (!s?.clienteSocketId || Date.now() - s.ultimoQuadro < INTERVALO_QUADRO_MS) return
    s.ultimoQuadro = Date.now()
    io.to(s.clienteSocketId).emit(EVENTOS.espelho.quadroCompleto, { sessao: s.id })
  })

  socket.on(EVENTOS.espelho.pedirControle, (dados: { sessao?: string }) => {
    const s = daCentral(dados?.sessao)
    if (!s?.clienteSocketId) return
    if (s.semAceite) {
      s.controle = true
      s.usouControle = true
      io.to(s.clienteSocketId).emit(EVENTOS.espelho.controle, { sessao: s.id, permitido: true })
      return socket.emit(EVENTOS.espelho.controle, { sessao: s.id, permitido: true })
    }
    io.to(s.clienteSocketId).emit(EVENTOS.espelho.pedirControle, { sessao: s.id, suporte: s.suporte })
  })

  socket.on(EVENTOS.espelho.acao, (dados: { sessao?: string; tipo?: string; [k: string]: unknown }) => {
    const s = daCentral(dados?.sessao)
    const tipo = String(dados?.tipo)
    if (!s?.clienteSocketId || !ACOES.has(tipo)) return
    if (ACOES_DE_CONTROLE.has(tipo) && !s.controle) return
    if (ACOES_DE_CONTROLE.has(tipo)) s.usouControle = true
    const acao = {
      sessao: s.id, tipo,
      x: Number(dados.x) || 0, y: Number(dados.y) || 0,
      dx: Number(dados.dx) || 0, dy: Number(dados.dy) || 0,
      tecla: texto(dados.tecla, 32), texto: texto(dados.texto, 2000), valor: texto(dados.valor, 500),
      ctrl: !!dados.ctrl, shift: !!dados.shift, alt: !!dados.alt, meta: !!dados.meta,
    }
    io.to(s.clienteSocketId).emit(EVENTOS.espelho.acao, acao)
  })

  socket.on(EVENTOS.espelho.chat, (dados: { sessao?: string; texto?: string }) => {
    const s = daCentral(dados?.sessao)
    const msg = texto(dados?.texto, 1000)
    if (!s?.clienteSocketId || !msg) return
    s.mensagens++
    io.to(s.clienteSocketId).emit(EVENTOS.espelho.chat, { sessao: s.id, de: 'suporte', nome: s.suporte, texto: msg, em: Date.now() })
  })

  socket.on(EVENTOS.espelho.encerrar, (dados: { sessao?: string }) => {
    const s = daCentral(dados?.sessao)
    if (s) encerrar(io, s, 'O suporte encerrou')
  })

  socket.on('disconnect', () => {
    for (const s of sessoes.values()) if (s.centralSocketId === socket.id) encerrar(io, s, 'O suporte saiu')
  })
}

/** Lado do restaurante (socket com token do tenant) */
export function espelhoDoRestaurante(io: Server, socket: Socket, user: { tenantId: string; nome?: string; cargo?: string; suporte?: boolean }) {
  // A própria aba de suporte (aberta pela Central como o cliente) não entra na lista
  if (!user.suporte) {
    socket.data.aparelho = { nome: user.nome || '', cargo: user.cargo || '', tela: '', desde: Date.now() } satisfies DadosAparelho
  }
  const doCliente = (id: unknown) => {
    const s = sessoes.get(String(id))
    return s && s.clienteSocketId === socket.id ? s : null
  }

  socket.on(EVENTOS.espelho.onde, (dados: { tela?: string }) => {
    if (socket.data.aparelho) socket.data.aparelho.tela = texto(dados?.tela, 200)
  })

  socket.on(EVENTOS.espelho.responder, async (dados: { sessao?: string; aceitar?: boolean; tela?: string }) => {
    const s = sessoes.get(String(dados?.sessao))
    // Sessão de outro restaurante, já atendida, ou o próprio suporte logado como o cliente
    if (!s || s.tenantId !== user.tenantId || s.clienteSocketId || user.suporte) return
    socket.to(salas.todos(s.tenantId)).emit(EVENTOS.espelho.atendido, { sessao: s.id })
    if (!dados.aceitar) return encerrar(io, s, `${user.nome || 'O restaurante'} recusou`)
    await comecar(io, s, socket.id, user.nome || '', texto(dados.tela, 200))
  })

  socket.on(EVENTOS.espelho.controle, (dados: { sessao?: string; permitido?: boolean }) => {
    const s = doCliente(dados?.sessao)
    if (!s) return
    s.controle = !!dados.permitido
    if (s.controle) s.usouControle = true
    io.to(salaDaSessao(s.id)).emit(EVENTOS.espelho.controle, { sessao: s.id, permitido: s.controle })
  })

  socket.on(EVENTOS.espelho.gravacao, (dados: { sessao?: string; eventos?: unknown[] }) => {
    const s = doCliente(dados?.sessao)
    if (!s || !Array.isArray(dados.eventos)) return
    socket.to(salaDaSessao(s.id)).emit(EVENTOS.espelho.gravacao, { sessao: s.id, eventos: dados.eventos })
  })

  socket.on(EVENTOS.espelho.chat, (dados: { sessao?: string; texto?: string }) => {
    const s = doCliente(dados?.sessao)
    const msg = texto(dados?.texto, 1000)
    if (!s || !msg) return
    s.mensagens++
    io.to(salaDaSessao(s.id)).emit(EVENTOS.espelho.chat, { sessao: s.id, de: 'cliente', nome: user.nome || 'Cliente', texto: msg, em: Date.now() })
  })

  socket.on(EVENTOS.espelho.encerrar, (dados: { sessao?: string }) => {
    const s = doCliente(dados?.sessao)
    if (s) encerrar(io, s, `${user.nome || 'O cliente'} encerrou`)
  })

  socket.on('disconnect', () => {
    for (const s of sessoes.values()) if (s.clienteSocketId === socket.id) encerrar(io, s, 'O aparelho do cliente desconectou')
  })
}
