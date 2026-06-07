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
    this.isStarting = false; this.currentMode = 'qr'; this.targetPhone = null;
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
      this.log('info', 'Sessões limpas. Nova conexão disponível.');
    } catch (e) {}
  }

  async logout() {
    try {
      if (this.sock) {
        this.sock.ev.removeAllListeners();
        await this.sock.logout();
        this.sock = null;
      }
      this.status = 'disconnected';
      this.qrCode = null;
      this.pairingCode = null;
      this.emitStatus();
      this.log('info', 'Bot desconectado manualmente.');
    } catch (e) {
      this.log('error', 'Erro ao desconectar: ' + e.message);
    }
  }

  async start({ mode = 'qr', phoneNumber = null } = {}) {
    if (this.isStarting) {
      this.log('warn', 'Já existe uma conexão em andamento. Aguarde...');
      return;
    }
    this.isStarting = true;
    this.currentMode = mode;
    this.targetPhone = phoneNumber;

    try {
      // Limpar sessão anterior
      if (this.sock) {
        this.sock.ev.removeAllListeners();
        try { this.sock.end(); } catch(e){}
        this.sock = null;
      }

      await this.clearSession();
      this.status = 'connecting';
      this.qrCode = null;
      this.pairingCode = null;
      this.emitStatus();
      this.log('info', `Iniciando conexão via ${mode === 'pair' ? 'Pair Code' : 'QR Code'}...`);

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
        printQRInTerminal: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 20000,
      });

      // --- PAIR CODE ---
      if (mode === 'pair' && phoneNumber) {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        this.log('info', `Solicitando Pair Code para: ${cleanNumber}`);
        
        // Aguarda o socket estabilizar
        await delay(5000);
        
        try {
          const code = await this.sock.requestPairingCode(cleanNumber);
          if (code) {
            this.pairingCode = code.match(/.{1,4}/g)?.join('-') || code;
            this.status = 'pairing';
            this.emitStatus();
            this.log('success', `🔐 PAIR CODE GERADO: ${this.pairingCode}`);
            this.log('info', `Digite este código no WhatsApp do número ${cleanNumber}`);
            this.log('info', `WhatsApp → Menu → Aparelhos conectados → Vincular com número`);
            
            // Notifica o dono via WhatsApp se o número alvo não for o do bot
            try {
              const ownerJid = config.owner.number + '@s.whatsapp.net';
              await this.sock.sendMessage(ownerJid, {
                text: `🔐 *PAIR CODE GERADO*\n\n` +
                      `📱 Número: ${cleanNumber}\n` +
                      `🔑 Código: *${this.pairingCode}*\n\n` +
                      `Passos:\n` +
                      `1. Abra WhatsApp no telemóvel\n` +
                      `2. Menu ⋮ → Aparelhos conectados → Vincular\n` +
                      `3. Digite: *${this.pairingCode}*\n\n` +
                      `⏱️ Expira em ~3 minutos\n` +
                      `_DARK BOT · Dashboard_`
              });
              this.log('success', `📱 Notificação enviada para o dono (${config.owner.number})`);
            } catch (notifyErr) {
              this.log('warn', 'Não conseguiu notificar o dono (ainda não conectado).');
            }
          } else {
            throw new Error('Código vazio retornado');
          }
        } catch (err) {
          this.log('error', `Erro ao gerar Pair Code: ${err.message}`);
          this.log('info', 'Verifique se o número está correcto e se o WhatsApp está activo.');
          this.status = 'disconnected';
          this.isStarting = false;
          this.emitStatus();
          return;
        }
      }

      // --- CREDENTIALS UPDATE ---
      this.sock.ev.on('creds.update', saveCreds);

      // --- CONNECTION UPDATE ---
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // QR Code gerado
        if (qr) {
          this.qrCode = await QRCode.toDataURL(qr, { width: 400 });
          this.status = 'qr';
          this.emitStatus();
          this.log('success', '📱 QR Code gerado! Escaneie agora pelo WhatsApp.');
        }

        // Conexão estabelecida
        if (connection === 'open') {
          this.status = 'connected';
          this.user = this.sock.user;
          this.qrCode = null;
          this.pairingCode = null;
          this.isStarting = false;
          this.emitStatus();
          
          const connectedNumber = this.user.id.split(':')[0];
          this.log('success', `✅ Bot conectado: +${connectedNumber}`);
          
          // Notifica o dono sobre a conexão
          try {
            const ownerJid = config.owner.number + '@s.whatsapp.net';
            await this.sock.sendMessage(ownerJid, {
              text: `✅ *BOT CONECTADO COM SUCESSO!*\n\n` +
                    `📱 Número: +${connectedNumber}\n` +
                    `🤖 Bot: ${config.bot.name}\n` +
                    `⏰ ${new Date().toLocaleString('pt-BR')}\n\n` +
                    `_O bot está online e pronto para usar._`
            });
          } catch (e) {}
        }

        // Conexão perdida
        if (connection === 'close') {
          this.isStarting = false;
          const code = lastDisconnect?.error?.output?.statusCode;
          this.status = 'disconnected';
          this.emitStatus();

          if (code !== DisconnectReason.loggedOut) {
            this.log('warn', `Conexão perdida (código: ${code}). Reconectando em 5s...`);
            setTimeout(() => this.start({ mode: 'qr' }), 5000);
          } else {
            this.log('error', 'Sessão encerrada (logged out). Conecte novamente pelo dashboard.');
            await this.clearSession();
          }
        }
      });

      // --- MESSAGES ---
      this.sock.ev.on('messages.upsert', async (m) => {
        if (!m.messages[0].message || m.messages[0].key.fromMe) return;
        messageListener.onUpsert(this.sock, m, this.io).catch(() => {});
        commandHandler.handle(this.sock, m.messages[0]).catch(() => {});
      });

      // --- MESSAGE DELETIONS (Anti-delete) ---
      this.sock.ev.on('messages.delete', async (update) => {
        if (update.keys) {
          messageListener.onDelete(this.sock, { keys: update.keys }, this.io).catch(() => {});
        }
      });

    } catch (e) {
      this.isStarting = false;
      this.log('error', 'Falha crítica: ' + e.message);
      this.status = 'disconnected';
      this.emitStatus();
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
