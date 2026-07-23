const mongoose = require('mongoose');

const GroupSettingsSchema = new mongoose.Schema({
  groupJid: { type: String, required: true, unique: true, index: true },
  groupName: { type: String, default: '' },

  botEnabled: { type: Boolean, default: true },

  // ── Anti-link ──────────────────────────────────────────
  antilink: { type: Boolean, default: false },
  antilinkMode: {
    type: String,
    // smart=só WA/Telegram | all_links=qualquer link | whatsapp_only=só invite WA
    enum: ['smart', 'whatsapp_only', 'all_links'],
    default: 'smart'
  },
  antilinkAction: { type: String, enum: ['warn', 'kick', 'delete'], default: 'warn' },
  antilinkWhitelist: [{ type: String }],  // ex: ['youtube.com', 'github.com']
  antilinkMaxWarns: { type: Number, default: 2 },
  antilinkDeleteMsg: { type: Boolean, default: true },  // apagar a msg com link
  antilinkNotify: { type: Boolean, default: true },     // avisar no grupo

  // ── Anti-spam ────────────────────────────────────────
  antispam: { type: Boolean, default: false },
  antispamWindowMs: { type: Number, default: 5000 },  // janela de 5s
  antispamMaxMsgs: { type: Number, default: 5 },      // max msgs na janela
  antispamMaxWarns: { type: Number, default: 3 },

  maxWarns: { type: Number, default: 3 },

  welcome: { type: Boolean, default: true },
  goodbye: { type: Boolean, default: true },

  customWelcome: { type: String, default: '' },
  customGoodbye: { type: String, default: '' },

  onlyAdmins: { type: Boolean, default: false },
  blockedCommands: [{ type: String }],
  blockedSubmenus: [{ type: String }],
  customBotName: { type: String, default: '' },

  participantsCount: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  totalCommands: { type: Number, default: 0 },

  lastActivity: { type: Date, default: Date.now },
  lastIdleNudgeAt: { type: Date, default: null },

  // Dark Side Engine — regras, atividade e moderação automática
  rulesText: { type: String, default: '' },
  inactiveEnabled: { type: Boolean, default: false },
  inactiveWarnDays: { type: Number, default: 7 },
  inactiveBanDays: { type: Number, default: 30 },
  inactiveAction: { type: String, enum: ['warn', 'ban'], default: 'warn' },
  inactiveNotifyPv: { type: Boolean, default: true },
  inactiveNotifyGroup: { type: Boolean, default: true },
  idleNudgeEnabled: { type: Boolean, default: false },
  idleNudgeExplicit: { type: Boolean, default: false },
  idleNudgeHours: { type: Number, default: 24 },
  warnLimit: { type: Number, default: 3 },

  // ── Hospedagem / Aluguel ──────────────────────────────────
  isHosted: { type: Boolean, default: false },
  trialExpiresAt: { type: Date, default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }, // 3 dias trial
  hostedUntil: { type: Date, default: null },
  commandsUsedToday: { type: Number, default: 0 },
  lastResetDate: { type: String, default: () => new Date().toISOString().split('T')[0] },

  // Quem adicionou o aluguel (número do dono/subdono/vip)
  rentedBy: { type: String, default: '' },
  rentedAt: { type: Date, default: null },

  // ── Welcome / Goodbye por grupo ───────────────────────────
  welcomeEnabled: { type: Boolean, default: true },
  goodbyeEnabled: { type: Boolean, default: true },
  customWelcomeMsg: { type: String, default: '' },  // {user} {grupo} {bot}
  customGoodbyeMsg: { type: String, default: '' },
  welcomeWithPhoto: { type: Boolean, default: true },
  welcomeWithMedia: { type: String, default: '' },  // URL de imagem de boas-vindas

  // ── Sticker pack por grupo ────────────────────────────────
  stickerPackName:   { type: String, default: '' },
  stickerAuthorName: { type: String, default: '' },

  // ── Limites free por grupo ────────────────────────────────
  freePvDailyLimit:  { type: Number, default: 20 },  // comandos PV para free por dia

}, { timestamps: true });

module.exports = mongoose.model('GroupSettings', GroupSettingsSchema);
