#!/usr/bin/env node
/**
 * Uso:
 *   npm run decrypt:url -- https://exemplo.com/config.ehi
 *   node scripts/decrypt-url.js https://exemplo.com/config.ehi saida.json
 */
const fs = require('fs');
const path = require('path');
const { decrypt } = require('../src/decrypter');

async function main() {
  const url = process.argv[2];
  const output = process.argv[3];
  if (!url || !/^https?:\/\//i.test(url)) {
    console.error('Uso: npm run decrypt:url -- <URL http/https> [saida.json]');
    process.exit(1);
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download falhou: HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = path.basename(new URL(url).pathname) || 'config.txt';
  const result = await decrypt(fileName, buffer);
  const json = JSON.stringify(result, null, 2);

  if (output) {
    fs.writeFileSync(output, json + '\n');
    console.log(`✅ Resultado guardado em ${output}`);
  } else {
    console.log(json);
  }
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
