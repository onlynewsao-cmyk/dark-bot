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
    this.isStarting = false;
  }

  setIO(io) { this.io = io; }

  emitStatus(extra = {}) {
    if (this.io) {
      this.io.emit('bot:status', { 
        status: this.status, 
        qr: this.qrCode, 
        pairingCode: this.pairingCode, 
        user: this.user, 
        ...extra 
      });
    }
  }

  log(level, message) {
    const entry = { level, message, time: new Date().toISOString() };
    this.recentLogs.push(entry);
    if (this.recentLogs.length > 30) this.recentLogs.shift();
    if (this.io) this.io.emit('bot:log', entry);
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  async clearSession() {
    try {
      const Session = require('../database/models/Session');
      await Session.deleteMany({});
      this.log('info', 'Banco de sessões limpo para nova conexão.');
    } catch (e) {}
  }

  async start({ mode = 'qr', phoneNumber = null } = {}) {
    if (this.isStarting) return;
    this.isStarting = true;

    try {
      if (this.sock) {
        this.sock.ev.removeAllListeners();
        try { this.sock.end(); } catch(e){}
        this.sock = null;
      }

      await this.clearSession();
      this.status = 'connecting';
      this.emitStatus();

      const { state, saveCreds } = await useMongoAuthState();
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: { 
          creds: state.creds, 
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) 
        },
        browser: Browsers.ubuntu('Chrome'), // Necessário para Pair Code
        printQRInTerminal: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 20000,
      });

      // --- LÓGICA DE PAIR CODE ATUALIZADA ---
      if (mode === 'pair' && phoneNumber && !this.sock.authState.creds.registered) {
        this.log('info', `Validando número ${phoneNumber}...`);
        await delay(6000); // Espera o socket estabilizar
        try {
          const code = await this.sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
          this.pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
          this.status = 'pairing';
          this.emitStatus();
          this.log('success', `CÓDIGO GERADO: ${this.pairingCode}`);
        } catch (err) {
          this.log('error', 'Erro ao solicitar Pair Code. Verifique o número.');
          this.status = 'disconnected';
          this.emitStatus();
        }
      }

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr && mode === 'qr') {
          this.qrCode = await QRCode.toDataURL(qr, { width: 400 });
          this.status = 'qr';
          this.emitStatus();
          this.log('info', 'QR Code gerado. Escaneie agora.');
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.user = this.sock.user;
          this.qrCode = null;
          this.pairingCode = null;
          this.isStarting = false;
          this.emitStatus();
          this.log('success', `Bot Online: ${this.user.id.split(':')[0]}`);
        }

        if (connection === 'close') {
          this.isStarting = false;
          const code = lastDisconnect?.error?.output?.statusCode;
          this.status = 'disconnected';
          this.emitStatus();

          if (code !== DisconnectReason.loggedOut) {
            this.log('warn', 'Conexão perdida. Tentando reconectar...');
            setTimeout(() => this.start({ mode: 'qr' }), 5000);
          } else {
            this.log('error', 'Sessão encerrada. Conecte novamente.');
            await this.clearSession();
          }
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        if (!m.messages[0].message || m.messages[0].key.fromMe) return;
        messageListener.onUpsert(this.sock, m, this.io).catch(() => {});
        commandHandler.handle(this.sock, m.messages[0]).catch(() => {});
      });

    } catch (e) {
      this.isStarting = false;
      this.log('error', 'Falha crítica: ' + e.message);
    }
  }

  getStatus() {
    return {
      status: this.status,
      qr: this.qrCode,
      pairingCode: this.pairingCode,
      user: this.user,
      recentLogs: this.recentLogs
    };
  }
}

const bot = new WhatsAppBot();
module.exports = { getBot: (io) => { if(io) bot.setIO(io); return bot; } };
