'use strict';
/** v7.78 — LISTAS RESTANTES: myinstants, tiktokstalk, anime, filme */
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

const lista = require('../src/bot/listaEscolha');
const Module = require('module');
const _orig = Module.prototype.require;
const got = {};
Module.prototype.require = function (id) {
  const s = String(id);
  if (s === 'axios') return {
    get: async (url) => {
      if (String(url).includes('myinstants')) return { data: { results: [{ name: 'Som A', mp3: '/media/a.mp3' }, { name: 'Som B', mp3: '/media/b.mp3' }] } };
      if (String(url).includes('jikan')) return { data: { data: [{ title: 'Naruto', episodes: 220, score: 8.0, year: 2002, genres: [{ name: 'Ação' }] }, { title: 'Naruto Shippuuden', episodes: 500, score: 8.2, year: 2007, genres: [] }] } };
      if (String(url).includes('omdbapi') && String(url).includes('?s=')) return { data: { Response: 'True', Search: [{ Title: 'Inception', Year: '2010', imdbID: 'tt1375666', Type: 'movie' }, { Title: 'Inception 2', Year: '2030', imdbID: 'tt9999999', Type: 'movie' }] } };
      if (String(url).includes('omdbapi')) { got.omdb = String(url); return { data: { Response: 'True', Title: 'Inception', Year: '2010', imdbRating: '8.8', Genre: 'Sci-Fi', Director: 'Nolan', Actors: 'DiCaprio', Runtime: '148 min', Country: 'USA', Plot: 'Sonhos', Poster: 'N/A' } }; }
      return { data: {} };
    },
  };
  if (s.endsWith('dl/others')) return {
    tiktokSearch: async () => [{ title: 'ST1', author: 'uu', url: 'https://tt/s1.mp4' }, { title: 'ST2', author: 'uu', url: 'https://tt/s2.mp4' }],
  };
  if (s.endsWith('mediaHandler')) return { fetchBuffer: async (u) => { got.buf = u; return Buffer.alloc(5000, 5); } };
  return _orig.apply(this, arguments);
};

const cmds = {};
const collect = (names, fn, only) => names.forEach(n => { if (only === true && cmds[n]) return; cmds[n] = fn; }); // = caseHandler
require('../src/bot/cases/downloads2.js')(collect);
require('../src/bot/cases/search2.js')(collect);

const sockMock = (store) => ({ sendMessage: async (jid, content) => { store.push(content); return { key: { id: 'x' } }; } });
const CTX = (n) => ({ remoteJid: 'G' + n + '@g.us', senderNumber: '244900' + n, pushName: 'T' });
const MSG = { key: { id: 'm1' } };

(async () => {
  // myinstants
  let store = []; let sock = sockMock(store);
  const cM = CTX('MI');
  await cmds['myinstants']({ sock, msg: MSG, ctx: cM, args: ['bruh'], prefix: '!', reply: async (t) => t });
  check('myinstants mostra lista', (store.find(c => c.text)?.text || '').includes('Som B'));
  store.length = 0;
  await lista.tentarNumero(sock, MSG, cM, '2');
  check('myinstants escolhe → PTT', got.buf === 'https://www.myinstants.com/media/b.mp3' && store.some(c => c.audio && c.ptt === true), got.buf);

  // tiktokstalk
  store = []; sock = sockMock(store);
  const cS = CTX('ST');
  await cmds['tiktokstalk']({ sock, msg: MSG, ctx: cS, args: ['uu'], prefix: '!', reply: async (t) => t });
  check('ttstalk mostra lista', (store.find(c => c.text)?.text || '').includes('ST2'));
  store.length = 0;
  await lista.tentarNumero(sock, MSG, cS, '1');
  check('ttstalk escolhe → vídeo', store.some(c => c.document || c.video));

  // anime
  store = []; sock = sockMock(store);
  const cA = CTX('AN');
  await cmds['anime']({ sock, msg: MSG, ctx: cA, args: ['naruto'], prefix: '!' });
  check('anime mostra lista', (store.find(c => c.text)?.text || '').includes('Shippuuden'));
  store.length = 0;
  await lista.tentarNumero(sock, MSG, cA, '2');
  const tA = store.map(c => c.text || c.caption || '').join('\n');
  check('anime escolhe → detalhe', /Shippuuden/.test(tA) && /500/.test(tA), tA.slice(0, 80));

  // filme
  store = []; sock = sockMock(store);
  const cF = CTX('FI');
  await cmds['filme']({ sock, msg: MSG, ctx: cF, args: ['inception'], prefix: '!' });
  check('filme mostra lista', (store.find(c => c.text)?.text || '').includes('Inception 2'));
  store.length = 0;
  await lista.tentarNumero(sock, MSG, cF, '1');
  const tF = store.map(c => c.text || c.caption || '').join('\n');
  check('filme escolhe → detalhe por imdbID', /tt1375666/.test(got.omdb || '') && /Nolan/.test(tF), (got.omdb || '').slice(-30));

  console.log(`\n${fail ? '💥' : '🎉'} LISTAS2: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
