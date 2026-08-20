import type { FastifyRequest, FastifyReply } from 'fastify'

// Permissões padrão por cargo
const PERMISSOES_CARGO: Record<string, Record<string, boolean>> = {
  administrador: {
    adicionarPedido: true,
    cancelarItemPedido: true,
    abrirMesa: true,
    fecharMesa: true,
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
  },
  garcom: {
    adicionarPedido: true,
    abrirMesa: true,
    verCozinha: true,
  },
  caixa: {
    adicionarPedido: true,
    cancelarItemPedido: true,
    abrirMesa: true,
    fecharMesa: true,
    gerenciarCaixa: true,
    verCozinha: true,
    verRelatorios: true,
    aplicarDesconto: true,
  },
  cozinha: {
    verCozinha: true,
  },
}

export function requirePermissao(permissao: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth || request.auth.type !== 'tenant') {
      return reply.status(401).send({ error: 'Não autenticado' })
    }

    const { cargo, permissoes } = request.auth as any

    // Administrador sempre passa (a menos que explicitamente negado no perfil)
    if (cargo === 'administrador') return

    // Verifica permissão no perfil customizado
    if (permissoes && typeof permissoes[permissao] === 'boolean') {
      if (!permissoes[permissao]) {
        return reply.status(403).send({ error: 'Sem permissão para esta ação' })
      }
      return
    }

    // Fallback para permissões padrão do cargo
    const permsCargo = PERMISSOES_CARGO[cargo] ?? {}
    if (!permsCargo[permissao]) {
      return reply.status(403).send({ error: 'Sem permissão para esta ação' })
    }
  }
}
