#!/usr/bin/env node
/**
 * Teste: RPG GATE TOTAL (v7.97) 🌑
 *  • gate.modoAberto: PV aberto · comunidade aberta · grupo normal só com
 *    modorpg on · I/O morto = falha aberta
 *  • menus/submenus RPG FECHADOS devolvem a dica (#) e não abrem
 *  • fila "RPG & AVENTURA" do menu principal esconde onde o mundo dorme
 *  • !modorpg on/off sai com o CHANGE rico e único (portal DARK VILLE)
 *  • auditoria: zero comandos RPG duplicados no registo de cases
 */
'use strict';

process.env.MONGODB_URI = '';

const assert = require('assert');
const fs4 = require('fs');
const path4 = require('path');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;
let _gs = null;            // GroupSettings do grupo (hotCache)
let _comunidade = false;   // é grupo da comunidade?
let _render = null;        // captura do renderBlock
let _gsUpdates = [];
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('/hotCache') || s.endsWith('hotCache')) {
    return { getGroupSettings: async () => _gs, forgetGroup: () => {} };
  }
  if (s.endsWith('/rpg/community') || s.endsWith('bot/rpg/community') || s === './community') {
    return { loadState: async () => ({}), isCommunityGroup: () => _comunidade };
  }
  if (s.endsWith('GroupSettings')) {
    return {
      findOne: () => ({ lean: async () => _gs }),
      findOneAndUpdate: async (q, u) => { _gsUpdates.push([q, u]); return {}; },
      find: () => ({ lean: async () => [] }),
    };
  }
  if (s.endsWith('/renderEngine') || s.endsWith('renderEngine')) {
    const real = _orig.apply(this, arguments);
    return {
      ...real,
      renderSubmenu: (t, title, items) => { _render = { title: 'SUBMENU:' + title, lines: (items || []).map(i => i.name) }; return 'SUBMENU:' + title; },
      renderBlock: (t, title, lines) => { _render = { title, lines }; return [title, ...(lines || [])].join('\n'); },
    };
  }
  return _orig.apply(this, arguments);
};

const gate = require('../src/bot/rpg/gate');

const sent = [];
const sockF = {
  sendMessage: async (j, c) => { sent.push(c); return { key: { id: 'k' } }; },
  relayMessage: async () => ({}),
};
const CTX = (extra = {}) => ({ remoteJid: 'GRP@g.us', senderNumber: '2449', pushName: 'Dark', isGroup: true, prefix: '!', isOwner: true, ...extra });

