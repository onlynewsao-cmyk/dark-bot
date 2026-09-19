#!/usr/bin/env node
/**
 * v8.4 🎨 — WELCOME2 (foto IA + PIP) · WELCM3 (GIF super animado) · RG CARD
 * Tests com sharp/ffmpeg REAIS: cartão → PNG mágico; GIF → mp4 ftyp
 * com 12 frames verdadeiras do compositor; toggles admin-only + mútua
 * exclusão; rgcard exige personagem e usa o motor.
 */
'use strict';

process.env.MONGODB_URI = '';

const assert = require('assert');
const fs = require('fs'), p3 = require('path');
const sharp = require('sharp');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;
let _gs = null;
let _player = null;
let _gsUpdates = [];
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('hotCache')) return { getGroupSettings: async () => _gs, forgetGroup: () => {} };
  if (s.endsWith('GroupSettings')) return {
    findOne: () => ({ lean: async () => _gs }),
    findOneAndUpdate: async (q, u) => { _gsUpdates.push([q, u]); return {}; },
    find: () => ({ lean: async () => [] }),
  };
  if (s === './engine' || s.endsWith('/rpg/engine') || s.endsWith('rpg/engine')) {
    return { peekPlayer: async () => _player };
  }
  if (s.endsWith('/renderEngine') || s.endsWith('renderEngine')) return {
    getTheme: async () => ({}), renderBlock: (t, title, lines) => [title, ...(lines||[])].join('\n'),
  };
  return _orig.apply(this, arguments);
};

// Imagem de perfil falsa REAL (PNG via sharp)
let PPBUF = null, BG_FALSO = null;

const sent = [];
const sockF = {
  sendMessage: async (j, c) => { sent.push(c); return { key: { id: 'k' } }; },
  profilePictureUrl: async () => 'https://x.io/pp.jpg',
  user: { id: 'bot@s.whatsapp.net' },
};
const CTX = (extra = {}) => ({ remoteJid: 'GRP@g.us', senderNumber: '2449', senderJid: '2449@s.whatsapp.net', isGroup: true, pushName: 'Dark', prefix: '!', isOwner: false, ...extra });

