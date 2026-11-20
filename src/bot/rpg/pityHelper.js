/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG PITY HELPER                               ║
 * ║   Interface para sistema de pity (garantias gacha)               ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * Uso:
 *   const pityHelper = require('./pityHelper');
 *
 *   // Ao fazer gacha, incrementa e verifica se deve garantir
 *   const result = await pityHelper.increment(userId, 'Raro');
 *   if (result.guaranteed) {
 *     // Força item da raridade garantida
 *     const item = catalog.rollByRarity(result.guaranteed);
 *   }
 *
 *   // Ver status do pity
 *   const status = await pityHelper.getStatus(userId);
 *   // { pityLegendary: 7, pityMythic: 42, totalPulls: 156 }
 */
'use strict';

const RPGPity = require('../../database/models/RPGPity');

// Limiares de pity (quantas tentativas até garantir)
const THRESHOLDS = {
  legendary: 10, // 10 tentativas sem Lendário+ → garante Lendário
  mythic: 50,    // 50 tentativas sem Mítico → garante Mítico
};

/**
 * Incrementa contadores de pity após uma invocação
 * @param {string} userId - ID do utilizador
 * @param {string} rarity - Raridade obtida ('Raro', 'Épico', 'Lendário', 'Mítico')
 * @returns {Promise<{guaranteed: string|null, pityLegendary: number, pityMythic: number, totalPulls: number}>}
 */
async function increment(userId, rarity) {
  try {
    let record = await RPGPity.findOne({ userId });

    if (!record) {
      record = new RPGPity({
        userId,
        pityLegendary: 0,
        pityMythic: 0,
        totalPulls: 0,
      });
    }

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
  } catch (error) {
    console.error('[RPG Pity] Erro ao incrementar pity:', error.message);
    // Se erro no MongoDB, retorna sem garantia
    return {
      guaranteed: null,
      pityLegendary: 0,
      pityMythic: 0,
      totalPulls: 0,
    };
  }
}

/**
 * Obtém status atual do pity de um utilizador
 * @param {string} userId - ID do utilizador
 * @returns {Promise<{pityLegendary: number, pityMythic: number, totalPulls: number}>}
 */
async function getStatus(userId) {
  try {
    const record = await RPGPity.findOne({ userId });

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
  } catch (error) {
    console.error('[RPG Pity] Erro ao obter status:', error.message);
    return {
      pityLegendary: 0,
      pityMythic: 0,
      totalPulls: 0,
    };
  }
}

/**
 * Reseta contadores de pity (admin/debug)
 * @param {string} userId - ID do utilizador
 * @returns {Promise<void>}
 */
async function reset(userId) {
  try {
    await RPGPity.findOneAndUpdate(
      { userId },
      { pityLegendary: 0, pityMythic: 0 },
      { upsert: true }
    );
  } catch (error) {
    console.error('[RPG Pity] Erro ao resetar pity:', error.message);
  }
}

/**
 * Formata mensagem de status do pity
 * @param {object} status - Objeto com pityLegendary, pityMythic, totalPulls
 * @returns {string}
 */
function formatStatus(status) {
  const { pityLegendary, pityMythic, totalPulls } = status;

  const legendaryProgress = Math.min(pityLegendary, THRESHOLDS.legendary);
  const mythicProgress = Math.min(pityMythic, THRESHOLDS.mythic);

  const legendaryBar = '█'.repeat(legendaryProgress) + '░'.repeat(THRESHOLDS.legendary - legendaryProgress);
  const mythicBar = '█'.repeat(Math.floor(mythicProgress / 5)) + '░'.repeat(Math.ceil((THRESHOLDS.mythic - mythicProgress) / 5));

  return `🎰 **Status do Pity**

🟡 **Lendário:** ${legendaryProgress}/${THRESHOLDS.legendary}
${legendaryBar}

🔴 **Mítico:** ${mythicProgress}/${THRESHOLDS.mythic}
${mythicBar}

📊 **Total de invocações:** ${totalPulls}

💡 _Quanto mais invocas, mais perto estás de garantir um item raro!_`;
}

module.exports = {
  increment,
  getStatus,
  reset,
  formatStatus,
  THRESHOLDS,
};
