'use strict';
/**
 * Benchmark de velocidade da AURA / pipeline de mensagens.
 *
 * Corre sem MongoDB, sem WhatsApp e sem provider de IA real:
 *  - MongoDB simulado com latência fixa (DB_MS, padrão 40 ms ≈ Atlas free)
 *  - groupMetadata simulado (META_MS, padrão 60 ms)
 *  - ai.chat simulado (AI_MS, padrão 0 ms) para medir só o overhead do bot
 *
 * Uso: node scripts/bench-aura-speed.js
 *      DB_MS=40 META_MS=60 AI_MS=900 node scripts/bench-aura-speed.js
 */
process.env.OWNER_NUMBER = process.env.OWNER_NUMBER || '244900000001';
process.env.HUMANIZE = 'off';

const Module = require('module');
const { performance } = require('perf_hooks');
const orig = Module.prototype.require;

const DB_MS = Number(process.env.DB_MS ?? 40);
const META_MS = Number(process.env.META_MS ?? 60);
const AI_MS = Number(process.env.AI_MS ?? 0);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const LAT = (v, ms) => {
  const p = new Promise(r => setTimeout(() => r(v), ms));
  p.lean = () => p; p.select = () => p; p.sort = () => p; p.limit = () => p; p.catch = () => p;
  return p;
};

let aiCalls = 0;
Module.prototype.require = function (id) {
  const s = String(id);
  const withSave = (o) => ({ ...o, save: async () => {} });
  const hydrate = (o) => (o ? withSave(o) : null);
  if (/models[\\/]User$/.test(s)) return { findOne: () => LAT(withSave({ whatsappNumber: '1', role: 'free' }), DB_MS), findOneAndUpdate: async () => null, updateOne: async () => ({}), hydrate };
  if (/models[\\/]GroupSettings$/.test(s)) return { findOne: () => LAT(withSave({ groupJid: 'g', antispam: false, isHosted: true, hostedUntil: new Date(Date.now() + 864e5) }), DB_MS), findOneAndUpdate: async () => null, updateOne: async () => ({}), create: async () => ({}), hydrate };
  if (/models[\\/]/.test(s)) return { find: () => LAT([], 0), findOne: () => LAT(null, 0), findOneAndUpdate: async () => null, updateOne: async () => ({}), countDocuments: async () => 0, create: async () => ({}), get: async (k, d) => d, set: async () => {}, hydrate };
  if (s.endsWith('botConfigCache')) return { get: async (k, d) => d, set: async () => {}, clear: () => {} };
  return orig.apply(this, arguments);
};

