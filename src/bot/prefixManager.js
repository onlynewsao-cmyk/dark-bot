/**
 * DARK BOT v5 — Prefix Manager
 * Prefixo dinâmico global — UM único prefixo em todo o bot.
 * Só o Dono pode mudar via !setprefix
 *
 * !setprefix $   → muda para $
 * !setprefix /   → muda para /
 */
'use strict';

const BotConfig = require('../database/models/BotConfig');
const config    = require('../config');

let _cached = null;
let _ts     = 0;
const TTL   = 30_000; // 30s

/**
 * Retorna o prefixo actual (sempre array com 1 elemento).
 */
async function getPrefixes() {
  const now = Date.now();
  if (_cached && now - _ts < TTL) return _cached;
  try {
    const stored = await BotConfig.findOne({ key: 'prefixes' }).lean();
    let prefix;
    if (stored?.value) {
      // Aceita string ou array — pega sempre só o primeiro
      const raw = Array.isArray(stored.value) ? stored.value[0] : String(stored.value).split(/[\s,]+/)[0];
      prefix = String(raw || '').trim() || config.bot.prefix || '!';
    } else {
      prefix = config.bot.prefix || '!';
    }
    _cached = [prefix];
    _ts     = now;
    return _cached;
  } catch {
    return [config.bot.prefix || '!'];
  }
}

/**
 * Define o prefixo global — aceita APENAS 1 prefixo.
 * @param {string|string[]} prefixes
 */
async function setPrefixes(prefixes) {
  // Pega sempre só o primeiro token — prefixo único
  const raw = Array.isArray(prefixes) ? prefixes[0] : String(prefixes).split(/[\s,]+/)[0];
  const p   = String(raw || '').trim() || '!';
  await BotConfig.findOneAndUpdate(
    { key: 'prefixes' },
    { key: 'prefixes', value: [p] },
    { upsert: true, new: true }
  );
  _cached = [p];
  _ts     = Date.now();
  return [p];
}

/**
 * Detecta se o texto começa com o prefixo actual.
 */
async function detectPrefix(text) {
  if (!text) return null;
  const [p] = await getPrefixes();
  if (text.startsWith(p)) {
    return { prefix: p, rest: text.slice(p.length).trim() };
  }
  return null;
}

async function getPrimaryPrefix() {
  const [p] = await getPrefixes();
  return p || '!';
}

async function getPrefixDisplay() {
  const [p] = await getPrefixes();
  return p;
}

function clearCache() { _cached = null; _ts = 0; }

module.exports = { getPrefixes, setPrefixes, detectPrefix, getPrimaryPrefix, getPrefixDisplay, clearCache };
