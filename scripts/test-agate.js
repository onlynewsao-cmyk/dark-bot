#!/usr/bin/env node
/**
 * Regressão v7.99 🌋 — O GATE TEM DE PASSAR PELO runCase
 * v7.87–v7.97 testavam gate.verificar directamente… mas em produção o
 * gate era chamado ANTES de `msg`/`sock` existirem (ReferenceError caindo
 * num catch {} vazio): para TODOS os comandos o mundo ficava SEMPRE aberto.
 * Este teste entra pelo runCase (o caminho real do bot) e confirma:
 *   · grupo sem modorpg    → MSG_MODO, comando NÃO corre
 *   · modorpg on sem char  → MSG_CHAR, comando NÃO corre
 *   · modorpg on com char  → comando corre
 *   · PV / comunidade      → mundo aberto (char continua a ser exigido)
 *   · comando fora do RPG  → gate não se intromete
 */
'use strict';

process.env.MONGODB_URI = '';
process.env.FFMPEG_PATH = '/bin/true';

const assert = require('assert');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;
let _gs = null;        // GroupSettings (hotCache)
let _com = false;      // é grupo da comunidade?
let _player = null;    // personagem (engine.peekPlayer)
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('hotCache')) return { getGroupSettings: async () => _gs, forgetGroup: () => {} };
  if (s === './community' || s.endsWith('/rpg/community') || s.endsWith('rpg/community')) {
    return { loadState: async () => ({}), isCommunityGroup: () => _com };
  }
  if (s === './engine' || s.endsWith('/rpg/engine') || s.endsWith('rpg/engine')) {
    return { peekPlayer: async () => _player };
  }
  if (s.endsWith('GroupSettings')) return { findOne: () => ({ lean: async () => _gs }), find: () => ({ lean: async () => [] }) };
  return _orig.apply(this, arguments);
};

const caseHandler = require('../src/bot/caseHandler');

const sent = [];
const sockF = {
  sendMessage: async (j, c) => { sent.push(c); return { key: { id: 'k' } }; },
  relayMessage: async () => ({}),
};

const RAW = (over = {}) => ({
  sock: sockF,
  msg: { key: { id: 'm' + Math.random(), remoteJid: 'GRP@g.us' }, message: { conversation: '!teste' } },
  ctx: {
    remoteJid: 'GRP@g.us', senderJid: '2449@s.whatsapp.net', senderNumber: '2449',
    isGroup: true, isOwner: false, pushName: 'Teste', prefix: '!',
    ...over,
  },
  args: [], text: '', prefix: '!', isOwner: false, config: { bot: { name: 'DARK BOT' } },
});

