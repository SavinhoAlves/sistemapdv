import crypto from 'crypto'
import type { Server, Socket } from 'socket.io'
import { EVENTOS, salas } from '../lib/eventos'

/**
 * Espelho ao vivo: o suporte (Central) vê a tela de um aparelho do restaurante.
 *
 * 1. a Central pede (espelho:pedir) → todos os aparelhos logados do restaurante
 *    recebem o aviso (espelho:pedido);
 * 2. o primeiro aparelho que responde decide; os outros fecham o aviso;
 * 3. aceito, o aparelho grava a página com rrweb (senhas mascaradas) e manda os
 *    eventos; o servidor só repassa, para a sala da sessão, onde está a Central.
 *
 * Nada é guardado: as sessões vivem em memória e acabam quando um dos lados
 * encerra, desconecta, ou quando ninguém responde ao pedido.
 */

const ESPERA_RESPOSTA_MS = 60_000
/** Pedido de tela inteira: no máximo um a cada 3 s por sessão */
const INTERVALO_QUADRO_MS = 3_000

interface Sessao {
  id: string
  tenantId: string
  suporte: string
  centralSocketId: string
  clienteSocketId: string | null
  timer: ReturnType<typeof setTimeout> | null
  ultimoQuadro: number
}

const sessoes = new Map<string, Sessao>()
const salaDaSessao = (id: string) => `espelho:${id}`

function encerrar(io: Server, s: Sessao, motivo: string) {
  if (!sessoes.has(s.id)) return
  sessoes.delete(s.id)
  if (s.timer) clearTimeout(s.timer)
  io.to(salaDaSessao(s.id)).emit(EVENTOS.espelho.encerrado, { sessao: s.id, motivo })
  if (s.clienteSocketId) io.to(s.clienteSocketId).emit(EVENTOS.espelho.encerrado, { sessao: s.id, motivo })
  // Aviso ainda aberto nos aparelhos (ninguém respondeu)
  else io.to(salas.todos(s.tenantId)).emit(EVENTOS.espelho.atendido, { sessao: s.id })
  io.in(salaDaSessao(s.id)).socketsLeave(salaDaSessao(s.id))
}

/** Lado da Central (socket com token da plataforma) */
export function espelhoDaCentral(io: Server, socket: Socket, user: { nome?: string }) {
  socket.on(EVENTOS.espelho.pedir, (dados: { tenantId?: string }, ack?: (r: any) => void) => {
    const tenantId = typeof dados?.tenantId === 'string' ? dados.tenantId : ''
    if (!tenantId) return ack?.({ erro: 'Restaurante não informado' })
    const s: Sessao = {
      id: crypto.randomUUID(), tenantId, suporte: user.nome || 'Suporte',
      centralSocketId: socket.id, clienteSocketId: null, timer: null, ultimoQuadro: 0,
    }
    s.timer = setTimeout(() => encerrar(io, s, 'Ninguém respondeu no restaurante'), ESPERA_RESPOSTA_MS)
    sessoes.set(s.id, s)
    socket.join(salaDaSessao(s.id))
    io.to(salas.todos(tenantId)).emit(EVENTOS.espelho.pedido, { sessao: s.id, suporte: s.suporte })
    ack?.({ sessao: s.id })
  })

  socket.on(EVENTOS.espelho.quadroCompleto, (dados: { sessao?: string }) => {
    const s = sessoes.get(String(dados?.sessao))
    if (!s || s.centralSocketId !== socket.id || !s.clienteSocketId) return
    if (Date.now() - s.ultimoQuadro < INTERVALO_QUADRO_MS) return
    s.ultimoQuadro = Date.now()
    io.to(s.clienteSocketId).emit(EVENTOS.espelho.quadroCompleto, { sessao: s.id })
  })

  socket.on(EVENTOS.espelho.encerrar, (dados: { sessao?: string }) => {
    const s = sessoes.get(String(dados?.sessao))
    if (s && s.centralSocketId === socket.id) encerrar(io, s, 'O suporte encerrou')
  })

  socket.on('disconnect', () => {
    for (const s of sessoes.values()) if (s.centralSocketId === socket.id) encerrar(io, s, 'O suporte saiu')
  })
}

/** Lado do restaurante (socket com token do tenant) */
export function espelhoDoRestaurante(io: Server, socket: Socket, user: { tenantId: string; nome?: string; suporte?: boolean }) {
  socket.on(EVENTOS.espelho.responder, (dados: { sessao?: string; aceitar?: boolean; tela?: string }) => {
    const s = sessoes.get(String(dados?.sessao))
    // Sessão de outro restaurante, já atendida, ou o próprio suporte logado como o cliente
    if (!s || s.tenantId !== user.tenantId || s.clienteSocketId || user.suporte) return
    if (s.timer) { clearTimeout(s.timer); s.timer = null }
    socket.to(salas.todos(s.tenantId)).emit(EVENTOS.espelho.atendido, { sessao: s.id })
    if (!dados.aceitar) return encerrar(io, s, `${user.nome || 'O restaurante'} recusou`)
    s.clienteSocketId = socket.id
    io.to(salaDaSessao(s.id)).emit(EVENTOS.espelho.aceito, { sessao: s.id, usuario: user.nome || '', tela: String(dados.tela ?? '').slice(0, 200) })
  })

  socket.on(EVENTOS.espelho.gravacao, (dados: { sessao?: string; eventos?: unknown[] }) => {
    const s = sessoes.get(String(dados?.sessao))
    if (!s || s.clienteSocketId !== socket.id || !Array.isArray(dados.eventos)) return
    socket.to(salaDaSessao(s.id)).emit(EVENTOS.espelho.gravacao, { sessao: s.id, eventos: dados.eventos })
  })

  socket.on(EVENTOS.espelho.encerrar, (dados: { sessao?: string }) => {
    const s = sessoes.get(String(dados?.sessao))
    if (s && s.clienteSocketId === socket.id) encerrar(io, s, `${user.nome || 'O cliente'} encerrou`)
  })

  socket.on('disconnect', () => {
    for (const s of sessoes.values()) if (s.clienteSocketId === socket.id) encerrar(io, s, 'O aparelho do cliente desconectou')
  })
}
