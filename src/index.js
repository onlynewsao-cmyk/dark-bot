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
const scheduler = require('./bot/scheduler');
const botConfigCache = require('./bot/botConfigCache');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');

async function bootstrap() {
  // Cloudinary
  if (config.cloudinary.cloud_name) {
    cloudinary.config(config.cloudinary);
    console.log('☁️  Cloudinary configurado');
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
      console.log(`👑 Dono criado: ${config.owner.username}`);
    } else {
      console.log(`👑 Dono já existe: ${config.owner.username}`);
    }
  }

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  // Configuração de sessão melhorada
  const sessionConfig = {
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    },
  };

  if (conn) {
    sessionConfig.store = MongoStore.create({ 
      mongoUrl: config.mongodb.uri, 
      ttl: 60 * 60 * 24 * 7 
    });
  }

  app.use(session(sessionConfig));

  app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.bot = config.bot;
    res.locals.owner = config.owner;
    res.locals.currentPath = req.path;
    res.locals.process = { env: process.env };
    next();
  });

  app.get('/health', (req, res) => res.json({ status: 'ok', bot: getBot(io).getStatus().status }));

  app.use('/', authRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/api', apiRoutes(io));

  app.use((req, res) => res.status(404).render('404', { title: '404' }));

  io.on('connection', (socket) => {
    const bot = getBot(io);
    socket.emit('bot:status', bot.getStatus());
  });

  // Bot
  const bot = getBot(io);
  if (conn) {
    try {
      const Session = require('./database/models/Session');
      const hasSession = await Session.countDocuments();
      if (hasSession > 0) {
        console.log('🔄 Sessão WhatsApp encontrada no MongoDB - reconectando...');
        bot.start({ mode: 'qr' }).catch(e => console.error('Auto-start:', e.message));
      }
    } catch (e) {}
  }

  // Scheduler
  if (conn) {
    scheduler.start();
    botConfigCache.refresh().catch(() => {});
    setInterval(() => botConfigCache.refresh().catch(() => {}), 5 * 60 * 1000);
  }

  server.listen(config.port, () => {
    console.log(`\n🚀 ${config.bot.name} rodando em ${config.appUrl}`);
    console.log(`📊 Dashboard: ${config.appUrl}/dashboard`);
    console.log(`👑 Dono: ${config.owner.name} (${config.owner.username})\n`);
  });
}

bootstrap().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});