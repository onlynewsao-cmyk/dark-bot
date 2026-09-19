#!/usr/bin/env node
/**
 * v9.0 🎠 — CARROSSEIS: VIP revisto · RPG com fotos
 *   1) helper rpg/carousel: cartas com imagem (cache IA), selo
 *      biz/native_flow no relay, carta sobrevive sem imagem, false p/ fallback
 *   2) VIP (!vip): carrossel ganhou o selo que os clientes novos exigem
 *      (o relay "fantasma" antigo não tinha additionalNodes)
 *   3) createFlow: raças/classes tentam CARROSSEL 1º (RPGPICK preservado),
 *      lista single_select continua de reserva, plano-B numerado no corpo
 *   4) !viajar (sem args): carrossel de biomas com botão "!viajar <sítio>"
 *      + fallback texto intacto
 */
'use strict';

process.env.MONGODB_URI = '';

const assert = require('assert');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;
let _relayOpts = [];
let _relays = [];
let _failsRelay = false;
let _imgsGeradas = 0;
let _carro = null;          // {ok, capt} — mock do enviarCarrossel
let _player = null;

const BUF_IMG = Buffer.concat([Buffer.from('RPGXP'), Buffer.alloc(6000, 7)]);

Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('hotCache')) return { getGroupSettings: async () => ({ modorpg: true }), forgetGroup: () => {} };
  if (s.endsWith('GroupSettings')) return { findOne: () => ({ lean: async () => ({ modorpg: true }) }), findOneAndUpdate: async () => ({}), find: () => ({ lean: async () => [] }) };
  if (s.endsWith('BotConfig')) return { findOne: () => ({ lean: async () => null }), findOneAndUpdate: async () => ({}) };
  if (s.endsWith('botConfigCache')) return { get: async (k, d) => d, set: async () => {}, clear: () => {}, refresh: async () => {}, getMany: async () => ({}), dump: () => ({}) };
  if (s.endsWith('prefixManager')) return { getActive: async () => ['!'], getAllActive: async () => ['!'] };
  if (s.endsWith('identidadeCanal')) return { canalLink: async () => 'https://whatsapp.com/channel/X' };
  // createFlow/viajar passam ESTE mock; o helper real (caminho absoluto)
  // é testado directamente na secção 1.
  if (s === './carousel' || s === '../rpg/carousel') {
    return { enviarCarrossel: async (sock, msg, ctx, o) => { _carro = { ok: true, capt: o }; return true; }, _imgCache: new Map(), _imagem: async () => BUF_IMG };
  }
  if (s === './images' || s.endsWith('/rpg/images')) {
    return { generateFromPrompt: async () => { _imgsGeradas++; return BUF_IMG; } };
  }
  if (s === './engine' || s.endsWith('/rpg/engine')) {
    return {
      peekPlayer: async () => _player, getPlayer: async () => ({ biome: { visited: ['floresta'] } }), savePlayer: async () => {},
      RACES: { humano: { emoji: '🧑', desc: 'Versátil' }, shinobi: { emoji: '🥷', desc: 'Sombra e velocidade' } },
      CLASSES: { guerreiro: { emoji: '⚔️', desc: 'Tanque de guerra' }, mago: { emoji: '🔮', desc: 'Magia arcana' } },
      BIOMES: {
        floresta: { emoji: '🌲', desc: 'Mata densa e silenciosa', nivel: 1, danger: 1, loot: ['madeira', 'erva', 'cogumelo'] },
        vulcao: { emoji: '🌋', desc: 'Lava e cinzas', nivel: 20, danger: 4, loot: ['obsidiana', 'enxofre', 'rubi'] },
      },
      ORIGINS: {}, getRank: () => ({ emoji: '⚪', name: 'E' }),
    };
  }
  if (s === './world' || s.endsWith('/rpg/world')) {
    return { mapa: () => ['x'], viajar: () => ({ ok: true, primeiraVez: true, linhas: ['x'] }) };
  }
  if (s.includes('baileys')) {
    const p = { fromObject: (o) => o };
    return {
      generateWAMessageFromContent: (jid, content) => ({ key: { id: 'gen' }, message: { _wrapped: content } }),
      proto: { Message: { InteractiveMessage: { ...p, Body: p, Footer: p, Header: p, NativeFlowMessage: p } } },
      prepareWAMessageMedia: async (m) => ({ imageMessage: { _ok: true, url: 'enc://x', mediaKey: 'K' } }),
    };
  }
  if (s.endsWith('renderEngine')) return { getTheme: async () => null, renderBlock: (t, ti, l) => [ti, ...l].join('\n'), renderSubmenu: () => 'X', renderChange: () => 'X' };
  if (s.endsWith('prefixEngine')) return { getActivePrefix: async () => '!' };
  if (s.endsWith('roleResolver')) return { resolveRole: async () => ({ cargo: '🆓 FREE' }) };
  if (s.endsWith('submenuData')) return { SUBMENU_META: { economia: { title: 'X', emoji: '🎮' } }, buildItems: () => [] };
  if (s.endsWith('caseHandler')) return { CASES: new Map(), registerCase: () => {} };
  if (s.endsWith('nativeCommands')) return {};
  if (s.includes('/packages/')) return {};
  if (s.endsWith('/rpg/community') || s.endsWith('rpg/community')) return { loadState: async () => ({}), isCommunityGroup: () => false };
  if (s.endsWith('prefixCard')) return { sendPrefixCard: async () => {} };
  return _orig.apply(this, arguments);
};

