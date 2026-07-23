/**
 * DARK BOT v5 — WhatsApp Engine
 * @systemzero/baileys como motor principal
 * Reconexão inteligente + keep-alive para Render Free
 */
'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
  delay,
} = require('@systemzero/baileys');

const pino   = require('pino');
const fs     = require('fs');
const path   = require('path');
const QRCode = require('qrcode');
const { useMongoAuthState } = require('./mongoAuthState');
const mongoose = require('mongoose');

const messageListener = require('./messageListener');
const commandHandler  = require('./commandHandler');
const antispam        = require('./antiSpam');
const groupEvents     = require('./groupEvents');

const AUTH_FOLDER = path.join(__dirname, '..', '..', 'data', 'auth');
if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

// ── Keep-alive para Render Free ─────────────────────────────
let _keepAlive = null;
function startKeepAlive(url) {
  if (_keepAlive || !url || url.includes('localhost')) return;
  const lib = url.startsWith('https') ? require('https') : require('http');
  _keepAlive = setInterval(() => {
    lib.get(`${url}/ping`, res => {
      console.log(`🏓 Keep-alive ${res.statusCode}`);
    }).on('error', () => {});
  }, 14 * 60 * 1000); // 14 min
  console.log(`⏰ Keep-alive activo → ${url}`);
}

// ── Backoff de reconexão ─────────────────────────────────────
const BACKOFF = [3000, 6000, 12000, 24000, 48000];
let _attempt = 0;
const nextDelay = () => BACKOFF[Math.min(_attempt++, BACKOFF.length - 1)];
const resetDelay = () => { _attempt = 0; };

class WhatsAppBot {
  constructor() {
    this.io = null;
    this.sock = null;
    this.qrCode = null;
    this.pairingCode = null;
    this.status = 'disconnected';
    this.mode = 'qr';
    this.user = null;
    this.lastError = null;
    this.startedAt = null;
    this.msgCount = 0;
    this.cmdCount = 0;
    this.starting = false;
    this.logs = [];
    this.mongoAuth = null;
    this._reconnectTimer = null;
    this._qrTimer = null;
  }

  setIO(io) { this.io = io; }

  emit(event, data) {
    try { if (this.io) this.io.emit(event, data); } catch {}
  }

  setStatus(s, extra = {}) {
    this.status = s;
    this.emit('bot:status', { status: s, ...extra });
    console.log(`📡 [BOT] ${s}`);
  }

  log(level, msg) {
    const entry = { level, message: msg, time: new Date().toISOString() };
    this.logs.push(entry);
    if (this.logs.length > 100) this.logs.shift();
    console.log(`[${level.toUpperCase()}] ${msg}`);
    this.emit('bot:log', entry);
  }

  async getAuthState() {
    if (mongoose.connection.readyState === 1) {
      try {
        this.mongoAuth = await useMongoAuthState();
        this.log('info', '🗄️ Auth: MongoDB');
        return { state: this.mongoAuth.state, saveCreds: this.mongoAuth.saveCreds };
      } catch (e) {
        this.log('warn', 'MongoAuth falhou: ' + e.message);
      }
    }
    this.log('info', '📁 Auth: arquivos locais');
    return useMultiFileAuthState(AUTH_FOLDER);
  }

