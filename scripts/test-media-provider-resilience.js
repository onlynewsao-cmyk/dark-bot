#!/usr/bin/env node
'use strict';
/** Regressões de rapidez: card !play e Pinterest não podem esperar uma API lenta. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const originalRequire = Module.prototype.require;
const ROOT = path.join(__dirname, '..');

const wait = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

async function testPlaySearchRace() {
  const target = path.join(ROOT, 'src', 'bot', 'systemZeroPlay.js');
  delete require.cache[require.resolve(target)];
  Module.prototype.require = function patched(id) {
    if (id === './mediaHandler') return {
      fetchJson: async () => wait(280, { resultados: [{ title: 'Remoto tardio', youtube_url: 'https://youtu.be/BBBBBBBBBBB' }] }),
    };
    if (id === '../config') return { bot: { name: 'DARK BOT' } };
    if (id === '../../mediaQuality') return { profile: (audio, video) => ({ audio, video, apiAudio: audio, apiVideo: video }) };
    if (id === 'yt-search') return async () => ({ videos: [{
      type: 'video', title: 'Local rápido', url: 'https://youtu.be/AAAAAAAAAAA', videoId: 'AAAAAAAAAAA',
      author: { name: 'Canal' }, views: 1, timestamp: '0:22', thumbnail: 'https://img.example/one.jpg',
    }] });
    return originalRequire.apply(this, arguments);
  };
  const play = require(target);
  const started = Date.now();
  const out = await play.ytsearch('mush intro');
  const elapsed = Date.now() - started;
  assert.strictEqual(out.resultados[0].title, 'Local rápido');
  assert(elapsed < 150, `a busca local vencedora demorou ${elapsed} ms`);
  console.log('✅ !play usa a primeira busca válida, sem esperar API remota lenta');
}

function testYtdlpAndroidFallback() {
  const source = fs.readFileSync(path.join(ROOT, 'src', 'bot', 'ytdl.js'), 'utf8');
  const web = source.indexOf("{ name: 'web', args }");
  const android = source.indexOf("{ name: 'android', args: [...args, '--extractor-args', 'youtube:player_client=android'] }");
  assert(web >= 0 && android > web, 'yt-dlp deve tentar web e depois o perfil Android sem configuração externa');
  console.log('✅ yt-dlp tem fallback Android automático, sem cookie, proxy ou chave');
}

async function testPinterestRaceAndRouting() {
  const target = path.join(ROOT, 'src', 'bot', 'pinterestSearch.js');
  delete require.cache[require.resolve(target)];
  Module.prototype.require = function patched(id) {
    if (id === './mediaHandler') return {
      fetchJson: async (url) => {
        if (/siputzx/.test(url)) return wait(8, { data: [1, 2, 3, 4].map((n) => ({
          image_url: `https://i.pinimg.com/originals/image-${n}.jpg`, description: `imagem ${n}`,
        })) });
        return wait(260, { data: [] });
      },
      fetchBuffer: async () => { throw new Error('não deve fazer scraping quando a fonte rápida respondeu'); },
    };
    return originalRequire.apply(this, arguments);
  };
  const pin = require(target);
  const started = Date.now();
  const items = await pin.searchPinterest('B.O.A.T', { type: 'image', limit: 4 });
  const elapsed = Date.now() - started;
  assert.strictEqual(items.length, 4);
  assert(elapsed < 150, `Pinterest esperou fonte lenta: ${elapsed} ms`);

  const native = fs.readFileSync(path.join(ROOT, 'src', 'bot', 'nativeCommands.js'), 'utf8');
  const command = native.slice(native.indexOf('async pinterest('), native.indexOf('// !pinsticker'));
  assert(command.includes("require('./pinterestSearch')"), 'comando Pinterest deve usar o motor multi-fonte');
  assert(!command.includes("const SZ = 'https://api.siputzx.my.id/api'"), 'comando não pode voltar a depender de uma única API');
  console.log('✅ Pinterest usa a primeira fonte útil e o comando aponta para o motor multi-fonte');
}

(async () => {
  try {
    await testPlaySearchRace();
    testYtdlpAndroidFallback();
    await testPinterestRaceAndRouting();
    console.log('MEDIA PROVIDERS: rapidez e fallbacks aprovados.');
  } finally {
    Module.prototype.require = originalRequire;
  }
})().catch((error) => {
  Module.prototype.require = originalRequire;
  console.error('MEDIA PROVIDERS: FAIL:', error.stack || error.message);
  process.exitCode = 1;
});