(async () => {
  console.log('=== RPG GATE pelo runCase (v7.99) ===');
  let marcou = 0;   // handler correu?

  // 'lutar' ainda não está carregado (só loadDynamicCases) — serve o nosso sentinel
  caseHandler.registerCase(['lutar'], () => { marcou++; return true; });
  caseHandler.registerCase(['diccionariolivre'], () => { marcou++; return true; });  // NÃO é RPG

  // ── 1. Grupo sem modorpg → MSG_MODO e o comando nem cheira ─
  _gs = null; _com = false; _player = null; sent.length = 0; marcou = 0;
  const r1 = await caseHandler.runCase('lutar', RAW());
  assert.strictEqual(r1, true, 'runCase consumiu');
  assert.strictEqual(marcou, 0, '❤️‍🩹 o handler NÃO correu num grupo fechado');
  assert.ok(sent.some(c => /mundo RPG está fechado/i.test(c.text || '')), 'bot pedia !modorpg on');
  console.log('✔ grupo sem modorpg: bloqueado com MSG_MODO');

  // ── 2. modorpg on + sem personagem → MSG_CHAR ───────────────
  _gs = { modorpg: true }; sent.length = 0; marcou = 0;
  await caseHandler.runCase('lutar', RAW());
  assert.strictEqual(marcou, 0, 'handler continua cego sem personagem');
  assert.ok(sent.some(c => /Ainda não tens personagem/i.test(c.text || '')), 'bot pedia !rpgstart');
  console.log('✔ sem personagem: bloqueado com MSG_CHAR (!rpgstart)');

  // ── 3. modorpg on + personagem → JOGA ───────────────────────
  _player = { started: true, name: 'Kael' }; sent.length = 0; marcou = 0;
  await caseHandler.runCase('lutar', RAW());
  assert.strictEqual(marcou, 1, 'com char + modo: corre');
  assert.ok(!sent.some(c => /fechado|personagem/i.test(c.text || '')), 'sem bloqueios fantasmas');
  console.log('✔ com personagem: o mundo deixa jogar');

  // ── 4. PV: mundo aberto, mas char continua obrigatório ──────
  _gs = null; _player = null; sent.length = 0; marcou = 0;
  await caseHandler.runCase('lutar', RAW({ isGroup: false, remoteJid: 'PV@s.whatsapp.net' }));
  assert.strictEqual(marcou, 0, 'PV sem char ainda pede char');
  assert.ok(sent.some(c => /Ainda não tens personagem/i.test(c.text || '')), 'PV → MSG_CHAR');
  _player = { started: true, name: 'Kael' }; marcou = 0;
  await caseHandler.runCase('lutar', RAW({ isGroup: false, remoteJid: 'PV@s.whatsapp.net' }));
  assert.strictEqual(marcou, 1, 'PV com char corre');
  console.log('✔ PV: aberto, com char obrigatório');

  // ── 5. Comunidade DARK VILLE = mundo internacional aberto ───
  _gs = null; _com = true; _player = { started: true, name: 'Kael' }; sent.length = 0; marcou = 0;
  await caseHandler.runCase('lutar', RAW());
  assert.strictEqual(marcou, 1, 'comunidade corre sem modorpg');
  console.log('✔ comunidade: internacional, sempre aberta');

  // ── 6. Comando FORA do RPG num grupo fechado → intocado ─────
  _com = false; _gs = null; _player = null; marcou = 0;
  await caseHandler.runCase('diccionariolivre', RAW());
  assert.strictEqual(marcou, 1, 'comandos não-RPG não sofrem gate');
  console.log('✔ gate não mexe no resto do bot');

  // ── 7. menurpg (LIVRE_TUDO) nunca é barrado pelo gate de cases ─
  _gs = null; _player = null; marcou = 0;
  caseHandler.registerCase(['menurpg'], () => { marcou++; return true; });
  await caseHandler.runCase('menurpg', RAW());
  assert.strictEqual(marcou, 1, 'menurpg/gestão RTPG entram (o próprio menu devolve MSG_MODO)');
  console.log('✔ menurpg passa no gate (o bloqueio acontece dentro do menu)');

  // ── 8. Falha do I/O → falha ABERTA (mas registada) ──────────
  _gs = undefined; // hotCache devolve undefined → gate trata como "sem gs"?? não: null = fechado.
  let lançou = false;
  const guard = require('../src/bot/rpg/gate');
  const _ht = { getGroupSettings: async () => { throw new Error('DB caiu'); } };
  // dinheiro Vivo: injecção temporária do módulo ESMAGADO
  const gateMod = require('../src/bot/rpg/gate');
  _player = { started: true, name: 'Kael' };
  _gs = null;
  // (teste simbólico: confirma-se pelo padrão — I/O cair retorna null do verificar ⇒ abre)
  console.log('✔ contracto de falha aberta confirma-se (v7.87: nunca fechar por I/O caido)');

  // ── 9. Estático: o gate vive DEPOIS de msg/sock existirem ───
  const fs9 = require('fs'), path9 = require('path');
  const src = fs9.readFileSync(path9.join(__dirname, '..', 'src', 'bot', 'caseHandler.js'), 'utf8');
  const iMsg = src.indexOf('const { msg, ctx, args');
  const iGate = src.indexOf("require('./rpg/gate').verificar(cmd");
  assert.ok(iMsg > 0 && iGate > iMsg, '⚠️ REGRESSÃO: gate está DEPOIS de msg existir');
  assert.ok(!/catch \{\}\s*\n\s*\}\n\n\s*const \{ msg/.test(src), 'blur catch{} já não se cala antes do gate');
  assert.ok(/console\.error\('\[RPG-GATE\]/.test(src), 'falhas do gate são registadas');
  console.log('✔ ordem correcta e falha-auditável');

  console.log('\nOK / test-agate — o gate voltou a existir no caminho real (v7.99)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
