'use strict';
/** Regression: !play auto-sends audio, !play3 shares the normal card skin, fallbacks remain. */
const assert = require('assert');
const Module = require('module');
const originalRequire = Module.prototype.require;
let buttonsEnabled = true;
let audioFails = false;
const fakeAudio = Buffer.alloc(4096, 1);
const fakeMediaHandler = {
  isAudioBytes: () => true,
  fetchBuffer: async () => fakeAudio,
};

class FakeButtonV2 {
  static sent = [];
  constructor(sock) { this.sock = sock; this.buttons = []; FakeButtonV2.sent.push(this); }
  setTitle(v) { this.title = v; }
  setBody(v) { this.body = v; }
  setFooter(v) { this.footer = v; }
  setThumbnail(v) { this.thumbnail = v; }
  addButton(label, id) { this.buttons.push({ label, id }); }
  async send(jid, opts) {
    await this.sock.sendMessage(jid, {
      fakeButtonCard: true, title: this.title, body: this.body, buttons: this.buttons,
    }, opts);
  }
}

const results = [
  { title: 'Faixa Um', author: 'Artista Um', duration: '3:21', views: 12345, youtube_url: 'https://youtu.be/AAAAAAAAAAA', thumbnail: 'https://img.example/one.jpg' },
  { title: 'Faixa Dois', author: 'Artista Dois', duration: '4:02', views: 23456, youtube_url: 'https://youtu.be/BBBBBBBBBBB' },
  { title: 'Faixa Três', author: 'Artista Três', duration: '5:43', views: 34567, youtube_url: 'https://youtu.be/CCCCCCCCCCC' },
];
const fakeSystemZeroPlay = {
  ytsearch: async () => ({ resultados: results }),
  ytAudio: async (_url, quality) => {
    if (audioFails) throw new Error('mock provider unavailable');
    return { buffer: fakeAudio, title: 'Faixa Um', mimetype: 'audio/mpeg', quality };
  },
  sendPlayCard: async () => { throw new Error('unexpected legacy card fallback'); },
  sendToxicPlayCard: async () => { throw new Error('!play3 must not use the DARK TOXIC card'); },
};

Module.prototype.require = function (id) {
  if (id === '../../config' || id === '../config') return { footer: 'DARK BOT', bot: { name: 'DARK BOT' } };
  if (id === '../systemZeroPlay') return fakeSystemZeroPlay;
  if (id === '../mediaHandler' || id === './mediaHandler') return fakeMediaHandler;
  if (id === '@systemzero/baileys/lib/MB.cjs') return buttonsEnabled ? { ButtonV2: FakeButtonV2 } : {};
  return originalRequire.apply(this, arguments);
};

