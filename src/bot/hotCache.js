'use strict';
/**
 * v7.52 TURBO — hotCache: deduplicação de I/O quente por mensagem.
 *
 * O PROBLEMA (medido no pipeline):
 *   Cada mensagem de grupo dispara 5 handlers em paralelo
 *   (commandHandler + antiSpam + antiLink + antiTipos + antiFoba) e cada
 *   um ia ao Mongo buscar o MESMO GroupSettings e o MESMO User:
 *   ~8 roundtrips ao Atlas (~40ms cada) por mensagem.
 *   O requestCache só cobre o commandHandler e o seu âmbito é global
 *   (perde-se com mensagens concorrentes).
 *
 * A SOLUÇÃO:
 *   Memo agarrado à PRÓPRIA mensagem (`msg._hot`). Todos os handlers
 *   recebem o mesmo objecto `msg` (e o spread do normalizeIncomingMsg
 *   preserva a referência) → 1 query por doc, mesmo em fan-out paralelo
 *   (deduplicação em voo via promessa partilhada). Entre mensagens
 *   diferentes NUNCA há partilha → zero dados velhos.
 *
 * Inclui ainda getMeta(): groupMetadata com TTL curto, indexado pelo
 * socket (WeakMap) para os testes com mocks nunca se contaminarem.
 */

const _stats = { hits: 0, misses: 0, saved: 0 };

// ── v7.53: TTL entre-mensagens (OPCIONAL, via env) ───────────
// Por omissão DESLIGADO (0): só o memo por-mensagem actua, e os testes
// nunca vêem dados velhos. Em produção, HOTCACHE_TTL_MS=45000 elimina as
// 2 queries ao Atlas na maioria das mensagens (~40-80ms poupados).
// Lido por chamada (não no load) para se poder ligar/desligar em runtime.
const _ttlMs = () => Number(process.env.HOTCACHE_TTL_MS || 0);
const _ttl = new Map(); // key → { v, ts } (só POJOs lean, nunca docs mongoose)
function _ttlGet(key) {
  if (!_ttlMs()) return undefined;
  const e = _ttl.get(key);
  if (!e) return undefined;
  if (Date.now() - e.ts > _ttlMs()) { _ttl.delete(key); return undefined; }
  _stats.hits++; _stats.saved++;
  return e.v;
}
function _ttlSet(key, v) {
  if (!_ttlMs() || v == null) return; // nulls nunca: utilizador novo tem de aparecer logo
  if (_ttl.size > 2000) _ttl.clear();
  _ttl.set(key, { v, ts: Date.now() });
}
/**
 * v7.53 — espreita o TTL sem msg e sem fetch (para chamadas fora do
 * pipeline, ex.: themeResolver). Devolve o lean em cache ou undefined.
 */
function peekGroup(groupJid) {
  const jid = String(groupJid || '');
  if (!jid) return undefined;
  return _ttlGet('g:' + jid);
}

/** Invalidar após escrita própria (aluguel, trial, premium). */
function forgetUser(number) {
  const num = String(number || '').replace(/\D/g, '');
  if (num) { _ttl.delete('u:' + num); }
}
function forgetGroup(groupJid) {
  const jid = String(groupJid || '');
  if (jid) { _ttl.delete('g:' + jid); }
}

function slot(msg) {
  if (!msg || typeof msg !== 'object') return {};
  if (!msg._hot || typeof msg._hot !== 'object') msg._hot = {};
  return msg._hot;
}

function _memo(msg, key, loader) {
  const s = slot(msg);
  if (s[key]) { _stats.hits++; _stats.saved++; return s[key]; }
  _stats.misses++;
  const p = Promise.resolve()
    .then(loader)
    .catch(() => null); // leituras quentes nunca rebentam o pipeline
  s[key] = p;
  return p;
}

async function _execLean(modelRequire, query) {
  try {
    const M = require(modelRequire);
    if (!M || typeof M.findOne !== 'function') return null;
    let q = M.findOne(query);
    if (!q) return null;
    // Stubs de teste e Query mongoose: ambos suportam .lean(); se não
    // houver, aguarda o valor directo.
    if (typeof q.lean === 'function') q = q.lean();
    return await q;
  } catch { return null; }
}

