const mongoose = require('mongoose');

const GroupSettingsSchema = new mongoose.Schema({
  groupJid: { type: String, required: true, unique: true, index: true },
  groupName: { type: String, default: '' },

  botEnabled: { type: Boolean, default: true },

  // Anti-link
  antilink: { type: Boolean, default: false },
  antilinkMode: {
    type: String,
    enum: ['smart', 'whatsapp_only', 'all_links'],
    default: 'smart'
  },
  antilinkAction: { type: String, enum: ['warn', 'kick'], default: 'warn' },
  antilinkWhitelist: [{ type: String }], // domínios permitidos: ['youtube.com', 'github.com']
  maxWarns: { type: Number, default: 3 },

  // Anti-spam
  antispam: { type: Boolean, default: false },

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
  idleNudgeEnabled: { type: Boolean, default: true },
  idleNudgeHours: { type: Number, default: 24 },
  warnLimit: { type: Number, default: 3 },

  // Hospedagem
  isHosted: { type: Boolean, default: false },
  trialExpiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  hostedUntil: { type: Date, default: null },
  commandsUsedToday: { type: Number, default: 0 },
  lastResetDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
}, { timestamps: true });

module.exports = mongoose.model('GroupSettings', GroupSettingsSchema);
