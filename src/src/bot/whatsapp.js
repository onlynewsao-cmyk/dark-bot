/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║       DARK BOT — WhatsApp Engine v3 ULTRA               ║
 * ║  Reconexão inteligente + Keep-alive Render Free         ║
 * ║  Timeouts otimizados + logging avançado                 ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
  delay,
} = require('@systemzero/baileys');
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
const themeFormatter = require('./themeFormatter');

const AUTH_FOLDER = path.join(__dirname, '..', '..', 'data', 'auth');
if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

// ─────────────────────────────────────────────
// KEEP-ALIVE: evita que Render Free durma
// Faz um ping interno a cada 14 minutos
// ─────────────────────────────────────────────
let _keepAliveInterval = null;
function startKeepAlive(appUrl) {
  if (_keepAliveInterval) return;
  const url = appUrl || process.env.APP_URL;
  if (!url || url.includes('localhost')) return;

  const http = url.startsWith('https') ? require('https') : require('http');
  _keepAliveInterval = setInterval(() => {
    try {
      http.get(`${url}/health`, (res) => {
        console.log(`🏓 Keep-alive ping → ${res.statusCode}`);
      }).on('error', () => {});
    } catch {}
  }, 14 * 60 * 1000); // 14 min

  console.log(`⏰ Keep-alive ativado para ${url}`);
}

// ─────────────────────────────────────────────
// RECONEXÃO COM BACKOFF EXPONENCIAL
// ─────────────────────────────────────────────
const RECONNECT_DELAYS = [3000, 6000, 12000, 24000, 48000]; // máx ~48s
let _reconnectAttempt = 0;

function getReconnectDelay() {
  const d = RECONNECT_DELAYS[Math.min(_reconnectAttempt, RECONNECT_DELAYS.length - 1)];
  _reconnectAttempt++;
  return d;
}

