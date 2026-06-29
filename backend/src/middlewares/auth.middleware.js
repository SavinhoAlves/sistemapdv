const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');

const CARGOS = {
  administrador: ['administrador'],
  garcom: ['garcom', 'administrador'],
  caixa: ['caixa', 'administrador'],
  cozinha: ['cozinha', 'administrador']
};

// Middleware de autenticação JWT
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verifica se usuário ainda está ativo
    const [usuario] = await query(
      'SELECT id, nome, cargo, ativo FROM usuarios WHERE id = ?',
      [decoded.id]
    );

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ error: 'Usuário inativo ou não encontrado' });
    }

    req.user = usuario;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Middleware de autorização por cargo
function authorize(...cargosPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userCargo = req.user.cargo;
    const permitido = cargosPermitidos.some(cargo => {
      if (cargo === 'administrador') return userCargo === 'administrador';
      return CARGOS[cargo]?.includes(userCargo);
    });

    if (!permitido) {
      return res.status(403).json({
        error: 'Acesso negado. Cargo sem permissão para esta ação.',
        cargo: userCargo,
        requerido: cargosPermitidos
      });
    }

    next();
  };
}

// Permissões específicas
const permissoes = {
  abrirMesa: authorize('garcom', 'administrador'),
  adicionarPedido: authorize('garcom', 'administrador'),
  fecharMesa: authorize('caixa', 'administrador'),
  verCozinha: authorize('cozinha', 'garcom', 'administrador'),
  atualizarItemCozinha: authorize('cozinha', 'administrador'),
  gerenciarUsuarios: authorize('administrador'),
  gerenciarProdutos: authorize('administrador'),
  relatorios: authorize('administrador', 'caixa'),
  gerenciarCaixa: authorize('caixa', 'administrador'),
  cancelarPedido: authorize('administrador')
};

module.exports = { authenticate, authorize, permissoes };
