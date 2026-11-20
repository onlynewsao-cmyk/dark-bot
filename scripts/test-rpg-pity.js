/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — TESTES RPG PITY                               ║
 * ║   Testa sistema de pity (garantias gacha)                        ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
'use strict';

// Mock do mongoose para testes sem MongoDB
const mockPity = {
  _store: new Map(),

  async findOne(query) {
    return this._store.get(query.userId) || null;
  },

  async create(data) {
    const record = new this(data);
    this._store.set(data.userId, record);
    return record;
  },

  async findOneAndUpdate(query, update, options) {
    const userId = query.userId;
    let existing = this._store.get(userId);
    if (!existing) {
      existing = new this({ userId, ...update });
      this._store.set(userId, existing);
    } else {
      Object.assign(existing, update);
    }
    return existing;
  },

  // Construtor
  constructor: function(data) {
    Object.assign(this, {
      userId: data.userId,
      pityLegendary: data.pityLegendary || 0,
      pityMythic: data.pityMythic || 0,
      totalPulls: data.totalPulls || 0,
    });
  },

  save: async function() {
    mockPity._store.set(this.userId, this);
  },
};

// Fazer o mock funcionar como construtor
const OriginalMock = mockPity;
const MockConstructor = function(data) {
  Object.assign(this, {
    userId: data.userId,
    pityLegendary: data.pityLegendary || 0,
    pityMythic: data.pityMythic || 0,
    totalPulls: data.totalPulls || 0,
    save: async function() {
      OriginalMock._store.set(this.userId, this);
    }
  });
};
MockConstructor._store = OriginalMock._store;
MockConstructor.findOne = OriginalMock.findOne.bind(OriginalMock);
MockConstructor.create = OriginalMock.create.bind(OriginalMock);
MockConstructor.findOneAndUpdate = OriginalMock.findOneAndUpdate.bind(OriginalMock);

// Substituir o modelo real pelo mock
require.cache[require.resolve('../src/database/models/RPGPity')] = {
  exports: MockConstructor,
};

const pityHelper = require('../src/bot/rpg/pityHelper');

async function testPityIncrement() {
  console.log('Test 1: increment() - incrementa contadores');
  mockPity._store.clear();

  const result = await pityHelper.increment('12345', 'Raro');
  if (result.pityLegendary !== 1) throw new Error('pityLegendary deveria ser 1');
  if (result.pityMythic !== 1) throw new Error('pityMythic deveria ser 1');
  if (result.totalPulls !== 1) throw new Error('totalPulls deveria ser 1');
  console.log('  ✅ Passou');
}

async function testPityLegendaryGuarantee() {
  console.log('Test 2: increment() - garante Lendário após 10 tentativas');
  mockPity._store.clear();

  // Fazer 10 tentativas com Raro
  let lastResult;
  for (let i = 0; i < 10; i++) {
    lastResult = await pityHelper.increment('12345', 'Raro');
  }

  if (!lastResult.guaranteed) throw new Error('Deveria garantir após 10 tentativas');
  if (lastResult.guaranteed !== 'Lendário') throw new Error('Deveria garantir Lendário');
  console.log('  ✅ Passou');
}

async function testPityMythicGuarantee() {
  console.log('Test 3: increment() - garante Mítico após 50 tentativas');
  mockPity._store.clear();

  // Fazer 50 tentativas com Raro
  let lastResult;
  for (let i = 0; i < 50; i++) {
    lastResult = await pityHelper.increment('12345', 'Raro');
  }

  if (!lastResult.guaranteed) throw new Error('Deveria garantir após 50 tentativas');
  if (lastResult.guaranteed !== 'Mítico') throw new Error('Deveria garantir Mítico');
  console.log('  ✅ Passou');
}

async function testPityResetOnLegendary() {
  console.log('Test 4: increment() - reseta pityLegendary ao obter Lendário');
  mockPity._store.clear();

  // Fazer 5 tentativas com Raro
  for (let i = 0; i < 5; i++) {
    await pityHelper.increment('12345', 'Raro');
  }

  // Obter Lendário
  const result = await pityHelper.increment('12345', 'Lendário');
  if (result.pityLegendary !== 0) throw new Error('pityLegendary deveria resetar para 0');
  console.log('  ✅ Passou');
}

async function testPityResetOnMythic() {
  console.log('Test 5: increment() - reseta ambos ao obter Mítico');
  mockPity._store.clear();

  // Fazer 5 tentativas com Raro
  for (let i = 0; i < 5; i++) {
    await pityHelper.increment('12345', 'Raro');
  }

  // Obter Mítico
  const result = await pityHelper.increment('12345', 'Mítico');
  if (result.pityLegendary !== 0) throw new Error('pityLegendary deveria resetar para 0');
  if (result.pityMythic !== 0) throw new Error('pityMythic deveria resetar para 0');
  console.log('  ✅ Passou');
}

async function testPityGetStatus() {
  console.log('Test 6: getStatus() - obtém status atual');
  mockPity._store.clear();

  await pityHelper.increment('12345', 'Raro');
  await pityHelper.increment('12345', 'Raro');

  const status = await pityHelper.getStatus('12345');
  if (status.pityLegendary !== 2) throw new Error('pityLegendary deveria ser 2');
  if (status.pityMythic !== 2) throw new Error('pityMythic deveria ser 2');
  if (status.totalPulls !== 2) throw new Error('totalPulls deveria ser 2');
  console.log('  ✅ Passou');
}

async function testPityFormatStatus() {
  console.log('Test 7: formatStatus() - formata corretamente');

  const status = {
    pityLegendary: 7,
    pityMythic: 42,
    totalPulls: 156,
  };

  const formatted = pityHelper.formatStatus(status);
  if (!formatted.includes('7/10')) throw new Error('Deveria incluir 7/10');
  if (!formatted.includes('42/50')) throw new Error('Deveria incluir 42/50');
  if (!formatted.includes('156')) throw new Error('Deveria incluir total pulls');
  if (!formatted.includes('█')) throw new Error('Deveria ter barras de progresso');
  console.log('  ✅ Passou');
}

async function testPityReset() {
  console.log('Test 8: reset() - reseta contadores');
  mockPity._store.clear();

  await pityHelper.increment('12345', 'Raro');
  await pityHelper.increment('12345', 'Raro');

  await pityHelper.reset('12345');

  const status = await pityHelper.getStatus('12345');
  if (status.pityLegendary !== 0) throw new Error('pityLegendary deveria ser 0');
  if (status.pityMythic !== 0) throw new Error('pityMythic deveria ser 0');
  console.log('  ✅ Passou');
}

async function runTests() {
  console.log('🧪 A correr testes de pity...\n');

  try {
    await testPityIncrement();
    await testPityLegendaryGuarantee();
    await testPityMythicGuarantee();
    await testPityResetOnLegendary();
    await testPityResetOnMythic();
    await testPityGetStatus();
    await testPityFormatStatus();
    await testPityReset();

    console.log('\n✅ Todos os testes passaram!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Teste falhou:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
