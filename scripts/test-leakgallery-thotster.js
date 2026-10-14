'use strict';

const assert = require('assert');
const adultSources = require('../src/bot/adultSources');
const nativeCommands = require('../src/bot/nativeCommands');

async function test() {
  console.log('=== TESTE: Novas Fontes Menu18 (LeakGallery & Thotster) ===');

  // 1. Verificar se as funções existem em adultSources
  assert.strictEqual(typeof adultSources.leakgallerySearch, 'function', 'leakgallerySearch deve existir');
  assert.strictEqual(typeof adultSources.leakgalleryDownload, 'function', 'leakgalleryDownload deve existir');
  assert.strictEqual(typeof adultSources.thotsterSearch, 'function', 'thotsterSearch deve existir');
  assert.strictEqual(typeof adultSources.thotsterDownload, 'function', 'thotsterDownload deve existir');
  console.log('  ✔ Funções exportadas em adultSources');

  // 2. Verificar se os comandos existem em nativeCommands
  assert.strictEqual(typeof nativeCommands.leakgallery, 'function', 'cmd leakgallery deve existir');
  assert.strictEqual(typeof nativeCommands.leakg, 'function', 'cmd leakg deve existir');
  assert.strictEqual(typeof nativeCommands.thotster, 'function', 'cmd thotster deve existir');
  assert.strictEqual(typeof nativeCommands.thot, 'function', 'cmd thot deve existir');
  console.log('  ✔ Comandos registados em nativeCommands');

  // 3. Testar busca real no LeakGallery
  console.log('  Testing LeakGallery search (pinkchyu)...');
  const leakRes = await adultSources.leakgallerySearch('pinkchyu', 5);
  console.log(`  LeakGallery encontrou ${leakRes.length} itens`);
  assert(leakRes.length > 0, 'LeakGallery deve encontrar mídias para pinkchyu');
  assert(leakRes[0].url.startsWith('https://cdn.leakgallery.com/'), 'URL deve ser do cdn.leakgallery.com');
  console.log('  ✔ LeakGallery search OK');

  // 4. Testar download de mídia real do LeakGallery
  console.log('  Testing LeakGallery download...');
  const firstThumb = leakRes[0].thumb || leakRes[0].url;
  const dl = await adultSources.leakgalleryDownload(firstThumb);
  assert(dl.buf && dl.buf.length > 500, 'Buffer baixado deve ser válido (>500B)');
  console.log(`  ✔ LeakGallery download OK (${dl.buf.length} bytes, container=${dl.container})`);

  // 5. Testar busca real no Thotster
  console.log('  Testing Thotster search (cosplay)...');
  const thotRes = await adultSources.thotsterSearch('cosplay', 5);
  console.log(`  Thotster encontrou ${thotRes.length} itens`);
  assert(thotRes.length > 0, 'Thotster deve encontrar mídias');
  assert(thotRes[0].url.includes('cdn.thotster.net'), 'URL deve ser do cdn.thotster.net');
  console.log('  ✔ Thotster search OK');

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!\n');
  process.exit(0);
}

test().catch(err => {
  console.error('❌ Teste falhou:', err);
  process.exit(1);
});
