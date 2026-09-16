#!/usr/bin/env node
/** Auditoria ESTÁTICA: comandos referenciados nos menus vs implementados. */
'use strict';
const fs = require('fs');
const path = require('path');
const SRC = '/home/user/darknet-tunnel/src/bot';

const impl = new Set();
function scanFile(fp) {
  const src = fs.readFileSync(fp, 'utf8');
  for (const m of src.matchAll(/registerCase\(\s*\[([\s\S]*?)\]/g))
    for (const q of m[1].matchAll(/['"]([a-zA-Z0-9_çãõáéíóúâêôàü]+)['"]/g)) impl.add(q[1].toLowerCase());
  for (const q of src.matchAll(/async function ([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g)) impl.add(q[1].toLowerCase());
  for (const q of src.matchAll(/^\s*async ([a-z][a-z0-9_çãõ]{2,})\s*\(\s*\{/gm)) impl.add(q[1].toLowerCase());
  const mi = src.indexOf('module.exports');
  if (mi > 0) for (const q of src.slice(mi).matchAll(/(?:^\s*|[,{]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*[:,]/gm)) impl.add(q[1].toLowerCase());
}
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const fp = `${dir}/${f}`;
    const st = fs.statSync(fp);
    if (st.isDirectory()) { if (f !== 'node_modules') walk(fp); }
    else if (f.endsWith('.js')) scanFile(fp);
  }
}
walk(SRC);

// Referenciados nos menus:
const ref = new Map(); // cmd -> origem
function addRef(cmd, from) {
  cmd = String(cmd).toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (cmd.length < 2 || /^\d+$/.test(cmd)) return;
  if (!ref.has(cmd)) ref.set(cmd, from);
}
{
  // menuBuilder: `${p}cmd`
  const src = fs.readFileSync(SRC + '/menuBuilder.js', 'utf8');
  for (const q of src.matchAll(/\$\{p\}([a-zA-Z0-9_]+)/g) ) addRef(q[1], 'menuBuilder');
  // nativeCommands art: cmds('a','b') e { cmd: 'x' }
  const nc = fs.readFileSync(SRC + '/nativeCommands.js', 'utf8');
  for (const m of nc.matchAll(/cmds\(([^)]*)\)/g))
    for (const q of m[1].matchAll(/['"]([a-zA-Z0-9_]+)['"]/g)) addRef(q[1], 'nativeArt');
  for (const q of nc.matchAll(/\{\s*cmd:\s*['"]([a-zA-Z0-9_]+)['"]/g)) addRef(q[1], 'nativeArt');
  // submenuData secções: re: /^(a|b|c)$/
  const sd = fs.readFileSync(SRC + '/submenuData.js', 'utf8');
  for (const m of sd.matchAll(/re:\s*\/\^\(?([a-zA-Z0-9_|$^()]+)\)?\$\//g))
    for (const alt of m[1].split('|')) addRef(alt.replace(/[$^()]/g, ''), 'submenus');
  // downloads2 redes sociais já cobertas pelas secções
}
const missing = [...ref.keys()].filter(c => !impl.has(c)).sort();
console.log(`implementados: ${impl.size} | referenciados: ${ref.size}`);
console.log(`FALTAM (${missing.length}):`);
for (const c of missing) console.log(`  ${c}  [${ref.get(c)}]`);
