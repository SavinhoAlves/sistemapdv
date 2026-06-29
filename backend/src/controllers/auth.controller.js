const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ⚠️ Ajuste conforme seu banco
const { query } = require('../database/connection');

// 🔐 Gerar token
function gerarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      nome: usuario.nome,
      cargo: usuario.cargo
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// 🔑 Login com senha
const loginSenha = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const result = await query(
      'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );

    const usuario = result[0];

    if (!usuario || !usuario.senha_hash) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!usuario.ativo) {
      return res.status(403).json({ error: 'Usuário inativo no sistema' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = gerarToken(usuario);

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        cargo: usuario.cargo
      }
    });
  } catch (error) {
    console.error('Erro loginSenha:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// 📡 Login por RFID
const loginRFID = async (req, res) => {
  try {
    const rfid = req.body.rfid || req.body.cartao_rfid;

    if (!rfid) {
      return res.status(400).json({ error: 'RFID é obrigatório' });
    }

    const result = await query(
      'SELECT * FROM usuarios WHERE cartao_rfid = ? LIMIT 1',
      [rfid]
    );

    const usuario = result[0];

    if (!usuario) {
      return res.status(401).json({ error: 'RFID não encontrado' });
    }

    if (!usuario.ativo) {
      return res.status(403).json({ error: 'Usuário inativo no sistema' });
    }

    const token = gerarToken(usuario);

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        cargo: usuario.cargo
      }
    });
  } catch (error) {
    console.error('Erro loginRFID:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// 🔢 Login por PIN
const loginPIN = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'PIN é obrigatório' });
    }

    const candidatos = await query(
      'SELECT * FROM usuarios WHERE pin IS NOT NULL AND ativo = 1 LIMIT 100',
      []
    );

    let usuario = null;
    for (const u of candidatos) {
      if (await bcrypt.compare(pin, u.pin)) {
        usuario = u;
        break;
      }
    }

    if (!usuario) {
      return res.status(401).json({ error: 'PIN inválido' });
    }

    const token = gerarToken(usuario);

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        cargo: usuario.cargo
      }
    });
  } catch (error) {
    console.error('Erro loginPIN:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// 👤 Usuário autenticado
const me = async (req, res) => {
  try {
    // ✅ AJUSTADO: Mudado de req.usuario para req.user para bater com o auth.middleware.js
    const usuario = req.user; 

    res.json({
      usuario
    });
  } catch (error) {
    console.error('Erro me:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

module.exports = {
  loginRFID,
  loginSenha,
  loginPIN,
  me
};