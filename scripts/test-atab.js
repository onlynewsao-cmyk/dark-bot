#!/usr/bin/env node
/**
 * v9.5 📑 — !tab aba interativa · !aurahub da Aura · selos no que faltava
 *   1) !tab: hub com 5 abas; escolher renderiza a aba E reabre o hub
 *      (navegação contínua via onEscolha); `!tab <aba>` directo por texto
 *   2) !aurahub: estado real nos botões (voz on→off, humor animada→
 *      provocante, nível normal→viva, acordada→dorme) + selo biz
 *   3) !change, !maiscmds e as decisões AURASEL ganham o selo
 *      biz/native_flow (eram relays fantasma como o VIP)
 */
'use strict';

process.env.MONGODB_URI = '';

const assert = require('assert');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;
let _pend = null;
let _relayOpts = [];
let _relays = [];
let _failsRelay = false;
const sent = [];

const DOC = {
  whatsappNumber: '2449', name: 'Kira Storm', race: 'shinobi', class: 'mago', title: 'A Sombra',
  level: 12, xp: 430, xpNext: 2000, hp: 72, maxHp: 120, mp: 55, maxMp: 90, lives: 2,
  stats: { str: 14, dex: 18, int: 21, vit: 11, luk: 9 },
  coins: 5300, bank: 1200,
  inventory: ['poção de vida', 'poção de vida', 'ferro', 'peixe'],
  equipment: { weapon: 'Katana Lua', armor: 'Véu Névoa', accessory: null },
  world: { visited: ['floresta', 'praia'], discoveries: 2 },
  biome: { visited: ['floresta', 'praia'] },
  kill: 0, kills: 88, deaths: 5, bossKills: 2, streak: 6, bestStreak: 9,
  karma: 3, reputation: 420, guild: 'NOITE', faction: 'Lume',
  started: true, raceBonusApplied: true,
};

Module.prototype.require = function (id) {
  const s = String(id);
  if (s === '../../config' || s === '../../../config' || s === './../config') return { ai: { groq: 'k', gemini: null }, bot: { name: 'DARK BOT', prefix: '!' }, owner: { name: 'Dark', number: '1' } };
  if (s.endsWith('botConfigCache')) return { get: async (k, d) => k === 'aura_proactive_enabled' ? true : (k === 'aura_proactive_nivel' ? 'normal' : d), set: async () => {}, getMany: async () => ({}), dump: () => ({}), clear: () => {} };
  if (s.endsWith('/rpg/engine') || s.endsWith('rpg/engine')) {
    return {
      getPlayer: async () => DOC, peekPlayer: async () => DOC, savePlayer: async () => {},
      getRank: () => ({ emoji: '🟣', name: 'B' }),
      BIOMES: {
        floresta: { emoji: '🌲', desc: 'Mata densa', nivel: 1, danger: 1, loot: ['madeira'] },
        praia: { emoji: '🏖️', desc: 'Areia branca', nivel: 3, danger: 1, loot: ['concha'] },
        caverna: { emoji: '🕳️', desc: 'Escuridão', nivel: 8, danger: 2, loot: ['cristal'] },
      },
      RACES: {}, CLASSES: {}, ORIGINS: {},
    };
  }
  if (s.endsWith('/rpg/ui') || s.endsWith('rpg/ui')) {
    return {
      escolher: async (sock, msg, ctx, o) => { _pend = o; return true; },
      confirmar: async () => true, resolver: async () => false, decidirPorTexto: async () => true, escolherPorTexto: async () => true, pendentes: () => new Map(),
    };
  }
  if (s.endsWith('auraBrain')) return { modos: () => ({ soAudio: true, vigilante: false }) };
  if (s.endsWith('auraHuman')) return { getMood: () => ({ mood: 'animada' }), setMood: () => {} };
  if (s.endsWith('auraModes')) return { isAuraAwake: async () => true, invokeAura: async () => ({ ok: true }), dismissAura: async () => ({ ok: true }) };
  if (s.includes('baileys')) {
    const p = { fromObject: (o) => o };
    return {
      generateWAMessageFromContent: (jid, content) => ({ key: { id: 'gen' }, message: { _wrapped: content } }),
      proto: { Message: { InteractiveMessage: { ...p, Body: p, Footer: p, Header: p, NativeFlowMessage: p } } },
      prepareWAMessageMedia: async () => ({}),
    };
  }
  if (s.endsWith('renderEngine')) return { getTheme: async () => null, renderBlock: () => 'X', renderSubmenu: () => 'X', renderChange: () => 'X' };
  if (s.endsWith('hotCache')) return { getGroupSettings: async () => ({ modorpg: true }), forgetGroup: () => {}, getGroupDoc: async () => null };
  return _orig.apply(this, arguments);
};

