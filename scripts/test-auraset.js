'use strict';
/** v7.74 — CENTRAL DA AURA (!auraset): estado, voz, proativa, humor, memória, presença */
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

// BD falsa em memória (BotConfig + GroupSettings)
const Module = require('module');
const _orig = Module.prototype.require;
const w = (v) => { const p = Promise.resolve(v); p.lean = () => p; p.select = () => p; p.sort = () => p; p.limit = () => p; return p; };
const _bc = {}, _gs = {};
Module.prototype.require = function (id) {
  const s = String(id);
  if (s.endsWith('models/BotConfig')) return {
    findOne: (q) => w(_bc[q.key] !== undefined ? { value: _bc[q.key] } : null),
    updateOne: async (q, u) => { _bc[q.key] = u.$set.value; return { ok: 1 }; },
    deleteOne: async (q) => { delete _bc[q.key]; return { ok: 1 }; },
  };
  if (s.endsWith('models/GroupSettings')) return {
    findOne: (q) => w(_gs[q.groupJid] || null),
    updateOne: async (q, u) => { _gs[q.groupJid] = { ...(_gs[q.groupJid] || {}), ...(u.$set || {}) }; return { ok: 1 }; },
  };
  return _orig.apply(this, arguments);
};

const mem = require('../src/aura/auraMemory');
const collected = {};
require('../src/bot/cases/auraset.js')((names, fn) => names.forEach(n => { collected[n] = fn; }));

const GRUPO = '120363777777@g.us';
const DONO = '244945280380';
const base = (over = {}) => ({
  sock: {}, msg: {}, ctx: { remoteJid: GRUPO, isGroup: true, senderNumber: DONO, groupName: 'Teste' },
  args: [], text: '', prefix: '!', isOwner: true, reply: async (t) => t, ...over,
});
const run = (args, over = {}) => collected['auraset'](base({ args, text: args.join(' '), ...over }));

(async () => {
  console.log('\n═══ MEMÓRIA (motor) ═══');
  await mem.guardar(DONO, 'o Dark chama-se Dark e gosta de café', { importante: true });
  await mem.guardar(DONO, 'bla bla conversa', { importante: false });
  await mem.guardar(DONO, 'outra curta', { importante: false });
  let c = await mem.contar(DONO);
  check('contar: 1 facto + 2 recentes', c.importante === 1 && c.recente === 2, JSON.stringify(c));
  await mem.esquecer(DONO);
  c = await mem.contar(DONO);
  check('esquecer limpa tudo', c.importante === 0 && c.recente === 0, JSON.stringify(c));

  console.log('\n═══ PAINEL ═══');
  let t = await run([]);
  for (const s of ['CENTRAL DA AURA', 'IA:', 'Proativa:', 'Humor:', 'Aqui:', 'Memória do Dark:', 'auraset voz', 'auraset humor']) {
    check(`painel traz "${s}"`, t.includes(s), t.slice(0, 80));
  }
  t = await run(['estado']);
  check('!auraset estado = painel', t.includes('CENTRAL DA AURA'));
  t = await run([], { isOwner: false });
  check('não-dono é barrado', /só para o \*dono\*/.test(t));

  console.log('\n═══ VOZ / PROATIVA / HUMOR ═══');
  const brain = require('../src/aura/auraBrain');
  const bcc = require('../src/bot/botConfigCache');
  t = await run(['voz', 'on']);
  check('voz on', brain.modos(GRUPO).soAudio === true && /áudio/.test(t));
  t = await run(['voz', 'off']);
  check('voz off', brain.modos(GRUPO).soAudio === false);
  t = await run(['voz', 'x']);
  check('voz inválida → ajuda', /Usa:/.test(t));
  t = await run(['proativa', 'calma']);
  check('proativa calma', /calma/.test(t) && (await bcc.get('aura_proactive_nivel')) === 'calma');
  t = await run(['proativa', 'off']);
  check('proativa off', (await bcc.get('aura_proactive_enabled')) === false);
  t = await run(['proativa', 'viva']);
  check('proativa viva religa', (await bcc.get('aura_proactive_enabled')) === true);
  t = await run(['proativa', 'x']);
  check('proativa inválida → ajuda', /Usa:/.test(t));
  const hum = require('../src/aura/auraHuman');
  t = await run(['humor', 'feliz']);
  check('humor feliz', hum.getMood().mood === 'feliz');
  t = await run(['humor', 'morto']);
  check('humor inválido → lista', /Opções:/.test(t) && hum.getMood().mood === 'feliz');
  t = await run(['humor']);
  check('humor sem arg → mostra atual', /feliz/.test(t));
  hum.setMood('normal', 'teste');

  console.log('\n═══ MEMÓRIA (case) / PRESENÇA ═══');
  await mem.guardar('244900000111', 'facto xpto importante mesmo', { importante: true });
  t = await run(['memoria', '244900000111']);
  check('memoria <n> mostra contagem', /1\* factos/.test(t), t);
  t = await run(['esquecer', '244900000111']);
  check('esquecer sem SIM → pede confirmação', /SIM/.test(t));
  t = await run(['esquecer', '244900000111', 'SIM']);
  check('esquecer com SIM → apaga', /Esqueci/.test(t) && (await mem.contar('244900000111')).importante === 0);
  t = await run(['acorda']);
  check('acorda', /Acordei/.test(t), t);
  t = await run(['acorda']);
  check('acorda 2x → já estava', /Já estou/.test(t), t);
  t = await run(['dorme']);
  check('dorme', /Vou dormir/.test(t), t);
  t = await run(['dorme']);
  check('dorme 2x → já estava', /Já estava/.test(t), t);
  t = await run(['zzz']);
  check('sub inválido → ajuda', /desconhecido/.test(t));

  console.log(`\n${fail ? '💥' : '🎉'} AURASET: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
