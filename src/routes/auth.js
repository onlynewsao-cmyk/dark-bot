const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../database/models/User');

function renderLogin(res, error = null, username = '') {
  return res.render('auth/login', { title: 'Login', error, username });
}

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

// Landing page
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('landing', { title: 'Bem-vindo' });
});

// ===== LOGIN =====
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  renderLogin(res);
});

router.post('/login', async (req, res) => {
  const username = (req.body.username || '').toLowerCase().trim();
  const password = req.body.password || '';

  try {
    if (!username || !password) {
      return renderLogin(res, 'Preencha username e senha', username);
    }
    if (!isDatabaseReady()) {
      return renderLogin(res, 'Base de dados indisponível. Verifique MONGODB_URI no Render.', username);
    }

    const user = await User.findOne({ username }).maxTimeMS(8000);
    if (!user || !user.active) {
      return renderLogin(res, 'Usuário ou senha inválidos', username);
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return renderLogin(res, 'Usuário ou senha inválidos', username);
    }

    user.lastLogin = new Date();
    await user.save();

    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error('Session regenerate:', regenErr.message);
        return renderLogin(res, 'Erro ao iniciar sessão. Tente novamente.', username);
      }
      req.session.user = {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role,
        whatsappNumber: user.whatsappNumber,
      };
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save:', saveErr.message);
          return renderLogin(res, 'Erro ao guardar sessão. Tente novamente.', username);
        }
        return res.redirect('/dashboard');
      });
    });
  } catch (err) {
    console.error('Login error:', err.message);
    renderLogin(res, 'Erro no servidor. Tente novamente.', username);
  }
});

// ===== REGISTER =====
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/register', { title: 'Criar Conta', error: null, username: '', name: '', whatsappNumber: '' });
});

router.post('/register', async (req, res) => {
  const { username, password, name, whatsappNumber } = req.body;
  const cleanUsername = (username || '').toLowerCase().trim();
  const renderErr = (msg) => res.render('auth/register', {
    title: 'Criar Conta', error: msg,
    username: cleanUsername, name: name || '', whatsappNumber: whatsappNumber || '',
  });
  try {
    if (!isDatabaseReady()) return renderErr('Base de dados indisponível. Verifique MONGODB_URI no Render.');
    if (!cleanUsername || !password) return renderErr('Preencha username e senha');
    if (password.length < 6) return renderErr('Senha deve ter mínimo 6 caracteres');
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) return renderErr('Username: só letras, números e _');
    const exists = await User.findOne({ username: cleanUsername }).maxTimeMS(8000);
    if (exists) return renderErr('Esse username já está em uso');
    await User.create({
      username: cleanUsername,
      password,
      name: (name || cleanUsername).trim(),
      whatsappNumber: (whatsappNumber || '').replace(/\D/g, ''),
      role: 'free',
    });
    res.redirect('/login?registered=1');
  } catch (err) {
    console.error('Register error:', err.message);
    renderErr('Erro ao criar conta: ' + err.message);
  }
});

// ===== LOGOUT =====
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