function resetReconnectDelay() {
  _reconnectAttempt = 0;
}

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
    this.recentLogs = [];
    this.mongoAuth = null;
    this._reconnectTimer = null;
    this._qrTimeout = null;
  }

  setIO(io) { this.io = io; }

  emit(event, data) {
    try { if (this.io) this.io.emit(event, data); } catch {}
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
    if (this.recentLogs.length > 100) this.recentLogs.shift();
    const icons = { info: '📘', warn: '⚠️', error: '❌', success: '✅', debug: '🔍' };
    console.log(`${icons[level] || '•'} [BOT] ${message}`);
    this.emit('bot:log', entry);
  }

  async getAuthState() {
    if (mongoose.connection.readyState === 1) {
      try {
        this.mongoAuth = await useMongoAuthState();
        this.log('info', '🗄️ Auth state: MongoDB (persistente)');
        return { state: this.mongoAuth.state, saveCreds: this.mongoAuth.saveCreds };
      } catch (e) {
        this.log('warn', 'Falha MongoAuth, usando local: ' + e.message);
      }
    }
    this.log('info', '📁 Auth state: arquivos locais');
    return useMultiFileAuthState(AUTH_FOLDER);
  }

  async clearSession() {
    if (mongoose.connection.readyState === 1) {
      try {
        const Session = require('../database/models/Session');
        await Session.deleteMany({});
      } catch (e) {
        this.log('warn', 'Falha ao limpar sessão MongoDB: ' + e.message);
      }
    }
    if (this.mongoAuth) {
      try { await this.mongoAuth.clearSession(); } catch {}
    }
    try {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    } catch {}
    this.qrCode = null;
    this.pairingCode = null;
    this.user = null;
  }

  async closeSocket() {
    if (!this.sock) return;
    try { this.sock.ev.removeAllListeners(); } catch {}
    try { this.sock.end(); } catch {}
    this.sock = null;
    await delay(600);
  }

  _clearReconnectTimer() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  async start({ mode = 'qr', phoneNumber = null, fresh = false } = {}) {
    const cleanMode = mode === 'pair' ? 'pair' : 'qr';

    if (this.connectionStatus === 'connected' && !fresh) {
      this.log('info', 'Bot já está conectado.');
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

    this._clearReconnectTimer();
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
        this.log('info', cleanMode === 'pair' ? 'Sessão limpa — novo pair code' : 'Sessão limpa — novo QR Code');
      }

      const { state, saveCreds } = await this.getAuthState();
      const { version } = await fetchLatestBaileysVersion();
      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: cleanMode === 'pair'
          ? Browsers.ubuntu('Chrome')
          : Browsers.macOS('Safari'),

        // ── Performance ──────────────────────────────────────
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        emitOwnEvents: false,
        fireInitQueries: true,

        // ── Timeouts otimizados para Render Free ─────────────
        connectTimeoutMs: 45000,
        keepAliveIntervalMs: 20000,
        retryRequestDelayMs: 500,
        defaultQueryTimeoutMs: 60000,

        // ── Patch para compatibilidade de botões/template ─────
        // Envolve buttonsMessage/templateMessage em viewOnce
        // para funcionar nos clientes novos do WhatsApp
        patchMessageBeforeSending: (message) => {
          const needsPatch = !!(
            message.buttonsMessage ||
            message.templateMessage ||
            message.listMessage
          );
          if (!needsPatch) return message;
          return {
            viewOnceMessage: {
              message: {
                ...message,
                messageContextInfo: {
                  deviceListMetadataVersion: 2,
                  deviceListMetadata: {},
                },
              },
            },
          };
        },

        // ── Cache de mensagens para velocidade ───────────────
        getMessage: async (key) => {
          try {
            const { messageCache } = require('./messageListener');
            const cached = messageCache.get(key.id);
            if (cached?.message) return cached.message;
          } catch {}
          return undefined;
        },
      });

      // Patch de tema global
      themeFormatter.patchSock(this.sock);

      this.setStatus('connecting', { mode: cleanMode });
      this.sock.ev.on('creds.update', saveCreds);

      // ── Eventos de conexão ──────────────────────────────────
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && cleanMode === 'qr') {
          try {
            this.qrCode = await QRCode.toDataURL(qr, { width: 420, margin: 2, color: { dark: '#0a0a0a', light: '#ffffff' } });
            this.setStatus('qr', { qr: this.qrCode });
            this.log('info', '📱 QR Code gerado — escaneie em 60s');

            // Auto-renova QR se não escanear em 55s
            if (this._qrTimeout) clearTimeout(this._qrTimeout);
            this._qrTimeout = setTimeout(() => {
              if (this.connectionStatus === 'qr') {
                this.log('warn', 'QR expirado — regenerando...');
                this.starting = false;
                this.start({ mode: 'qr' }).catch(() => {});
              }
            }, 55000);

          } catch (e) {
            this.log('error', 'Falha ao gerar QR: ' + e.message);
          }
        }

        if (connection === 'open') {
          if (this._qrTimeout) { clearTimeout(this._qrTimeout); this._qrTimeout = null; }
          resetReconnectDelay();
          this.qrCode = null;
          this.pairingCode = null;
          this.user = this.sock.user;
          this.startedAt = new Date();
          this.setStatus('connected', { user: this.sock.user });
          this.log('success', `✅ Conectado: ${this.sock.user?.id}`);

          // Inicia keep-alive quando conectado
          const config = require('../config');
          startKeepAlive(config.appUrl);
        }

        if (connection === 'close') {
          const code = lastDisconnect?.error?.output?.statusCode;
          const reason = lastDisconnect?.error?.message || 'desconhecido';
          const isLoggedOut = code === DisconnectReason.loggedOut || code === 401;
          const isRestart = code === DisconnectReason.restartRequired;

          this.log('warn', `Conexão fechada (código ${code || '?'}): ${reason}`);
          this.setStatus('disconnected', { reason: code, message: reason });

          if (isLoggedOut) {
            await this.clearSession();
            this.log('warn', '⚠️ Sessão expirada — limpa. Reconecte manualmente.');
            return;
          }

          // Reconexão automática com backoff
          const delay_ms = getReconnectDelay();
          this.log('info', `🔄 Reconectando em ${delay_ms / 1000}s... (tentativa ${_reconnectAttempt})`);
          this._clearReconnectTimer();
          this._reconnectTimer = setTimeout(() => {
            this.starting = false;
            this.start({ mode: 'qr' }).catch(e => {
              this.log('error', 'Falha na reconexão: ' + e.message);
            });
          }, delay_ms);
        }
      });

      // ── Handler de mensagens ────────────────────────────────
      this.sock.ev.on('messages.upsert', async (m) => {
        try {
          const msg = m.messages?.[0];
          if (!msg || !msg.message) return;
          this.messageCount++;

          // Anti-delete e espião (não bloqueante)
          messageListener.onUpsert(this.sock, m, this.io).catch(() => {});

          if (msg.key.fromMe) return;

          // Comando + antispam em paralelo
          const [handled] = await Promise.all([
            commandHandler.handle(this.sock, msg).catch(() => false),
            antispam.check(this.sock, msg).catch(() => {}),
          ]);

          if (handled) this.commandCount++;

        } catch (err) {
          console.error('[MSG ERR]', err?.message || err);
        }
      });

      // ── Anti-delete ─────────────────────────────────────────
      this.sock.ev.on('messages.update', async (updates) => {
        try {
          const deletes = updates.filter(u =>
            u.update?.message === null || u.update?.messageStubType === 1
          );
          if (deletes.length) {
            await messageListener.onDelete(this.sock, deletes, this.io);
          }
        } catch {}
      });

      // ── Eventos de grupo ────────────────────────────────────
      this.sock.ev.on('group-participants.update', async (event) => {
        try { await groupEvents.handle(this.sock, event); } catch {}
      });

      // ── Pair Code ───────────────────────────────────────────
      if (cleanMode === 'pair') {
        try {
          const clean = String(phoneNumber || '').replace(/\D/g, '');
          if (clean.length < 10) throw new Error('Número inválido (mín. 10 dígitos com DDI)');
          if (this.sock.authState.creds.registered) {
            throw new Error('Já existe uma sessão ativa. Use Reset e tente novamente.');
          }
          this.setStatus('pairing', { phoneNumber: clean });
          this.log('info', `Solicitando pair code para +${clean}...`);
          await delay(2500);
          const code = await this.sock.requestPairingCode(clean);
          this.pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
          this.setStatus('pairing', { pairingCode: this.pairingCode, phoneNumber: clean });
          this.log('success', `🔐 Pair Code: ${this.pairingCode}`);
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
      console.error('[BOT START ERR]', err.message);
      throw err;
    }
  }

  async logout() {
    this._clearReconnectTimer();
    try { if (this.sock) await this.sock.logout(); } catch {}
    await this.clearSession();
    await this.closeSocket();
    this.user = null;
    this.qrCode = null;
    this.pairingCode = null;
    this.setStatus('disconnected');
    this.log('info', '🔌 Bot desconectado e sessão limpa');
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
      recentLogs: this.recentLogs.slice(-30),
      uptime: this.startedAt
        ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
        : 0,
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
