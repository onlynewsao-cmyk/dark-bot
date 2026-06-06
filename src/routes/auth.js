const express = require('express');
const router = express.Router();
const User = require('../database/models/User');

// Landing page
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('landing', { title: 'Bem-vindo' });
});

// ===== LOGIN =====
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Login', error: null, username: '' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`[AUTH] Login attempt: username=${username} ip=${req.ip} ua=${req.headers['user-agent']?.slice(0,60)}`);
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.render('auth/login', { title: 'Login', error: 'Banco de dados offline. Configure MONGODB_URI no .env', username: username || '' });
  }
  try {
    const user = await User.findOne({ username: (username || '').toLowerCase().trim() });
    if (!user) {
      console.log(`[AUTH] User not found: ${username}`);
      return res.render('auth/login', { title: 'Login', error: 'Usuário ou senha inválidos', username: username || '' });
    }
    
    // Debug temporário para ver o papel do usuário
    console.log(`[AUTH] User found: ${user.username} role=${user.role} active=${user.active}`);

    if (!user.active) {
      console.log(`[AUTH] User inactive: ${username}`);
      return res.render('auth/login', { title: 'Login', error: 'Usuário ou senha inválidos', username: username || '' });
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      console.log(`[AUTH] Wrong password for: ${username}`);
      return res.render('auth/login', { title: 'Login', error: 'Usuário ou senha inválidos', username: username || '' });
    }
    console.log(`[AUTH] Login success: ${username} role=${user.role}`);
    user.lastLogin = new Date();
    await user.save();
    
    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      role: user.role,
      whatsappNumber: user.whatsappNumber,
    };

    // Força a gravação da sessão
    return req.session.save((err) => {
      if (err) {
        console.error('[AUTH] Session save error:', err);
      }
      console.log(`[AUTH] Redirecting ${username} to dashboard...`);
      res.redirect('/dashboard');
    });
  } catch (err) {
    console.error('[AUTH] Server error during login:', err);
    res.render('auth/login', { title: 'Login', error: 'Erro no servidor. Tente novamente.', username: username || '' });
  }
});

// ===== REGISTER =====
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/register', { title: 'Criar Conta', error: null, username: '', name: '', whatsappNumber: '' });
});

router.post('/register', async (req, res) => {
  const { username, password, name, whatsappNumber } = req.body;
  const renderErr = (msg) => res.render('auth/register', {
    title: 'Criar Conta', error: msg,
    username: username || '', name: name || '', whatsappNumber: whatsappNumber || '',
  });
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.render('auth/login', { title: 'Login', error: 'Banco de dados offline. Configure MONGODB_URI no .env', username: username || '' });
  }
  try {
    if (!username || !password) return renderErr('Preencha username e senha');
    if (password.length < 6) return renderErr('Senha deve ter mínimo 6 caracteres');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return renderErr('Username: só letras, números e _');
    const exists = await User.findOne({ username: username.toLowerCase().trim() });
    if (exists) return renderErr('Esse username já está em uso');
    await User.create({
      username: username.toLowerCase().trim(),
      password,
      name: (name || username).trim(),
      whatsappNumber: (whatsappNumber || '').replace(/\D/g, ''),
      role: 'free',
    });
    res.redirect('/login?registered=1');
  } catch (err) {
    console.error(err);
    renderErr('Erro ao criar conta: ' + err.message);
  }
});

// ===== LOGOUT =====
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
