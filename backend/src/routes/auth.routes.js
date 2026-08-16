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

// 🔐 Rotas oficiais
router.post('/login', loginSenha);
router.post('/rfid', loginRFID);
router.post('/pin', loginPIN);
router.post('/mobile', loginMobile);
router.get('/renovar', authenticate, renovar);
router.get('/me', authenticate, me);

module.exports = router;
