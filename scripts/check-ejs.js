#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const root = path.join(__dirname, '..');
const viewsDir = path.join(root, 'src', 'views');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith('.ejs')) files.push(full);
  }
}
walk(viewsDir);

let failed = false;
for (const file of files.sort()) {
  try {
    ejs.compile(fs.readFileSync(file, 'utf8'), { filename: file });
  } catch (err) {
    failed = true;
    console.error(`\n❌ EJS error: ${path.relative(root, file)}`);
    console.error(err.message);
  }
}

if (failed) process.exit(1);
console.log(`✅ EJS OK (${files.length} templates)`);
