#!/usr/bin/env node
/**
 * v8.6 🎭 — menurpg ao dia · createFlow com plano-B escrito · dynSub fala
 *   1) menurpg lista TODOS os comandos vivos do mundo (ficha, reviver,
 *      historia, irpara, criarguilda, rgcard…)
 *   2) createFlow: mesmo quando o telemóvel não abre a lista clicável,
 *      o corpo traz as OPÇÕES NUMERADAS e o caminho escrito
 *      (``!rpgstart Nome raça classe``) — nunca fica "só para clicar".
 *   3) dynSub vazio diz "ainda não há comandos nesta área" em vez de
 *      cair em silêncio ("nenhum resultado lá aparece").
 */
'use strict';

process.env.MONGODB_URI = '';

const assert = require('assert');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;
let _gs = null;
let _player = null;
let _relays = [];
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('hotCache')) return { getGroupSettings: async () => _gs, forgetGroup: () => {}, getGroupDoc: async () => null };
  if (s.endsWith('/rpg/community') || s.endsWith('rpg/community') || s === './community') {
    return { loadState: async () => ({}), isCommunityGroup: () => false };
  }
  if (s === './engine' || s.endsWith('/rpg/engine') || s.endsWith('rpg/engine')) {
    return {
      peekPlayer: async () => _player,
      RACES: {
        humano: { emoji: '🧑', desc: 'Versátil' },
        shinobi: { emoji: '🥷', desc: 'Sombra e velocidade' },
        pirata: { emoji: '🏴', desc: 'Mar e tesouros' },
      },
      CLASSES: {
        guerreiro: { emoji: '⚔️', desc: 'Tanque de guerra' },
        mago: { emoji: '🔮', desc: 'Magia arcana' },
      },
      ORIGINS: {}, getRank: () => ({ emoji: '⚪', name: 'E' }),
      getPlayer: async () => ({}), savePlayer: async () => {},
    };
  }
  if (s.includes('baileys')) {
    const passthrough = { fromObject: (o) => o };
    return {
      generateWAMessageFromContent: (jid, content) => ({ key: { id: 'gen' + Date.now() }, message: { _wrapped: content } }),
      proto: { Message: { InteractiveMessage: { ...passthrough, Body: passthrough, Footer: passthrough, Header: passthrough, NativeFlowMessage: passthrough } },
        InteractiveMessagePlus: passthrough },
      prepareWAMessageMedia: async () => ({}),
    };
  }
  if (s.endsWith('GroupSettings')) return { findOne: () => ({ lean: async () => _gs }), findOneAndUpdate: async () => ({}), find: () => ({ lean: async () => [] }) };
  if (s.endsWith('/submenuData') || s.endsWith('submenuData')) {
    return { SUBMENU_META: { economia: { title: '🎮 RPG & AVENTURA', emoji: '🎮' } }, buildItems: () => [] };
  }
  if (s.endsWith('/caseHandler') || s.endsWith('caseHandler')) return { CASES: new Map(), registerCase: () => {} };
  if (s.endsWith('/nativeCommands') || s.endsWith('nativeCommands')) return {};
  if (s.includes('/packages/')) return {};
  if (s.endsWith('/renderEngine') || s.endsWith('renderEngine')) return { getTheme: async () => ({}), renderBlock: (t, title, lines) => [title, ...(lines || [])].join('\n'), renderSubmenu: () => 'X', renderChange: () => 'X' };
  if (s.endsWith('/prefixEngine')) return { getActivePrefix: async () => '!' };
  if (s.endsWith('/roleResolver') || s.endsWith('roleResolver')) return { resolveRole: async () => ({ cargo: '🆓 FREE', vip: 'INATIVO' }) };
  if (s.endsWith('/botConfigCache') || s.endsWith('botConfigCache')) return { get: async (k, d) => d, set: async () => {}, clear: () => {}, refresh: async () => {}, getMany: async () => ({}), dump: () => ({}) };
  return _orig.apply(this, arguments);
};

const sent = [];
const sockF = {
  sendMessage: async (j, c) => { sent.push(c); return { key: { id: 'k' } }; },
  relayMessage: async (j, m) => { _relays.push(m); return {}; },
  user: { id: 'bot@s.whatsapp.net' },
};
const CTX = (extra = {}) => ({ remoteJid: 'GRP@g.us', senderNumber: '2449', senderJid: '2449@s.whatsapp.net', isGroup: true, pushName: 'Dark', prefix: '!', isOwner: false, ...extra });

