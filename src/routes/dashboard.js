const express = require('express');
const router = express.Router();
const { requireLogin, requireOwner } = require('../middleware/auth');
const User = require('../database/models/User');
const Command = require('../database/models/Command');
const Media = require('../database/models/Media');
const BotConfig = require('../database/models/BotConfig');
const { getBot } = require('../bot/whatsapp');

router.use(requireLogin);

router.get('/', async (req, res) => {
  const bot = getBot();
  const botState = bot.getStatus();
  const stats = {
    botStatus: botState.status,
    totalUsers: await User.countDocuments().catch(() => 0),
    premiumUsers: await User.countDocuments({ role: 'premium' }).catch(() => 0),
    totalCommands: await Command.countDocuments().catch(() => 0),
    totalMedia: await Media.countDocuments().catch(() => 0),
    messageCount: botState.messageCount || 0,
  };
  res.render('dashboard/home', { title: 'Dashboard', stats });
});

router.get('/connect', requireOwner, (req, res) => {
  res.render('dashboard/connect', { title: 'Conectar Bot', botState: getBot().getStatus() });
});

router.get('/console', requireOwner, (req, res) => {
  res.render('dashboard/console', { title: 'Console Live', botState: getBot().getStatus() });
});

router.get('/broadcast', requireOwner, async (req, res) => {
  const medias = await Media.find().sort({ createdAt: -1 }).limit(100).catch(() => []);
  res.render('dashboard/broadcast', { title: 'Broadcast', medias });
});

router.get('/settings', requireOwner, async (req, res) => {
  const all = await BotConfig.find().catch(() => []);
  const settings = {};
  all.forEach(c => { settings[c.key] = c.value; });
  res.render('dashboard/settings', { title: 'Configurações', settings });
});

router.get('/commands', requireOwner, async (req, res) => {
  const commands = await Command.find().sort({ category: 1, name: 1 });
  res.render('dashboard/commands', { title: 'Comandos', commands });
});

router.get('/commands/new', requireOwner, async (req, res) => {
  const medias = await Media.find().sort({ createdAt: -1 }).limit(100).catch(() => []);
  res.render('dashboard/command-edit', { title: 'Novo Comando', cmd: null, medias });
});

router.get('/commands/:id/edit', requireOwner, async (req, res) => {
  const cmd = await Command.findById(req.params.id);
  if (!cmd) return res.redirect('/dashboard/commands');
  const medias = await Media.find().sort({ createdAt: -1 }).limit(100).catch(() => []);
  res.render('dashboard/command-edit', { title: 'Editar Comando', cmd, medias });
});

router.get('/media', requireOwner, async (req, res) => {
  const medias = await Media.find().sort({ createdAt: -1 });
  res.render('dashboard/media', { title: 'Mídias', medias });
});

router.get('/users', requireOwner, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.render('dashboard/users', { title: 'Usuários', users });
});

router.get('/profile', async (req, res) => {
  const user = await User.findById(req.session.user.id);
  res.render('dashboard/profile', { title: 'Meu Perfil', userData: user });
});

module.exports = router;
