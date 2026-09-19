#!/usr/bin/env node
/**
 * v8.00 🕸️ MENURPG VIVO
 * O menurpg deixou de ser uma parede de texto: cartão da personagem
 * (HP/MP/nível/gold/vidas/guilda/biomas) + lista toque-para-correr.
 * Sem personagem: o portal de criação lidera e o jogo espera.
 */
'use strict';

process.env.MONGODB_URI = '';

const assert = require('assert');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;
let _gs = null;
let _player = null;
let _gen = [];                    // mensagens geradas (generateWAMessageFromContent)
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('hotCache')) return { getGroupSettings: async () => _gs, forgetGroup: () => {} };
  if (s === './community' || s.endsWith('/rpg/community') || s.endsWith('rpg/community')) {
    return { loadState: async () => ({}), isCommunityGroup: () => false };
  }
  if (s === './engine' || s.endsWith('/rpg/engine') || s.endsWith('rpg/engine')) {
    return { peekPlayer: async () => _player };
  }
  if (s.includes('baileys')) {
    const passthrough = { fromObject: (o) => o };
    return {
      generateWAMessageFromContent: (jid, content) => { _gen.push({ jid, content }); return { key: { id: 'gen' + _gen.length }, message: { _wrapped: content } }; },
      proto: { Message: { InteractiveMessage: passthrough && { fromObject: o => o }, } },
      prepareWAMessageMedia: async () => ({}),
    };
  }
  if (s.endsWith('GroupSettings')) return { findOne: () => ({ lean: async () => _gs }), find: () => ({ lean: async () => [] }) };
  return _orig.apply(this, arguments);
};

// ensure proto structure completo
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('hotCache')) return { getGroupSettings: async () => _gs, forgetGroup: () => {} };
  if (s === './community' || s.endsWith('/rpg/community') || s.endsWith('rpg/community')) return { loadState: async () => ({}), isCommunityGroup: () => false };
  if (s === './engine' || s.endsWith('/rpg/engine') || s.endsWith('rpg/engine')) return { peekPlayer: async () => _player };
  if (s.includes('baileys')) {
    const passthrough = { fromObject: (o) => o };
    return {
      generateWAMessageFromContent: (jid, content) => { _gen.push({ jid, content }); return { key: { id: 'gen' + _gen.length }, message: { _wrapped: content } }; },
      proto: { Message: {
        InteractiveMessage: { ...passthrough, Body: passthrough, Footer: passthrough, Header: passthrough, NativeFlowMessage: passthrough },
      }},
      prepareWAMessageMedia: async () => ({}),
    };
  }
  if (s.endsWith('GroupSettings')) return { findOne: () => ({ lean: async () => _gs }), find: () => ({ lean: async () => [] }) };
  return _orig.apply(this, arguments);
};

const sent = [];
let relayFalha = false;
const sockF = {
  sendMessage: async (j, c) => { sent.push({ j, c }); return { key: { id: 'k' } }; },
  relayMessage: async (j, m, o) => { if (relayFalha) throw new Error('relay quebrou'); sent.push({ j, relay: m }); return {}; },
  user: { id: 'bot@s.whatsapp.net' },
};
const CTX = (extra = {}) => ({ remoteJid: 'GRP@g.us', senderNumber: '2449', senderJid: '2449@s.whatsapp.net', isGroup: true, pushName: 'Dark', prefix: '!', isOwner: false, ...extra });

function _seccoes(gen) {
  const btn = gen.content.interactiveMessage.nativeFlowMessage.buttons[0];
  return JSON.parse(btn.buttonParamsJson);
}
function _body(gen) {
  return gen.content.interactiveMessage.body.text;
}