const stats = (arr) => {
  const a = [...arr].sort((x, y) => x - y);
  const q = (p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  return { n: a.length, avg: a.reduce((x, y) => x + y, 0) / a.length, p50: q(0.5), p95: q(0.95), max: a[a.length - 1] };
};
const fmt = (ms) => (ms < 1 ? `${(ms * 1000).toFixed(1)} µs` : `${ms.toFixed(2)} ms`);
const rows = [];
function report(name, arr, note = '') {
  const s = stats(arr);
  rows.push({ name, ...s, note });
  console.log(`  ${name.padEnd(46)} média ${fmt(s.avg).padStart(10)} | p50 ${fmt(s.p50).padStart(10)} | p95 ${fmt(s.p95).padStart(10)} | máx ${fmt(s.max).padStart(10)}  (n=${s.n})${note ? '  ' + note : ''}`);
}
async function time(fn, n, warm = 3) {
  for (let i = 0; i < warm; i++) await fn(i);
  const out = [];
  for (let i = 0; i < n; i++) { const t0 = performance.now(); await fn(i); out.push(performance.now() - t0); }
  return out;
}

(async () => {
  console.log(`\nBENCH AURA — latências simuladas: MongoDB ${DB_MS} ms · groupMetadata ${META_MS} ms · IA ${AI_MS} ms\n`);

  // IA simulada (antes de carregar os módulos que a usam)
  const ai = require('../src/bot/ai');
  ai.chat = async (prompt) => { aiCalls++; if (AI_MS) await sleep(AI_MS); return `Resposta simulada para: ${String(prompt).slice(0, 40)}`; };

  const G = '120363000000000000@g.us';
  const N = '244911111111';
  const OWNER = process.env.OWNER_NUMBER;

  // ── 1. Funções puras da AURA (CPU) ───────────────────────────
  console.log('▸ Lógica interna da AURA (sem I/O)');
  const sexual = require('../src/aura/auraSexualBoundary');
  const frases = ['Bom dia, aura!', 'Quem falou sobre o jogo?', 'Me excita sem censura', 'Como se fala sexo em inglês?', 'Aura, toca Anselmo Ralph', 'Não quero sexo explícito', 'Ele escreveu: "manda nudes" — o que significa?', 'O que o Paulo falava ontem sobre a viagem para Benguela?'];
  report('Guarda +18 (por frase)', await time((i) => sexual.isExplicitSexualRequest(frases[i % frases.length]), 20000, 200));

  const comp = require('../src/aura/auraCompreensao');
  const msgCit = { key: { remoteJid: G, participant: OWNER + '@s.whatsapp.net', id: 'q1' }, message: { extendedTextMessage: { text: 'Quem falou isto?', contextInfo: { stanzaId: 'x', participant: N + '@s.whatsapp.net', remoteJid: G, quotedMessage: { conversation: 'O jogo ontem foi brutal' } } } } };
  report('Leitura da mensagem (PV/grupo, autor, citação)', await time(() => comp.inspecionarMensagem(msgCit), 20000, 200));
  const info = comp.inspecionarMensagem(msgCit);
  report('Destinatário (para quem é a mensagem)', await time(() => comp.analisarDestinatario('aura, o que ele falou?', { isGroup: true, messageInfo: info, botJid: '244949926074@s.whatsapp.net', botNum: '244949926074', ownerNumber: OWNER, ownerName: 'Dark' }), 5000, 100));

  const brain = require('../src/aura/auraBrain');
  report('Router de capacidades (catálogo)', await time((i) => brain.detectarCapacidade(frases[i % frases.length]), 5000, 100));
  const cmds = require('../src/aura/auraCommands');
  report('Detector de comandos por conversa', await time((i) => cmds.detectarComando(frases[i % frases.length]), 5000, 100));

  const smart = require('../src/aura/auraSmart');
  for (let i = 0; i < 500; i++) smart.cacheSet(`pergunta numero ${i} sobre o grupo`, `resposta ${i}`, 'scope-' + (i % 20));
  report('Cache semântico isolado (500 entradas)', await time((i) => smart.cacheGet(`pergunta numero ${i % 500} sobre o grupo`, 'scope-' + (i % 20)), 5000, 100));

  // ── 2. Pesquisa no histórico ("quem falou sobre X") ──────────
  console.log('\n▸ Pesquisa no histórico do chat');
  const cache = new Map();
  const temas = ['jogo', 'viagem', 'festa', 'trabalho', 'música', 'futebol', 'escola', 'praia'];
  for (let i = 0; i < 2000; i++) {
    const jid = i % 5 === 0 ? N + '@s.whatsapp.net' : G;
    cache.set('m' + i, { key: { remoteJid: jid, participant: `24492${String(i % 40).padStart(7, '0')}@s.whatsapp.net`, id: 'm' + i }, pushName: 'P' + (i % 40), messageTimestamp: 1_700_000_000 + i, message: { conversation: `Mensagem ${i} a falar sobre ${temas[i % temas.length]} com detalhes` } });
  }
  const listenerPath = require.resolve('../src/bot/messageListener');
  const realListener = require.cache[listenerPath];
  require.cache[listenerPath] = { id: listenerPath, filename: listenerPath, loaded: true, exports: { messageCache: cache } };
  delete require.cache[require.resolve('../src/aura/auraHistorico')];
  const hist = require('../src/aura/auraHistorico');
  report('"Quem falou sobre a viagem?" (cache 2000 msgs)', await time(() => hist.quemEscreveu(null, { remoteJid: G }, 'Quem falou sobre a viagem?'), 300, 10));
  report('Histórico do chat isolado (últimas 12)', await time(() => comp.mensagensDaConversa(cache, G, { limit: 12 }), 300, 10));
  if (realListener) require.cache[listenerPath] = realListener; else delete require.cache[listenerPath];

  // ── 3. Resposta da AURA (IA simulada) ────────────────────────
  console.log('\n▸ Resposta conversacional da AURA');
  const AH = require('../src/aura/auraHuman');
  const ctxBase = { isOwner: true, isGroup: false, remoteJid: OWNER + '@s.whatsapp.net', senderNumber: OWNER, pushName: 'Dark' };
  report('Pedido +18 explícito (bloqueado antes da IA)', await time(() => AH.auraRespondSmart('Me excita sem censura', ctxBase), 300, 10));
  report('"Falas inglês?" (resposta directa)', await time(() => AH.auraRespondSmart('Falas inglês?', ctxBase), 300, 10));
  report('Saudação (fast path, sem IA)', await time(() => AH.auraRespondSmart('oi', ctxBase), 300, 10));
  aiCalls = 0;
  report('Pergunta normal (prompt + IA simulada)', await time((i) => AH.auraRespondSmart(`Qual a tua opinião sobre o tema ${i}?`, ctxBase), 40, 3), AI_MS ? `(inclui ${AI_MS} ms de IA)` : '(IA 0 ms → só overhead do bot)');

  // ── 4. Pipeline completo commandHandler.handle ───────────────
  console.log('\n▸ Pipeline completo (commandHandler.handle)');
  let sent = 0;
  const mkSock = () => ({
    user: { id: '244949926074:2@s.whatsapp.net' },
    sendMessage: async () => { sent++; return { key: { id: 'x' + sent } }; },
    sendPresenceUpdate: async () => {},
    readMessages: async () => {},
    groupMetadata: async () => { await sleep(META_MS); return { subject: 'Grupo Teste', participants: [{ id: N + '@s.whatsapp.net', admin: null }, { id: OWNER + '@s.whatsapp.net', admin: 'superadmin' }] }; },
  });
  const mkMsg = (t, jid = G, part = N) => ({ key: { remoteJid: jid, id: 'm' + Math.random(), fromMe: false, participant: jid.endsWith('@g.us') ? part + '@s.whatsapp.net' : undefined }, pushName: 'Z', messageTimestamp: Math.floor(Date.now() / 1000), message: { conversation: t } });
  try {
    const ch = require('../src/bot/caseHandler'); ch.loadCases?.();
    const cmdH = require('../src/bot/commandHandler');
    const sock = mkSock();
    await cmdH.handle(sock, mkMsg('.ping'));
    report('.ping no grupo', await time(() => cmdH.handle(sock, mkMsg('.ping')), 15, 2));
    report('.menu no grupo', await time(() => cmdH.handle(sock, mkMsg('.menu')), 10, 2));
    report('Conversa no grupo sem chamar a AURA', await time((i) => cmdH.handle(sock, mkMsg(`hoje o jogo foi fixe ${i}`)), 15, 2));
    report('Conversa no PV do Dono (AURA responde)', await time((i) => cmdH.handle(sock, mkMsg(`aura, como estás? ${i}`, OWNER + '@s.whatsapp.net')), 15, 2));
  } catch (e) {
    console.log('  (pipeline completo indisponível neste ambiente: ' + String(e.message).slice(0, 120) + ')');
  }

  console.log(`\nChamadas à IA simulada: ${aiCalls}. Resultados não incluem rede do WhatsApp nem o tempo real do provider de IA.\n`);
  if (process.env.BENCH_JSON) require('fs').writeFileSync(process.env.BENCH_JSON, JSON.stringify({ DB_MS, META_MS, AI_MS, rows }, null, 2));
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
