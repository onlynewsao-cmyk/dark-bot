'use strict';
/** v7.80 — RANK SEMANAL + bugfix rankativos (path ../database não existia) */
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

const wk = require('../src/bot/weekKey');
check('weekKey formato AAAA-WNN', /^\d{4}-W\d{2}$/.test(wk.key()), wk.key());
check('weekKey estável no mesmo dia', wk.key(new Date()) === wk.key(new Date()));
const ops = wk.buildWeekOps('m');
const incK = Object.keys(ops.inc)[0];
check('buildWeekOps $inc na semana atual', incK === `weeks.${ops.k}.m`, incK);
check('buildWeekOps $unset 3 semanas velhas', Object.keys(ops.unset).length === 3 && Object.keys(ops.unset).every(k => k.startsWith('weeks.') && !k.includes(ops.k)));
check('shiftKey anda para trás', wk.shiftKey(new Date(), 8) !== ops.k && /^\d{4}-W\d{2}$/.test(wk.shiftKey(new Date(), 8)));

const Module = require('module');
const _orig = Module.prototype.require;
const K = ops.k;
let docs = [
  { groupJid: 'G@g.us', memberJid: '111@s.whatsapp.net', memberNumber: '111', pushName: 'Ana', messages: 100, commands: 50, weeks: { [K]: { m: 5, c: 2 } } },
  { groupJid: 'G@g.us', memberJid: '222@s.whatsapp.net', memberNumber: '222', pushName: 'Beto', messages: 10, commands: 1, weeks: { [K]: { m: 9, c: 0 } } },
  { groupJid: 'G@g.us', memberJid: '333@s.whatsapp.net', memberNumber: '333', pushName: 'Cata', messages: 999, commands: 99, weeks: { '2020-W01': { m: 99, c: 9 } } },
  { groupJid: 'G@g.us', memberJid: '444@s.whatsapp.net', memberNumber: '444', pushName: 'Duda', messages: 50, commands: 5 },
];
Module.prototype.require = function (id) {
  if (String(id).endsWith('models/GroupMemberActivity')) return {
    find: () => ({ sort: () => ({ limit: () => ({ lean: async () => docs }) }), limit: () => ({ lean: async () => docs }) }),
  };
  return _orig.apply(this, arguments);
};

const cmds = {};
require('../src/bot/cases/info.js')((names, fn) => names.forEach(n => { cmds[n] = fn; }));

const store = [];
const sock = { sendMessage: async (jid, content) => { store.push({ jid, ...content }); return { key: { id: 'x' } }; } };
const GCTX = { remoteJid: 'G@g.us', isGroup: true, senderNumber: '999', pushName: 'T' };
const MSG = { key: { id: 'm1' } };

(async () => {
  // ranksemanal
  store.length = 0;
  await cmds['ranksemanal']({ sock, msg: MSG, ctx: GCTX, reply: async () => {} });
  const t = (store[0]?.text || '');
  check('ranksemanal mostra semana', t.includes(K), t.slice(0, 60));
  check('ranksemanal ordena pela semana (Beto 1º)', t.indexOf('@222') > -1 && t.indexOf('@222') < t.indexOf('@111'));
  check('ranksemanal exclui semana velha/sem dados', !t.includes('@333') && !t.includes('@444'));
  check('ranksemanal menciona os tops', (store[0]?.mentions || []).includes('222@s.whatsapp.net'));
  // vazio
  const keep = docs; docs = [];
  let out = '';
  await cmds['ranksemanal']({ sock, msg: MSG, ctx: GCTX, reply: async (x) => { out = x; } });
  check('ranksemanal vazio simpático', /ainda sem movimento/.test(out));
  docs = keep;
  // PV bloqueia
  out = '';
  await cmds['ranksemanal']({ sock, msg: MSG, ctx: { ...GCTX, isGroup: false }, reply: async (x) => { out = x; } });
  check('ranksemanal bloqueia PV', /só em \*grupos\*/.test(out));
  // rankativos usa o model (bugfix do path)
  store.length = 0;
  await cmds['rankativos']({ sock, msg: MSG, ctx: GCTX, reply: async () => {}, command: 'rankativos' });
  const t2 = (store[0]?.text || '');
  check('rankativos mostra dados (path fix)', /@111/.test(t2) && !/Ainda não há atividade/.test(t2), t2.slice(0, 80));

  console.log(`\n${fail ? '💥' : '🎉'} RANK-SEMANAL: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