(async () => {
  console.log('=== v8.6 — menurpg ao dia · createFlow plano-B · dynSub fala ===');

  // ── 1. menurpg ao dia: comandos vivos todos listados ────────
  _gs = { modorpg: true };
  _player = { started: true, name: 'Kael Storm', race: 'shinobi', class: 'mago', level: 12, xp: 10, hp: 72, maxHp: 120, mp: 55, maxMp: 90, coins: 630, bank: 2500, lives: 2, kills: 88, deaths: 5, biome: { visited: ['floresta'] } };
  sent.length = 0;
  const reg = {};
  require('../src/bot/cases/rpgCommunity')((nomes, fn) => { for (const n of [].concat(nomes)) reg[n] = fn; });
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm1' } }, ctx: CTX(), prefix: '!' });
  const livro = sent.find(c => c.text && /O TEU LIVRO/.test(c.text)).text;
  for (const cmd of ['!rg', '!ficha', '!nome', '!vidas', '!rgcard', '!reviver', '!lutar', '!explorar', '!quest', '!historia', '!viajar', '!irpara', '!descansar', '!pocao', '!inventario', '!bau', '!falar', '!guilda', '!criarguilda', '!criaclan', '!npc', '!ranking', '!mundial', '!regrasrpg', '!rpgguia']) {
    assert.ok(livro.includes(cmd), `menurpg lista ${cmd}`);
  }
  console.log('✔ menurpg actualizado: 25 comandos vivos no livro');

  // ── 2. createFlow: plano-B escrito DENTRO do corpo interactivo ─
  _player = null;    // sem personagem → fluxo de CRIAÇÃO (listas)
  const cf = require('../src/bot/rpg/createFlow');
  sent.length = 0; _relays.length = 0;
  await cf.start({ sock: sockF, msg: { key: { id: 'm2' } }, ctx: CTX({ pushName: 'Zeca' }), args: [] });
  assert.ok(_relays.length === 1, 'lista clicável continua a ser enviada');
  const corpo = _relays[0]._wrapped.interactiveMessage.body.text;
  assert.ok(/1\. 🧑 \*humano\*/.test(corpo), 'opções numeradas no corpo');
  assert.ok(/!rpgstart Zeca <raça> <classe>/.test(corpo), 'caminho escrito no corpo');
  assert.ok(/!rpgstart Zeca shinobi guerreiro/.test(corpo), 'exemplo de reroll');
  assert.ok(/se a lista não abrir/i.test(corpo), 'a frase do plano B');
  const jStr = JSON.stringify(_relays[0]);
  assert.ok(/RPGPICK_R_shinobi/.test(jStr), 'rows clicáveis preservadas');
  // segunda passada (raça escolhida → classes idem)
  await cf.start({ sock: sockF, msg: { key: { id: 'm3' } }, ctx: CTX({ pushName: 'Zeca' }), args: ['Zeca', 'shinobi'] });
  const corpo2 = _relays[1]._wrapped.interactiveMessage.body.text;
  assert.ok(/1\. ⚔️ \*guerreiro\*/.test(corpo2), 'classes numeradas');
  assert.ok(/!rpgstart Zeca shinobi <classe>/.test(corpo2), 'caminho das classes');
  console.log('✔ createFlow: numerado + caminho escrito — a criação nunca trava');

  // ── 3. dynSub vazio → fala em vez de silêncio ───────────────
  _gs = { modorpg: true }; sent.length = 0;
  const ds = {};
  require('../src/bot/cases/dynamicSubmenus')((nomes, fn) => { for (const n of [].concat(nomes)) ds[n] = fn; });
  await ds.submenuRPG({ sock: sockF, msg: { key: { id: 'm4' } }, ctx: CTX(), config: { bot: { name: 'DARK BOT' } } });
  assert.ok(sent.some(c => /Ainda não há comandos nesta área/.test(c.text || '')), 'mensagem clara em vez de silêncio');
  console.log('✔ dynSub: vazio fala ("nenhum resultado" deixou de ser fantasma)');

  // ── 4. Estático ─────────────────────────────────────────────
  const fs2 = require('fs'), p2 = require('path');
  const src = fs2.readFileSync(p2.join(__dirname, '..', 'src', 'bot', 'rpg', 'createFlow.js'), 'utf8');
  assert.ok(/se a lista não abrir/i.test(src), 'plano B no código');
  const dsSrc = fs2.readFileSync(p2.join(__dirname, '..', 'src', 'bot', 'cases', 'dynamicSubmenus.js'), 'utf8');
  assert.ok(/Ainda não há comandos nesta área/.test(dsSrc), 'dynSub fala no código');
  console.log('✔ ganchos v8.6');

  console.log('\nOK / test-arpgupd — menurpg ao dia, criação com plano B (v8.6)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
