const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
  delay,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { useMongoAuthState } = require('./mongoAuthState');
const mongoose = require('mongoose');

// Pre-load módulos fora do handler (evita require() a cada mensagem)
const messageListener = require('./messageListener');
const commandHandler = require('./commandHandler');
const antispam = require('./antiSpam');
const groupEvents = require('./groupEvents');

const AUTH_FOLDER = path.join(__dirname, '..', '..', 'data', 'auth');
if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

class WhatsAppBot {
  constructor() {
    this.io = null;
    this.sock = null;
    this.qrCode = null;
    this.pairingCode = null;
    this.connectionStatus = 'disconnected';
    this.connectionMode = 'qr';
    this.requestedNumber = null;
    this.user = null;
    this.lastError = null;
    this.startedAt = null;
    this.messageCount = 0;
    this.commandCount = 0;
    this.starting = false;
    this.recentLogs = []; // últimos 50 logs em memória
    this.mongoAuth = null;
  }

  setIO(io) { this.io = io; }

  emit(event, data) {
    try { if (this.io) this.io.emit(event, data); } catch (e) {}
  }

  setStatus(status, extra = {}) {
    this.connectionStatus = status;
    const payload = { status, ...extra };
    const safeExtra = extra.pairingCode ? '(pair code pronto)' : '';
    console.log(`📡 [BOT] ${status} ${safeExtra}`.trim());
    this.emit('bot:status', payload);
  }

  log(level, message) {
    const entry = { level, message, time: new Date().toISOString() };
    this.recentLogs.push(entry);
    if (this.recentLogs.length > 50) this.recentLogs.shift();
    console.log(`[BOT:${level}] ${message}`);
    this.emit('bot:log', entry);
  }

  async getAuthState() {
    // Usa MongoDB se disponível (persistência), senão multi-file local
    if (mongoose.connection.readyState === 1) {
      try {
        this.mongoAuth = await useMongoAuthState();
        this.log('info', '🗄️ Auth state: MongoDB (persistente)');
        return {
          state: this.mongoAuth.state,
          saveCreds: this.mongoAuth.saveCreds,
        };
      } catch (e) {
        this.log('warn', 'Falha MongoAuth, usando local: ' + e.message);
      }
    }
    this.log('info', '📁 Auth state: arquivos locais');
    return useMultiFileAuthState(AUTH_FOLDER);
  }

  async clearSession() {
    // Importante: apaga também sessões antigas do Mongo mesmo quando this.mongoAuth ainda não foi criado.
    if (mongoose.connection.readyState === 1) {
      try {
        const Session = require('../database/models/Session');
        await Session.deleteMany({});
      } catch (e) {
        this.log('warn', 'Falha ao limpar sessão MongoDB: ' + e.message);
      }
    }
    if (this.mongoAuth) {
      try { await this.mongoAuth.clearSession(); } catch (e) {}
    }
    try {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    } catch (e) {}
    this.qrCode = null;
    this.pairingCode = null;
    this.user = null;
  }

  async closeSocket() {
    if (!this.sock) return;
    try { this.sock.ev.removeAllListeners(); } catch (e) {}
    try { this.sock.end(); } catch (e) {}
    this.sock = null;
    await delay(500);
  }

  async start({ mode = 'qr', phoneNumber = null, fresh = false } = {}) {
    const cleanMode = mode === 'pair' ? 'pair' : 'qr';

    if (this.connectionStatus === 'connected' && !fresh) {
      this.log('info', 'Bot já está conectado. Use desconectar/reset para gerar nova sessão.');
      this.setStatus('connected', { user: this.user });
      return;
    }

    if (this.starting) {
      this.log('warn', 'Já iniciando, aguarde...');
      this.setStatus(this.connectionStatus, {
        qr: this.qrCode,
        pairingCode: this.pairingCode,
        user: this.user,
      });
      return;
    }

    this.starting = true;
    this.connectionMode = cleanMode;
    this.requestedNumber = phoneNumber;
    this.qrCode = null;
    this.pairingCode = null;
    this.lastError = null;

    try {
      await this.closeSocket();

      if (cleanMode === 'pair' || fresh) {
        await this.clearSession();
        this.log('info', cleanMode === 'pair' ? 'Sessão limpa para novo pair code' : 'Sessão limpa para novo QR Code');
      }

      const { state, saveCreds } = await this.getAuthState();
      const { version } = await fetchLatestBaileysVersion();
      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version, logger, printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
        browser: cleanMode === 'pair' ? Browsers.ubuntu('Chrome') : Browsers.macOS('Safari'),

        // ── Velocidade ──────────────────────────────────────────
        markOnlineOnConnect: false, // não fica "online" → menos tráfego
        generateHighQualityLinkPreview: false, // preview leve
        syncFullHistory: false, // não baixa histórico antigo
        emitOwnEvents: false, // ignora eventos das próprias msgs
        fireInitQueries: true, // inicializa contatos mais rápido

        // ── Timeouts optimizados para Render ───────────────────
        connectTimeoutMs: 30000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 250,
        defaultQueryTimeoutMs: 45000,
        msgRetryCounterCache: undefined, // usa cache padrão do Baileys

        // ── Cache de mensagens para velocidade ────────────────
        getMessage: async (key) => {
          try {
            const { messageCache } = require('./messageListener');
            const cached = messageCache.get(key.id);
            if (cached?.message) return cached.message;
          } catch {}
          return undefined;
        },
      });

