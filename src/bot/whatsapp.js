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
const QRCode = require('qrcode');
const config = require('../config');
const { useMongoAuthState } = require('./mongoAuthState');
const mongoose = require('mongoose');

const messageListener = require('./messageListener');
const commandHandler = require('./commandHandler');
const antispam = require('./antiSpam');
const groupEvents = require('./groupEvents');

class WhatsAppBot {
  constructor() {
    this.io = null;
    this.sock = null;
    this.qrCode = null;
    this.pairingCode = null;
    this.connectionStatus = 'disconnected';
    this.user = null;
    this.recentLogs = [];
    this.starting = false;
  }

  setIO(io) { this.io = io; }

  setStatus(status, extra = {}) {
    this.connectionStatus = status;
    const payload = { 
      status, 
      qr: this.qrCode, 
      pairingCode: this.pairingCode, 
      user: this.user, 
      ...extra 
    };
    if (this.io) this.io.emit('bot:status', payload);
  }

  log(level, message) {
    const entry = { level, message, time: new Date().toISOString() };
    this.recentLogs.push(entry);
    if (this.recentLogs.length > 20) this.recentLogs.shift();
    if (this.io) this.io.emit('bot:log', entry);
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  async clearSession() {
    try {
      const Session = require('../database/models/Session');
      await Session.deleteMany({});
      this.log('info', 'Sessão limpa.');
    } catch (e) {}
  }

  async start({ mode = 'qr', phoneNumber = null } = {}) {
    if (this.starting) return;
    this.starting = true;
    this.qrCode = null;
    this.pairingCode = null;

    try {
      if (this.sock) {
        this.sock.ev.removeAllListeners();
        try { this.sock.end(); } catch (e) {}
        this.sock = null;
      }

      await this.clearSession();
      this.setStatus('connecting');

      const { state, saveCreds } = await useMongoAuthState();
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: { 
          creds: state.creds, 
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) 
        },
        browser: Browsers.ubuntu('Chrome'),
        connectTimeoutMs: 60000,
        printQRInTerminal: false,
      });

      // Lógica de Pairing Code
      if (mode === 'pair' && phoneNumber) {
        await delay(5000);
        try {
          const code = await this.sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
          this.pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
          this.setStatus('pairing');
          this.log('success', `Pair Code Gerado: ${this.pairingCode}`);
        } catch (e) {
          this.log('error', 'Erro ao gerar Pair Code.');
        }
      }

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = await QRCode.toDataURL(qr, { width: 400 });
          this.setStatus('qr');
          this.log('info', 'Novo QR Code gerado.');
        }

        if (connection === 'open') {
          this.starting = false;
          this.qrCode = null;
          this.pairingCode = null;
          this.user = this.sock.user;
          this.setStatus('connected');
          this.log('success', 'Bot Conectado!');
        }

        if (connection === 'close') {
          this.starting = false;
          const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
          this.setStatus('disconnected');
          if (shouldReconnect) this.start({ mode: 'qr' });
        }
      });

      // Listeners de mensagens
      this.sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        messageListener.onUpsert(this.sock, m, this.io).catch(() => {});
        commandHandler.handle(this.sock, msg).catch(() => {});
      });

    } catch (e) {
      this.starting = false;
      this.log('error', 'Falha ao iniciar: ' + e.message);
    }
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      qr: this.qrCode,
      pairingCode: this.pairingCode,
      user: this.user,
      recentLogs: this.recentLogs
    };
  }
}

const botInstance = new WhatsAppBot();
module.exports = { getBot: (io) => { if(io) botInstance.setIO(io); return botInstance; } };
