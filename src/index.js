const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const config = require('./config');
const { connectDB } = require('./database/connection');
const { getBot } = require('./bot/whatsapp');

async function bootstrap() {
  const conn = await connectDB();
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('trust proxy', 1);

  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  const sessionConfig = {
    secret: config.sessionSecret || 'dark-bot-secret',
    resave: true,
    saveUninitialized: true,
    name: 'darkbot.sid',
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
    },
    store: MongoStore.create({
      mongoUrl: config.mongodb.uri,
      collectionName: 'web_sessions',
    })
  };
  app.use(session(sessionConfig));

  app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.bot = config.bot;
    res.locals.owner = config.owner;
    res.locals.currentPath = req.path;
    next();
  });

  const authRoutes = require('./routes/auth');
  const dashboardRoutes = require('./routes/dashboard');
  const apiRoutes = require('./routes/api');

  app.use('/', authRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/api', apiRoutes(io));

  io.on('connection', (socket) => {
    const bot = getBot(io);
    socket.emit('bot:status', bot.getStatus());
  });

  // Auto-start do bot se não estiver conectado
  const bot = getBot(io);
  const status = bot.getStatus().status;
  if (status === 'disconnected') {
    bot.start({ mode: 'qr' }).catch(() => {});
  }

  server.listen(config.port, () => {
    console.log(`\n🚀 DARK BOT ONLINE EM: ${config.appUrl}\n`);
  });
}

bootstrap().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
