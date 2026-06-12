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

  // Hospedagem
  isHosted: { type: Boolean, default: false },
  trialExpiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  hostedUntil: { type: Date, default: null },
  commandsUsedToday: { type: Number, default: 0 },
  lastResetDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
}, { timestamps: true });

module.exports = mongoose.model('GroupSettings', GroupSettingsSchema);
