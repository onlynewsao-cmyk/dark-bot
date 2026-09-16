'use strict';
/** v7.75 — GRUPOS PRO: backup/restore, slowmode, setwarnlimit */
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

const Module = require('module');
const _orig = Module.prototype.require;
const _gs = {};
let _forgot = [];
Module.prototype.require = function (id) {
  const s = String(id);
  if (/(^|\/)hotCache$/.test(s)) return {
    getGroupDoc: async (m, j) => (_gs[j] ? { ..._gs[j] } : null),
    forgetGroup: (j) => { _forgot.push(j); },
  };
  if (s.endsWith('models/GroupSettings')) return {
    findOneAndUpdate: async (q, u) => { _gs[q.groupJid] = { ...(_gs[q.groupJid] || {}), ...(u.$set || {}) }; return _gs[q.groupJid]; },
  };
  return _orig.apply(this, arguments);
};

const gb = require('../src/bot/groupBackup');
const collected = {};
require('../src/bot/cases/gruposPro.js')((names, fn) => names.forEach(n => { collected[n] = fn; }));
const bcc = require('../src/bot/botConfigCache');

const GA = '111@g.us', GB = '222@g.us', ADM = '244900000001';
_gs[GA] = { groupJid: GA, antiflood: true, slowmode: 30, warnLimit: 5, rulesText: 'sem spam', isHosted: true, trialExpiresAt: 'x', commandsUsedToday: 99, auraMode: 'aura' };
const base = (over = {}) => ({
  msg: {}, sock: {}, ctx: { remoteJid: GA, isGroup: true, senderNumber: ADM, groupName: 'Grupo A' },
  args: [], text: '', prefix: '!', isOwner: false, isAdminFn: async () => true, reply: async (t) => t, ...over,
});
const run = (cmd, args, over = {}) => collected[cmd](base({ args, text: args.join(' '), ...over }));

(async () => {
  console.log('\n═══ BACKUP (motor) ═══');
  const cfg = gb.extrair(_gs[GA]);
  check('extrai config', cfg.antiflood === true && cfg.slowmode === 30 && cfg.warnLimit === 5 && cfg.rulesText === 'sem spam');
  check('exclui identidade/aluguel/contadores/aura', cfg.groupJid === undefined && cfg.isHosted === undefined && cfg.trialExpiresAt === undefined && cfg.commandsUsedToday === undefined && cfg.auraMode === undefined);
  check('slot normaliza número', gb.slotDe('+244 900 000 001') === 'backup_gp_244900000001');

  console.log('\n═══ CASES ═══');
  let t = await run('backupgp', []);
  const slot = gb.slotDe(ADM);
  const saved = await bcc.get(slot, null);
  check('backupgp guarda no slot', /Backup guardado/.test(t) && saved?.cfg?.antiflood === true && saved?.de === 'Grupo A', t.slice(0, 60));
  t = await run('backupgp', [], { isAdminFn: async () => false });
  check('backupgp barra não-admin', /administrador/.test(t));
  t = await run('restoregp', []);
  check('restoregp sem SIM → confirmação', /SIM/.test(t));
  // noutro grupo, com o mesmo admin
  t = await collected['restoregp'](base({ ctx: { remoteJid: GB, isGroup: true, senderNumber: ADM, groupName: 'Grupo B' }, args: ['SIM'], text: 'SIM' }));
  check('restoregp aplica noutro grupo', /aplicada/.test(t) && _gs[GB]?.antiflood === true && _gs[GB]?.slowmode === 30 && _forgot.includes(GB), t.slice(0, 70));
  t = await collected['restoregp'](base({ ctx: { remoteJid: GB, isGroup: true, senderNumber: '244000000000' }, args: ['SIM'], text: 'SIM' }));
  check('restoregp sem backup → erro limpo', /Não tens backup/.test(t));

  t = await run('slowmode', ['30']);
  check('slowmode 30', /30s/.test(t) && _gs[GA]?.slowmode === 30);
  t = await run('slowmode', ['2']);
  check('slowmode <5 → ajuda', /Usa:/.test(t));
  t = await run('slowmode', ['off']);
  check('slowmode off', /desligado/.test(t) && _gs[GA]?.slowmode === 0);
  t = await run('setwarnlimit', ['5']);
  check('setwarnlimit 5', /5/.test(t) && _gs[GA]?.warnLimit === 5);
  t = await run('setwarnlimit', ['99']);
  check('setwarnlimit inválido → ajuda', /Usa:/.test(t));
  t = await run('slowmode', ['30'], { isAdminFn: async () => false });
  check('slowmode barra não-admin', /administrador/.test(t));
  t = await run('backupgp', [], { ctx: { remoteJid: 'u@s.whatsapp.net', isGroup: false, senderNumber: ADM } });
  check('backupgp no PV → só grupos', /só em \*grupos\*/.test(t));

  console.log(`\n${fail ? '💥' : '🎉'} GRUPOS-PRO: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
