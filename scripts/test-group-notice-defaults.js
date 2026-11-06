#!/usr/bin/env node
'use strict';

const assert = require('assert');
const Module = require('module');
const {
  NOTICE_DEFAULTS_VERSION,
  NOTICE_DEFAULTS_MARKER,
  DEFAULT_WELCOME_TEMPLATE,
  DEFAULT_GOODBYE_TEMPLATE,
  groupNoticeDefaultsPatch,
  applyApprovedGroupNoticeDefaults,
} = require('../src/database/groupNoticeDefaults');

(async () => {
  const patch = groupNoticeDefaultsPatch();

  assert.ok(NOTICE_DEFAULTS_VERSION.includes('group-notices'));
  assert.ok(DEFAULT_WELCOME_TEMPLATE.includes('{user}'));
  assert.ok(DEFAULT_WELCOME_TEMPLATE.includes('{membros}'));
  assert.ok(DEFAULT_GOODBYE_TEMPLATE.includes('{user}'));
  assert.ok(!/@lid|@\d{12,}/i.test(DEFAULT_WELCOME_TEMPLATE), 'padrão nunca traz JID/LID estático');
  assert.ok(!/@lid|@\d{12,}/i.test(DEFAULT_GOODBYE_TEMPLATE), 'padrão nunca traz JID/LID estático');

  for (const key of ['welcome', 'goodbye', 'welcomeEnabled', 'goodbyeEnabled', 'x9', 'autoapresentar', 'antifoba']) {
    assert.strictEqual(patch[key], true, `${key} deve iniciar activo`);
  }
  assert.strictEqual(patch.customWelcomeMsg, DEFAULT_WELCOME_TEMPLATE);
  assert.strictEqual(patch.customGoodbyeMsg, DEFAULT_GOODBYE_TEMPLATE);
  assert.deepStrictEqual(patch.fobaBlacklist, [], 'nenhum DDI é banido sem lista explícita');
  assert.strictEqual(patch.welcomeWithMedia, '');
  assert.strictEqual(patch.goodbyeWithMedia, '');
  assert.strictEqual(patch.welcome2, false);
  assert.strictEqual(patch.welcm3, false);

  // Sem Mongo real: prova que a reposição é global, destrutiva apenas uma vez
  // e não volta a apagar escolhas dos admins em reinícios posteriores.
  const originalRequire = Module.prototype.require;
  let marker = null;
  let update = null;
  Module.prototype.require = function patchedRequire(id) {
    const path = String(id);
    if (path.endsWith('models/GroupSettings')) {
      return {
        updateMany: async (filter, operation) => {
          update = { filter, operation };
          return { matchedCount: 7, modifiedCount: 7 };
        },
      };
    }
    if (path.endsWith('models/BotConfig')) {
      return {
        get: async (key) => (key === NOTICE_DEFAULTS_MARKER ? marker : null),
        set: async (key, value) => { if (key === NOTICE_DEFAULTS_MARKER) marker = value; return value; },
      };
    }
    return originalRequire.apply(this, arguments);
  };
  try {
    const first = await applyApprovedGroupNoticeDefaults();
    assert.strictEqual(first.applied, true);
    assert.strictEqual(first.matched, 7);
    assert.deepStrictEqual(update.filter, {});
    assert.deepStrictEqual(update.operation.$set, patch);
    assert.strictEqual(marker.version, NOTICE_DEFAULTS_VERSION);

    update = null;
    const second = await applyApprovedGroupNoticeDefaults();
    assert.deepStrictEqual(second, { applied: false, reason: 'already-applied', matched: 0, modified: 0 });
    assert.strictEqual(update, null, 'marcador impede uma segunda reposição');
  } finally {
    Module.prototype.require = originalRequire;
  }

  console.log('✅ group notice defaults OK');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
