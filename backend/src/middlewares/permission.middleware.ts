import type { FastifyRequest, FastifyReply } from 'fastify'
import { aplicarOperador } from './operador.middleware'
import { permissoesAtuais } from '../lib/permissoesAtuais'

/**
 * Permissões por cargo.
 *
 * Correções em relação à versão anterior:
 *
 * - `transferirComanda` e `encerrarSemPagamento` passam a existir. A primeira
 *   é para a rota de transferência (documentada no README e nunca
 *   implementada); a segunda separa "fechar comanda quitada" de "fechar
 *   comanda devendo", que antes eram a mesma permissão `fecharMesa`.
 *
 * - O early return de administrador foi corrigido. Ele rodava ANTES de
 *   consultar o perfil, então o comentário "a menos que explicitamente negado
 *   no perfil" não correspondia ao código: um perfil customizado não
 *   conseguia restringir nada de um administrador.
 *
 * - `abrirCaixa` NÃO existe e nunca existiu. `vendas.routes.ts` usava
 *   `requirePermissao('abrirCaixa')`, e como o fallback é
 *   `if (!permsCargo[permissao]) return 403`, apenas administrador conseguia
 *   fazer venda de balcão — caixa e garçom levavam 403 numa função central do
 *   produto. A rota corrigida usa `gerenciarCaixa`.
 */
export const PERMISSOES_CARGO: Record<string, Record<string, boolean>> = {
  administrador: {
    adicionarPedido: true,
    cancelarItemPedido: true,
    // Lixeira da comanda (item inteiro). Tirar uma unidade é adicionarPedido.
    excluirItemPedido: true,
    abrirMesa: true,
    fecharMesa: true,
    encerrarSemPagamento: true,
    transferirComanda: true,
    gerenciarCaixa: true,
    verCozinha: true,
    gerenciarProdutos: true,
    verRelatorios: true,
    gerenciarConfiguracoes: true,
    gerenciarUsuarios: true,
    gerenciarPerfis: true,
    verDashboard: true,
    aplicarDesconto: true,
    estornarPagamento: true,
    fazerEntregas: true,
  },
  garcom: {
    adicionarPedido: true,
    abrirMesa: true,
    transferirComanda: true,
    verCozinha: true,
    // Terminal de evento logado como garçom: "Sair das Mesas" leva ao Dashboard
    verDashboard: true,
  },
  caixa: {
    adicionarPedido: true,
    cancelarItemPedido: true,
    abrirMesa: true,
    fecharMesa: true,
    encerrarSemPagamento: true,
    transferirComanda: true,
    gerenciarCaixa: true,
    verCozinha: true,
    verRelatorios: true,
    aplicarDesconto: true,
    // Estorno mexe em caixa já conferido. Fica com o administrador.
    estornarPagamento: false,
  },
  cozinha: {
    verCozinha: true,
  },
  // App do entregador: só a própria rota
  entregador: {
    fazerEntregas: true,
  },
}

export function requirePermissao(permissao: string) {
  return requireAlgumaPermissao(permissao)
}

/** Passa se tiver qualquer uma das permissões (mesmas regras de requirePermissao) */
export function requireAlgumaPermissao(...lista: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth || request.auth.type !== 'tenant') {
      return reply.status(401).send({ error: 'Não autenticado' })
    }
    // Cartão RFID passado: a permissão conferida é a do dono do cartão
    if (!aplicarOperador(request, reply)) return

    // Confere pelas permissões de agora (banco), não pelas do login: uma
    // mudança do administrador vale na hora, mesmo com o token ainda válido.
    const auth = request.auth as any
    const atuais = auth.tenantId && auth.sub ? await permissoesAtuais(auth.tenantId, auth.sub) : null
    const quem = atuais ?? auth

    if (!lista.some(p => temPermissao(quem, p))) {
      return reply.status(403).send({ error: 'Sem permissão para esta ação' })
    }
  }
}

function temPermissao({ cargo, permissoes }: { cargo: string; permissoes?: Record<string, boolean> }, permissao: string): boolean {
  // O perfil customizado tem precedência sobre o cargo, inclusive para
  // administrador. Era o comportamento descrito no comentário original,
  // mas o código retornava antes de chegar aqui.
  if (permissoes && typeof permissoes[permissao] === 'boolean') return permissoes[permissao]

  // Sem perfil customizado: administrador passa em tudo.
  if (cargo === 'administrador') return true

  return !!PERMISSOES_CARGO[cargo]?.[permissao]
}
