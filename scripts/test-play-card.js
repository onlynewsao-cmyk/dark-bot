'use strict';
/** Regression: compact play card keeps direct audio and video actions. */
const assert = require('assert');
const Module = require('module');
const originalRequire = Module.prototype.require;
let buttonsEnabled = true;

class FakeButtonV2 {
  static sent = [];
  constructor(sock) { this.sock = sock; this.buttons = []; FakeButtonV2.sent.push(this); }
  setTitle(v) { this.title = v; }
  setBody(v) { this.body = v; }
  setFooter(v) { this.footer = v; }
  setThumbnail(v) { this.thumbnail = v; }
  addButton(label, id) { this.buttons.push({ label, id }); }
  async send(jid, opts) {
    await this.sock.sendMessage(jid, { fakeButtonCard: true, title: this.title, body: this.body, buttons: this.buttons }, opts);
  }
}

const results = [
  { title: 'Faixa Um', author: 'Artista Um', duration: '3:21', views: 12345, youtube_url: 'https://youtu.be/AAAAAAAAAAA', thumbnail: 'https://img.example/one.jpg' },
  { title: 'Faixa Dois', author: 'Artista Dois', duration: '4:02', views: 23456, youtube_url: 'https://youtu.be/BBBBBBBBBBB' },
  { title: 'Faixa Três', author: 'Artista Três', duration: '5:43', views: 34567, youtube_url: 'https://youtu.be/CCCCCCCCCCC' },
];
const fakeSystemZeroPlay = {
  ytsearch: async () => ({ resultados: results }),
  sendPlayCard: async () => { throw new Error('unexpected fallback'); },
  sendToxicPlayCard: async () => { throw new Error('toxic card must not be used'); },
};

Module.prototype.require = function (id) {
  if (id === '../../config') return { footer: 'DARK BOT', bot: { name: 'DARK BOT' } };
  if (id === '../systemZeroPlay') return fakeSystemZeroPlay;
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
  assert.strictEqual(r.cards.length, 1, '!play sends exactly one interactive card');
  let card = r.cards[0];
  assert.strictEqual(card.title, 'Faixa Um', '!play keeps the first search result');
  assert.ok(card.body.length <= 180, 'card body stays compact');
  for (const detail of ['Artista Um', '3:21', '12.345']) assert.ok(card.body.includes(detail), `card includes ${detail}`);
  assert.ok(!/toxic|ataque|escolha o ataque/i.test(card.body), 'normal play style, not the old toxic card');
  assert.strictEqual(card.buttons.length, 2, 'one audio and one video action');
  assert.deepStrictEqual(card.buttons.map(b => b.id), [
    '!ytd https://youtu.be/AAAAAAAAAAA | 128k',
    '!gyt https://youtu.be/AAAAAAAAAAA | mp4 | 480 | 3:21',
  ]);
  assert.ok(r.sent.filter(x => x.payload?.fakeButtonCard).length === 1, 'one card payload is emitted');

  r = await run('play2');
  assert.strictEqual(r.cards.length, 1, '!play2 sends one card');
  assert.strictEqual(r.cards[0].title, 'Faixa Dois', '!play2 remains the second search result');
  assert.ok(r.cards[0].body.includes('Resultado #2'), 'play2 is identified compactly');
  assert.ok(r.cards[0].buttons[0].id.endsWith('| 192k'), 'play2 keeps medium-quality audio');
  assert.ok(r.cards[0].buttons[1].id.includes('| mp4 | 720 | 4:02'), 'play2 keeps medium-quality video');
  assert.ok(!/toxic|ataque/i.test(r.cards[0].body), 'play2 uses the clean card style');

  r = await run('play3');
  assert.strictEqual(r.cards.length, 1, '!play3 still sends one card');
  card = r.cards[0];
  assert.strictEqual(card.title, 'Faixa Três', '!play3 remains the third search result');
  assert.ok(card.body.includes('Resultado #3'), 'play3 is identified compactly');
  assert.ok(card.buttons[0].id.endsWith('| 320k'), 'play3 keeps high-quality audio');
  assert.ok(card.buttons[1].id.includes('| mp4 | 1080 | 5:43'), 'play3 keeps high-quality video');
  assert.ok(!/toxic|ataque/i.test(card.body), 'play3 and play share the clean card style');

  buttonsEnabled = false;
  r = await run('play');
  const fallback = r.sent.find(x => x.payload?.text)?.payload.text || '';
  assert.ok(fallback.includes('!ytd https://youtu.be/AAAAAAAAAAA | 128k'), 'text fallback retains direct audio command');
  assert.ok(fallback.includes('!gyt https://youtu.be/AAAAAAAAAAA | mp4 | 480 | 3:21'), 'text fallback retains video command');

  console.log('PLAY CARD: compact style, results 1/2/3, direct audio/video buttons and fallback passed.');
})().catch(error => {
  console.error('PLAY CARD: FAIL:', error.message);
  process.exitCode = 1;
}).finally(() => {
  Module.prototype.require = originalRequire;
});
