const jwt = require('jsonwebtoken')
const { query } = require('../database/connection')

// Permissões padrão por cargo (usado quando o usuário não tem perfil vinculado)
const PERMISSOES_PADRAO = {
  administrador: {
    adicionarPedido: true, cancelarItemPedido: true,
    abrirMesa: true, fecharMesa: true,
    gerenciarCaixa: true, verCozinha: true,
    gerenciarProdutos: true, verRelatorios: true,
    gerenciarConfiguracoes: true
  },
  garcom: {
    adicionarPedido: true, cancelarItemPedido: false,
    abrirMesa: true, fecharMesa: false,
    gerenciarCaixa: false, verCozinha: true,
    gerenciarProdutos: false, verRelatorios: false,
    gerenciarConfiguracoes: false
  },
  caixa: {
    adicionarPedido: true, cancelarItemPedido: true,
    abrirMesa: true, fecharMesa: true,
    gerenciarCaixa: true, verCozinha: true,
    gerenciarProdutos: false, verRelatorios: true,
    gerenciarConfiguracoes: false
  },
  cozinha: {
    adicionarPedido: false, cancelarItemPedido: false,
    abrirMesa: false, fecharMesa: false,
    gerenciarCaixa: false, verCozinha: true,
    gerenciarProdutos: false, verRelatorios: false,
    gerenciarConfiguracoes: false
  }
}

function resolverPermissoes(usuario) {
  if (usuario.cargo === 'administrador') return PERMISSOES_PADRAO.administrador

  if (usuario.perfil_permissoes) {
    try {
      const p = typeof usuario.perfil_permissoes === 'string'
        ? JSON.parse(usuario.perfil_permissoes)
        : usuario.perfil_permissoes
      return p
    } catch {}
  }

  return PERMISSOES_PADRAO[usuario.cargo] || {}
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const [usuario] = await query(
      `SELECT u.id, u.nome, u.cargo, u.ativo, u.perfil_id,
              p.permissoes AS perfil_permissoes, p.nome AS perfil_nome
       FROM usuarios u
       LEFT JOIN perfis p ON p.id = u.perfil_id
       WHERE u.id = ?`,
      [decoded.id]
    )

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ error: 'Usuário inativo ou não encontrado' })
    }

    usuario.permissoes = resolverPermissoes(usuario)
    req.user = usuario
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' })
    }
    return res.status(401).json({ error: 'Token inválido' })
  }
}

// Verificação por cargo (rotas estritamente administrativas)
function authorize(...cargosPermitidos) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' })
    if (!cargosPermitidos.includes(req.user.cargo)) {
      return res.status(403).json({ error: 'Acesso negado', requerido: cargosPermitidos })
    }
    return next()
  }
}

// Verificação por permissão configurável de perfil
function autorizarPermissao(permissao) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' })
    if (req.user.cargo === 'administrador') return next()
    if (!req.user.permissoes?.[permissao]) {
      return res.status(403).json({ error: 'Sem permissão para esta ação' })
    }
    return next()
  }
}

const permissoes = {
  abrirMesa:            autorizarPermissao('abrirMesa'),
  adicionarPedido:      autorizarPermissao('adicionarPedido'),
  fecharMesa:           autorizarPermissao('fecharMesa'),
  verCozinha:           autorizarPermissao('verCozinha'),
  atualizarItemCozinha: autorizarPermissao('verCozinha'),
  gerenciarUsuarios:    authorize('administrador'),
  gerenciarProdutos:    autorizarPermissao('gerenciarProdutos'),
  relatorios:           autorizarPermissao('verRelatorios'),
  gerenciarCaixa:       autorizarPermissao('gerenciarCaixa'),
  cancelarPedido:       autorizarPermissao('cancelarItemPedido'),
}

module.exports = { authenticate, authorize, autorizarPermissao, permissoes, PERMISSOES_PADRAO }
