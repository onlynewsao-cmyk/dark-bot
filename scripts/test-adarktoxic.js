#!/usr/bin/env node
/**
 * v8.5 ☠️ — DARKTOXIC, o novo tema do cartão de prefixo
 *  • !prefixo e a palavra "prefixo" mostram o cartão no tema activo
 *    (darktoxic por defeito; !prefixotema classico troca; preview imediato)
 *  • botão de copiar intacto (displayText/copyCode)
 */
'use strict';

process.env.MONGODB_URI = '';

const assert = require('assert');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;
let _cfg = { prefix_theme: 'darktoxic' };
let _copia = [];
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('hotCache')) return { getGroupDoc: async () => null, getGroupSettings: async () => null, forgetGroup: () => {} };
  if (s.endsWith('botConfigCache')) return {
    get: async (k, d) => (k in _cfg ? _cfg[k] : d),
    set: async (k, v) => { _cfg[k] = v; }, clear: () => {}, refresh: async () => {}, getMany: async () => ({}), dump: () => ({}),
  };
  if (s.endsWith('/buttonHandler') || s.endsWith('buttonHandler')) {
    return { sendCopyButton: async (sock, jid, text, displayText, copyCode) => { _copia.push([text, displayText, copyCode]); return { ok: true }; } };
  }
  return _orig.apply(this, arguments);
};

const pc = require('../src/bot/prefixCard');

(async () => {
  console.log('=== v8.5 — DARKTOXIC (tema do cartão de prefixo) ===');

  // ── 1. Dois temas existem; darktoxic é o defeito ────────────
  assert.ok(pc.TEMAS.darktoxic && pc.TEMAS.classico, '2 temas');
  assert.strictEqual(pc.temaActivo('nada'), pc.TEMAS.darktoxic);
  assert.strictEqual(pc.temaActivo('classico'), pc.TEMAS.classico);
  console.log('✔ registo de temas + defeito');

  // ── 2. Cartão DARKTOXIC — visual completo + cópia intacta ───
  const dt = pc.buildPrefixCard({ prefix: '!', custom: true, tema: 'darktoxic' });
  assert.ok(/DARKTOXIC/.test(dt.text), 'título do tema');
  assert.ok(/☣️/.test(dt.text) && /☠️/.test(dt.text), 'vinhas tóxicas + crânio');
  assert.ok(/🕸️〘/.test(dt.text), 'moldura aranha');
  assert.ok(/Prefixo actual: \*!\*/.test(dt.text), 'prefixo visível');
  assert.ok(/Customizado neste grupo/.test(dt.text), 'estado custom');
  assert.ok(/toca no botão abaixo para copiar/.test(dt.text), 'guia de cópia');
  assert.strictEqual(dt.copyCode, '!', 'copyCode = prefixo puro');
  assert.ok(/☢️ copiar prefixo 『 ! 』/.test(dt.displayText), 'rótulo do botão');
  const dt2 = pc.buildPrefixCard({ prefix: '.', tema: 'darktoxic' });
  assert.strictEqual(dt2.copyCode, '.');
  assert.ok(!/Customizado/.test(dt2.text), 'sem custom quando não é');
  console.log('✔ cartão DARKTOXIC completo + copiável');

  // ── 3. Cartão CLÁSSICO intacto (a herança v7.72) ────────────
  const cl = pc.buildPrefixCard({ prefix: '!', tema: 'classico' });
  assert.ok(/┏⍟ 『 PREFIXO DO BOT 』 =⍟/.test(cl.text), 'frame original');
  assert.ok(/clique no botão abaixo/.test(cl.test || cl.text), 'guia original');
  console.log('✔ clássico preservado');

  // ── 4. sendPrefixCard lê o tema activo e manda o botão ──────
  _copia.length = 0;
  await pc.sendPrefixCard({}, 'J@g.us', { prefix: '!', custom: false });
  assert.ok(_copia.length === 1, 'botão de copiar enviado');
  assert.ok(/DARKTOXIC/.test(_copia[0][0]), 'cartão activo = darktoxic');
  assert.strictEqual(_copia[0][2], '!', 'copyCode do activo');
  _cfg.prefix_theme = 'classico'; _copia.length = 0;
  await pc.sendPrefixCard({}, 'J@g.us', { prefix: '!', custom: false });
  assert.ok(/┏⍟/.test(_copia[0][0]), 'troca para classico funciona');
  console.log('✔ leitura do tema + botão cta_copy com a arte certa');

  // ── 5. !prefixotema (dono): lista, troca e preview ──────────
  const replies = [];
  const reg = {};
  require('../src/bot/cases/premium')((nomes, fn) => { for (const n of [].concat(nomes)) reg[n] = fn; });
  assert.ok(reg.prefixotema, 'comando registado');
  // não-dono
  await reg.prefixotema({ sock: {}, msg: {}, ctx: { remoteJid: 'G@g.us', isGroup: true, senderNumber: '1' }, prefix: '!', args: ['darktoxic'], isOwner: false, reply: async (t) => { replies.push(t); } });
  assert.ok(replies.some(t => /DONO SUPREMO/.test(t)), 'só o dono troca');
  // sem arg → lista com estado
  replies.length = 0;
  await reg.prefixotema({ sock: {}, msg: {}, ctx: { remoteJid: 'G@g.us', isGroup: true, senderNumber: '1' }, prefix: '!', args: [], isOwner: true, reply: async (t) => { replies.push(t); } });
  assert.ok(replies.some(t => /TEMAS DO CARTÃO DE PREFIXO/.test(t) && /🟢 classico/.test(t)), 'lista mostra o tema activo em 🟢');
  // troca para darktoxic → guarda + manda o cartão no novo tema
  _copia.length = 0; _cfg.prefix_theme = 'classico'; replies.length = 0;
  await reg.prefixotema({ sock: {}, msg: {}, ctx: { remoteJid: 'G@g.us', isGroup: true, senderNumber: '1' }, prefix: '!', args: ['darktoxic'], isOwner: true, reply: async (t) => { replies.push(t); } });
  assert.strictEqual(_cfg.prefix_theme, 'darktoxic', 'config guardada');
  assert.ok(_copia.length === 1 && /DARKTOXIC/.test(_copia[0][0]), 'preview imediato no novo tema');
  // tema desconhecido → educado
  replies.length = 0;
  await reg.prefixotema({ sock: {}, msg: {}, ctx: { remoteJid: 'G@g.us', isGroup: true, senderNumber: '1' }, prefix: '!', args: ['neonzebra'], isOwner: true, reply: async (t) => { replies.push(t); } });
  assert.ok(replies.some(t => /Tema desconhecido/.test(t) && /darktoxic/.test(t)), 'refusal elegante');
  console.log('✔ prefixotema: dono-only, lista com activo 🟢, troca com preview');

  // ── 6. Estático ─────────────────────────────────────────────
  const fs2 = require('fs'), p2 = require('path');
  const src = fs2.readFileSync(p2.join(__dirname, '..', 'src', 'bot', 'prefixCard.js'), 'utf8');
  assert.ok(/darktoxic/.test(src) && /classico/.test(src), 'temas no módulo');
  assert.ok(/sendCopyButton/.test(src), 'botão cta_copy mantém-se');
  console.log('✔ ganchos certos');

  console.log('\nOK / test-adarktoxic — DARKTOXIC no ar (v8.5)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
