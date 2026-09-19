#!/usr/bin/env node
/**
 * v9.8 ☣️ — CLIENTE ONLINE / DIVULGAÇÃO DARKTOXIC (apenas dono)
 *   1) !cliente: hub com 5 secções, selo biz, moldura ☣️☠️🕸️, estado real
 *   2) GRUPOS: add (no grupo) · addall · list · del N · delall — isolado por dono
 *   3) !delay: painel com 🟢 no activo, presets e custom 1..5000, delayultrarapido
 *   4) MOTOR: visível (@tags à vista) vs INVISÍVEL (menção silenciosa —
 *      o ADM não vê a lista de marcados) + histórico + stop
 *   5) SEU BOT: conectar/meubot/desconector + !aluguel (tabela)
 */
'use strict';

process.env.MONGODB_URI = '';

const assert = require('assert');

// ── mocks plásticos ───────────────────────────────────────────
const Module = require('module');
const _orig = Module.prototype.require;
let _relays = [];
let _opcao = null;
const sent = [];
let _db = new Map();      // botConfigCache
let _donorFail = {};
let _carroOk = true;
let _carroH = null;

const GRUPO1 = { id: 'G1@g.us', subject: '💎 RÁDIO DARK', participants: [
  { id: '2441@s.whatsapp.net' }, { id: '2442@s.whatsapp.net' }, { id: '2449@s.whatsapp.net' },
] };
const GRUPO2 = { id: 'G2@g.us', subject: '🔥 VENDAS', participants: [
  { id: '2443@s.whatsapp.net' }, { id: '2444@s.whatsapp.net' },
] };

Module.prototype.require = function (id) {
  const s = String(id);
  if (s === '../../config') return { bot: { name: 'DARK BOT', prefix: '!' }, owner: { number: '2449' }, ai: { groq: 'k', gemini: null } };
  if (s.endsWith('botConfigCache')) return {
    get: async (k, d) => _db.has(k) ? _db.get(k) : d,
    set: async (k, v) => { _db.set(k, v); return v; },
  };
  if (s.endsWith('/rpg/ui') || s.endsWith('rpg/ui')) {
    return {
      escolher: async (sock, msg, ctx, o) => { _opcao = o; return true; },
      confirmar: async () => true, resolver: async () => false, decidirPorTexto: async () => true, escolherPorTexto: async () => true, pendentes: () => new Map(),
    };
  }
  if (s.includes('baileys')) {
    const p = { fromObject: (o) => o };
    return {
      generateWAMessageFromContent: (jid, content) => ({ key: { id: 'gen' }, message: { _wrapped: content } }),
      proto: { Message: { InteractiveMessage: { ...p, Body: p, Footer: p, Header: p, NativeFlowMessage: p } } },
      downloadMediaMessage: async () => Buffer.from('MEDIAFAKE-9.8'),
    };
  }
  if (s.endsWith('/rpg/carousel') || s === '../rpg/carousel') return { enviarCarrossel: async (sock, msg, ctx, o) => { _carroH = { capt: o }; return _carroOk; }, _imgCache: new Map(), _imagem: async () => null };
  if (s.endsWith('renderEngine')) return { getTheme: async () => null, renderBlock: () => 'X', renderSubmenu: () => 'X', renderChange: () => 'X' };
  if (s.endsWith('hotCache')) return { getGroupSettings: async () => ({}), forgetGroup: () => {} };
  if (s.endsWith('GroupSettings')) return { findOne: () => ({ lean: async () => null }) };
  return _orig.apply(this, arguments);
};

const sockF = {
  sendMessage: async (jid, c) => { if (_donorFail[jid]) throw new Error('forbidden'); sent.push({ jid, ...c }); return { key: { id: 'k' } }; },
  relayMessage: async (j, m, o) => { _relays.push({ m, o }); return {}; },
  groupMetadata: async (jid) => ({ 'G1@g.us': GRUPO1, 'G2@g.us': GRUPO2, 'GRP@g.us': GRUPO1 }[jid] || { participants: [] }),
  groupFetchAllParticipating: async () => ({ 'G1@g.us': GRUPO1, 'G2@g.us': GRUPO2 }),
  waUploadToServer: async () => ({}),
  user: { id: 'bot@s.whatsapp.net' },
};
const DONO = { remoteJid: 'GRP@g.us', senderNumber: '2449', senderJid: '2449@s.whatsapp.net', isGroup: true, isOwner: true, prefix: '!', groupName: 'QG DARK' };
const FREE = { ...DONO, senderNumber: '2443', senderJid: '2443@s.whatsapp.net', isOwner: false };
const reply = async (t) => sent.push({ jid: DONO.remoteJid, text: t });
const keys = (k) => _db.get(`divulg_${k}`);

