#!/usr/bin/env node
'use strict';
/** Regressão: cada capacidade que o cérebro anuncia tem rota no executor. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const brain = require('../src/aura/auraBrain');
const executorSource = fs.readFileSync(path.join(__dirname, '../src/aura/auraExec.js'), 'utf8');
const cases = new Set([...executorSource.matchAll(/case '([^']+)'/g)].map(match => match[1]));
const ids = brain.CAPACIDADES.map(cap => cap.id);
const missing = ids.filter(id => !cases.has(id));
const orphanCases = [...cases].filter(id => !ids.includes(id));

assert.strictEqual(missing.length, 0, `Capacidades sem executor: ${missing.join(', ')}`);
assert.ok(executorSource.includes("require('./auraChannelAdvanced').executar"), 'capacidades avançadas de canal devem usar ponte validada');

console.log(`AURA CAPABILITY COVERAGE: ${ids.length}/${ids.length} capacidades com executor.` +
  (orphanCases.length ? ` Cases extra (legados): ${orphanCases.length}.` : ''));
