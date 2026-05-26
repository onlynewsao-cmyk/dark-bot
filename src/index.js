const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const config = require('./config');
const { connectDB } = require('./database/connection');
const User = require('./database/models/User');
const Command = require('./database/models/Command');
const { getBot } = require('./bot/whatsapp');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');

async function bootstrap() {
  // Cloudinary
  if (config.cloudinary.cloud_name) {
    cloudinary.config(config.cloudinary);
    console.log('☁️  Cloudinary configurado');
  } else {
    console.warn('⚠️  Cloudinary não configurado — upload de mídia desabilitado');
  }

  // MongoDB
  const conn = await connectDB();

  // Seed do dono
  if (conn) {
    const existing = await User.findOne({ username: config.owner.username });
    if (!existing) {
      await User.create({
        username: config.owner.username,
        password: config.owner.password,
        name: config.owner.name,
        whatsappNumber: config.owner.number,
        role: 'owner',
      });
      console.log(`👑 Conta do dono criada: ${config.owner.username}`);
    }
    // Seed de comandos básicos se vazio
    const count = await Command.countDocuments();
    if (count === 0) {
      await Command.insertMany([
        { name: 'oi', description: 'Saudação', response: '👋 Olá {user}! Eu sou o {bot}.', category: 'geral' },
        { name: 'site', description: 'Site do dono', response: '🌐 Visite nosso site!', category: 'info' },
        { name: 'vip', description: 'Info premium', response: '⭐ Comando premium ativo {user}!', category: 'premium', accessLevel: 'premium' },
      ]);
      console.log('📚 Comandos iniciais criados');
    }
  }

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  // Views
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Middlewares
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  const sessionConfig = {
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7, secure: false },
  };
  if (conn) {
    sessionConfig.store = MongoStore.create({ mongoUrl: config.mongodb.uri, ttl: 60 * 60 * 24 * 7 });
  }
  app.use(session(sessionConfig));

  // Disponibiliza dados globais nas views
  app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.bot = config.bot;
    res.locals.owner = config.owner;
    res.locals.currentPath = req.path;
    next();
  });

  // Health check para Render
  app.get('/health', (req, res) => res.json({ status: 'ok', bot: getBot(io).getStatus().status }));

  // Rotas
  app.use('/', authRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/api', apiRoutes(io));

  // 404
  app.use((req, res) => res.status(404).render('404', { title: '404' }));

  // Socket.IO
  io.on('connection', (socket) => {
    const bot = getBot(io);
    socket.emit('bot:status', bot.getStatus());
  });

  // Bot
  const bot = getBot(io);
  // Auto-conectar se já houver credenciais salvas
  const fs = require('fs');
  const authFolder = path.join(__dirname, '..', 'data', 'auth');
  if (fs.existsSync(authFolder) && fs.readdirSync(authFolder).length > 0) {
    console.log('🔄 Sessão WhatsApp encontrada — reconectando...');
    bot.start({ mode: 'qr' }).catch((e) => console.error('Erro auto-start:', e));
  }

  server.listen(config.port, () => {
    console.log(`\n🚀 ${config.bot.name} rodando em ${config.appUrl}`);
    console.log(`📊 Dashboard: ${config.appUrl}/dashboard`);
    console.log(`👑 Dono: ${config.owner.name} (${config.owner.username})\n`);
  });
}

bootstrap().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
