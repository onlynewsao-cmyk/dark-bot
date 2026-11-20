/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG COOLDOWN MODEL                            ║
 * ║   Persiste cooldowns no MongoDB (sobrevive restarts)             ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
'use strict';

const mongoose = require('mongoose');

const cooldownSchema = new mongoose.Schema({
  // Chave única: userId_actionType
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Timestamp do último uso
  lastUsed: {
    type: Date,
    required: true,
    default: Date.now,
    index: { expires: '7d' }, // Auto-delete após 7 dias
  },

  // Tipo de acção (battle, quest, train, explore, craft, etc)
  actionType: {
    type: String,
    required: true,
    index: true,
  },

  // ID do utilizador
  userId: {
    type: String,
    required: true,
    index: true,
  },
}, {
  timestamps: false,
  collection: 'rpg_cooldowns',
});

// Índices compostos para queries eficientes
cooldownSchema.index({ userId: 1, actionType: 1 });

/**
 * Verifica se uma acção está em cooldown
 * @param {string} userId - ID do utilizador
 * @param {string} actionType - Tipo de acção (battle, quest, train, etc)
 * @param {number} cooldownMs - Duração do cooldown em milissegundos
 * @returns {Promise<{ready: boolean, remainingMs: number}>}
 */
cooldownSchema.statics.check = async function(userId, actionType, cooldownMs) {
  const key = `${userId}_${actionType}`;
  const record = await this.findOne({ key });

  if (!record) {
    return { ready: true, remainingMs: 0 };
  }

  const elapsed = Date.now() - record.lastUsed.getTime();
  const remainingMs = cooldownMs - elapsed;

  return {
    ready: remainingMs <= 0,
    remainingMs: Math.max(0, remainingMs),
  };
};

/**
 * Regista o uso de uma acção (inicia cooldown)
 * @param {string} userId - ID do utilizador
 * @param {string} actionType - Tipo de acção
 * @returns {Promise<void>}
 */
cooldownSchema.statics.use = async function(userId, actionType) {
  const key = `${userId}_${actionType}`;

  await this.findOneAndUpdate(
    { key },
    {
      key,
      userId,
      actionType,
      lastUsed: new Date(),
    },
    { upsert: true, new: true }
  );
};

/**
 * Limpa o cooldown de uma acção específica
 * @param {string} userId - ID do utilizador
 * @param {string} actionType - Tipo de acção
 * @returns {Promise<void>}
 */
cooldownSchema.statics.clear = async function(userId, actionType) {
  const key = `${userId}_${actionType}`;
  await this.deleteOne({ key });
};

/**
 * Limpa todos os cooldowns de um utilizador
 * @param {string} userId - ID do utilizador
 * @returns {Promise<void>}
 */
cooldownSchema.statics.clearAll = async function(userId) {
  await this.deleteMany({ userId });
};

/**
 * Formata o tempo restante para exibição
 * @param {number} remainingMs - Milissegundos restantes
 * @returns {string} - Texto formatado (ex: "2m 30s")
 */
cooldownSchema.statics.formatTime = function(remainingMs) {
  if (remainingMs <= 0) return 'Pronto!';

  const seconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

const RPGCooldown = mongoose.model('RPGCooldown', cooldownSchema);

module.exports = RPGCooldown;
