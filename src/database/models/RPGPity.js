/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG PITY MODEL                                ║
 * ║   Persiste contadores de pity no MongoDB                         ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * O pity system garante que após X tentativas sem um item raro,
 * o jogador recebe garantidamente esse item.
 *
 * Limiares (thresholds):
 * - Lendário: 10 tentativas sem lendário+ → garante lendário
 * - Mítico: 50 tentativas sem mítico → garante mítico
 */
'use strict';

const mongoose = require('mongoose');

const pitySchema = new mongoose.Schema({
  // ID do utilizador
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Contador de tentativas desde o último Lendário+
  pityLegendary: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Contador de tentativas desde o último Mítico
  pityMythic: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Total de invocações feitas
  totalPulls: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Último item obtido (para estatísticas)
  lastPull: {
    itemId: String,
    rarity: String,
    timestamp: Date,
  },
}, {
  timestamps: true,
  collection: 'rpg_pity',
});

/**
 * Incrementa contadores de pity e verifica se deve garantir item
 * @param {string} userId - ID do utilizador
 * @param {string} rarity - Raridade do item obtido ('Raro', 'Épico', 'Lendário', 'Mítico')
 * @returns {Promise<{guaranteed: string|null, pityLegendary: number, pityMythic: number}>}
 */
pitySchema.statics.increment = async function(userId, rarity) {
  const record = await this.findOne({ userId }) || await this.create({ userId });

  record.pityLegendary += 1;
  record.pityMythic += 1;
  record.totalPulls += 1;

  let guaranteed = null;

  // Verifica pity mythic (50 tentativas)
  if (record.pityMythic >= 50) {
    guaranteed = 'Mítico';
    record.pityLegendary = 0;
    record.pityMythic = 0;
  }
  // Verifica pity legendary (10 tentativas)
  else if (record.pityLegendary >= 10 && (rarity === 'Raro' || rarity === 'Épico')) {
    guaranteed = 'Lendário';
    record.pityLegendary = 0;
  }
  // Se obteve lendário ou mítico, reseta contadores
  else if (rarity === 'Lendário') {
    record.pityLegendary = 0;
  }
  else if (rarity === 'Mítico') {
    record.pityLegendary = 0;
    record.pityMythic = 0;
  }

  await record.save();

  return {
    guaranteed,
    pityLegendary: record.pityLegendary,
    pityMythic: record.pityMythic,
    totalPulls: record.totalPulls,
  };
};

/**
 * Obtém status atual do pity
 * @param {string} userId - ID do utilizador
 * @returns {Promise<{pityLegendary: number, pityMythic: number, totalPulls: number}>}
 */
pitySchema.statics.getStatus = async function(userId) {
  const record = await this.findOne({ userId });

  if (!record) {
    return {
      pityLegendary: 0,
      pityMythic: 0,
      totalPulls: 0,
    };
  }

  return {
    pityLegendary: record.pityLegendary,
    pityMythic: record.pityMythic,
    totalPulls: record.totalPulls,
  };
};

/**
 * Reseta contadores de pity (admin/debug)
 * @param {string} userId - ID do utilizador
 * @returns {Promise<void>}
 */
pitySchema.statics.reset = async function(userId) {
  await this.findOneAndUpdate(
    { userId },
    { pityLegendary: 0, pityMythic: 0 },
    { upsert: true }
  );
};

const RPGPity = mongoose.model('RPGPity', pitySchema);

module.exports = RPGPity;