(async () => {
  const register = require('../src/bot/cases/downloads');
  const handlers = new Map();
  register((names, fn) => [].concat(names).forEach(name => handlers.set(name, fn)));
  const jid = 'test@s.whatsapp.net';
  const sent = [];
  const sock = { sendMessage: async (to, payload, opts) => { sent.push({ to, payload, opts }); return { key: { id: 'mock' } }; } };
  const msg = { key: { id: 'm1', remoteJid: jid }, message: {} };
  const m = { chat: jid, key: msg.key, reply: async text => sent.push({ reply: text }) };
  async function run(command) {
    sent.length = 0;
    FakeButtonV2.sent.length = 0;
    await handlers.get(command)({ sock, m, msg, ctx: { remoteJid: jid }, text: 'faixa de teste', prefix: '!', command });
    return { sent: [...sent], cards: [...FakeButtonV2.sent] };
  }

  let r = await run('play');
  assert.strictEqual(r.cards.length, 1, '!play sends one compact video card');
  let card = r.cards[0];
  assert.strictEqual(card.title, 'Faixa Um', '!play keeps the first search result');
  assert.ok(card.body.length <= 180, 'card body stays compact');
  for (const detail of ['Artista Um', '3:21', '12.345']) assert.ok(card.body.includes(detail), `card includes ${detail}`);
  assert.ok(card.body.includes('Áudio automático (128k)'), 'card says audio is automatic');
  assert.ok(!/toxic|ataque/i.test(card.body), '!play stays simple, not DARK TOXIC');
  assert.strictEqual(card.buttons.length, 1, '!play card only needs the video button');
  assert.ok(card.buttons[0].id.includes('!gyt https://youtu.be/AAAAAAAAAAA | mp4 | 480 | 3:21'));
  assert.ok(r.sent.some(x => x.payload?.audio?.equals(fakeAudio) && x.payload.mimetype === 'audio/mpeg' && x.payload.ptt === false),
    '!play sends the MP3 automatically');

  r = await run('play2');
  assert.strictEqual(r.cards.length, 1, '!play2 sends one regular card');
  assert.strictEqual(r.cards[0].title, 'Faixa Dois', '!play2 remains the second search result');
  assert.ok(r.cards[0].body.includes('Resultado #2'), 'play2 is identified compactly');
  assert.strictEqual(r.cards[0].buttons.length, 2, '!play2 keeps audio and video buttons');
  assert.ok(r.cards[0].buttons[0].id.endsWith('| 192k'), 'play2 keeps medium-quality audio');
  assert.ok(r.cards[0].buttons[1].id.includes('| mp4 | 720 | 4:02'), 'play2 keeps medium-quality video');
  assert.ok(!r.sent.some(x => x.payload?.audio), '!play2 does not auto-send audio');
  assert.ok(!/toxic|ataque/i.test(r.cards[0].body), '!play2 keeps the normal style');

  r = await run('play3');
  assert.strictEqual(r.cards.length, 1, '!play3 sends one card');
  card = r.cards[0];
  assert.ok(card.title.includes('Faixa Três'), '!play3 remains the third search result');
  assert.ok(!/toxic|ataque/i.test(card.body), '!play3 uses the normal play skin');
  assert.ok(card.body.includes('Resultado #3'), 'normal card identifies the third result');
  assert.ok(card.body.includes('Áudio automático (320k)') && card.body.includes('1080p'), 'play3 uses the same card line with high-quality values');
  assert.strictEqual(card.buttons.length, 1, '!play3 has the same single video button as play');
  assert.ok(card.buttons[0].id.includes('| mp4 | 1080 | 5:43'), 'play3 keeps high-quality video');
  assert.ok(r.sent.some(x => x.payload?.audio?.equals(fakeAudio) && x.payload.mimetype === 'audio/mpeg' && x.payload.ptt === false),
    '!play3 automatically sends high-quality audio');

  buttonsEnabled = false;
  r = await run('play');
  const fallback = r.sent.find(x => x.payload?.text)?.payload.text || '';
  assert.ok(fallback.includes('!gyt https://youtu.be/AAAAAAAAAAA | mp4 | 480 | 3:21'), 'text fallback retains the video command');
  assert.ok(!fallback.includes('!ytd '), 'video-only card fallback does not offer redundant audio');
  assert.ok(r.sent.some(x => x.payload?.audio?.equals(fakeAudio)), 'audio still sends when ButtonV2 is unavailable');

  r = await run('play3');
  const play3Fallback = r.sent.find(x => x.payload?.text)?.payload.text || '';
  assert.ok(play3Fallback.includes('Faixa Três') && play3Fallback.includes('Áudio automático (320k)') && play3Fallback.includes('| mp4 | 1080 | 5:43'),
    'play3 text fallback keeps the play layout, result #3, and high-quality commands');
  assert.ok(!/toxic|ataque/i.test(play3Fallback), 'play3 fallback is not DARK TOXIC');
  assert.ok(!play3Fallback.includes('!ytd '), 'play3 fallback has the same single video button flow as play');
  assert.ok(r.sent.some(x => x.payload?.audio?.equals(fakeAudio)), 'play3 fallback still sends the high-quality audio automatically');

  buttonsEnabled = true;
  audioFails = true;
  r = await run('play');
  assert.strictEqual(r.cards.length, 1, 'video card survives audio-provider failure');
  assert.ok(!r.sent.some(x => x.payload?.audio), 'no fake audio is sent after provider failure');
  assert.ok(r.sent.some(x => /não consegui entregar o áudio/i.test(x.reply || '')), 'audio failure is reported honestly');
  assert.ok(r.sent.some(x => x.payload?.react?.text === '⚠️'), 'failure uses a warning reaction, not success');

  console.log('PLAY FLOW: auto-audio + video button, play2 normal, play3 shared skin/high quality, and fallbacks passed.');
})().catch(error => {
  console.error('PLAY FLOW: FAIL:', error.stack || error.message);
  process.exitCode = 1;
}).finally(() => {
  Module.prototype.require = originalRequire;
});
