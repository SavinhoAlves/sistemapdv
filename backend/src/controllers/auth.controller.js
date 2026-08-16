const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { query } = require('../database/connection');

function gerarToken(usuario) {
  return jwt.sign(
    {
      id:        usuario.id,
      nome:      usuario.nome,
      cargo:     usuario.cargo,
      perfil_id: usuario.perfil_id || null
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

async function buscarPermissoes(perfilId) {
  if (!perfilId) return null;
  try {
    const rows = await query('SELECT permissoes FROM perfis WHERE id = ? LIMIT 1', [perfilId]);
    if (!rows[0]) return null;
    const p = rows[0].permissoes;
    return typeof p === 'string' ? JSON.parse(p) : p;
  } catch { return null; }
}

function respostaLogin(res, token, usuario, permissoes) {
  return res.json({
    token,
    usuario: {
      id:         usuario.id,
      nome:       usuario.nome,
      cargo:      usuario.cargo,
      perfil_id:  usuario.perfil_id || null,
      permissoes: permissoes || null
    }
  });
}

// 🔑 Login com senha
const loginSenha = async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const result = await query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [email]);
    const usuario = result[0];

    if (!usuario || !usuario.senha_hash) return res.status(401).json({ error: 'Credenciais inválidas' });
    if (!usuario.ativo) return res.status(403).json({ error: 'Usuário inativo no sistema' });

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token      = gerarToken(usuario);
    const permissoes = await buscarPermissoes(usuario.perfil_id);
    return respostaLogin(res, token, usuario, permissoes);
  } catch (error) {
    console.error('Erro loginSenha:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

// 📡 Login por RFID
const loginRFID = async (req, res) => {
  try {
    const rfid = req.body.rfid || req.body.cartao_rfid;
    if (!rfid) return res.status(400).json({ error: 'RFID é obrigatório' });

    // Verifica se o RFID está habilitado nas configurações
    try {
      const cfg = await query('SELECT rfid_ativo FROM configuracoes WHERE id = 1');
      if (cfg[0] && cfg[0].rfid_ativo === 0) {
        return res.status(403).json({ error: 'Autenticação por cartão RFID está desativada' });
      }
    } catch {} // se a coluna não existe ainda, permite (seguro)

    const result = await query('SELECT * FROM usuarios WHERE cartao_rfid = ? LIMIT 1', [rfid]);
    const usuario = result[0];

    if (!usuario) return res.status(401).json({ error: 'RFID não encontrado' });
    if (!usuario.ativo) return res.status(403).json({ error: 'Usuário inativo no sistema' });

    const token      = gerarToken(usuario);
    const permissoes = await buscarPermissoes(usuario.perfil_id);
    return respostaLogin(res, token, usuario, permissoes);
  } catch (error) {
    console.error('Erro loginRFID:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

// 🔢 Login por PIN
const loginPIN = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN é obrigatório' });

    const candidatos = await query('SELECT * FROM usuarios WHERE pin IS NOT NULL AND ativo = 1 LIMIT 100', []);

    let usuario = null;
    for (const u of candidatos) {
      if (await bcrypt.compare(pin, u.pin)) { usuario = u; break; }
    }

    if (!usuario) return res.status(401).json({ error: 'PIN inválido' });

    const token      = gerarToken(usuario);
    const permissoes = await buscarPermissoes(usuario.perfil_id);
    return respostaLogin(res, token, usuario, permissoes);
  } catch (error) {
    console.error('Erro loginPIN:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

// ♻️ Renovar token
const renovar = async (req, res) => {
  try {
    const token      = gerarToken(req.user);
    const permissoes = await buscarPermissoes(req.user.perfil_id);
    return res.json({
      token,
      usuario: { ...req.user, permissoes: permissoes || null }
    });
  } catch (error) {
    console.error('Erro renovar:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

// 👤 Usuário autenticado
const me = async (req, res) => {
  try {
    const permissoes = await buscarPermissoes(req.user.perfil_id);
    return res.json({ usuario: { ...req.user, permissoes: permissoes || null } });
  } catch (error) {
    console.error('Erro me:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

// 📱 Login por QR Mobile
const loginMobile = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token é obrigatório' });
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const rows = await query(
      'SELECT * FROM usuarios WHERE mobile_token = ? AND mobile_token_expires > NOW() AND ativo = 1',
      [hash]
    );
    const usuario = rows[0];
    if (!usuario) return res.status(401).json({ error: 'Token inválido ou expirado' });
    const jwtToken = gerarToken(usuario);
    const permissoes = await buscarPermissoes(usuario.perfil_id);
    return respostaLogin(res, jwtToken, usuario, permissoes);
  } catch (err) {
    console.error('Erro loginMobile:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

module.exports = { loginRFID, loginSenha, loginPIN, renovar, me, loginMobile };
