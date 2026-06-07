const { 
  default: makeWASocket, 
  DisconnectReason, 
  fetchLatestBaileysVersion, 
  Browsers, 
  makeCacheableSignalKeyStore, 
  delay 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const config = require('../config');
const { useMongoAuthState } = require('./mongoAuthState');
const messageListener = require('./messageListener');
const commandHandler = require('./commandHandler');

class WhatsAppBot {
  constructor() {
    this.io = null; this.sock = null; this.qrCode = null; this.pairingCode = null;
    this.status = 'disconnected'; this.user = null; this.recentLogs = [];
  }

  setIO(io) { this.io = io; }

  emitStatus(extra = {}) {
    if (this.io) this.io.emit('bot:status', { status: this.status, qr: this.qrCode, pairingCode: this.pairingCode, user: this.user, ...extra });
  }

  log(level, message) {
    const entry = { level, message, time: new Date().toISOString() };
    this.recentLogs.push(entry);
    if (this.recentLogs.length > 30) this.recentLogs.shift();
    if (this.io) this.io.emit('bot:log', entry);
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  async start({ mode = 'qr', phoneNumber = null } = {}) {
    try {
      if (this.sock) { this.sock.ev.removeAllListeners(); try { this.sock.end(); } catch(e){} }
      
      this.status = 'connecting';
      this.emitStatus();

      const { state, saveCreds } = await useMongoAuthState();
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        browser: Browsers.ubuntu('Chrome'),
        printQRInTerminal: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
      });

      if (mode === 'pair' && phoneNumber) {
        await delay(5000);
        const code = await this.sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
        this.pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
        this.status = 'pairing';
        this.emitStatus();
        this.log('success', `Pair Code: ${this.pairingCode}`);
      }

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          this.qrCode = await QRCode.toDataURL(qr, { width: 400 });
          this.status = 'qr';
          this.emitStatus();
          this.log('info', 'QR Code disponível no dashboard.');
        }
        if (connection === 'open') {
          this.status = 'connected';
          this.user = this.sock.user;
          this.qrCode = null; this.pairingCode = null;
          this.emitStatus();
          this.log('success', 'Bot Conectado com Sucesso!');
        }
        if (connection === 'close') {
          this.status = 'disconnected';
          const code = lastDisconnect?.error?.output?.statusCode;
          if (code !== DisconnectReason.loggedOut) this.start({ mode: 'qr' });
          else this.log('warn', 'Sessão encerrada. Gere um novo QR.');
          this.emitStatus();
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        if (!m.messages[0].message || m.messages[0].key.fromMe) return;
        messageListener.onUpsert(this.sock, m, this.io).catch(e => console.error(e));
        commandHandler.handle(this.sock, m.messages[0]).catch(e => console.error(e));
      });

    } catch (e) { this.log('error', e.message); }
  }

  getStatus() { return { status: this.status, qr: this.qrCode, pairingCode: this.pairingCode, user: this.user, recentLogs: this.recentLogs }; }
}

const bot = new WhatsAppBot();
module.exports = { getBot: (io) => { if(io) bot.setIO(io); return bot; } };
