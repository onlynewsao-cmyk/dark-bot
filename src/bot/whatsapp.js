const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const config = require('../config');
const commandHandler = require('./commandHandler');
const mediaHandler = require('./mediaHandler');

const AUTH_FOLDER = path.join(__dirname, '..', '..', 'data', 'auth');
if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

class WhatsAppBot {
  constructor(io) {
    this.io = io; // socket.io para eventos em tempo real
    this.sock = null;
    this.qrCode = null;
    this.pairingCode = null;
    this.connectionStatus = 'disconnected'; // disconnected | connecting | qr | pairing | connected
    this.connectionMode = 'qr'; // qr | pair
    this.requestedNumber = null; // número para pair code
    this.user = null;
  }

  emit(event, data) {
    if (this.io) this.io.emit(event, data);
  }

  setStatus(status, extra = {}) {
    this.connectionStatus = status;
    this.emit('bot:status', { status, ...extra });
  }

  async start({ mode = 'qr', phoneNumber = null } = {}) {
    this.connectionMode = mode;
    this.requestedNumber = phoneNumber;

    if (this.sock) {
      try { this.sock.end(); } catch (e) {}
      this.sock = null;
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
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
      browser: Browsers.macOS('Safari'),
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
    });

    this.setStatus('connecting');

    // PAIR CODE: precisa solicitar antes de receber QR
    if (mode === 'pair' && phoneNumber && !this.sock.authState.creds.registered) {
      // Aguarda um instante
      setTimeout(async () => {
        try {
          const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
          const code = await this.sock.requestPairingCode(cleanNumber);
          this.pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
          this.setStatus('pairing', { pairingCode: this.pairingCode, phoneNumber: cleanNumber });
          console.log(`🔐 Pair Code para ${cleanNumber}: ${this.pairingCode}`);
        } catch (err) {
          console.error('Erro ao gerar pair code:', err);
          this.emit('bot:error', { message: 'Falha ao gerar pair code: ' + err.message });
        }
      }, 1500);
    }

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && mode === 'qr') {
        try {
          this.qrCode = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
          this.setStatus('qr', { qr: this.qrCode });
          console.log('📱 QR Code gerado — escaneie pelo dashboard');
        } catch (e) {
          console.error('Erro ao gerar QR:', e);
        }
      }

      if (connection === 'open') {
        this.qrCode = null;
        this.pairingCode = null;
        this.user = this.sock.user;
        this.setStatus('connected', { user: this.sock.user });
        console.log(`✅ ${config.bot.name} conectado como ${this.sock.user?.id}`);
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        console.log(`⚠️  Conexão fechada. Código: ${code}. Reconectar: ${shouldReconnect}`);
        this.setStatus('disconnected', { reason: code });

        if (code === DisconnectReason.loggedOut) {
          // Limpa sessão
          try { fs.rmSync(AUTH_FOLDER, { recursive: true, force: true }); } catch (e) {}
          fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        }

        if (shouldReconnect) {
          setTimeout(() => this.start({ mode: this.connectionMode, phoneNumber: this.requestedNumber }), 3000);
        }
      }
    });

    // ENTRADA DE MENSAGENS
    this.sock.ev.on('messages.upsert', async (m) => {
      try {
        const msg = m.messages?.[0];
        if (!msg || !msg.message) return;
        if (msg.key.fromMe) return;
        await commandHandler.handle(this.sock, msg);
      } catch (err) {
        console.error('Erro ao processar mensagem:', err);
      }
    });
  }

  async logout() {
    try {
      if (this.sock) await this.sock.logout();
    } catch (e) {}
    try {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    } catch (e) {}
    this.sock = null;
    this.user = null;
    this.qrCode = null;
    this.pairingCode = null;
    this.setStatus('disconnected');
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      mode: this.connectionMode,
      qr: this.qrCode,
      pairingCode: this.pairingCode,
      user: this.user,
    };
  }
}

let instance = null;
function getBot(io) {
  if (!instance) instance = new WhatsAppBot(io);
  else if (io && !instance.io) instance.io = io;
  return instance;
}

module.exports = { getBot, WhatsAppBot };