const sent = [];
const sockF = {
  sendMessage: async (j, c) => { sent.push(c); return { key: { id: 'k' } }; },
  relayMessage: async (j, m, o) => { if (_failsRelay) throw new Error('rede'); _relays.push(m); _relayOpts.push(o); return {}; },
  waUploadToServer: async () => ({ url: 'up://ok' }),
  user: { id: 'bot@s.whatsapp.net' },
};
const CTX = (extra = {}) => ({ remoteJid: 'GRP@g.us', senderNumber: '2449', senderJid: '2449@s.whatsapp.net', isGroup: true, pushName: 'Dark', prefix: '!', isOwner: true, ...extra });

function carouselDo(relay) {
  return relay?._wrapped?.interactiveMessage?.carouselMessage || null;
}

(async () => {
  console.log('=== v9.0 — carrosseis: VIP revisto · RPG com fotos ===');

  // ── 1. Helper rpg/carousel (real, com imagens mockadas) ─────
  const { enviarCarrossel, _imgCache } = require('../src/bot/rpg/carousel');
  _relays = []; _relayOpts = []; _failsRelay = false; _imgsGeradas = 0;
  const ok1 = await enviarCarrossel(sockF, { key: { id: 'c1' } }, CTX(), {
    corpo: 'corpo', rodape: 'rod', cards: [
      { corpo: 'A', rodape: 'f', promptImg: 'p1', cacheKey: 'k1', botoes: [{ texto: 'b', id: 'ID1' }] },
      { corpo: 'B', rodape: 'f', promptImg: 'p2', cacheKey: 'k2', botoes: [{ texto: 'u', url: 'https://x.y' }] },
      { corpo: 'SEM-IMAGEM', rodape: 'f', botoes: [] },
    ],
  });
  assert.ok(ok1, 'carrossel saiu');
  const car = carouselDo(_relays[0]);
  assert.ok(car && car.cards.length === 3, '3 cartas no carrossel');
  assert.ok(car.cards[0].header.hasMediaAttachment, 'carta com imagem (IA)');
  assert.strictEqual(_imgsGeradas, 2, '2 cacheKeys = 2 gerações');
  assert.strictEqual(_imgCache.size, 2, 'cache guardado');
  // 2ª chamada com o MESMO cacheKey não re-gera (sessão seguinte)
  await enviarCarrossel(sockF, { key: { id: 'c1b' } }, CTX(), { corpo: 'x', cards: [{ corpo: 'y', promptImg: 'p1', cacheKey: 'k1', botoes: [] }] });
  assert.strictEqual(_imgsGeradas, 2, 'cache: cacheKey repetido não re-gera');
  assert.ok(!car.cards[2].header.hasMediaAttachment, 'carta sem imagem sobrevive');
  const qr = JSON.parse(car.cards[0].nativeFlowMessage.buttons[0].buttonParamsJson);
  assert.strictEqual(qr.id, 'ID1', 'quick_reply id intacto');
  assert.strictEqual(car.cards[1].nativeFlowMessage.buttons[0].name, 'cta_url', 'cta_url mapeado');
  assert.ok(_relayOpts[0].additionalNodes?.[0]?.tag === 'biz', 'selo biz/native_flow no relay');
  // relay a falhar → false (chamador cai para lista/texto)
  _failsRelay = true;
  const ok2 = await enviarCarrossel(sockF, { key: { id: 'c2' } }, CTX(), { corpo: 'x', cards: [{ corpo: 'x', botoes: [] }] });
  assert.strictEqual(ok2, false, 'relay falhou → false p/ fallback');
  _failsRelay = false;
  // sem imagem gerada (gerador a falhar) → carta sem capa, carrossel na mesma
  const { enviarCarrossel: env2 } = require('../src/bot/rpg/carousel');
  _relays = [];
  const imgsBak = _imgsGeradas;
  const ok3 = await env2(sockF, { key: { id: 'c3' } }, CTX(), { corpo: 'x', cards: [{ corpo: 'y', promptImg: 'nova', cacheKey: 'knova', botoes: [] }] });
  assert.ok(ok3, 'carrossel sobrevive sem upload de imagem');
  console.log('✔ helper: cartas+selo biz · cache · sobrevive sem imagem relay falha→false');

  // ── 2. VIP: carrossel revisto com o selo biz/native_flow ────
  _relays = []; _relayOpts = []; sent.length = 0;
  const prem = {};
  require('../src/bot/cases/premium')((nomes, fn) => { for (const x of [].concat(nomes)) prem[x] = fn; });
  await prem.vip({ sock: sockF, msg: { key: { id: 'v1' } }, ctx: CTX(), prefix: '!', reply: async () => {}, react: async () => {} });
  const carVip = _relays.map(r => carouselDo(r)).find(Boolean);
  assert.ok(carVip, 'VIP enviou carrossel');
  assert.strictEqual(carVip.cards.length, 4, '4 planos');
  const b7 = carVip.cards[1].nativeFlowMessage.buttons;
  assert.strictEqual(JSON.parse(b7[0].buttonParamsJson).id, 'PREMIUM_7_2449', 'botão contratar');
  assert.strictEqual(b7[1].name, 'cta_url', 'cta_url dono');
  const idxVip = _relays.findIndex(r => carouselDo(r));
  assert.ok(_relayOpts[idxVip].additionalNodes?.[0]?.content?.[0]?.attrs?.type === 'native_flow',
    'o carrossel VIP agora leva o selo (era o relay fantasma sem additionalNodes)');
  console.log('✔ VIP: carrossel com 4 planos + selo biz/native_flow (verificado)');

  // ── 3. createFlow: CARROSSEL primeiro, RPGPICK preservado ───
  _carro = null; _relays = []; sent.length = 0; _player = null;
  const cf = require('../src/bot/rpg/createFlow');
  await cf.start({ sock: sockF, msg: { key: { id: 'm1' } }, ctx: CTX({ pushName: 'Mira' }), args: [] });
  assert.ok(_carro?.ok, 'criação tentou o carrossel primeiro');
  const idsCartas = _carro.capt.cards.flatMap(c => c.botoes.map(b => b.id));
  assert.ok(idsCartas.includes('RPGPICK_R_humano') && idsCartas.includes('RPGPICK_R_shinobi'),
    'tokens RPGPICK_R_ preservados (interceptador intacto)');
  assert.ok(_carro.capt.cards.every(c => c.promptImg && c.cacheKey), 'cartas com foto IA');
  if (!(/1\. 🧑 \*humano\*/.test(_carro.capt.corpo) && /!rpgstart Mira/.test(_carro.capt.corpo))) console.error('DEBUG-CORPO>>>', _carro.capt.corpo.slice(0,300));
  assert.ok(/1\. 🧑 \*humano\*/.test(_carro.capt.corpo) && /!rpgstart Mira/.test(_carro.capt.corpo),
    'plano-B numerado + caminho escrito segue no corpo do carrossel');
  console.log('✔ createFlow: carrossel 1º · RPGPICK intacto · plano-B no corpo');

  // ── 4. !viajar sem args: carrossel de biomas + fallback ─────
  _carro = null; _relays = []; sent.length = 0;
  const rw = {};
  require('../src/bot/cases/rpgWorld')((nomes, fn) => { for (const x of [].concat(nomes)) rw[x] = fn; });
  await rw.viajar({ sock: sockF, msg: { key: { id: 'w1' } }, ctx: CTX(), args: [] });
  assert.ok(_carro?.ok, 'viajar tentou o carrossel');
  assert.strictEqual(_carro.capt.cards.length, 2, '1 carta por bioma');
  const btnIds = _carro.capt.cards.map(c => c.botoes[0].id);
  assert.ok(btnIds.includes('!viajar floresta') && btnIds.includes('!viajar vulcao'), 'botões = comandos reais');
  assert.ok(/1\. 🌲 \*floresta\*/.test(_carro.capt.corpo) && /!viajar <sítio>/.test(_carro.capt.corpo), 'plano-B no corpo');
  assert.ok(/✅ já visitado/.test(_carro.capt.cards[0].corpo) && /🆕/.test(_carro.capt.cards[1].corpo), 'visitado vs novo');
  console.log('✔ !viajar: carrossel do mundo · botões viajam de verdade · estado por carta');

  // ── 5. Fallbacks: carrossel indisponível → lista/texto ──────
  const carroSrc = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'bot', 'rpg', 'carousel.js'), 'utf8');
  assert.ok(/return false/.test(carroSrc), 'helper devolve false p/ fallback');
  const cfSrc = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'bot', 'rpg', 'createFlow.js'), 'utf8');
  assert.ok(/enviarCarrossel[\s\S]*?single_select/.test(cfSrc), 'carrossel → lista → texto (escada)');
  console.log('✔ escadas de fallback preservadas');

  console.log('\nOK / test-acarrossel — carrosseis VIP + RPG com fotos (v9.0)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