/** User (lean) — 1 query por mensagem, partilhada pelos 5 handlers. */
function getUser(msg, number) {
  const num = String(number || '').replace(/\D/g, '');
  if (!num) return Promise.resolve(null);
  const cached = _ttlGet('u:' + num); // v7.53: TTL entre-mensagens
  if (cached !== undefined) return Promise.resolve(cached);
  return _memo(msg, 'u:' + num, async () => {
    const v = await _execLean('../database/models/User', { whatsappNumber: num });
    _ttlSet('u:' + num, v);
    return v;
  });
}

async function _execDoc(modelRequire, query) {
  try {
    const M = require(modelRequire);
    if (!M || typeof M.findOne !== 'function') return null;
    return await M.findOne(query);
  } catch { return null; }
}

/**
 * User DOCUMENTO (não lean) — para código que faz .save().
 * v7.53: com TTL ligado, hidrata do lean em cache (Model.hydrate → doc
 * real com .save() a fazer UPDATE). Sem hydrate (stubs de teste) ou sem
 * TTL, vai à base como antes.
 */
function getUserDoc(msg, number) {
  const num = String(number || '').replace(/\D/g, '');
  if (!num) return Promise.resolve(null);
  return _memo(msg, 'ud:' + num, async () => {
    if (_ttlMs()) {
      const lean = await getUser(msg, num);
      if (!lean) return null; // mesma query, mesmo resultado — sem 2.º roundtrip
      try {
        const M = require('../database/models/User');
        if (M && typeof M.hydrate === 'function') return M.hydrate(lean);
      } catch {}
    }
    return _execDoc('../database/models/User', { whatsappNumber: num });
  });
}

/** GroupSettings DOCUMENTO (não lean) — idem (hydrate do lean em cache). */
function getGroupDoc(msg, groupJid) {
  const jid = String(groupJid || '');
  if (!jid) return Promise.resolve(null);
  return _memo(msg, 'gd:' + jid, async () => {
    if (_ttlMs()) {
      const lean = await getGroupSettings(msg, jid);
      if (!lean) return null;
      try {
        const M = require('../database/models/GroupSettings');
        if (M && typeof M.hydrate === 'function') return M.hydrate(lean);
      } catch {}
    }
    return _execDoc('../database/models/GroupSettings', { groupJid: jid });
  });
}

/** GroupSettings (lean) — 1 query por mensagem, partilhada. */
function getGroupSettings(msg, groupJid) {
  const jid = String(groupJid || '');
  if (!jid) return Promise.resolve(null);
  const cached = _ttlGet('g:' + jid); // v7.53: TTL entre-mensagens
  if (cached !== undefined) return Promise.resolve(cached);
  return _memo(msg, 'g:' + jid, async () => {
    const v = await _execLean('../database/models/GroupSettings', { groupJid: jid });
    _ttlSet('g:' + jid, v);
    return v;
  });
}

// ── groupMetadata com TTL (indexado por socket) ──────────────
const META_TTL = 45 * 1000;
const _metaPorSock = new WeakMap(); // sock → Map(jid → { meta, ts })

function getMeta(sock, jid) {
  const id = String(jid || '');
  if (!sock || !id) return Promise.resolve(null);
  let porSock = _metaPorSock.get(sock);
  if (!porSock) { porSock = new Map(); _metaPorSock.set(sock, porSock); }
  const c = porSock.get(id);
  if (c && Date.now() - c.ts < META_TTL) { _stats.hits++; _stats.saved++; return Promise.resolve(c.meta); }
  _stats.misses++;
  return Promise.resolve()
    .then(() => sock.groupMetadata(id))
    .then((meta) => {
      if (meta) {
        if (porSock.size > 200) porSock.clear(); // fuga de memória
        porSock.set(id, { meta, ts: Date.now() });
      }
      return meta || null;
    })
    .catch(() => (c ? c.meta : null)); // falhou → serve o último conhecido
}

function stats() {
  return { ..._stats };
}

module.exports = { slot, getUser, getUserDoc, getGroupSettings, getGroupDoc, getMeta, stats, forgetUser, forgetGroup, peekGroup };
