/**
 * Sabe quem está a falar COM ela vs quem parou.
 * Janela de conversa: 3 minutos. Depois considera que a pessoa saiu.
 * v9.21: LRU cache com sweep para evitar memory leak.
 */
'use strict';

const { LRUCache } = require('../bot/lruCache');
const JANELA = 3 * 60 * 1000;
const _fala = new LRUCache({ maxSize: 5000, ttlMs: JANELA, sweepIntervalMs: 300_000, name: 'auraTalk' });

function key(jid, num) {
  return String(jid || '') + ':' + String(num || '');
}

function marcarFala(jid, num) {
  _fala.set(key(jid, num), Date.now());
}

function estaAFalar(jid, num) {
  const ts = _fala.get(key(jid, num));
  return !!ts;
}

function parou(jid, num) {
  _fala.delete(key(jid, num));
}

function limparExpirados() {
  _fala.sweep();
}

module.exports = { marcarFala, estaAFalar, parou, limparExpirados, JANELA };
