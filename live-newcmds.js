#!/usr/bin/env node
/** Live-test v7.55: statusvideo (ffmpeg real) + setpremium (User fake). */
'use strict';
process.env.PATH = '/home/user/bin:' + process.env.PATH;
const Module = require('module');
const orig = Module.prototype.require;
// Fake User em memória
const fakeUsers = { '999888777': { whatsappNumber: '999888777', role: 'free', premiumUntil: null, save: async function () { this._saved = true; return this; } } };
Module.prototype.require = function (id) {
  if (String(id).endsWith('database/models/User')) return { findOne: async ({ whatsappNumber }) => fakeUsers[whatsappNumber] || null };
  return orig.apply(this, arguments);
};
const { execFileSync } = require('child_process');
const fs = require('fs');

(async () => {
  const collected = new Map();
  const RC = (n, f) => n.forEach(x => collected.set(x, f));
  require('./src/bot/cases/downloads2.js')(RC);
  require('./src/bot/cases/premium.js')(RC);

  // 1. statusvideo com mp4 real de 40s (deve sair ≤30s)
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc=duration=40:size=320x240:rate=10', '-pix_fmt', 'yuv420p', '/tmp/stv-in.mp4'], { stdio: 'ignore' });
  const inBuf = fs.readFileSync('/tmp/stv-in.mp4');
  let sent = null;
  const sock = { sendMessage: async (j, c) => { sent = c.video; return {}; } };
  // simula msg própria com vídeo: downloadFromMessage precisa de objeto real... usa URL? Não — injeta via quoted falso:
  // caminho mais simples: chama o handler com quoted nulo e msg sem vídeo mas URL do zoo (testa pipeline URL→corte)
  let got = '';
  const t0 = Date.now();
  await collected.get('statusvideo')({ sock, msg: { message: {} }, quoted: null, ctx: { remoteJid: 'x' }, args: ['https://www.youtube.com/watch?v=jNQXAC9IVRw'], prefix: '!', reply: async t => { got = t; } });
  if (sent?.length > 4096 && sent.toString('ascii', 4, 8) === 'ftyp') {
    fs.writeFileSync('/tmp/stv-out.mp4', sent);
    let dur = '?';
    try { execFileSync('ffmpeg', ['-i', '/tmp/stv-out.mp4'], { stdio: 'pipe' }); }
    catch (e) { const m = String(e.stderr || '').match(/Duration: (\S+)/); if (m) dur = m[1]; }
    console.log(`✅ statusvideo URL→corte: ${(sent.length / 1024).toFixed(0)}KB MP4, duração ${dur}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } else console.log('❌ statusvideo:', got.slice(0, 120));

  // 2. setpremium com User fake
  got = '';
  await collected.get('setpremium')({ m: { reply: async t => { got = t; } }, args: ['999888777', '15'], isOwner: true });
  const u = fakeUsers['999888777'];
  console.log(u.role === 'premium' && u._saved && u.premiumUntil > new Date() ? `✅ setpremium: role=${u.role} 15d (${got.slice(0, 40)}…)` : `❌ setpremium: ${got.slice(0, 100)}`);
  got = '';
  await collected.get('setpremium')({ m: { reply: async t => { got = t; } }, args: ['000000000'], isOwner: true });
  console.log(/não encontrado/i.test(got) ? '✅ setpremium: desconhecido avisa' : `❌ setpremium: ${got.slice(0, 80)}`);
  console.log('LIVE-NEWCMDS-DONE');
})();
