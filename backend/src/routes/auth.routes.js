const express = require('express');
const router = express.Router();

const {
  loginRFID,
  loginSenha,
  loginPIN,
  renovar,
  me
} = require('../controllers/auth.controller');

const { authenticate } = require('../middlewares/auth.middleware');

// 🔐 Rotas oficiais
router.post('/login', loginSenha);
router.post('/rfid', loginRFID);
router.post('/pin', loginPIN);
router.get('/renovar', authenticate, renovar);
router.get('/me', authenticate, me);

module.exports = router;