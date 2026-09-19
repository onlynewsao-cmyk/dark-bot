#!/usr/bin/env node
/**
 * v8.01 📜 MENURPG — LISTA DE TEXTO DOS COMANDOS RPG
 * O menurpg é o LIVRO EM TEXTO: cartão vivo da personagem no topo +
 * lista completa por secções — SEM botões/interactivos (a versão
 * toque-para-correr vive na fila "RPG & AVENTURA" do menu principal).
 * Sem personagem: o PORTAL lidera; o jogo fica guardado.
 */
'use strict';

process.env.MONGODB_URI = '';

const assert = require('assert');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;
let _gs = null;
let _player = null;
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('hotCache')) return { getGroupSettings: async () => _gs, forgetGroup: () => {} };
  if (s === './community' || s.endsWith('/rpg/community') || s.endsWith('rpg/community')) {
    return { loadState: async () => ({}), isCommunityGroup: () => false };
  }
  if (s === './engine' || s.endsWith('/rpg/engine') || s.endsWith('rpg/engine')) {
    return { peekPlayer: async () => _player };
  }
  if (s.endsWith('GroupSettings')) return { findOne: () => ({ lean: async () => _gs }), find: () => ({ lean: async () => [] }) };
  return _orig.apply(this, arguments);
};

const sent = [];
let relays = 0;
const sockF = {
  sendMessage: async (j, c) => { sent.push({ j, c }); return { key: { id: 'k' } }; },
  relayMessage: async () => { relays++; return {}; },
  user: { id: 'bot@s.whatsapp.net' },
};
const CTX = (extra = {}) => ({ remoteJid: 'GRP@g.us', senderNumber: '2449', senderJid: '2449@s.whatsapp.net', isGroup: true, pushName: 'Dark', prefix: '!', isOwner: false, ...extra });

(async () => {
  console.log('=== v8.01 — MENURPG LISTA DE TEXTO ===');

  const reg = {};
  require('../src/bot/cases/rpgCommunity')((nomes, fn) => { for (const n of [].concat(nomes)) reg[n] = fn; });
  assert.ok(reg.menurpg && reg['menu-rpg'] && reg.rpgmenu, 'menurpg registado');

  // ── 1. Fechado → MSG_MODO ──────────────────────────────────
  _gs = null; sent.length = 0; relays = 0;
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm1' } }, ctx: CTX(), prefix: '!' });
  assert.ok(sent.some(x => /mundo RPG está fechado/i.test(x.c?.text || '')), 'mundo fechado pede !modorpg');
  console.log('✔ gate intacto: fechado nem abre');

  // ── 2. Aberto SEM personagem → PORTAL lidera em texto ──────
  _gs = { modorpg: true }; _player = null; sent.length = 0; relays = 0;
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm2' } }, ctx: CTX(), prefix: '!' });
  const t2 = sent.find(x => x.c?.text)?.c.text || '';
  assert.ok(t2, 'texto enviado');
  assert.ok(/Ainda não tens personagem/i.test(t2), 'cartão avisa a falta de personagem');
  assert.ok(/PORTAL DE ENTRADA/.test(t2), 'secção do portal');
  assert.ok(/!rpgstart/.test(t2), 'linha de criação');
  assert.ok(!/!lutar\b/.test(t2), 'jogo fica guardado sem personagem');
  assert.ok(/!ranking/.test(t2), 'vitrine continua visível');
  assert.strictEqual(relays, 0, '📜 zero botões interactivos — é LISTA DE TEXTO');
  console.log('✔ sem personagem: portal lidera, jogo guardado, ZERO botões');

  // ── 3. Aberto COM personagem → livro completo em texto ──────
  _player = {
    started: true, name: 'Kael Storm', race: 'elfo', class: 'mago',
    level: 12, xp: 1440, hp: 72, maxHp: 120, mp: 55, maxMp: 90,
    coins: 630, bank: 2500, lives: 2, kills: 88, deaths: 5,
    guild: 'LOBO NEGRO', winStreak: 7, biome: { visited: ['floresta', 'caverna', 'vulcão'] },
  };
  sent.length = 0; relays = 0;
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm3' } }, ctx: CTX(), prefix: '!' });
  const t3 = sent.find(x => x.c?.text)?.c.text || '';
  assert.ok(/Kael Storm/.test(t3), 'nome da personagem');
  assert.ok(/ELFO · MAGO/.test(t3), 'raça + classe');
  assert.ok(/Nível \*12\*/.test(t3) && /XP 1440/.test(t3), 'nível + xp');
  assert.ok(/▰/.test(t3) && /▱/.test(t3), 'barras HP/MP');
  assert.ok(/72\/120/.test(t3) && /55\/90/.test(t3), 'valores HP/MP');
  assert.ok(/630 gold/.test(t3) && /2500 banco/.test(t3), 'finanças');
  assert.ok(/2 vidas/.test(t3) && /88 K/.test(t3) && /💀 5 M/.test(t3), 'vidas + K/M');
  assert.ok(/LOBO NEGRO/.test(t3), 'guilda');
  assert.ok(/biomas pisados: 3/.test(t3), 'biomas');
  for (const seccao of ['A TUA PERSONAGEM', 'AVENTURA & COMBATE', 'INVENTÁRIO & BAÚ', 'PRAÇA', 'LIVRO DO MUNDO']) {
    assert.ok(t3.includes(seccao), `secção ${seccao} no livro`);
  }
  for (const cmd of ['!rg', '!lutar', '!explorar', '!quest', '!viajar', '!descansar', '!pocao', '!inventario', '!bau', '!guilda', '!criaclan', '!npc', '!ranking', '!mundial', '!nome', '!vidas', '!regrasrpg', '!rpgguia']) {
    assert.ok(t3.includes(cmd), `comando ${cmd} listado`);
  }
  assert.strictEqual(relays, 0, 'continua lista de texto pura');
  console.log('✔ com personagem: cartão completo + 18 comandos por secções');

  // ── 4. Prefixos respeitados ─────────────────────────────────
  sent.length = 0;
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm4' } }, ctx: CTX({ prefix: '.' }), prefix: '.' });
  const t4 = sent.find(x => x.c?.text)?.c.text || '';
  assert.ok(/.lutar/.test(t4) && !/!lutar/.test(t4), 'linhas usam o prefixo activo');
  console.log('✔ prefixo dinâmico aplicado');

  // ── 5. Estático ─────────────────────────────────────────────
  const fs8 = require('fs'), path8 = require('path');
  const src = fs8.readFileSync(path8.join(__dirname, '..', 'src', 'bot', 'cases', 'rpgCommunity.js'), 'utf8');
  assert.ok(/LISTA DE TEXTO/.test(src), 'comentário do contrato texto');
  assert.ok(/peekPlayer/.test(src), 'lê a personagem sem criar');
  assert.ok(!/single_select/.test(src), '📜 sem interactivo no menurpg');
  console.log('✔ ganchos correctos e sem botões no código');

  console.log('\nOK / test-amenurpg — MENURPG LISTA DE TEXTO pronto (v8.01)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
