'use strict';
/** v7.82 — AURA VERDADE: sem resposta dupla, sem alucinação, contacto partilhado (regressão dos 2 prints) */
process.env.OWNER_NUMBER = '244900000001';
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

// stubs de models (padrão test-turbo) ANTES de carregar o router
const Module = require('module');
const _orig = Module.prototype.require;
const w = (v) => { const p = Promise.resolve(v); p.lean = () => p; p.select = () => p; p.sort = () => p; p.limit = () => p; return p; };
const fullModels = { find: () => w([]), findOne: () => w(null), findOneAndUpdate: async () => null, countDocuments: async () => 0, updateOne: async () => ({}) };
let runCaseCalls = [];
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('bot/caseHandler')) return { runCase: async (cmd, c) => { runCaseCalls.push(cmd); return true; } };
  if (/models[\\/]/.test(s)) return fullModels;
  if (s.endsWith('botConfigCache')) return { get: async (k, d) => d, set: async () => {}, clear: () => {}, refresh: async () => {} };
  return _orig.apply(this, arguments);
};

(async () => {
  // ── 1. BRAIN: triggers determinísticos ──
  const brain = require('../src/aura/auraBrain');
  check('print1: "o que aconteceu nos grupos" → resumo_grupos', brain.detectarCapacidade('Me diga o que aconteceu nos grupos')?.id === 'resumo_grupos');
  check('print1b: "verifica lá e me conta" → resumo_grupos', brain.detectarCapacidade('Verifica lá e me conta')?.id === 'resumo_grupos');
  check('print2: "partilha o meu contacto" → partilhar_contacto', brain.detectarCapacidade('Diga lá pra me adicionar lá partilha o meu contacto')?.id === 'partilhar_contacto');
  check('var: "o que se passa nos grupos?" → resumo_grupos', brain.detectarCapacidade('o que se passa nos grupos?')?.id === 'resumo_grupos');
  check('legit: link real → entrar_link', brain.detectarCapacidade('entra nesse grupo https://chat.whatsapp.com/ABCDEFGHIJKLMNOPQRSTUV')?.id === 'entrar_link');

  // ── 2. EXEC ──
  const exec = require('../src/aura/auraExec');
  const store = [];
  const sock = { sendMessage: async (j, c, o) => { store.push({ j, ...c }); return { key: { id: 'x' } }; } };
  const PV = { remoteJid: '244900@s.whatsapp.net', isGroup: false, senderNumber: '244900', pushName: 'Dark' };
  const G = { remoteJid: 'G@g.us', isGroup: true, senderNumber: '244900', pushName: 'Dark' };
  const MSG = { key: { id: 'm' } };
  let r = await exec.executar('falar_com_todos', '', { sock, msg: MSG, ctx: PV, texto: 'diga lá', isOwner: true });
  check('falar_com_todos no PV → fallthrough (sem msg parva)', r?.ok === false && r?.msg == null);
  store.length = 0;
  r = await exec.executar('partilhar_contacto', '', { sock, msg: MSG, ctx: PV, texto: 'partilha o meu contacto', isOwner: true });
  const vc = store.find(m => m.contacts)?.contacts?.contacts?.[0]?.vcard || '';
  check('partilhar_contacto envia vCard', vc.includes('BEGIN:VCARD') && vc.includes('waid=244900'), vc.slice(0, 50));
  check('partilhar_contacto explica', /reencaminha|admin/.test(r?.msg || ''));
  runCaseCalls = [];
  r = await exec.executar('resumo_grupos', '', { sock, msg: MSG, ctx: PV, texto: 'o que aconteceu nos grupos', isOwner: true });
  check('resumo_grupos delega no case', runCaseCalls.includes('resumogrupos') && r?.ok === true && r?.silencioso === true);
  r = await exec.executar('resumo_grupos', '', { sock, msg: MSG, ctx: G, texto: 'verifica lá', isOwner: true });
  check('resumo_grupos "verifica lá" em grupo → fallthrough', r?.ok === false && r?.msg == null);

  // ── 3. ROUTER: tipo + dedup ──
  const router = require('../src/bot/messageRouter');
  const ch = require('../src/bot/commandHandler');
  let handled = 0;
  const keepHandle = ch.handle;
  ch.handle = async () => { handled++; return true; };
  const bot = { sock: { sendMessage: async () => ({ key: { id: 'x' } }), groupMetadata: async () => ({ participants: [] }) } };
  const mk = (id, txt) => ({ key: { remoteJid: '1@s.whatsapp.net', id, fromMe: false }, pushName: 'Z', message: { conversation: txt } });
  router._vistos.clear();
  await router.process(bot, { type: 'append', messages: [mk('H1', 'msg velha do sync')] });
  check('router ignora batch append (history-sync)', handled === 0, 'handled=' + handled);
  await router.process(bot, { type: 'notify', messages: [mk('N1', 'oi')] });
  await router.process(bot, { type: 'notify', messages: [mk('N1', 'oi')] }); // re-emissão
  check('router dedup: mesma msg 2x → 1 handle', handled === 1, 'handled=' + handled);
  await router.process(bot, { messages: [mk('N2', 'oi')] }); // sem type (compat testes)
  check('router sem type processa', handled === 2, 'handled=' + handled);
  ch.handle = keepHandle;

  // ── 4. UNIVERSAL alargado + prompt blindado ──
  const u = require('../src/aura/auraUniversal');
  const cat = new Map([['resumogrupos', { desc: 'resumo do que acontece nos grupos' }], ['noticias', { desc: 'noticias' }]]);
  check('universal: "aconteceu" → resumogrupos', u._candidatos('me diga o que aconteceu nos grupos', cat).includes('resumogrupos'));
  const srcBrain = require('fs').readFileSync(require.resolve('../src/aura/auraBrain.js'), 'utf8');
  check('rotearComIA: exemplos negativos no prompt', /quase nunca são ordens/.test(srcBrain));
  const srcHuman = require('fs').readFileSync(require.resolve('../src/aura/auraHuman.js'), 'utf8');
  check('auraHuman: grounding anti-grupo/link', /NUNCA descrevas\s*\n?\s*grupos, links ou mensagens/.test(srcHuman));

  console.log(`\n${fail ? '💥' : '🎉'} AURA-VERDADE: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
