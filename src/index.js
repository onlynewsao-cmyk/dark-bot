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

async function ensureOwnerUser() {
  const ownerUsername = config.owner.username;
  if (!ownerUsername || !config.owner.password) {
    console.warn('⚠️  OWNER_USERNAME/OWNER_PASSWORD não definidos; não foi possível sincronizar o dono.');
    return;
  }

  let user = await User.findOne({ username: ownerUsername });
  if (!user) {
    await User.create({
      username: ownerUsername,
      password: config.owner.password,
      name: config.owner.name,
      whatsappNumber: config.owner.number,
      role: 'owner',
      active: true,
    });
    console.log(`👑 Dono criado/sincronizado: ${ownerUsername}`);
    return;
  }

  let changed = false;
  if (user.role !== 'owner') { user.role = 'owner'; changed = true; }
  if (!user.active) { user.active = true; changed = true; }
  if (user.name !== config.owner.name) { user.name = config.owner.name; changed = true; }
  if (user.whatsappNumber !== config.owner.number) { user.whatsappNumber = config.owner.number; changed = true; }

  // Se a senha do Render mudou, sincroniza o hash sem revelar a senha nos logs.
  const passwordMatches = await user.comparePassword(config.owner.password).catch(() => false);
  if (!passwordMatches) {
    user.password = config.owner.password;
    changed = true;
  }

  if (changed) {
    await user.save();
    console.log(`👑 Dono sincronizado: ${ownerUsername}`);
  }
}

async function seedDefaults(conn) {
  if (!conn) return;

  await ensureOwnerUser();

  const count = await Command.countDocuments();
  if (count === 0) {
    await Command.insertMany([
      { name: 'oi', description: 'Saudação', response: '👋 Olá {user}! Eu sou o {bot}.', category: 'geral' },
      { name: 'site', description: 'Site', response: '🌐 Visite nosso site!', category: 'info' },
      { name: 'vip-info', description: 'Info VIP', response: '⭐ Comando VIP {user}!', category: 'premium', accessLevel: 'premium' },
    ]);
    console.log('📚 Comandos seed criados');
  }
}