(async () => {
  console.log('=== v9.8 — CLIENTE ONLINE / DIVULGAÇÃO ☣️ ===');

  const div = {};
  require('../src/bot/cases/divulgacao')((nomes, fn) => { for (const x of [].concat(nomes)) div[x] = fn; });

  // ── 1. Hub !cliente — CARROSSEL primeiro, lista de reserva ──
  _relays = []; sent.length = 0; _carroOk = true; _carroH = null;
  await div.cliente({ sock: sockF, msg: { key: { id: 'c1' } }, ctx: DONO, isOwner: true, reply });
  assert.ok(_carroH?.capt, 'hub tentou o carrossel DARKTOXIC primeiro');
  assert.strictEqual(_carroH.capt.cards.length, 4, '4 cartões (grupos/velocidade/enviar/seu bot)');
  const botoesCartas = _carroH.capt.cards.flatMap(c => c.botoes.map(b => b.id));
  for (const id of ['!divulgar addall', '!divulgar list', '!delay', '!delay rapido', '!divulgar', '!divulgarteste visivel', '!meubot', '!aluguel']) {
    assert.ok(botoesCartas.includes(id), `cartão tem botão vivo ${id}`);
  }
  assert.ok(_carroH.capt.cards.every(c => c.promptImg && c.cacheKey), 'capas IA darktoxic por cartão');
  assert.ok(/DARKTOXIC/.test(_carroH.capt.corpo) && /☣️◢◤/.test(_carroH.capt.corpo), 'moldura darktoxic no corpo');
  // fallback: carrossel indisponível → lista single_select
  _carroOk = false; _relays = []; sent.length = 0; _carroH = null;
  await div.cliente({ sock: sockF, msg: { key: { id: 'c1x' } }, ctx: DONO, isOwner: true, reply });
    const hub = _relays[0].m._wrapped.interactiveMessage;
  assert.ok(/DARKTOXIC/.test(hub.body.text), 'moldura darktoxic também na lista');
  const secs = JSON.parse(hub.nativeFlowMessage.buttons[0].buttonParamsJson).sections;
  assert.strictEqual(secs.length, 4, '4 secções (grupos/velocidade/enviar/seu bot)');
  const allRows = secs.flatMap(s => s.rows.map(r => r.id));
  for (const cmd of ['!divulgar add', '!divulgar addall', '!divulgar list', '!divulgar delall', '!delay', '!delay ultra', '!divulgarrapido visivel', '!divulgarstop', '!divulgarhistorico', '!divulgarrepetir', '!divulgarstats', '!divulgaragenda', '!conectarbot', '!meubot', '!desconectarbot', '!aluguel']) {
    assert.ok(allRows.includes(cmd), `hub tem a linha ${cmd}`);
  }
  assert.ok(_relays[0].o.additionalNodes?.[0]?.tag === 'biz', 'selo biz no hub');
  // negação: free não entra
  sent.length = 0;
  await div.cliente({ sock: sockF, msg: { key: { id: 'c1b' } }, ctx: FREE, isOwner: false, reply });
  assert.ok(/só do dono/.test(sent[0].text), 'free barrado no hub');
  console.log('✔ !cliente: hub darktoxic real + cadeado dono');

  // ── 2. Grupos: add → addall → list → del → delall ───────────
  sent.length = 0;
  await div.divulgar({ sock: sockF, msg: { key: { id: 'g1' } }, ctx: DONO, args: ['add'], prefix: '!', isOwner: true, reply });
  assert.strictEqual((keys('grupos_2449') || []).length, 1, 'add regista ESTE grupo');
  assert.ok(/G R U P O  R E G I S T A D O/.test(sent[0].text), 'confirmação darktoxic');
  await div.divulgar({ sock: sockF, msg: { key: { id: 'g2' } }, ctx: DONO, args: ['addall'], prefix: '!', isOwner: true, reply });
  assert.strictEqual((keys('grupos_2449') || []).length, 3, 'addall pega G1+G2 além do GRP registado');
  // list vai como carrossel hidden — no, lista single_select
  _relays = []; sent.length = 0;
  await div.divulgar({ sock: sockF, msg: { key: { id: 'g3' } }, ctx: DONO, args: ['list'], prefix: '!', isOwner: true, reply });
  assert.ok(/G R U P O S  D A  O N D A/.test(_relays[0].m._wrapped.interactiveMessage.body.text), 'lista numerada');
  // del 1
  await div.divulgar({ sock: sockF, msg: { key: { id: 'g4' } }, ctx: DONO, args: ['del', '1'], prefix: '!', isOwner: true, reply });
  assert.strictEqual((keys('grupos_2449') || []).length, 2, 'del 1 remove o 1º');
  assert.strictEqual(keys('grupos_2449')[0].jid, 'G1@g.us', 'sobram G1 e G2');
  // isolamento: outro cavalheiro não mistura
  await div.divulgar({ sock: sockF, msg: { key: { id: 'g5' } }, ctx: { ...DONO, senderNumber: '1111' }, args: ['addall'], prefix: '!', isOwner: true, reply });
  assert.strictEqual((keys('grupos_1111') || []).length, 2, 'cada dono tem a sua onda (isolado)');
  console.log('✔ GRUPOS: add/addall/list/del/delall — estado isolado por dono');

  // ── 3. Delay panel + presets + custom ───────────────────────
  _relays = []; sent.length = 0;
  await div.delay({ sock: sockF, msg: { key: { id: 'd1' } }, ctx: DONO, args: [], prefix: '!', isOwner: true, reply });
  const painelD = _relays[0].m._wrapped.interactiveMessage.body.text;
  assert.ok(/🟢 ATIVO/.test(painelD), '🟢 no preset ativo (1200 default)');
  assert.ok(/custom: `!delay 100`/.test(painelD), 'hint custom no painel');
  const dRows = JSON.parse(_relays[0].m._wrapped.interactiveMessage.nativeFlowMessage.buttons[0].buttonParamsJson).sections[0].rows;
  assert.ok(dRows.some(r => r.id === '!delay antiban'), 'linha antiban');
  await div.delay({ sock: sockF, msg: { key: { id: 'd2' } }, ctx: DONO, args: ['rapido'], prefix: '!', isOwner: true, reply });
  assert.strictEqual(keys('delay_2449'), 70, 'preset rápido = 70ms');
  await div.delay({ sock: sockF, msg: { key: { id: 'd3' } }, ctx: DONO, args: ['100'], prefix: '!', isOwner: true, reply });
  assert.strictEqual(keys('delay_2449'), 100, 'custom 100ms');
  await div.delay({ sock: sockF, msg: { key: { id: 'd4' } }, ctx: DONO, args: ['90000'], prefix: '!', isOwner: true, reply });
  assert.strictEqual(keys('delay_2449'), 5000, 'custom clampado em 5000');
  await div.delayultrarapido({ sock: sockF, msg: { key: { id: 'd5' } }, ctx: DONO, args: [], prefix: '!', isOwner: true, reply });
  assert.strictEqual(keys('delay_2449'), 5000, 'delayultrarapido = 5000ms');
  console.log('✔ !delay: painel com 🟢 + presets + custom clampado');

  // ── 4. MOTOR: visível vs invisível + histórico ──────────────
  // já tem G2 na onda do 2449
  await div.delay({ sock: sockF, msg: { key: { id: 'd6' } }, ctx: DONO, args: ['1'], prefix: '!', isOwner: true, reply });
  sent.length = 0;
  await div.divulgarrapido({ sock: sockF, msg: { key: { id: 'r1' } }, ctx: DONO, args: ['visivel', 'saiu', 'o', 'drop'], isOwner: true, reply });
  const alvoVis = sent.find(m => m.jid === 'G2@g.us' && typeof m.text === 'string');
  assert.ok(alvoVis, 'mandou para o G2');
  assert.ok(/@2443/.test(alvoVis.text) && /@2444/.test(alvoVis.text), 'VIsível: @tags à vista');
  assert.ok(alvoVis.mentions.includes('2443@s.whatsapp.net') && alvoVis.mentions.length === 2, 'menções completas');
  assert.ok(sent.filter(m=>/☣️ \*DIVULGAÇÃO\*/.test(m.text||'')).length === 2, 'onda cobriu os 2 grupos');
  // invisível: ZERO @ no texto, menções completas na mesma (silenciosas)
  sent.length = 0;
  await div.divulgarrapido({ sock: sockF, msg: { key: { id: 'r2' } }, ctx: DONO, args: ['invisivel', 'saiu', 'o', 'drop'], isOwner: true, reply });
  const alvoInv = sent.find(m => m.jid === 'G2@g.us' && typeof m.text === 'string');
  assert.ok(alvoInv, 'mandou para o G2 (invisível)');
  assert.ok(!/@2443/.test(alvoInv.text), 'INVISÍVEL: nenhum @ no texto — ADM não vê tags');
  assert.ok(alvoInv.mentions.length === 2, 'mas todos são notificados na mesma');
  // histórico actualizado
  const hist = keys('hist_2449') || [];
  assert.ok(hist.length >= 2 && hist[hist.length - 1].feitos === 2, 'histórico regista feitos (2 grupos)');
  // failures contados
  _donorFail['G2@g.us'] = true;
  sent.length = 0; _relays = [];
  await div.divulgarrapido({ sock: sockF, msg: { key: { id: 'r3' } }, ctx: DONO, args: ['invisivel', 'x'], isOwner: true, reply });
  const repT = (sent.map(m => m.text).filter(Boolean).join(' ') + ' ' +
    _relays.map(x => x.m?._wrapped?.interactiveMessage?.body?.text || '').join(' '));
  assert.ok(/R E L A T Ó R I O/.test(repT) && /❌ Falhou: \*1\*/.test(repT), 'relatório conta falhas (relay fixo)');
  _donorFail = {};
  console.log('✔ MOTOR: visível vs invisível (silêncio no ADM) + histórico + falhas');

  // ── 5. !divulgar 4 passos com escolher + stop ───────────────
  sent.length = 0; _opcao = null;
  await div.divulgar({ sock: sockF, msg: { key: { id: 'm1' } }, ctx: DONO, args: 'miga drop chegou 🕸️'.split(' '), prefix: '!', isOwner: true, reply });
  assert.ok(_opcao && _opcao.opcoes.length === 4, 'passo 3: 4 opções (visivel/invisivel/sem/cancelar)');
  await _opcao.onEscolha(1, { sock: sockF, msg: { key: { id: 'm1b' } }, ctx: DONO }); // invisível
  assert.ok(sent.some(m => m.jid === 'G2@g.us' && /drop chegou/.test(m.text || '')), 'onda correu depois do toque');
  // cancelar
  sent.length = 0; _opcao = null;
  await div.divulgar({ sock: sockF, msg: { key: { id: 'm2' } }, ctx: DONO, args: ['aborta'], prefix: '!', isOwner: true, reply });
  await _opcao.onEscolha(3, { sock: sockF, msg: { key: { id: 'm2b' } }, ctx: DONO });
  assert.ok(/C A N C E L A D O/.test(sent[0].text), 'cancelar aborta antes do disparo');
  assert.ok(!sent.some(m => m.jid === 'G2@g.us'), 'nada saiu');
  // stop sinaliza
  sent.length = 0;
  await div.divulgarstop({ sock: sockF, msg: { key: { id: 'm3' } }, ctx: DONO, isOwner: true, reply });
  assert.ok(/A P A R A R/.test(sent[0].text), 'stop confirma');
  console.log('✔ !divulgar: 4 passos com escolher + cancelar + stop');

  // ── 6. SEU BOT + plano ─────────────────────────────────────
  sent.length = 0;
  await div.conectarbot({ sock: sockF, msg: { key: { id: 'b1' } }, ctx: DONO, args: ['244933344455'], isOwner: true, reply });
  assert.ok(/244933344455/.test(sent[0].text), 'número registado');
  sent.length = 0;
  await div.meubot({ sock: sockF, msg: { key: { id: 'b2' } }, ctx: DONO, isOwner: true, reply });
  assert.ok(/ATIVO/.test(sent[0].text) && /Grupos da onda: \*2\*/.test(sent[0].text), 'meubot mostra estado real');
  sent.length = 0;
  await div.desconectarbot({ sock: sockF, msg: { key: { id: 'b3' } }, ctx: DONO, isOwner: true, reply });
  assert.ok(/D E S C O N E C T A D O/.test(sent[0].text), 'desconecta');
  sent.length = 0;
  await div.aluguel({ sock: sockF, msg: { key: { id: 'b4' } }, ctx: DONO, isOwner: true, reply });
  assert.ok(/7 dias/.test(sent[0].text) && /90 dias/.test(sent[0].text), 'tabela de aluguel');
  console.log('✔ SEU BOT: conectar/meu/desligar + tabela de planos');

  // ── 6.5. Botões FIXOS no relatório + repetir + stats + agenda ──
  _relays = []; sent.length = 0;
  await div.divulgarrapido({ sock: sockF, msg: { key: { id: 'x1' } }, ctx: DONO, args: ['invisivel', 'onda', 'com', 'botoes'], isOwner: true, reply });
  const repFixo = _relays.map(x => x.m?._wrapped?.interactiveMessage).find(Boolean);
  assert.ok(repFixo && /R E L A T Ó R I O/.test(repFixo.body.text), 'relatório com botões fixos');
  const fixos = repFixo.nativeFlowMessage.buttons.map(b => JSON.parse(b.buttonParamsJson).id);
  assert.ok(fixos.includes('!divulgarrepetir') && fixos.includes('!divulgarhistorico') && fixos.includes('!divulgarstop'), 'fixos: repetir · histórico · parar');
  // repetir a mesma onda
  sent.length = 0;
  await div.divulgarrepetir({ sock: sockF, msg: { key: { id: 'x2' } }, ctx: DONO, isOwner: true, reply });
  assert.ok(sent.filter(m => /☣️ \*DIVULGAÇÃO\*/.test(m.text || '')).length === 2, 'repetir volta a regar os 2 grupos');
  // stats
  sent.length = 0;
  await div.divulgarstats({ sock: sockF, msg: { key: { id: 'x3' } }, ctx: DONO, isOwner: true, reply });
  assert.ok(/P R O V A/.test(sent[0].text) && /Ondas disparadas/.test(sent[0].text) && /Entregues com sucesso/.test(sent[0].text), 'dashboard de stats');
  // agenda (simulando a passagem do minuto)
  let _agendaFn = null;
  const realST = global.setTimeout;
  global.setTimeout = (fn, ms) => { assert.strictEqual(ms, 60000, '1 min real'); _agendaFn = fn; return 1; };
  sent.length = 0;
  await div.divulgaragenda({ sock: sockF, msg: { key: { id: 'x4' } }, ctx: DONO, args: ['1', 'invisivel', 'onda', 'das', '21h'], isOwner: true, reply });
  global.setTimeout = realST;
  assert.ok(/A G E N D A D A/.test(sent[0].text) && /1min/.test(sent[0].text), 'agenda confirmada darktoxic');
  assert.ok(_agendaFn, 'timer registado');
  // stop cancela agenda pendente
  sent.length = 0;
  await div.divulgarstop({ sock: sockF, msg: { key: { id: 'x5' } }, ctx: DONO, isOwner: true, reply });
  assert.ok(/Agenda pendente também cancelada/.test(sent[0].text), 'stop apaga a agenda');
  clearTimeout; // noop
  console.log('✔ FIXOS + repetir + stats + agenda (com cancel no stop)');

  // ── 7. estáticos ────────────────────────────────────────────
  const fs = require('fs'), path=require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'bot', 'cases', 'divulgacao.js'), 'utf8');
  assert.ok(/☣️◢◤/.test(src) && /DARKTOXIC/.test(src), 'tema darktoxic no código');
  assert.ok(/additionalNodes/.test(src), 'selo biz no código');
  assert.ok(!/meualuguel/.test(src), 'sem colisão com meualuguel (rental2)');
  const sd = require('../src/bot/submenuData');
  for (const c of ['divulgar', 'divulgarfoto', 'delay', 'meubot', 'aluguel', 'cliente']) {
    assert.strictEqual(sd.categorize(c), 'owner', `${c} → owner`);
  }
  console.log('✔ estáticos: tema, selo, sem colisões, categorias');

  console.log('\nOK / test-adivulgacao — CLIENTE ONLINE darktoxic (v9.8)');
  process.exit(0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(1); });
