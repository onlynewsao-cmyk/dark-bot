/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — RequestCache v1                                 ║
 * ║   Deduplicação de I/O dentro da MESMA mensagem               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * O PROBLEMA (medido com profiler):
 *   Uma única mensagem fazia ~10 operações de I/O, das quais
 *   várias eram a MESMA leitura repetida:
 *     • User.findOne(senderNumber)      → até 3x
 *     • GroupSettings.findOne(groupJid) → até 3x
 *   Com MongoDB Atlas free (~40ms por query), isso são ~200ms
 *   por mensagem, quase tudo desperdiçado em repetições.
 *
 * A SOLUÇÃO:
 *   Um cache com o tempo de vida de UMA mensagem. A primeira
 *   leitura vai à base; as seguintes vêm da memória. Também
 *   deduplica chamadas em voo (se duas partes do código pedirem
 *   ao mesmo tempo, só sai uma query).
 *
 * Porquê não um cache global com TTL?
 *   Porque dados de utilizador/grupo mudam (VIP expira, admin
 *   promove, prefixo muda). Um cache por mensagem dá o ganho
 *   sem NUNCA servir dados velhos entre mensagens diferentes.
 */

'use strict';

// Cache activo da mensagem em processamento.
// Chave → { value } ou { promise } para chamadas em voo.
const { AsyncLocalStorage } = require('async_hooks');
const scopes = new AsyncLocalStorage();

// Estatísticas (para o comando de diagnóstico)
const _stats = { hits: 0, misses: 0, saved: 0 };

/**
 * Inicia um novo âmbito de cache. Chamar no topo do handler,
 * uma vez por mensagem recebida.
 */
function begin() {
  const current = new Map();
  scopes.enterWith(current);
  return current;
}

/** Termina o âmbito e liberta a memória. */
function end() {
  scopes.enterWith(undefined);
}

/**
 * Lê do cache ou executa o loader.
 *
 * @param {string}   key     identificador único (ex: 'user:2449...')
 * @param {Function} loader  função async que obtém o valor
 * @returns {Promise<*>}
 */
async function remember(key, loader) {
  const _current = scopes.getStore();
  // Sem âmbito activo → executa directamente (não quebra nada)
  if (!_current) return loader();

  const hit = _current.get(key);
  if (hit) {
    // Já resolvido
    if ('value' in hit) { _stats.hits++; _stats.saved++; return hit.value; }
    // Em voo → espera pela mesma promessa (dedup de concorrência)
    if (hit.promise) { _stats.hits++; _stats.saved++; return hit.promise; }
  }

  _stats.misses++;
  const pending = {};
  const promise = Promise.resolve()
    .then(loader)
    .then((value) => {
      if (_current.get(key) === pending) _current.set(key, { value });
      return value;
    })
    .catch((err) => {
      // Não guarda erros — a próxima tentativa pode correr bem
      if (_current.get(key) === pending) _current.delete(key);
      throw err;
    });

  pending.promise = promise;
  _current.set(key, pending);
  return promise;
}

/** Invalida uma chave (após escrita que mude o valor). */
function forget(key) {
  const _current = scopes.getStore();
  if (_current) _current.delete(key);
}

/** Guarda um valor já conhecido, evitando uma leitura futura. */
function put(key, value) {
  const _current = scopes.getStore();
  if (_current) _current.set(key, { value });
}

/** Lê um valor já guardado neste âmbito (sem loader). */
function get(key) {
  const _current = scopes.getStore();
  if (!_current) return undefined;
  const hit = _current.get(key);
  if (hit && 'value' in hit) return hit.value;
  return undefined;
}

function stats() {
  const _current = scopes.getStore();
  return { ..._stats, active: _current ? _current.size : 0 };
}

function resetStats() {
  _stats.hits = _stats.misses = _stats.saved = 0;
}

// ── Chaves normalizadas (evita erros de digitação) ──────────
const K = {
  user:  (num) => `user:${String(num || '').replace(/\D/g, '')}`,
  group: (jid) => `group:${jid}`,
  role:  (num) => `role:${String(num || '').replace(/\D/g, '')}`,
  meta:  (jid) => `meta:${jid}`,
  aura:  (jid) => `aura:${jid}`,
};

function run(fn) { return scopes.run(new Map(), fn); }

module.exports = { run, begin, end, remember, forget, put, get, stats, resetStats, K };
