'use strict';
const { createHash } = require('crypto');
function cacheKey(prompt, system, context = '') {
  return createHash('sha256').update(JSON.stringify([String(prompt || ''), String(system || ''), context])).digest('hex');
}
function limit(value, fallback, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.max(min, Math.min(max, n)) : fallback;
}
function chatBudget(opts = {}, priority = false) {
  const totalDefault = priority ? 12000 : 15000;
  const total = limit(process.env.AI_TOTAL_TIMEOUT_MS, totalDefault, 250, 30000);
  return {
    total: Math.min(total, limit(opts.timeoutMs, total, 25, 30000)),
    provider: limit(process.env.AI_PROVIDER_TIMEOUT_MS, 5000, 250, 10000),
  };
}
module.exports = { cacheKey, chatBudget };
