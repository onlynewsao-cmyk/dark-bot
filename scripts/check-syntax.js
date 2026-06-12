#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith('.js')) files.push(full);
  }
}
walk(path.join(root, 'src'));

let failed = false;
for (const file of files.sort()) {
  const r = spawnSync(process.execPath, ['--check', file], { stdio: 'pipe', encoding: 'utf8' });
  if (r.status !== 0) {
    failed = true;
    console.error(`\n❌ Syntax error: ${path.relative(root, file)}`);
    if (r.stderr) console.error(r.stderr.trim());
  }
}

if (failed) process.exit(1);
console.log(`✅ Syntax OK (${files.length} arquivos JS)`);
