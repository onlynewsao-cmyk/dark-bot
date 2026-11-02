#!/usr/bin/env node
/**
 * Regressão: os comandos repetidos no case legado devem usar exatamente os
 * handlers do pacote de interações (gifHelper multi-fonte), não a antiga rota
 * Tenor/URL crua. Não faz pedido de rede nem toca na base de dados.
 */
'use strict';

const interactions = require('../src/bot/packages/interactions');
const registerInteractionsCase = require('../src/bot/cases/interacoes2');

const cases = new Map();
function registerCase(commands, handler, onlyIfNew = false) {
  for (const command of (Array.isArray(commands) ? commands : [commands])) {
    const key = String(command).toLowerCase();
    if (onlyIfNew && cases.has(key)) continue;
    cases.set(key, handler);
  }
}

registerInteractionsCase(registerCase);

const canonical = ['soco', 'tapa', 'beijar', 'abracar', 'morder', 'matar', 'dancar', 'cafune'];
const aliases = { socar: 'soco', tapar: 'tapa', beijo: 'beijar', abraco: 'abracar', mordida: 'morder', mata: 'matar' };
let failed = 0;
function check(name, ok) {
  if (ok) console.log(`  ✅ ${name}`);
  else { failed++; console.error(`  ❌ ${name}`); }
}

console.log('\n🎞️ INTERAÇÕES — ROTA GIF UNIFICADA\n');
for (const cmd of canonical) check(`${cmd} usa o handler único do pacote`, cases.get(cmd) === interactions[cmd]);
for (const [alias, target] of Object.entries(aliases)) check(`${alias} usa ${target}`, cases.get(alias) === interactions[target]);
for (const cmd of ['lamber', 'lambida', 'explodir', 'tomate', 'proteger', 'baterrpg', 'sexo', 'beijob']) {
  check(`${cmd} mantém handler com GIF`, typeof cases.get(cmd) === 'function');
}

if (failed) process.exit(1);
console.log('\n✅ Interações antigas e novas partilham a rota GIF quando há comando canónico.\n');
