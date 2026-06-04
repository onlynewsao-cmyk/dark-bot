const express = require('express');
const router = express.Router();
const User = require('../database/models/User');

// Landing page
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('landing', { title: 'Bem-vindo' });
});

// LOGIN
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Login', error: null, username: '' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User.findOne({ username: (username || '').toLowerCase().trim() });
    
    if (!user || !user.active) {
      return res.render('auth/login', { 
        title: 'Login', 
        error: 'Usuário ou senha inválidos', 
        username: username || '' 
      });
    }

    const ok = await user.comparePassword(password);
    
    if (!ok) {
      return res.render('auth/login', { 
        title: 'Login', 
        error: 'Usuário ou senha inválidos', 
        username: username || '' 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      role: user.role,
      whatsappNumber: user.whatsappNumber,
    };

    res.redirect('/dashboard');
    
  } catch (err) {
    console.error('Erro no login:', err);
    res.render('auth/login', { 
      title: 'Login', 
      error: 'Erro no servidor. Tente novamente.', 
      username: username || '' 
    });
  }
});

// LOGOUT
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;