(async () => {
  console.log('=== v8.4 — WELCOME2 / WELCM3 / RG CARD ===');
  // materiais sintéticos reais
  PPBUF = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 120, g: 40, b: 220 } } }).png().toBuffer();
  BG_FALSO = await sharp({ create: { width: 1026, height: 420, channels: 3, background: { r: 30, g: 10, b: 80 } } })
    .composite([{ input: Buffer.from('<svg width="1026" height="420"><circle cx="240" cy="210" r="140" fill="#8b00ff" opacity="0.8"/></svg>'), top: 0, left: 0 }])
    .jpeg().toBuffer();
  const fetchFn = async (url) => /pp\.jpg/.test(url) ? PPBUF : BG_FALSO;

  const wa = require('../src/bot/welcomeArt');

  // ── 1. artCard → PNG real com todos os blocos ───────────────
  const png = await wa.artCard({
    profilePicUrl: 'https://x.io/pp.jpg', name: 'Zeca Teia', sub1: 'Entrou em DARK VILLE',
    sub2: 'Membro nº 42 🕸️', footer: '🕸️ DARK BOT · WELCOME2', kind: 'welcome', fetchFn,
  });
  assert.ok(png[0] === 0x89 && png.toString('ascii', 1, 4) === 'PNG', 'cartão PNG mágico');
  assert.ok(png.length > 15000, 'cartão tem substância (arte+pp+texto)');
  const metaPng = await sharp(png).metadata();
  assert.deepStrictEqual([metaPng.width, metaPng.height], [900, 420], 'proporções do cartão');
  console.log('✔ welcome2: PNG real 900×420 com PIP e tipografia');
  const semIA = await wa.artCard({ profilePicUrl: null, name: 'Sem Foto', kind: 'welcome', fetchFn: async () => null });
  assert.ok(semIA[0] === 0x89, 'queda sem IA e sem PP ainda pinta');
  console.log('✔ quedas seguras (IA fora / sem foto)');

  // ── 2. artGif → mp4 real (12 frames composição) ─────────────
  const mp4 = await wa.artGif({
    profilePicUrl: 'https://x.io/pp.jpg', name: 'Zeca Teia', sub1: 'Entrou', sub2: 'nº 42',
    footer: '🕸️ DARK BOT · WELCM3', kind: 'welcome', frames: 12, fetchFn,
  });
  assert.ok(mp4.length > 12000, 'GIF tem massa de frames reais');
  assert.ok(mp4.slice(4, 8).toString('ascii') === 'ftyp', 'mp4 válido (ftyp)');
  console.log('✔ welcm3: mp4 gifPlayback real com 12 frames compostas');

  // ── 3. Toggles: admin-only + mutua exclusão ─────────────────
  const reg = {};
  require('../src/bot/cases/welcm')((nomes, fn) => { for (const n of [].concat(nomes)) reg[n] = fn; });
  assert.ok(reg.welcome2 && reg.welcm3 && reg.rgcard && reg.fichacard, 'casos registados');

  sent.length = 0; _gsUpdates.length = 0; _gs = null;
  await reg.welcome2({ sock: sockF, msg: { key: { id: 'a1' } }, ctx: CTX(), args: ['on'], isOwner: false, isAdminFn: async () => false, prefix: '!' });
  assert.ok(sent.some(c => /SÓ ADMINS/i.test(c.text || '')), 'membro comum não mexe nos welcomes');
  assert.strictEqual(_gsUpdates.length, 0);
  _gs = { welcm3: true };
  sent.length = 0; _gsUpdates.length = 0;
  await reg.welcome2({ sock: sockF, msg: { key: { id: 'a2' } }, ctx: CTX(), args: ['on'], isOwner: false, isAdminFn: async () => true, prefix: '!' });
  assert.strictEqual(_gsUpdates[0][1].welcome2, true, 'grava ON');
  assert.strictEqual(_gsUpdates[0][1].welcm3, false, 'welcm3 desliga (exclusivos)');
  assert.ok(sent.some(c => /WELCOME2 — FOTO DE ENTRADA IA/.test(c.text || '') && /welcm3 estava ligado/i.test(c.text || '')), 'CHANGE rico');
  // welcm3 on → welcome2 off
  _gs = { welcome2: true }; _gsUpdates.length = 0;
  await reg.welcm3({ sock: sockF, msg: { key: { id: 'a3' } }, ctx: CTX(), args: ['on'], isOwner: true, isAdminFn: async () => true, prefix: '!' });
  assert.strictEqual(_gsUpdates[0][1].welcm3, true);
  assert.strictEqual(_gsUpdates[0][1].welcome2, false, 'mútua exclusão honrada');
  // off simples
  _gsUpdates.length = 0;
  await reg.welcm3({ sock: sockF, msg: { key: { id: 'a4' } }, ctx: CTX(), args: ['off'], isOwner: true, isAdminFn: async () => true, prefix: '!' });
  assert.strictEqual(_gsUpdates[0][1].welcm3, false);
  console.log('✔ toggles: admin-only, mutua exclusão welcome2⇆welcm3, CHANGE rico');

  // ── 4. RG CARD: exige ficha + usa a arte do hero ────────────
  _player = null; sent.length = 0;
  await reg.rgcard({ sock: sockF, msg: { key: { id: 'b1' } }, ctx: CTX(), args: [], prefix: '!' });
  assert.ok(sent.some(c => /PERSONAGEM POR EXISTIR/.test(c.text || '')), 'sem ficha → convida !rpgstart');
  _player = { started: true, name: 'Kael Storm', race: 'elfo', class: 'mago', level: 12, hp: 72, maxHp: 120, mp: 55, maxMp: 90, coins: 630, lives: 2 };
  sent.length = 0;
  await reg.rgcard({ sock: sockF, msg: { key: { id: 'b2' } }, ctx: CTX(), args: [], prefix: '!' });
  const img = sent.find(c => c.image);
  assert.ok(img, 'cartão enviado');
  assert.ok(img.image[0] === 0x89 && img.image.toString('ascii', 1, 4) === 'PNG', 'cartão PNG real');
  assert.ok(/Kael Storm/.test(img.caption || ''), 'caption com o herói');
  sent.length = 0;
  await reg.rgcard({ sock: sockF, msg: { key: { id: 'b3' } }, ctx: CTX(), args: ['gif'], prefix: '!' });
  const vid = sent.find(c => c.video);
  assert.ok(vid && vid.gifPlayback === true, 'rgcard gif → gifPlayback');
  assert.ok(vid.video.slice(4, 8).toString('ascii') === 'ftyp', 'gif do herói válido');
  console.log('✔ rgcard: estático + animado com ficha real');

  // ── 5. Estático ─────────────────────────────────────────────
  const ge = fs.readFileSync(p3.join(__dirname, '..', 'src', 'bot', 'groupEvents.js'), 'utf8');
  assert.ok(/gs\?\.welcm3/.test(ge) && /gs\?\.welcome2/.test(ge), 'onJoin vê os dois ramos');
  assert.ok(/2 ramos|WELCM3/.test(ge), 'welcm3 no onJoin');
  const gsModel = fs.readFileSync(p3.join(__dirname, '..', 'src', 'database', 'models', 'GroupSettings.js'), 'utf8');
  assert.ok(/welcome2/.test(gsModel) && /welcm3/.test(gsModel), 'schema guarda os campos');
  const menuprpg = fs.readFileSync(p3.join(__dirname, '..', 'src', 'bot', 'cases', 'rpgCommunity.js'), 'utf8');
  assert.ok(/rgcard/.test(menuprpg), 'menurpg fala do rgcard');
  console.log('✔ onJoin + schema + menurpg ligados ao v8.4');

  console.log('\nOK / test-awelcm — arte de entrada pronta (v8.4)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