(async () => {
  console.log('=== RPG GATE TOTAL (v7.97) ===');

  // ── 1. modoAberto ───────────────────────────────────────────
  _gs = null; _comunidade = false;
  assert.strictEqual(await gate.modoAberto(CTX({ isGroup: false })), true, 'PV sempre aberto');
  assert.strictEqual(await gate.modoAberto(CTX()), false, 'grupo sem modorpg fechado');
  _gs = { modorpg: true };
  assert.strictEqual(await gate.modoAberto(CTX()), true, 'grupo com modorpg aberto');
  _gs = null; _comunidade = true;
  assert.strictEqual(await gate.modoAberto(CTX()), true, 'comunidade DARK VILLE sempre aberta');
  _comunidade = false;
  assert.strictEqual(await gate.verificar('lutar', { isGroup: false, senderNumber: '1' }), null, 'PV: jogo livre (sem char the MSG_CHAR não — verificar pergunta char)'.length > 0);
  console.log('✔ modoAberto: PV/comunidade/grupo/falha-aberta');

  // ── 2. submenuRPG fechado → devolve MSG_MODO ────────────────
  let reg = {};
  const regFn = (nomes, fn) => { for (const n of [].concat(nomes)) reg[n] = fn; };
  require('../src/bot/cases/dynamicSubmenus')(regFn);
  sent.length = 0; _gs = null; _comunidade = false;
  await reg.submenuRPG({ sock: sockF, msg: { key: { id: 'm1' } }, ctx: CTX(), config: { bot: { name: "DARK BOT" } } });
  assert.ok(sent.some(c => /mundo RPG está fechado/i.test(c.text || '')), 'submenuRPG fechado → MSG_MODO');
  assert.ok(!/economia/i.test(JSON.stringify(sent).slice(0, 400)), 'não abriu o submenu');
  sent.length = 0; _gs = { modorpg: true };
  _render = null;
  await reg.submenuRPG({ sock: sockF, msg: { key: { id: 'm2' } }, ctx: CTX(), config: { bot: { name: "DARK BOT" } } });
  assert.ok(!sent.some(c => /mundo RPG está fechado/i.test(c.text || '')), 'submenuRPG aberto → sem MSG_MODO');
  console.log('✔ submenuRPG respeita o gate');

  // menurpg (rpgCommunity) idem
  reg = {}; require('../src/bot/cases/rpgCommunity')(regFn);
  sent.length = 0; _gs = null;
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm3' } }, ctx: CTX(), prefix: '!' });
  assert.ok(sent.some(c => /mundo RPG está fechado/i.test(c.text || '')), 'menurpg fechado → MSG_MODO');
  sent.length = 0; _gs = { modorpg: true };
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm4' } }, ctx: CTX(), prefix: '!' });
  assert.ok(sent.some(c => /MENU RPG/.test(c.text || '')), 'menurpg aberto → menu abre');
  console.log('✔ menurpg respeita o gate');

  // ── 3. menu principal esconde a fila RPG quando dorme ───────
  const nat = fs4.readFileSync(path4.join(__dirname, '..', 'src', 'bot', 'nativeCommands.js'), 'utf8');
  assert.ok(/modoAberto\(\{ \.\.\.ctx, _msg: msg \}\)/.test(nat), 'menu lê o gate');
  assert.ok(/category === 'rpg' && !_rpgAberto\) return false/.test(nat), 'fila RPG fica fora quando fechado');
  assert.ok(/submenuRPG/.test(nat), 'fila continua apontando ao submenuRPG');
  console.log('✔ fila "RPG & AVENTURA" só existe com o mundo ligado');

  // ── 4. !modorpg agora sai com o CHANGE rico e único ─────────
  reg = {};
  require('../src/bot/cases/audioAdmin2')(regFn);
  sent.length = 0; _render = null; _gsUpdates.length = 0;
  await reg.modorpg({ sock: sockF, msg: { key: { id: 'm5' } }, ctx: CTX(), args: ['on'], isOwner: true, isAdminFn: async () => true });
  const bodyOn = _render ? [_render.title, ..._render.lines].join('\n') : JSON.stringify(sent);
  assert.ok(/DARK VILLE — MUNDO LIGADO/.test(bodyOn), 'CHANGE ON tem o título do portal');
  assert.ok(/portal abriu-se com trovões de obsidiana/.test(bodyOn), 'narrativa rica (trovões)');
  assert.ok(/rpgstart — cria o teu herói/.test(bodyOn) && /menurpg — o livro do mundo/.test(bodyOn), 'aponta os primeiros passos');
  assert.ok(!/Usa !modorpg on\/off para alternar/.test(bodyOn), 'não cai no design genérico');
  assert.ok(_gsUpdates.some(([, u]) => u.modorpg === true), 'BD ficou ON');
  sent.length = 0; _render = null;
  await reg.modorpg({ sock: sockF, msg: { key: { id: 'm6' } }, ctx: CTX(), args: ['off'], isOwner: true, isAdminFn: async () => true });
  const bodyOff = _render ? [_render.title, ..._render.lines].join('\n') : JSON.stringify(sent);
  assert.ok(/MUNDO ADORMECEU/.test(bodyOff), 'CHANGE OFF próprio (adormeceu)');
  assert.ok(/fichas ficam guardadas/.test(bodyOff), 'OFF lembra que nada se perde');
  console.log('✔ modorpg: CHANGE rico (ON justo ao contrário do genérico)');

  // ── 5. auditoria — zero comandos RPG duplicados ─────────────
  const ch = require('../src/bot/caseHandler');
  ch.init();
  const reg2 = ch.COMMAND_REGISTRY || new Map();
  const porNome = new Map();
  for (const [c, meta] of reg2.entries()) {
    const f = meta && meta.file;
    if (!porNome.has(c)) porNome.set(c, new Set());
    if (f) porNome.get(c).add(f);
  }
  // nomes de superfície RPG: cases listados no gate + menus RPG
  const superficie = [...gate.RPG_CMDS].concat(['submenurpg', 'menurpg2']).map(s => s.toLowerCase());
  const dupRpg = [...porNome.entries()]
    .filter(([c, s]) => s.size > 1 && superficie.includes(c))
    .map(([c, s]) => `${c}(${[...s].join('|')})`);
  assert.strictEqual(dupRpg.length, 0, 'comandos RPG duplicados: ' + dupRpg.join(','));
  // superfícies menurpg/submenuRPG: cada uma registada só uma vez
  assert.ok(ch.CASES.has('menurpg'), 'menurpg existe');
  assert.ok(ch.CASES.has('submenurpg'), 'submenuRPG existe (lowercase)');
  assert.ok(ch.CASES.size > 1500, 'registo intacto (' + ch.CASES.size + ')');
  console.log('✔ zero comandos RPG duplicados (' + ch.CASES.size + ' cases, registo limpo)');

  // ── 6. ganchos no código-fonte ──────────────────────────────
  const g = fs4.readFileSync(path4.join(__dirname, '..', 'src', 'bot', 'rpg', 'gate.js'), 'utf8');
  assert.ok(/async function modoAberto/.test(g) && /modoAberto/.test(g.split('module.exports')[1]), 'modoAberto exportado');
  const a = fs4.readFileSync(path4.join(__dirname, '..', 'src', 'bot', 'cases', 'audioAdmin2.js'), 'utf8');
  assert.ok(/cmd === 'modorpg'/.test(a) && /DARK VILLE — MUNDO LIGADO/.test(a), 'CHANGE rico no toggle');
  const dy = fs4.readFileSync(path4.join(__dirname, '..', 'src', 'bot', 'cases', 'dynamicSubmenus.js'), 'utf8');
  assert.ok(/gateR\.modoAberto/.test(dy), 'submenuRPG gated');
  const rc = fs4.readFileSync(path4.join(__dirname, '..', 'src', 'bot', 'cases', 'rpgCommunity.js'), 'utf8');
  assert.ok(/gateR\.modoAberto/.test(rc), 'menurpg gated');
  console.log('✔ ganchos presentes');

  console.log('\nOK / test-arpggate — tudo passou (v7.97)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