async function bootstrap() {
  // Cloudinary
  if (config.cloudinary.cloud_name) {
    cloudinary.config(config.cloudinary);
    console.log('☁️  Cloudinary configurado');
  }

  // MongoDB
  const conn = await connectDB();
  if (config.isProduction && !conn) {
    console.error('❌ MongoDB é obrigatório em produção. Corrija MONGODB_URI no Render e faça novo deploy.');
    console.error('💡 Dica: erro "bad auth" significa username/senha inválidos no MongoDB Atlas ou senha mal copiada/sem URL encode.');
    process.exit(1);
  }
  await seedDefaults(conn);

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  // Render fica atrás de proxy HTTPS. Sem isto, cookies seguros de sessão não persistem.
  app.set('trust proxy', 1);

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  const sessionConfig = {
    name: 'darkbot.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: config.isProduction ? 'auto' : false,
      sameSite: 'lax',
    },
  };
  if (conn) {
    sessionConfig.store = MongoStore.create({
      mongoUrl: config.mongodb.uri,
      collectionName: 'web_sessions',
      ttl: 60 * 60 * 24 * 7,
      crypto: { secret: config.sessionSecret },
      touchAfter: 24 * 3600,
    });
  }
  app.use(session(sessionConfig));

  app.use(async (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.bot = config.bot;
    res.locals.owner = {
      name: config.owner.name,
      number: config.owner.number,
      username: config.owner.username,
    };
    res.locals.currentPath = req.path;
    res.locals.siteMeta = {
      title: await botConfigCache.get('site_meta_title', config.bot.name).catch(() => config.bot.name),
      description: await botConfigCache.get('site_meta_description', 'DARK BOT - Bot WhatsApp profissional com Dashboard').catch(() => 'DARK BOT - Bot WhatsApp profissional com Dashboard'),
      keywords: await botConfigCache.get('site_meta_keywords', 'whatsapp, bot, dark bot, automação').catch(() => 'whatsapp, bot, dark bot, automação'),
      image: await botConfigCache.get('site_meta_image', '/img/logo.jpg').catch(() => '/img/logo.jpg'),
    };
    // Compatibilidade com views antigas, sem expor segredos reais do process.env.
    res.locals.process = {
      env: {
        GROQ_API_KEY: config.ai.groqApiKey ? 'configured' : '',
        GEMINI_API_KEY: config.ai.geminiApiKey ? 'configured' : '',
        APP_URL: config.appUrl,
        NODE_ENV: config.nodeEnv,
      },
    };
    next();
  });

  // ── /health — Render liveness + UptimeRobot monitor ──────────────────
  // UptimeRobot deve monitorar esta URL com status 200.
  // Endpoint SEM autenticação, público, resposta rápida.
  app.get('/health', (req, res) => {
    const botStatus = getBot(io).getStatus();
    res.status(200).json({
      status: 'ok',
      bot: botStatus.status,
      db: conn ? 'connected' : 'unavailable',
      uptime: botStatus.uptime || 0,
      messages: botStatus.messageCount || 0,
      commands: botStatus.commandCount || 0,
      ts: Date.now(),
      version: '6.0.0',
    });
  });

  // ── /ping — Keep-alive para UptimeRobot / cron-job.org ───────────────
  // Configure o UptimeRobot para fazer GET em: https://SEU-NOME.onrender.com/ping
  // Intervalo: 5 minutos (evita hibernação do Render Free)
  app.get('/ping', (req, res) => {
    res.status(200).send('OK');
  });

  // ── /status — Página pública de status do bot (sem login) ────────────
  app.get('/status', (req, res) => {
    const botStatus = getBot(io).getStatus();
    const isOnline = botStatus.status === 'connected';
    res.status(200).send(
      `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8">` +
      `<meta http-equiv="refresh" content="30">` +
      `<title>${config.bot.name} — Status</title>` +
      `<style>body{font-family:monospace;background:#0a0a0a;color:#8B5CF6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}` +
      `.box{text-align:center;padding:2rem;border:1px solid #8B5CF6;border-radius:12px;max-width:400px}` +
      `h1{margin:0 0 1rem;font-size:1.5rem}.dot{display:inline-block;width:14px;height:14px;border-radius:50%;` +
      `background:${isOnline ? '#22c55e' : '#ef4444'};margin-right:8px;vertical-align:middle}` +
      `.muted{color:#666;font-size:.85rem;margin-top:1rem}</style></head>` +
      `<body><div class="box">` +
      `<h1>🕸️ ${config.bot.name}</h1>` +
      `<p><span class="dot"></span><strong>${isOnline ? 'ONLINE' : 'OFFLINE'}</strong></p>` +
      `<p>Bot: ${botStatus.status} | DB: ${conn ? 'ok' : 'off'}</p>` +
      `<p>Mensagens: ${botStatus.messageCount || 0} | Comandos: ${botStatus.commandCount || 0}</p>` +
      `<p class="muted">Uptime: ${botStatus.uptime || 0}s · Atualiza a cada 30s</p>` +
      `</div></body></html>`
    );
  });

  app.use('/', authRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/api', apiRoutes(io));

  app.use((req, res) => res.status(404).render('404', { title: '404' }));

  io.on('connection', (socket) => {
    const bot = getBot(io);
    socket.emit('bot:status', bot.getStatus());
  });

  // Bot - tenta auto-conectar se já tem sessão (MongoDB ou local)
  const bot = getBot(io);
  if (conn) {
    // Verifica sessão no Mongo
    try {
      const Session = require('./database/models/Session');
      const hasSession = await Session.countDocuments();
      if (hasSession > 0) {
        console.log('🔄 Sessão WhatsApp encontrada no MongoDB - reconectando...');
        bot.start({ mode: 'qr' }).catch(e => console.error('Auto-start:', e.message));
      }
    } catch (e) {}
  } else {
    // Fallback: arquivos locais
    const fs = require('fs');
    const authFolder = path.join(__dirname, '..', 'data', 'auth');
    if (fs.existsSync(authFolder) && fs.readdirSync(authFolder).length > 0) {
      console.log('🔄 Sessão local encontrada - reconectando...');
      bot.start({ mode: 'qr' }).catch(e => console.error('Auto-start:', e.message));
    }
  }

  // Scheduler + Cache refresh
  if (conn) {
    scheduler.start();
    // Carrega o cache de configurações na inicialização
    botConfigCache.refresh().catch(() => {});
    // Refresh automático a cada 5 minutos
    setInterval(() => botConfigCache.refresh().catch(() => {}), 5 * 60 * 1000);
  }

  server.listen(config.port, () => {
    console.log(`\n${'='.repeat(55)}`);
    console.log(`🕸️  ${config.bot.name} v6 — DARK BOT`);
    console.log(`${'='.repeat(55)}`);
    console.log(`🚀 Servidor:   ${config.appUrl}`);
    console.log(`📊 Dashboard:  ${config.appUrl}/dashboard`);
    console.log(`🔌 Connect:    ${config.appUrl}/dashboard/connect`);
    console.log(`❤️  Status:     ${config.appUrl}/status`);
    console.log(`🏓 UptimePing: ${config.appUrl}/ping  ← Configura no UptimeRobot`);
    console.log(`👑 Dono:       ${config.owner.name} (${config.owner.username})`);
    console.log(`🌍 NODE_ENV:   ${config.nodeEnv}`);
    console.log(`🗄️  MongoDB:    ${conn ? 'conectado ✅' : 'desconectado ⚠️'}`);
    const hasAI = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);
    console.log(`🧠 IA:         ${hasAI ? 'configurada ✅' : 'sem chaves ⚠️ — defina GROQ_API_KEY no Render'}`);
    console.log(`${'='.repeat(55)}\n`);
  });
}

bootstrap().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
