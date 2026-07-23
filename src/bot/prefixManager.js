/**
 * DARK BOT v5 — Prefix Manager
 * Prefixo dinâmico global — muda em toda a parte ao mesmo tempo.
 * Suporta múltiplos prefixos separados por vírgula.
 *
 * !setprefix /         → muda para /
 * !setprefix ! .       → muda para ! e .
 * !prefixos            → ver prefixos actuais
 */
'use strict';

const BotConfig = require('../database/models/BotConfig');
const config    = require('../config');

let _cached = null;
let _ts     = 0;
const TTL   = 30_000; // 30s

async function getPrefixes() {
  const now = Date.now();
  if (_cached && now - _ts < TTL) return _cached;
  try {
    const stored = await BotConfig.findOne({ key: 'prefixes' }).lean();
    let prefixes;
    if (stored?.value) {
      prefixes = Array.isArray(stored.value)
        ? stored.value
        : String(stored.value).split(/[\s,]+/).filter(Boolean);
    } else {
      prefixes = [config.bot.prefix || '!'];
    }
    _cached = prefixes.filter(Boolean);
    _ts     = now;
    return _cached;
  } catch {
    return [config.bot.prefix || '!'];
  }
}

async function setPrefixes(prefixes) {
  const arr = (Array.isArray(prefixes) ? prefixes : String(prefixes).split(/[\s,]+/))
    .map(p => String(p).trim())
    .filter(Boolean)
    .slice(0, 5); // máx 5 prefixos
  if (!arr.length) arr.push('!');
  await BotConfig.findOneAndUpdate({ key: 'prefixes' }, { key: 'prefixes', value: arr }, { upsert: true, new: true });
  _cached = arr;
  _ts     = Date.now();
  return arr;
}

async function detectPrefix(text) {
  if (!text) return null;
  const prefixes = await getPrefixes();
  // Ordenar do mais longo para o mais curto (evita ambiguidade)
  const sorted = [...prefixes].sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    if (text.startsWith(p)) {
      return { prefix: p, rest: text.slice(p.length).trim() };
    }
  }
  return null;
}

async function getPrimaryPrefix() {
  const list = await getPrefixes();
  return list[0] || '!';
}

/** Retorna texto de prefixo formatado para exibição */
async function getPrefixDisplay() {
  const list = await getPrefixes();
  return list.length > 1 ? list.join('  •  ') : list[0];
}

function clearCache() { _cached = null; _ts = 0; }

module.exports = { getPrefixes, setPrefixes, detectPrefix, getPrimaryPrefix, getPrefixDisplay, clearCache };
