const express = require('express');
const router = express.Router();

const {
  loginRFID,
  loginSenha,
  loginPIN,
  renovar,
  me,
  loginMobile
} = require('../controllers/auth.controller');

const { authenticate } = require('../middlewares/auth.middleware');
const { query } = require('../database/connection');

// 🔐 Rotas oficiais
router.post('/login', loginSenha);
router.post('/rfid', loginRFID);
router.post('/pin', loginPIN);
router.post('/mobile', loginMobile);
router.get('/renovar', authenticate, renovar);
router.get('/me', authenticate, me);

// Identifica usuário pelo cartão RFID (sem gerar sessão — só retorna nome/cargo)
router.post('/rfid-identify', async (req, res) => {
  try {
    const rfid = req.body.rfid || req.body.cartao_rfid
    if (!rfid) return res.status(400).json({ error: 'RFID é obrigatório' })

    const rows = await query(
      'SELECT id, nome, cargo, perfil_id, ativo FROM usuarios WHERE cartao_rfid = ? LIMIT 1',
      [rfid]
    )
    const u = rows[0]
    if (!u) return res.status(401).json({ error: 'Cartão não cadastrado' })
    if (!u.ativo) return res.status(403).json({ error: 'Usuário inativo' })

    let permissoes = null
    if (u.perfil_id) {
      const perfilRows = await query('SELECT permissoes FROM perfis WHERE id = ? LIMIT 1', [u.perfil_id]).catch(() => [])
      const p = perfilRows[0]?.permissoes
      permissoes = p ? (typeof p === 'string' ? JSON.parse(p) : p) : null
    }

    return res.json({ usuario: { id: u.id, nome: u.nome, cargo: u.cargo, permissoes } })
  } catch (err) {
    console.error('Erro rfid-identify:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// Público: informa se o acesso mobile está habilitado (sem autenticação)
router.get('/mobile-status', async (req, res) => {
  try {
    const rows = await query('SELECT venda_mobile_permitida FROM sync_config WHERE id = 1')
    const ativo = rows.length === 0 ? true : Boolean(rows[0]?.venda_mobile_permitida)
    return res.json({ ativo })
  } catch {
    return res.json({ ativo: true }) // fail-open se DB indisponível
  }
});

module.exports = router;