(async () => {
  console.log('=== v8.00 — MENURPG VIVO ===');

  const reg = {};
  require('../src/bot/cases/rpgCommunity')((nomes, fn) => { for (const n of [].concat(nomes)) reg[n] = fn; });
  assert.ok(reg.menurpg && reg['menu-rpg'] && reg.rpgmenu, 'menurpg registado');

  // ── 1. Fechado → MSG_MODO (intocável no v8.00) ─────────────
  _gs = null; sent.length = 0;
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm1' } }, ctx: CTX(), prefix: '!' });
  assert.ok(sent.some(x => /mundo RPG está fechado/i.test(x.c?.text || '')), 'mundo fechado pede !modorpg');
  console.log('✔ gate intacto: fechado nem abre');

  // ── 2. Aberto SEM personagem → portal lidera ───────────────
  _gs = { modorpg: true }; _player = null; sent.length = 0; _gen.length = 0;
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm2' } }, ctx: CTX(), prefix: '!' });
  assert.strictEqual(_gen.length, 1, 'lista interactiva enviada');
  const lp0 = _seccoes(_gen[0]);
  const body0 = _body(_gen[0]);
  assert.ok(/Ainda não tens personagem/i.test(body0), 'cartão diz que falta personagem');
  assert.ok(/PORTAL DE ENTRADA/.test(lp0.sections[0].title), 'secção 1 é o portal');
  const rows0 = lp0.sections.flatMap(s => s.rows);
  assert.ok(rows0.some(r => r.id === '!rpgstart'), 'linha de criação presente');
  assert.ok(!rows0.some(r => r.id === '!lutar'), 'jogo fica guardado sem personagem');
  assert.ok(rows0.some(r => r.id === '!ranking'), 'vitrine (ranking) continua visível');
  assert.ok(/TOCA/i.test(body0) || /Toca para executar/.test(body0), 'o corpo convida ao toque');
  console.log('✔ sem personagem: portal no topo, vitrine aberta, jogo guardado');

  // ── 3. Aberto COM personagem → cartão vivo + mundo completo ─
  _player = {
    started: true, name: 'Kael Storm', race: 'elfo', class: 'mago',
    level: 12, xp: 1440, hp: 72, maxHp: 120, mp: 55, maxMp: 90,
    coins: 630, bank: 2500, lives: 2, kills: 88, deaths: 5,
    guild: 'LOBO NEGRO', winStreak: 7, biome: { visited: ['floresta', 'caverna', 'vulcão'] },
  };
  sent.length = 0; _gen.length = 0;
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm3' } }, ctx: CTX(), prefix: '!' });
  assert.strictEqual(_gen.length, 1, 'lista vai sempre que há personagem');
  const body1 = _body(_gen[0]);
  assert.ok(/Kael Storm/.test(body1), 'nome da personagem no cartão');
  assert.ok(/ELFO · MAGO/.test(body1), 'raça + classe');
  assert.ok(/Nível \*12\*/.test(body1) && /XP 1440/.test(body1), 'nível + xp');
  assert.ok(/▰/.test(body1) && /▱/.test(body1), 'barras HP/MP');
  assert.ok(/72\/120/.test(body1) && /55\/90/.test(body1), 'valores HP/MP');
  assert.ok(/630 gold/.test(body1) && /2500 banco/.test(body1), 'finanças');
  assert.ok(/2 vidas/.test(body1) && /88 K/.test(body1) && /💀 5 M/.test(body1), 'vidas + K/M');
  assert.ok(/LOBO NEGRO/.test(body1), 'guilda');
  assert.ok(/7\*/.test(body1) || /sequência de vitórias: \*7\*/.test(body1), 'winStreak');
  assert.ok(/biomas pisados: 3/.test(body1), 'biomas');
  const lp1 = _seccoes(_gen[0]);
  const rows1 = lp1.sections.flatMap(s => s.rows);
  for (const cmd of ['!rg', '!lutar', '!explorar', '!quest', '!viajar', '!descansar', '!pocao', '!inventario', '!bau', '!guilda', '!criaclan', '!npc', '!ranking', '!mundial', '!nome', '!vidas', '!regrasrpg', '!rpgguia']) {
    assert.ok(rows1.some(r => r.id === cmd), `linha ${cmd} existe`);
  }
  assert.ok(lp1.sections.some(s => /AVENTURA & COMBATE/.test(s.title)), 'secção AVENTURA');
  assert.ok(lp1.sections.some(s => /PRAÇA/.test(s.title)), 'secção PRAÇA');
  assert.ok(lp1.sections.some(s => /LIVRO DO MUNDO/.test(s.title)), 'secção LIVRO DO MUNDO');
  assert.ok(rows1.every(r => r.id && r.id.startsWith('!') && r.title && ('description' in r)), 'rows completas (id/title/description)');
  const footer = _gen[0].content.interactiveMessage.footer.text;
  assert.ok(/DARK VILLE RPG/.test(footer), 'rodapé da marca');
  console.log('✔ com personagem: cartão completo e 18 linhas vivas');

  // ── 4. Relé quebra → queda em texto rico ────────────────────
  relayFalha = true; sent.length = 0; _gen.length = 0;
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm4' } }, ctx: CTX(), prefix: '!' });
  const flat = sent.find(x => x.c?.text && /AVENTURA & COMBATE/.test(x.c.text));
  assert.ok(flat, 'texto de queda existe');
  assert.ok(/!lutar/.test(flat.c.text) && /!rg/.test(flat.c.text), 'comandos listados na queda');
  assert.ok(/Kael Storm/.test(flat.c.text), 'cartão sobrevive na queda');
  relayFalha = false;
  console.log('✔ fallback texto: cartão + comandos todos');

  // ── 5. Prefixos respeitados ─────────────────────────────────
  sent.length = 0; _gen.length = 0;
  await reg.menurpg({ sock: sockF, msg: { key: { id: 'm5' } }, ctx: CTX({ prefix: '.' }), prefix: '.' });
  const rows2 = _seccoes(_gen[0]).sections.flatMap(s => s.rows);
  assert.ok(rows2.every(r => r.id.startsWith('.')), 'linhas usam o prefixo activo');
  console.log('✔ prefixo dinâmico aplicado nas linhas');

  // ── 6. Estático ─────────────────────────────────────────────
  const fs8 = require('fs'), path8 = require('path');
  const src = fs8.readFileSync(path8.join(__dirname, '..', 'src', 'bot', 'cases', 'rpgCommunity.js'), 'utf8');
  assert.ok(/peekPlayer/.test(src), 'lê a personagem sem criar');
  assert.ok(/single_select/.test(src), 'lista interactiva');
  assert.ok(!/\$\{p\}loja|'loja'/.test(src), 'comandos mortos ficaram fora');
  console.log('✔ ganchos correctos, sem comandos-fantasma');

  console.log('\nOK / test-amenurpg — MENURPG VIVO pronto (v8.00)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
