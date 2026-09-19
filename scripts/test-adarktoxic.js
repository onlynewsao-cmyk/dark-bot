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

  // ── 2. Cartão DARKTOXIC — v9.15: SUPER-curto, abre em qualquer cliente ───
  const dt = pc.buildPrefixCard({ prefix: '!', custom: true, tema: 'darktoxic' });
  assert.ok(dt.text.split('\n').length <= 4, `cartão curto (${dt.text.split('\n').length} linhas)`);
  assert.ok(/☣️/.test(dt.text) && /☠️/.test(dt.text), 'vinhas tóxicas + crânio');
  assert.ok(/^☣️◢◤[\s\S]*☣️◤◢/.test(dt.text), 'fadigas de abertura e fecho');
  assert.ok(/Prefixo: \*!\*/.test(dt.text), 'prefixo visível');
  assert.ok(/grupo ☢️/.test(dt.text), 'estado custom = selo de grupo');
  assert.ok(/\nDARK BOT 🕸️\s*$/.test(dt.text), 'assinatura no fim do cartão');
  assert.strictEqual(dt.copyCode, '!', 'copyCode = prefixo puro');
  assert.ok(/segura e copia 『 ! 』/.test(dt.displayText), 'rótulo do toque');
  const dt2 = pc.buildPrefixCard({ prefix: '.', tema: 'darktoxic' });
  assert.strictEqual(dt2.copyCode, '.');
  assert.ok(!/grupo/.test(dt2.text), 'sem selo de grupo quando é default');
  console.log('✔ cartão DARKTOXIC curto (≤4 linhas) — compatível com tudo');

  // ── 3. Cartão CLÁSSICO intacto (curto também) ────
  const cl = pc.buildPrefixCard({ prefix: '!', tema: 'classico' });
  assert.ok(/┏⍟ 『 PREFIXO 』 ⍟┓/.test(cl.text), 'frame curto');
  assert.ok(/Actual: \*!\*/.test(cl.text), 'prefixo em linha própria');
  assert.ok(cl.text.split('\n').length <= 4, 'clássico também ≤4 linhas');
  console.log('✔ clássico preservado (versão curta)');

  // ── 4. sendPrefixCard lê o tema activo e envia TEXTO PURO ──
  const mkSock = () => { const sk = { _s: [], sendMessage: async (j, o) => { sk._s.push({ j, o }); return { key: {} }; } }; return sk; };
  _copia.length = 0;
  const sk1 = mkSock();
  await pc.sendPrefixCard(sk1, 'J@g.us', { prefix: '!', custom: false });
  assert.strictEqual(_copia.length, 0, 'zero botão cta_copy — texto simples');
  assert.strictEqual(sk1._s.length, 1, 'um envio de texto');
  assert.ok(/^☣️◢◤/.test(sk1._s[0].o.text) && !sk1._s[0].o.interactiveMessage, 'cartão activo = darktoxic em texto puro');
  const sk1b = mkSock();
  await pc.sendPrefixCard(sk1b, 'J@g.us', { prefix: '!', custom: false }, { key: { id: 'q' } });
  assert.ok(sk1b._s[0].o.text.includes('DARK BOT 🕸️'), 'assinatura da casa presente');
  _cfg.prefix_theme = 'classico'; _copia.length = 0;
  const sk2 = mkSock();
  await pc.sendPrefixCard(sk2, 'J@g.us', { prefix: '!', custom: false });
  assert.ok(/┏⍟/.test(sk2._s[0].o.text), 'troca para classico funciona');
  console.log('✔ leitura do tema + envio 100% texto (viewOnce/botões fora)');

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
  assert.ok(replies.some(t => /TEMAS DO CARTÃO DE PREFIXO/.test(t) && /classico/.test(t)), 'lista mostra o tema activo');
  // troca para darktoxic → guarda + manda o cartão no novo tema
  const sk3 = { _s: [], sendMessage: async (j, o) => { sk3._s.push({ j, o }); return { key: {} }; } };
  _copia.length = 0; _cfg.prefix_theme = 'classico'; replies.length = 0;
  await reg.prefixotema({ sock: sk3, msg: {}, ctx: { remoteJid: 'G@g.us', isGroup: true, senderNumber: '1' }, prefix: '!', args: ['darktoxic'], isOwner: true, reply: async (t) => { replies.push(t); } });
  assert.strictEqual(_cfg.prefix_theme, 'darktoxic', 'config guardada');
  assert.ok(/☣️◢◤/.test(sk3._s.map((x) => x.o.text).join('\n')), 'preview imediato no novo tema (texto puro)');
  // tema desconhecido → educado
  replies.length = 0;
  await reg.prefixotema({ sock: {}, msg: {}, ctx: { remoteJid: 'G@g.us', isGroup: true, senderNumber: '1' }, prefix: '!', args: ['neonzebra'], isOwner: true, reply: async (t) => { replies.push(t); } });
  assert.ok(replies.some(t => /Tema desconhecido/.test(t) && /darktoxic/.test(t)), 'refusal elegante');
  console.log('✔ prefixotema: dono-only, lista com activo 🟢, troca com preview');

  // ── 6. Estático — v9.15 inverte o contrato ─────────
  const fs2 = require('fs'), p2 = require('path');
  const src = fs2.readFileSync(p2.join(__dirname, '..', 'src', 'bot', 'prefixCard.js'), 'utf8');
  assert.ok(/darktoxic/.test(src), 'temas no módulo');
  assert.ok(!/sendCopyButton|viewOnce|native_flow|interactiveMessage/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')), 'zero botões/interactive no cartão — texto puro');
  assert.ok(Object.keys(pc.TEMAS).length >= 8, `temas do cartão: ${Object.keys(pc.TEMAS).length} (≥8)`);
  console.log('\nOK / test-adarktoxic — DARKTOXIC no ar (v8.5)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
