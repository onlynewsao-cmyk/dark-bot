/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG COOLDOWN HELPER                           ║
 * ║   Interface para cooldowns persistentes (MongoDB)                ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * Substitui o sistema antigo de cooldowns em memória (Map) que se
 * perdia no restart do bot.
 *
 * Uso:
 *   const cooldownHelper = require('./cooldownHelper');
 *
 *   // Verificar se pode usar
 *   const { ready, remainingMs } = await cooldownHelper.check(userId, 'battle', 60000);
 *   if (!ready) {
 *     return `⏳ Aguarda ${cooldownHelper.formatTime(remainingMs)} para próxima batalha!`;
 *   }
 *
 *   // Registar uso
 *   await cooldownHelper.use(userId, 'battle');
 */
'use strict';

const RPGCooldown = require('../../database/models/RPGCooldown');

// Funções auxiliares inline para evitar dependência circular
function formatTimeInline(remainingMs) {
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
}

// Constantes de cooldown (em milissegundos)
const COOLDOWNS = {
  battle:    60 * 1000,        // 1 minuto
  quest:     5 * 60 * 1000,    // 5 minutos
  train:     30 * 60 * 1000,   // 30 minutos
  explore:   10 * 60 * 1000,   // 10 minutos
  craft:     60 * 60 * 1000,   // 1 hora
  daily:     24 * 60 * 60 * 1000, // 24 horas
  gacha:     3 * 1000,         // 3 segundos (anti-spam)
};

/**
 * Verifica se uma acção está pronta (cooldown expirado)
 * @param {string} userId - ID do utilizador (número WhatsApp)
 * @param {string} actionType - Tipo de acção (battle, quest, train, etc)
 * @param {number} [customCooldownMs] - Cooldown customizado (usa COOLDOWNS[actionType] se omitido)
 * @returns {Promise<{ready: boolean, remainingMs: number, remainingText: string}>}
 */
async function check(userId, actionType, customCooldownMs = null) {
  try {
    const cooldownMs = customCooldownMs ?? COOLDOWNS[actionType] ?? 60000;
    const key = `${userId}_${actionType}`;
    const record = await RPGCooldown.findOne({ key });

    if (!record) {
      return { ready: true, remainingMs: 0, remainingText: 'Pronto!' };
    }

    const elapsed = Date.now() - record.lastUsed.getTime();
    const remainingMs = Math.max(0, cooldownMs - elapsed);

    return {
      ready: remainingMs <= 0,
      remainingMs,
      remainingText: formatTimeInline(remainingMs),
    };
  } catch (error) {
    console.error('[RPG Cooldown] Erro ao verificar cooldown:', error.message);
    // Se erro no MongoDB, permite a acção (fallback)
    return { ready: true, remainingMs: 0, remainingText: 'Pronto!' };
  }
}

/**
 * Regista o uso de uma acção (inicia cooldown)
 * @param {string} userId - ID do utilizador
 * @param {string} actionType - Tipo de acção
 * @returns {Promise<void>}
 */
async function use(userId, actionType) {
  try {
    const key = `${userId}_${actionType}`;
    await RPGCooldown.findOneAndUpdate(
      { key },
      {
        key,
        userId,
        actionType,
        lastUsed: new Date(),
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('[RPG Cooldown] Erro ao registar uso:', error.message);
    // Silencioso - não bloqueia a acção do utilizador
  }
}

/**
 * Limpa o cooldown de uma acção específica
 * @param {string} userId - ID do utilizador
 * @param {string} actionType - Tipo de acção
 * @returns {Promise<void>}
 */
async function clear(userId, actionType) {
  try {
    const key = `${userId}_${actionType}`;
    await RPGCooldown.deleteOne({ key });
  } catch (error) {
    console.error('[RPG Cooldown] Erro ao limpar cooldown:', error.message);
  }
}

/**
 * Limpa todos os cooldowns de um utilizador (admin)
 * @param {string} userId - ID do utilizador
 * @returns {Promise<void>}
 */
async function clearAll(userId) {
  try {
    await RPGCooldown.deleteMany({ userId });
  } catch (error) {
    console.error('[RPG Cooldown] Erro ao limpar todos cooldowns:', error.message);
  }
}

/**
 * Formata tempo restante para exibição
 * @param {number} remainingMs - Milissegundos restantes
 * @returns {string}
 */
function formatTime(remainingMs) {
  return formatTimeInline(remainingMs);
}

/**
 * Gera mensagem de cooldown formatada
 * @param {string} actionType - Tipo de acção
 * @param {number} remainingMs - Milissegundos restantes
 * @returns {string}
 */
function getMessage(actionType, remainingMs) {
  const emojis = {
    battle: '⚔️',
    quest: '📜',
    train: '🏋️',
    explore: '🗺️',
    craft: '🔨',
    daily: '🎁',
    gacha: '🎰',
  };

  const names = {
    battle: 'batalha',
    quest: 'quest',
    train: 'treino',
    explore: 'exploração',
    craft: 'crafting',
    daily: 'recompensa diária',
    gacha: 'gacha',
  };

  const emoji = emojis[actionType] || '⏳';
  const name = names[actionType] || 'acção';
  const time = formatTime(remainingMs);

  return `${emoji} **Cooldown:** Aguarda **${time}** para próxima ${name}.\n💡 _Descansa um pouco, guerreiro._`;
}

module.exports = {
  check,
  use,
  clear,
  clearAll,
  formatTime,
  getMessage,
  COOLDOWNS,
};
