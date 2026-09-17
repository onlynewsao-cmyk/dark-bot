'use strict';
/** v7.81 — AURA CONTA: "verifica lá" → digest dos grupos, nunca audit (regressão do print) */
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

// ── 1. ROUTER: candidatos ──
const u = require('../src/aura/auraUniversal');
const cat = new Map([
  ['verificarcmds', { desc: 'audita todos os comandos registados' }],
  ['auditcmds', { desc: 'auditoria de comandos' }],
  ['audit', { desc: 'auditoria de comandos' }],
  ['cmdcheck', { desc: 'verifica comandos' }],
  ['resumogrupos', { desc: 'resumo do que acontece nos grupos' }],
  ['noticias', { desc: 'noticias do dia' }],
]);
const META = ['verificarcmds', 'auditcmds', 'audit', 'cmdcheck'];
let c = u._candidatos('Verifica lá e me conta', cat);
check('print: audit FORA', META.every(m => !c.includes(m)), JSON.stringify(c));
check('print: resumogrupos DENTRO', c.includes('resumogrupos'));
c = u._candidatos('me diz o que acontece nos grupos', cat);
check('grupos: resumogrupos DENTRO, audit FORA', c.includes('resumogrupos') && META.every(m => !c.includes(m)), JSON.stringify(c));
c = u._candidatos('verifica os comandos do bot', cat);
check('legit: audit continua a funcionar', c.includes('verificarcmds') || c.includes('auditcmds'), JSON.stringify(c));
c = u._candidatos('lista os comandos todos', cat);
check('legit: lista comandos passa a guarda', META.some(m => c.includes(m)), JSON.stringify(c));

// ── 2. COMANDO resumogrupos ──
const Module = require('module');
const _orig = Module.prototype.require;
const wk = require('../src/bot/weekKey').key();
const D = 86400000, NOW = Date.now();
const G = [
  { groupJid: 'GA@g.us', groupName: 'Grupo Alfa', lastActivity: new Date(NOW - 2 * 3600000), isHosted: true, hostedUntil: new Date(NOW + 10 * D), trialExpiresAt: new Date(0) },
  { groupJid: 'GB@g.us', groupName: 'Grupo Beta', lastActivity: new Date(NOW - 3 * D), isHosted: false, hostedUntil: null, trialExpiresAt: new Date(NOW + 2 * D) },
  { groupJid: 'GC@g.us', groupName: 'Grupo Morto', lastActivity: new Date(NOW - 30 * D), isHosted: false, hostedUntil: null, trialExpiresAt: new Date(0) },
];
const M = [
  { groupJid: 'GA@g.us', pushName: 'Ana', memberNumber: '111', weeks: { [wk]: { m: 20, c: 3 } } },
  { groupJid: 'GA@g.us', pushName: 'Beto', memberNumber: '222', weeks: { [wk]: { m: 5, c: 0 } } },
  { groupJid: 'GB@g.us', pushName: 'Cata', memberNumber: '333', weeks: { [wk]: { m: 12, c: 1 } } },
];
let MODE = 'full'; // 'full' | 'empty' | 'audit' (GroupSettings sem .find, como no audit-publico)
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('models/GroupSettings')) {
    if (MODE === 'audit') return { findOne: async () => null, findOneAndUpdate: async () => null }; // sem find!
    return { find: () => ({ lean: async () => (MODE === 'empty' ? [] : G) }) };
  }
  if (s.endsWith('models/GroupMemberActivity')) return { find: () => ({ lean: async () => (MODE === 'empty' ? [] : M) }) };
  return _orig.apply(this, arguments);
};
const cmds = {};
require('../src/bot/cases/info.js')((names, fn) => names.forEach(n => { cmds[n] = fn; }));
const CTX = { remoteJid: 'PV@s.whatsapp.net', isGroup: false, senderNumber: '244900000000', pushName: 'Dono' };
const MSG = { key: { id: 'm1' } };

(async () => {
  let out = '';
  await cmds['resumogrupos']({ reply: async (t) => { out = t; }, isOwner: true, ctx: CTX, msg: MSG, sock: {} });
  check('digest: 2 grupos ativos (morto fora)', /Grupo Alfa/.test(out) && /Grupo Beta/.test(out) && !/Grupo Morto/.test(out), out.slice(0, 100));
  check('digest: contagens da semana', /28 msgs\/sem/.test(out) && /13 msgs\/sem/.test(out));
  check('digest: estados 💎/🆓', /💎/.test(out) && /🆓/.test(out));
  check('digest: top faladores ordenado', /Ana \(23\)/.test(out) && out.indexOf('Ana (23)') < out.indexOf('Cata (13)'));
  check('digest: semana ISO', out.includes(wk));
  out = '';
  await cmds['resumogrupos']({ reply: async (t) => { out = t; }, isOwner: false, ctx: CTX, msg: MSG, sock: {} });
  check('digest: bloqueia não-dono', /Só o \*dono\*/.test(out));
  MODE = 'empty'; out = '';
  await cmds['resumogrupos']({ reply: async (t) => { out = t; }, isOwner: true, ctx: CTX, msg: MSG, sock: {} });
  check('digest: vazio simpático', /Sem movimento/.test(out));
  MODE = 'audit'; out = '';
  await cmds['resumogrupos']({ reply: async (t) => { out = t; }, isOwner: true, ctx: CTX, msg: MSG, sock: {} });
  check('digest: sem .find (audit) responde texto', out.trim().length > 20, out.slice(0, 60));
  MODE = 'full';

  // ── 3. SUBMENUS ──
  const sd = require('../src/bot/submenuData');
  check('submenus: 3 aliases categorizados', ['resumogrupos', 'digestgrupos', 'novidadesgrupos'].every(a => sd.categorize(a) !== 'outros'));

  console.log(`\n${fail ? '💥' : '🎉'} AURA-CONTA: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
