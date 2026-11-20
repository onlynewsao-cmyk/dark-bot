/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — TESTES RPG COOLDOWN                           ║
 * ║   Testa sistema de cooldowns persistentes                        ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
'use strict';

// Mock do mongoose para testes sem MongoDB
const mockCooldown = {
  _store: new Map(),

  async findOne(query) {
    return this._store.get(query.key) || null;
  },

  async findOneAndUpdate(query, update, options) {
    const key = query.key;
    const existing = this._store.get(key);
    const updated = { ...existing, ...update, lastUsed: new Date() };
    this._store.set(key, updated);
    return updated;
  },

  async deleteOne(query) {
    this._store.delete(query.key);
  },

  async deleteMany(query) {
    for (const [key, value] of this._store) {
      if (value.userId === query.userId) {
        this._store.delete(key);
      }
    }
  },

  // Métodos estáticos
  async check(userId, actionType, cooldownMs) {
    const key = `${userId}_${actionType}`;
    const record = this._store.get(key);

    if (!record) {
      return { ready: true, remainingMs: 0 };
    }

    const elapsed = Date.now() - record.lastUsed.getTime();
    const remainingMs = cooldownMs - elapsed;

    return {
      ready: remainingMs <= 0,
      remainingMs: Math.max(0, remainingMs),
    };
  },

  async use(userId, actionType) {
    const key = `${userId}_${actionType}`;
    const record = this._store.get(key) || {};
    const updated = {
      ...record,
      key,
      userId,
      actionType,
      lastUsed: new Date(),
    };
    this._store.set(key, updated);
  },

  async clear(userId, actionType) {
    const key = `${userId}_${actionType}`;
    this._store.delete(key);
  },

  async clearAll(userId) {
    for (const [key, value] of this._store) {
      if (value.userId === userId) {
        this._store.delete(key);
      }
    }
  },

  formatTime(remainingMs) {
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
  },
};

// Substituir o modelo real pelo mock
require.cache[require.resolve('../src/database/models/RPGCooldown')] = {
  exports: mockCooldown,
};

const cooldownHelper = require('../src/bot/rpg/cooldownHelper');

async function testCooldownCheck() {
  console.log('Test 1: check() - sem cooldown ativo');
  mockCooldown._store.clear();

  const result = await cooldownHelper.check('12345', 'battle', 60000);
  if (!result.ready) throw new Error('Deveria estar pronto');
  if (result.remainingMs !== 0) throw new Error('Deveria ter 0ms restante');
  console.log('  ✅ Passou');
}

async function testCooldownUse() {
  console.log('Test 2: use() - regista uso');
  mockCooldown._store.clear();

  await cooldownHelper.use('12345', 'battle');
  const stored = mockCooldown._store.get('12345_battle');
  if (!stored) throw new Error('Deveria ter registado');
  if (stored.userId !== '12345') throw new Error('userId incorreto');
  if (stored.actionType !== 'battle') throw new Error('actionType incorreto');
  console.log('  ✅ Passou');
}

async function testCooldownBlocked() {
  console.log('Test 3: check() - cooldown ativo');
  mockCooldown._store.clear();

  // Registar uso agora
  await cooldownHelper.use('12345', 'battle');

  // Verificar imediatamente (deveria estar bloqueado)
  const result = await cooldownHelper.check('12345', 'battle', 60000);
  if (result.ready) throw new Error('Deveria estar bloqueado');
  if (result.remainingMs <= 0) throw new Error('Deveria ter tempo restante');
  if (!result.remainingText) throw new Error('Deveria ter texto formatado');
  console.log('  ✅ Passou');
}

async function testCooldownClear() {
  console.log('Test 4: clear() - limpa cooldown');
  mockCooldown._store.clear();

  await cooldownHelper.use('12345', 'battle');
  await cooldownHelper.clear('12345', 'battle');

  const result = await cooldownHelper.check('12345', 'battle', 60000);
  if (!result.ready) throw new Error('Deveria estar pronto após clear');
  console.log('  ✅ Passou');
}

async function testCooldownFormatTime() {
  console.log('Test 5: formatTime() - formata corretamente');

  if (cooldownHelper.formatTime(0) !== 'Pronto!') throw new Error('0ms deveria ser "Pronto!"');
  if (cooldownHelper.formatTime(30000) !== '30s') throw new Error('30s deveria ser "30s"');
  if (cooldownHelper.formatTime(90000) !== '1m 30s') throw new Error('90s deveria ser "1m 30s"');
  if (cooldownHelper.formatTime(3661000) !== '1h 1m') throw new Error('3661s deveria ser "1h 1m"');
  console.log('  ✅ Passou');
}

async function testCooldownGetMessage() {
  console.log('Test 6: getMessage() - gera mensagem formatada');

  const msg = cooldownHelper.getMessage('battle', 30000);
  if (!msg.includes('⚔️')) throw new Error('Deveria ter emoji de battle');
  if (!msg.includes('30s')) throw new Error('Deveria ter tempo formatado');
  if (!msg.includes('batalha')) throw new Error('Deveria ter nome da acção');
  console.log('  ✅ Passou');
}

async function runTests() {
  console.log('🧪 A correr testes de cooldown...\n');

  try {
    await testCooldownCheck();
    await testCooldownUse();
    await testCooldownBlocked();
    await testCooldownClear();
    await testCooldownFormatTime();
    await testCooldownGetMessage();

    console.log('\n✅ Todos os testes passaram!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Teste falhou:', error.message);
    process.exit(1);
  }
}

runTests();