  async clearSession() {
    if (mongoose.connection.readyState === 1) {
      try {
        const Session = require('../database/models/Session');
        await Session.deleteMany({});
      } catch {}
    }
    if (this.mongoAuth) {
      try { await this.mongoAuth.clearSession(); } catch {}
    }
    try { fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); fs.mkdirSync(AUTH_FOLDER, { recursive: true }); } catch {}
    this.qrCode = null; this.pairingCode = null; this.user = null;
  }

  async closeSocket() {
    if (!this.sock) return;
    try { this.sock.ev.removeAllListeners(); } catch {}
    try { this.sock.end(); } catch {}
    this.sock = null;
    await delay(600);
  }

  _clearTimer() {
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
  }

  async start({ mode = 'qr', phoneNumber = null, fresh = false } = {}) {
    const cleanMode = mode === 'pair' ? 'pair' : 'qr';

    if (this.status === 'connected' && !fresh) {
      this.setStatus('connected', { user: this.user }); return;
    }
    if (this.starting) {
      this.setStatus(this.status, { qr: this.qrCode, pairingCode: this.pairingCode, user: this.user }); return;
    }

    this._clearTimer();
    this.starting = true;
    this.mode = cleanMode;
    this.qrCode = null; this.pairingCode = null; this.lastError = null;

    try {
      await this.closeSocket();
      if (cleanMode === 'pair' || fresh) {
        await this.clearSession();
        this.log('info', 'Sessão limpa');
      }

      const { state, saveCreds } = await this.getAuthState();
      const { version } = await fetchLatestBaileysVersion();
      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version, logger,
        printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
        browser: cleanMode === 'pair' ? Browsers.ubuntu('Chrome') : Browsers.macOS('Safari'),

        // Performance
        markOnlineOnConnect:        false,
        generateHighQualityLinkPreview: false,
        syncFullHistory:            false,
        emitOwnEvents:              false,
        fireInitQueries:            true,

        // Timeouts Render Free
        connectTimeoutMs:           45000,
        keepAliveIntervalMs:        20000,
        retryRequestDelayMs:        500,
        defaultQueryTimeoutMs:      60000,

        // Patch de compatibilidade de botões
        patchMessageBeforeSending: (msg) => {
          if (!(msg.buttonsMessage || msg.templateMessage || msg.listMessage)) return msg;
          return {
            viewOnceMessage: {
              message: { ...msg, messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} } },
            },
          };
        },

        getMessage: async (key) => {
          try {
            const { messageCache } = require('./messageListener');
            return messageCache.get(key.id)?.message;
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
            this.qrCode = await QRCode.toDataURL(qr, { width: 420, margin: 2, color: { dark: '#0a0a0a', light: '#ffffff' } });
            this.setStatus('qr', { qr: this.qrCode });
            this.log('info', '📱 QR Code gerado');
            // Auto-renova se não escanear em 55s
            if (this._qrTimer) clearTimeout(this._qrTimer);
            this._qrTimer = setTimeout(() => {
              if (this.status === 'qr') {
                this.starting = false;
                this.start({ mode: 'qr' }).catch(() => {});
              }
            }, 55000);
          } catch (e) { this.log('error', 'QR falhou: ' + e.message); }
        }

        if (connection === 'open') {
          if (this._qrTimer) { clearTimeout(this._qrTimer); this._qrTimer = null; }
          resetDelay();
          this.user = this.sock.user;
          this.startedAt = new Date();
          this.qrCode = null; this.pairingCode = null;
          this.setStatus('connected', { user: this.user });
          this.log('success', `✅ Conectado: ${this.user?.id}`);
          const config = require('../config');
          startKeepAlive(config.appUrl);
        }

        if (connection === 'close') {
          const code   = lastDisconnect?.error?.output?.statusCode;
          const reason = lastDisconnect?.error?.message || '?';
          const isLoggedOut = code === DisconnectReason.loggedOut || code === 401;
          this.log('warn', `Fechado (${code}): ${reason}`);
          this.setStatus('disconnected', { reason: code, message: reason });
          if (isLoggedOut) {
            await this.clearSession();
            this.log('warn', 'Sessão expirada — reconecte manualmente.');
          } else {
            const d = nextDelay();
            this.log('info', `Reconectando em ${d / 1000}s...`);
            this._reconnectTimer = setTimeout(() => {
              this.starting = false;
              this.start({ mode: 'qr' }).catch(() => {});
            }, d);
          }
        }
      });

      // Mensagens
      this.sock.ev.on('messages.upsert', async (m) => {
        try {
          const msg = m.messages?.[0];
          if (!msg?.message) return;
          this.msgCount++;
          messageListener.onUpsert(this.sock, m, this.io).catch(() => {});
          if (msg.key.fromMe) return;
          const [handled] = await Promise.all([
            commandHandler.handle(this.sock, msg).catch(() => false),
            antispam.check(this.sock, msg).catch(() => {}),
          ]);
          if (handled) this.cmdCount++;
        } catch (e) { console.error('[MSG]', e.message); }
      });

      // Anti-delete
      this.sock.ev.on('messages.update', async (updates) => {
        try {
          const dels = updates.filter(u => u.update?.message === null || u.update?.messageStubType === 1);
          if (dels.length) await messageListener.onDelete(this.sock, dels, this.io);
        } catch {}
      });

      // Grupos
      this.sock.ev.on('group-participants.update', async (event) => {
        try { await groupEvents.handle(this.sock, event); } catch {}
      });

      // Pair Code
      if (cleanMode === 'pair') {
        try {
          const clean = String(phoneNumber || '').replace(/\D/g, '');
          if (clean.length < 10) throw new Error('Número inválido (mín. 10 dígitos com DDI)');
          if (this.sock.authState.creds.registered) throw new Error('Sessão activa. Use Reset e tente novamente.');
          this.setStatus('pairing', { phoneNumber: clean });
          await delay(2500);
          const code = await this.sock.requestPairingCode(clean);
          this.pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
          this.setStatus('pairing', { pairingCode: this.pairingCode, phoneNumber: clean });
          this.log('success', `🔐 Pair Code: ${this.pairingCode}`);
        } catch (e) {
          this.lastError = e.message;
          this.log('error', 'Pair: ' + e.message);
          this.setStatus('disconnected', { error: e.message });
          this.emit('bot:error', { message: e.message });
        }
      }

      this.starting = false;
    } catch (e) {
      this.starting = false;
      this.lastError = e.message;
      this.setStatus('disconnected', { error: e.message });
      this.emit('bot:error', { message: e.message });
      console.error('[BOT START]', e.message);
      throw e;
    }
  }

  async logout() {
    this._clearTimer();
    try { if (this.sock) await this.sock.logout(); } catch {}
    await this.clearSession();
    await this.closeSocket();
    this.user = null; this.qrCode = null; this.pairingCode = null;
    this.setStatus('disconnected');
    this.log('info', '🔌 Desconectado');
  }

  getStatus() {
    return {
      status:       this.status,
      mode:         this.mode,
      qr:           this.qrCode,
      pairingCode:  this.pairingCode,
      user:         this.user,
      startedAt:    this.startedAt,
      messageCount: this.msgCount,
      commandCount: this.cmdCount,
      lastError:    this.lastError,
      recentLogs:   this.logs.slice(-30),
      uptime:       this.startedAt ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000) : 0,
    };
  }
}

let _instance = null;
function getBot(io) {
  if (!_instance) _instance = new WhatsAppBot();
  if (io) _instance.setIO(io);
  return _instance;
}

module.exports = { getBot, WhatsAppBot };
