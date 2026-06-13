#!/usr/bin/env node
/**
 * Audita catálogo de comandos: sem duplicados e sem comandos nativos inexistentes.
 * Ajuda a manter o menu/dashboard profissional e só com comandos funcionais.
 */
const catalog = require('../src/bot/commandCatalog').getAll();
const nativeCommands = require('../src/bot/nativeCommands');
const packs = [
  require('../src/bot/packages/interactions'),
  require('../src/bot/packages/family'),
  require('../src/bot/packages/economy'),
  require('../src/bot/packages/games'),
  require('../src/bot/packages/cheats'),
];
const packageCommands = Object.assign({}, ...packs);
const implemented = new Set([...Object.keys(nativeCommands), ...Object.keys(packageCommands)]);
const counts = new Map();
for (const c of catalog) counts.set(c.name, (counts.get(c.name) || 0) + 1);
const duplicates = [...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name);
const missing = catalog.filter(c => c.native && !implemented.has(c.name)).map(c => c.name);

if (duplicates.length) console.error('❌ Duplicados no catálogo:', duplicates.join(', '));
if (missing.length) console.error('❌ Nativos no catálogo sem implementação:', missing.join(', '));
if (duplicates.length || missing.length) process.exit(1);

console.log(`✅ Command audit OK: ${catalog.length} comandos catalogados, sem duplicados e sem nativos quebrados.`);
process.exit(0);