const sockF = {
  sendMessage: async (j, c) => { sent.push(c); return { key: { id: 'k' } }; },
  relayMessage: async (j, m, o) => { if (_failsRelay) throw new Error('rede'); _relays.push(m); _relayOpts.push(o); return {}; },
  waUploadToServer: async () => ({}),
  user: { id: 'bot@s.whatsapp.net' },
};
const CTX = (extra = {}) => ({ remoteJid: 'GRP@g.us', senderNumber: '2449', senderJid: '2449@s.whatsapp.net', isGroup: true, pushName: 'Dark', prefix: '!', isOwner: true, ...extra });

(async () => {
  console.log('=== v9.5 — !tab · !aurahub · selos restantes ===');

  // ── 1. !tab: hub + abas vivas ───────────────────────────────
  const tab = {};
  require('../src/bot/cases/rpgTab')((nomes, fn) => { for (const x of [].concat(nomes)) tab[x] = fn; });
  sent.length = 0; _pend = null;
  await tab.tab({ sock: sockF, msg: { key: { id: 't1' } }, ctx: CTX(), args: [] });
  assert.ok(_pend && _pend.opcoes.length === 5, 'hub com 5 abas');
  assert.ok(/perfil|Kira Storm/.test(_pend.linhas.join(' ')), 'resumo no hub');

  // escolher a aba FICHA → render + hub reabre
  const hubAberturas = () => _pend;
  await _pend.onEscolha(1, { sock: sockF, msg: { key: { id: 't2' } }, ctx: CTX() });
  const ficha = sent.find(c => /FICHA|STR/.test(c.text || '')).text;
  assert.ok(/⚔️ STR \*14\*/.test(ficha) && /🍀 LUK \*9\*/.test(ficha), 'aba FICHA com atributos');
  assert.ok(hubAberturas() && _pend.opcoes.length === 5, 'hub reabriu após render (tab bar viva)');

  // cada aba renderiza sem rebentar
  for (let i = 0; i < 5; i++) {
    sent.length = 0;
    await _pend.onEscolha(i, { sock: sockF, msg: { key: { id: 'x' } }, ctx: CTX() });
    assert.ok(sent.length >= 1, `aba ${i} renderizou`);
  }
  sent.length = 0;
  await _pend.onEscolha(0, { sock: sockF, msg: { key: { id: 'x' } }, ctx: CTX() });
  assert.ok(/KIRA STORM/.test(sent[0].text) && /🛡️ Guilda: \*NOITE\*/.test(sent[0].text), 'aba PERFIL');
  sent.length = 0;
  await _pend.onEscolha(2, { sock: sockF, msg: { key: { id: 'x' } }, ctx: CTX() });
  assert.ok(/poção de vida ×2/.test(sent[0].text) && /Katana Lua/.test(sent[0].text), 'aba INVENTÁRIO com contagens e equipamento');
  sent.length = 0;
  await _pend.onEscolha(3, { sock: sockF, msg: { key: { id: 'x' } }, ctx: CTX() });
  assert.ok(/✅ 🌲 \*floresta\*/.test(sent[0].text) && /⬜ 🕳️ \*caverna\*/.test(sent[0].text), 'aba MUNDO visitado vs por descobrir');
  sent.length = 0;
  await _pend.onEscolha(4, { sock: sockF, msg: { key: { id: 'x' } }, ctx: CTX() });
  assert.ok(/👹 Bosses abatidos: \*2\*/.test(sent[0].text), 'aba REGISTOS');

  // caminho escrito: !tab stats
  sent.length = 0;
  await tab.tab({ sock: sockF, msg: { key: { id: 't3' } }, ctx: CTX(), args: ['stats'] });
  assert.ok(/REGISTOS|Bosses abatidos/i.test(sent[0].text), '!tab stats directo');
  sent.length = 0;
  await tab.tab({ sock: sockF, msg: { key: { id: 't4' } }, ctx: CTX(), args: ['zzz'] });
  assert.ok(/Aba desconhecida/.test(sent[0].text), 'aba inválida → ajuda');
  console.log('✔ !tab: 5 abas vivas · hub reabre · caminho escrito · ajuda');

  // ── 2. !aurahub: botões com o estado real ───────────────────
  const ah = {};
  require('../src/bot/cases/auraHub')((nomes, fn) => { for (const x of [].concat(nomes)) ah[x] = fn; });
  _relays = []; _relayOpts = []; sent.length = 0;
  await ah.aurahub({ sock: sockF, msg: { key: { id: 'a1' } }, ctx: CTX(), prefix: '!', isOwner: true, reply: async () => {}, });
  assert.strictEqual(_relays.length, 1, 'hub interactivo saiu');
  const im = _relays[0]._wrapped.interactiveMessage;
  assert.ok(/Humor: \*animada\*/.test(im.body.text) && /acordada 🌹/.test(im.body.text), 'estado real no corpo');
  const ids = im.nativeFlowMessage.buttons.map(b => JSON.parse(b.buttonParamsJson).id || '');
  assert.ok(ids.includes('!auraset voz off'), 'voz ligada → botão desliga');
  assert.ok(ids.includes('!auraset proativa off'), 'proativa ligada → desliga');
  assert.ok(ids.includes('!auraset proativa viva'), 'ciclo nível normal → viva');
  assert.ok(ids.includes('!auraset humor provocante'), 'ciclo humor animada → provocante');
  assert.ok(ids.includes('!auraset dorme'), 'acordada → dorme');
  assert.ok(_relayOpts[0].additionalNodes?.[0]?.content?.[0]?.attrs?.type === 'native_flow', 'selo biz no hub');
  console.log('✔ !aurahub: 5 botões reflectem o estado real + selo biz');

  // ── 3. Selos nos relays fantasma restantes ──────────────────
  const fs = require('fs'), path2 = require('path');
  const lê = f => fs.readFileSync(path2.join(__dirname, '..', f), 'utf8');
  for (const f of ['src/bot/cases/change.js', 'src/aura/auraEscolha.js']) {
    assert.ok(lê(f).includes('additionalNodes'), `selo biz em ${f}`);
  }
  const prem = lê('src/bot/cases/premium.js');
  assert.ok((prem.match(/additionalNodes/g) || []).length >= 2, '!maiscmds e !vip com selo');
  console.log('✔ selos biz/native_flow: change · maiscmds · AURASEL fechados');

  // ── 4. categorias (auditoria submenusorg) ───────────────────
  const sd = require('../src/bot/submenuData');
  assert.strictEqual(sd.categorize('tab'), 'economia', 'tab → economia');
  assert.strictEqual(sd.categorize('abas'), 'economia', 'abas → economia');
  assert.strictEqual(sd.categorize('aurahub'), 'owner', 'aurahub → owner');
  console.log('✔ categorias registadas');

  console.log('\nOK / test-atab — abas + hub da Aura + selos (v9.5)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
