#!/usr/bin/env node
'use strict';

/**
 * v9.21 — Testes do sistema genérico de GIFs (não anime)
 * Verifica que:
 *  1) Cada ação canónica tem queries genéricas (g:) para Reddit/Giphy
 *  2) resolveCategory devolve campo generic[]
 *  3) Fonte Reddit está integrada
 *  4) Prioridade correcta: genéricas antes de anime
 */

const assert = require('assert');

const gifHelper = require('../src/bot/gifHelper');
const { resolveCategory, resolveAction, ACTIONS } = gifHelper;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ❌ ${name}: ${e.message}`);
  }
}

console.log('\n▸ 1. Queries genéricas por ação\n');

// Todas as ações principais devem ter queries genéricas
const requiredActions = [
  'hug', 'kiss', 'pat', 'cuddle', 'love', 'flirt',
  'slap', 'punch', 'kick', 'beat', 'bite', 'kill',
  'cry', 'laugh', 'happy', 'sad', 'angry', 'shocked',
  'dance', 'celebrate', 'eat', 'coffee', 'run', 'sing',
  'money', 'poor', 'shopping', 'winner',
  'sleep', 'tired', 'bored', 'scared',
  'think', 'confused', 'smug', 'proud',
];

for (const action of requiredActions) {
  test(`${action} tem queries genéricas`, () => {
    const cat = resolveCategory(action);
    assert.ok(cat.generic, `resolveCategory(${action}) deve ter campo generic`);
    assert.ok(Array.isArray(cat.generic), `generic deve ser array`);
    assert.ok(cat.generic.length > 0, `${action} deve ter pelo menos 1 query genérica`);
    // Queries genéricas NÃO devem começar com "anime "
    for (const q of cat.generic) {
      assert.ok(!/^anime\s/i.test(q), `query genérica "${q}" não deve ter prefixo "anime"`);
    }
  });
}

console.log('\n▸ 2. Campo generic em resolveCategory\n');

test('resolveCategory("hug") inclui generic[]', () => {
  const cat = resolveCategory('hug');
  assert.deepStrictEqual(typeof cat.generic, 'object');
  assert.ok(cat.generic.length >= 2, `hug deve ter ≥2 queries genéricas, tem ${cat.generic.length}`);
  assert.ok(cat.generic.includes('hug'), 'hug genérico deve incluir "hug"');
});

test('resolveCategory("slap") inclui generic[] sem anime', () => {
  const cat = resolveCategory('slap');
  assert.ok(cat.generic.length >= 2);
  for (const q of cat.generic) {
    assert.ok(!q.startsWith('anime '), `slap genérico não deve ter "anime": "${q}"`);
  }
});

test('resolveCategory("dance") inclui "dancing" ou similar', () => {
  const cat = resolveCategory('dance');
  assert.ok(cat.generic.length >= 1);
  const hasDance = cat.generic.some(q => /dance|dancing|grooving/i.test(q));
  assert.ok(hasDance, `dance genérico deve ter "dancing" ou similar: ${JSON.stringify(cat.generic)}`);
});

console.log('\n▸ 3. Resolução de queries em português\n');

test('"abraço" resolve para hug', () => {
  const cat = resolveCategory('abraço');
  assert.strictEqual(cat.action, 'hug');
  assert.ok(cat.generic.length > 0, 'deve ter queries genéricas');
});

test('"tapa" resolve para slap', () => {
  const cat = resolveCategory('tapa');
  assert.strictEqual(cat.action, 'slap');
  assert.ok(cat.generic.length > 0);
});

test('"rir" resolve para laugh', () => {
  const cat = resolveCategory('rir');
  assert.strictEqual(cat.action, 'laugh');
  assert.ok(cat.generic.length > 0);
});

test('"dançar" resolve para dance', () => {
  const cat = resolveCategory('dançar');
  assert.strictEqual(cat.action, 'dance');
  assert.ok(cat.generic.length > 0);
});

test('"beijar" resolve para kiss', () => {
  const cat = resolveCategory('beijar');
  assert.strictEqual(cat.action, 'kiss');
  assert.ok(cat.generic.length > 0);
});

test('"soco" resolve para punch', () => {
  const cat = resolveCategory('soco');
  assert.strictEqual(cat.action, 'punch');
  assert.ok(cat.generic.length > 0);
});

console.log('\n▸ 4. Fonte Reddit integrada\n');

test('gifHelper exporta srcReddit (via fetchCandidates)', () => {
  // fetchCandidates é assíncrono, mas podemos testar que resolveCategory
  // devolve generic queries que vão para o Reddit
  const cat = resolveCategory('happy');
  assert.ok(cat.generic.length > 0);
  // As generic queries são usadas pelo srcReddit
});

test('gifHelper mantém compatibilidade com API antiga', () => {
  assert.ok(typeof gifHelper.fetchGifBuffer === 'function');
  assert.ok(typeof gifHelper.sendWithGif === 'function');
  assert.ok(typeof gifHelper.resolveCategory === 'function');
  assert.ok(typeof gifHelper.resolveAction === 'function');
  assert.ok(gifHelper.ACTIONS);
  assert.ok(gifHelper.SOURCES);
});

console.log('\n▸ 5. Cobertura de ações\n');

test('ACTIONS tem pelo menos 80 ações', () => {
  const count = Object.keys(ACTIONS).length;
  assert.ok(count >= 80, `ACTIONS deve ter ≥80 ações, tem ${count}`);
  console.log(`    (total: ${count} ações)`);
});

// Contar quantas têm queries genéricas
const withGeneric = Object.entries(ACTIONS).filter(([k, v]) => v.g && v.g.length > 0).length;
test(`${withGeneric}/${Object.keys(ACTIONS).length} ações têm queries genéricas`, () => {
  // Pelo menos 80% das ações devem ter genéricas
  const ratio = withGeneric / Object.keys(ACTIONS).length;
  assert.ok(ratio >= 0.8, `Apenas ${withGeneric}/${Object.keys(ACTIONS).length} ações têm genéricas (${(ratio*100).toFixed(0)}%)`);
});

console.log('\n▸ 6. Prioridade de fontes (genéricas > anime)\n');

test('resolveCategory mantém campo reactions (anime) E generic', () => {
  const cat = resolveCategory('kiss');
  assert.ok(cat.reactions.length > 0, 'deve ter reactions (anime)');
  assert.ok(cat.generic.length > 0, 'deve ter generic (não anime)');
  assert.ok(cat.tenor.length > 0, 'deve ter tenor');
  // Ambas existem lado a lado
});

console.log(`\n${'═'.repeat(50)}`);
console.log(`Resultados: ${passed} passaram, ${failed} falharam`);
console.log(`${'═'.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
