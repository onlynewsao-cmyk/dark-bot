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
const config = require('../config');
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
    console.log(`📡 [BOT] ${status}`, extra.pairingCode ? `pair=${extra.pairingCode}` : '');
    this.emit('bot:status', payload);
  }

  log(level, message) {
    const entry = { level, message, time: new Date().toISOString() };
    this.recentLogs.push(entry);
    if (this.recentLogs.length > 50) this.recentLogs.shift();
    console.log(`[BOT:${level}] ${message}`);
    this.emit('bot:log', entry);
  }

  async getAuthState(mode) {
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
    if (this.mongoAuth) {
      try { await this.mongoAuth.clearSession(); } catch (e) {}
    }
    try {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    } catch (e) {}
  }

  async start({ mode = 'qr', phoneNumber = null } = {}) {
    this.connectionMode = mode;
    this.requestedNumber = phoneNumber;
    this.qrCode = null;
    this.pairingCode = null;
    this.lastError = null;

    if (this.starting) {
      this.log('warn', 'Bot já está em processo de inicialização...');
      this.setStatus(this.connectionStatus); // Re-envia status atual
      return;
    }

    this.starting = true;

    try {
      // Limpeza agressiva antes de uma conexão NOVA do zero
      if (this.sock) {
        this.log('info', 'Fechando conexão antiga...');
        try { this.sock.ev.removeAllListeners(); this.sock.end(); } catch (e) {}
        this.sock = null;
        await delay(3000);
      }

      // Se for Pair Code ou se estivermos forçando um novo QR, limpamos a sessão
      if (mode === 'pair' || this.connectionStatus === 'disconnected') {
        await this.clearSession();
        this.log('info', 'Sessão limpa para nova conexão do zero');
      }

      const { state, saveCreds } = await this.getAuthState(mode);
      const { version } = await fetchLatestBaileysVersion();
      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
        browser: mode === 'pair' ? Browsers.ubuntu('Chrome') : Browsers.macOS('Safari'),
        connectTimeoutMs: 60000,
        retryRequestDelayMs: 5000,
        keepAliveIntervalMs: 30000,
      });

      this.setStatus('connecting');
      this.sock.ev.on('creds.update', saveCreds);

      // --- Lógica de Pair Code ---
      if (mode === 'pair' && phoneNumber && !this.sock.authState.creds.registered) {
        await delay(5000);
        try {
          const clean = phoneNumber.replace(/\D/g, '');
          this.log('info', `Solicitando Pair Code para: ${clean}`);
          const code = await this.sock.requestPairingCode(clean);
          this.pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
          this.setStatus('pairing', { pairingCode: this.pairingCode });
        } catch (err) {
          this.log('error', `Falha ao gerar Pair Code: ${err.message}`);
          this.starting = false;
        }
      }

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr && mode === 'qr') {
          this.qrCode = await QRCode.toDataURL(qr, { width: 400, margin: 2 });
          this.setStatus('qr', { qr: this.qrCode });
          this.log('success', '📱 QR Code gerado com sucesso!');
        }

        if (connection === 'open') {
          this.qrCode = null;
          this.pairingCode = null;
          this.starting = false;
          this.user = this.sock.user;
          this.setStatus('connected', { user: this.sock.user });
          this.log('success', `✅ DARK BOT ONLINE: ${this.sock.user?.id}`);
        }

        if (connection === 'close') {
          this.starting = false;
          const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
          this.log('warn', `Conexão encerrada. Código: ${code}`);
          
          if (code === DisconnectReason.loggedOut || code === 401) {
            await this.clearSession();
            this.setStatus('disconnected', { message: 'Sessão encerrada pelo WhatsApp' });
          } else {
            this.setStatus('disconnected', { message: 'Tentando reconectar...' });
            setTimeout(() => this.start({ mode: 'qr' }), 5000);
          }
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        try {
          const msg = m.messages?.[0];
          if (!msg || !msg.message) return;
          
          // Verifica se o socket ainda está vivo antes de processar
          if (!this.sock || this.connectionStatus !== 'connected') return;
          
          this.messageCount++;

          // Anti-delete + espião (não bloqueia comandos)
          messageListener.onUpsert(this.sock, m, this.io).catch(() => {});

          if (msg.key.fromMe) return;

          // Comando principal (aguarda) + antispam em paralelo (não bloqueia)
          const [handled] = await Promise.all([
            commandHandler.handle(this.sock, msg).catch((err) => {
              console.error('CommandHandler Error:', err.message);
              return false;
            }),
            antispam.check(this.sock, msg).catch(() => {}),
          ]);
          
          if (handled) this.commandCount++;

        } catch (err) { 
          // Silencia erros de conexão fechada durante o processamento
          if (!err.message.includes('Closed')) {
            console.error('msg upsert err:', err); 
          }
        }
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

      this.starting = false;
    } catch (err) {
      this.starting = false;
      this.lastError = err.message;
      this.setStatus('disconnected', { error: err.message });
      this.emit('bot:error', { message: err.message });
      console.error('Start err:', err);
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