      this.setStatus('connecting', { mode: cleanMode });
      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr && cleanMode === 'qr') {
          try {
            this.qrCode = await QRCode.toDataURL(qr, { width: 400, margin: 2 });
            this.setStatus('qr', { qr: this.qrCode });
            this.log('info', '📱 QR Code gerado');
          } catch (e) {
            this.log('error', 'Falha ao gerar QR Code: ' + e.message);
          }
        }
        if (connection === 'open') {
          this.qrCode = null;
          this.pairingCode = null;
          this.user = this.sock.user;
          this.startedAt = new Date();
          this.setStatus('connected', { user: this.sock.user });
          this.log('success', `✅ Conectado: ${this.sock.user?.id}`);
        }
        if (connection === 'close') {
          const code = lastDisconnect?.error?.output?.statusCode;
          const reason = lastDisconnect?.error?.message || '?';
          const shouldReconnect = code !== DisconnectReason.loggedOut && code !== 401;
          this.log('warn', `Fechado (${code || 'sem código'}): ${reason}`);
          this.setStatus('disconnected', { reason: code, message: reason });
          if (code === DisconnectReason.loggedOut || code === 401) {
            await this.clearSession();
            this.log('warn', 'Sessão expirada - limpa');
          } else if (shouldReconnect) {
            this.log('info', 'Reconectando em 3s...');
            setTimeout(() => {
              this.starting = false;
              this.start({ mode: 'qr' }).catch(() => {});
            }, 3000);
          }
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        try {
          const msg = m.messages?.[0];
          if (!msg || !msg.message) return;
          this.messageCount++;

          // Anti-delete + espião (não bloqueia comandos)
          messageListener.onUpsert(this.sock, m, this.io).catch(() => {});

          if (msg.key.fromMe) return;

          // Comando principal (aguarda) + antispam em paralelo (não bloqueia)
          const [handled] = await Promise.all([
            commandHandler.handle(this.sock, msg).catch(() => false),
            antispam.check(this.sock, msg).catch(() => {}),
          ]);
          if (handled) this.commandCount++;

        } catch (err) { console.error('msg err:', err); }
      });

      // Anti-delete: detecta mensagens apagadas
      this.sock.ev.on('messages.update', async (updates) => {
        try {
          const deletes = updates.filter(u => u.update?.message === null || u.update?.messageStubType === 1);
          if (deletes.length) {
            await messageListener.onDelete(this.sock, deletes, this.io);
          }
        } catch (e) {}
      });

      this.sock.ev.on('group-participants.update', async (event) => {
        try {
          await groupEvents.handle(this.sock, event);
        } catch (e) {}
      });

      if (cleanMode === 'pair') {
        try {
          const clean = String(phoneNumber || '').replace(/\D/g, '');
          if (clean.length < 10) throw new Error('Número inválido (mín. 10 dígitos com DDI)');
          if (this.sock.authState.creds.registered) {
            throw new Error('Já existe uma sessão registada. Use Reset/Desconectar e tente novamente.');
          }
          this.setStatus('pairing', { phoneNumber: clean });
          this.log('info', `Solicitando pair code para ${clean}...`);
          await delay(2500);
          const code = await this.sock.requestPairingCode(clean);
          this.pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
          this.setStatus('pairing', { pairingCode: this.pairingCode, phoneNumber: clean });
          this.log('success', '🔐 Pair Code gerado e enviado ao dashboard');
        } catch (err) {
          this.lastError = err.message;
          this.log('error', `Falha pair: ${err.message}`);
          this.setStatus('disconnected', { error: err.message });
          this.emit('bot:error', { message: err.message });
        }
      }

      this.starting = false;
    } catch (err) {
      this.starting = false;
      this.lastError = err.message;
      this.setStatus('disconnected', { error: err.message });
      this.emit('bot:error', { message: err.message });
      console.error('Start err:', err.message);
      throw err;
    }
  }

  async logout() {
    try { if (this.sock) await this.sock.logout(); } catch (e) {}
    await this.clearSession();
    this.sock = null;
    this.user = null;
    this.qrCode = null;
    this.pairingCode = null;
    this.setStatus('disconnected');
    this.log('info', 'Bot desconectado e sessão limpa');
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      mode: this.connectionMode,
      qr: this.qrCode,
      pairingCode: this.pairingCode,
      user: this.user,
      startedAt: this.startedAt,
      messageCount: this.messageCount,
      commandCount: this.commandCount,
      lastError: this.lastError,
      recentLogs: this.recentLogs.slice(-20),
    };
  }
}

let instance = null;
function getBot(io) {
  if (!instance) instance = new WhatsAppBot();
  if (io) instance.setIO(io);
  return instance;
}

module.exports = { getBot, WhatsAppBot };
