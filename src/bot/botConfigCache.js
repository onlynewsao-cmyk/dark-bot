/**
 * Cache em memória para configurações do bot.
 * Evita queries ao MongoDB em cada mensagem recebida.
 * Refresh automático a cada 5 minutos.
 */
const BotConfig = require('../database/models/BotConfig');

const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 minutos

async function get(key, defaultValue = null) {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && (now - cached.timestamp) < TTL) {
    return cached.value;
  }
  try {
    const doc = await BotConfig.findOne({ key });
    const value = doc ? doc.value : defaultValue;
    cache.set(key, { value, timestamp: now });
    return value;
  } catch (err) {
    return cached ? cached.value : defaultValue;
  }
}

async function set(key, value) {
  try {
    await BotConfig.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
    cache.set(key, { value, timestamp: Date.now() });
    return value;
  } catch (err) {
    console.error('[BotConfigCache] Erro ao setar:', err.message);
  }
}

function clear(key) {
  if (key) cache.delete(key);
  else cache.clear();
}

async function refresh() {
  try {
    const docs = await BotConfig.find();
    cache.clear();
    const now = Date.now();
    docs.forEach(d => cache.set(d.key, { value: d.value, timestamp: now }));
    console.log(`[BotConfigCache] Cache atualizado: ${docs.length} configurações`);
  } catch (err) {
    console.error('[BotConfigCache] Erro ao atualizar cache:', err.message);
  }
}

module.exports = { get, set, clear, refresh };
