'use strict';

/**
 * DARK BOT — LRU Cache com TTL
 * ════════════════════════════════════════════════════════════════════
 *
 * Cache genérico com limite máximo de entradas (LRU) e TTL por entrada.
 * Substitui os Maps ilimitados que causavam memory leak em:
 *   - auraModes._cache
 *   - commandHandler._msgCount
 *   - auraTalk._fala
 *   - groupMetaCache
 *   - hotCache
 *
 * Características:
 *   - Limite máximo de entradas (default: 1000) — quando cheio, remove a mais antiga
 *   - TTL por entrada (default: 5 min) — entradas expiram automaticamente
 *   - Varredura periódica opcional — remove entradas expiradas em background
 *   - Estatísticas de uso — hit/miss/evict para monitoring
 *   - API compatível com Map — get/set/has/delete/clear
 */

class LRUCache {
  /**
   * @param {object} opts
   * @param {number} [opts.maxSize=1000] — máximo de entradas
   * @param {number} [opts.ttlMs=300000] — tempo de vida padrão (5 min)
   * @param {number} [opts.sweepIntervalMs=0] — intervalo de varredura (0 = desactivado)
   * @param {string} [opts.name='lru'] — nome para logs/stats
   */
  constructor(opts = {}) {
    this.maxSize = opts.maxSize || 1000;
    this.defaultTTL = opts.ttlMs || 300_000;
    this.name = opts.name || 'lru';

    // Map<key, { value, expiresAt, lastAccess, createdAt }>
    this._map = new Map();

    // Stats
    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
    this._sets = 0;

    // Varredura periódica
    this._sweepTimer = null;
    if (opts.sweepIntervalMs > 0) {
      this._sweepTimer = setInterval(() => this.sweep(), opts.sweepIntervalMs);
      // Não impede o processo de terminar
      if (this._sweepTimer.unref) this._sweepTimer.unref();
    }
  }

  /**
   * Obtém um valor. Actualiza lastAccess para LRU.
   * @param {string} key
   * @returns {*} value or undefined if not found/expired
   */
  get(key) {
    const entry = this._map.get(key);
    if (!entry) {
      this._misses++;
      return undefined;
    }
    // Verifica expiração
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this._map.delete(key);
      this._misses++;
      return undefined;
    }
    // Actualiza acesso (LRU)
    entry.lastAccess = Date.now();
    this._hits++;
    return entry.value;
  }

  /**
   * Define um valor com TTL opcional.
   * @param {string} key
   * @param {*} value
   * @param {number} [ttlMs] — TTL específico (usa default se omitido)
   */
  set(key, value, ttlMs) {
    // Se já existe, actualiza
    if (this._map.has(key)) {
      const entry = this._map.get(key);
      entry.value = value;
      entry.lastAccess = Date.now();
      entry.expiresAt = (ttlMs ?? this.defaultTTL) > 0
        ? Date.now() + (ttlMs ?? this.defaultTTL)
        : 0;
      this._sets++;
      return;
    }

    // Se cheio, remove a entrada menos acedida (LRU)
    if (this._map.size >= this.maxSize) {
      this._evictLRU();
    }

    const ttl = ttlMs ?? this.defaultTTL;
    this._map.set(key, {
      value,
      expiresAt: ttl > 0 ? Date.now() + ttl : 0,
      lastAccess: Date.now(),
      createdAt: Date.now(),
    });
    this._sets++;
  }

  /**
   * Verifica se a chave existe e não expirou.
   */
  has(key) {
    const entry = this._map.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this._map.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Remove uma entrada.
   */
  delete(key) {
    return this._map.delete(key);
  }

  /**
   * Limpa tudo.
   */
  clear() {
    this._map.clear();
  }

  /**
   * Número de entradas actuais (incluindo possivelmente expiradas não varridas).
   */
  get size() {
    return this._map.size;
  }

  /**
   * Remove entradas expiradas.
   */
  sweep() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this._map) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this._map.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Remove a entrada menos recentemente acedida (LRU eviction).
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this._map) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this._map.delete(oldestKey);
      this._evictions++;
    }
  }

  /**
   * Estatísticas para monitoring.
   */
  stats() {
    return {
      name: this.name,
      size: this._map.size,
      maxSize: this.maxSize,
      hits: this._hits,
      misses: this._misses,
      hitRate: this._hits + this._misses > 0
        ? ((this._hits / (this._hits + this._misses)) * 100).toFixed(1) + '%'
        : 'N/A',
      evictions: this._evictions,
      sets: this._sets,
    };
  }

  /**
   * Pára a varredura periódica.
   */
  destroy() {
    if (this._sweepTimer) {
      clearInterval(this._sweepTimer);
      this._sweepTimer = null;
    }
    this._map.clear();
  }
}

module.exports = { LRUCache };
