'use strict';

const assert = require('assert');
const path = require('path');
let passed = 0;
function check(name, condition) {
  assert.ok(condition, name);
  passed++;
  console.log(`✅ ${name}`);
}
function mockModule(relativePath, exports) {
  const resolved = require.resolve(path.join(__dirname, '..', relativePath));
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
  return resolved;
}

(async () => {
  const bccValues = new Map();
  mockModule('src/bot/botConfigCache.js', {
    get: async (key, fallback = null) => bccValues.has(key) ? bccValues.get(key) : fallback,
    set: async (key, value) => { bccValues.set(key, value); return true; },
  });
  const dbValues = new Map();
  mockModule('src/database/models/BotConfig.js', {
    get: async (key, fallback = null) => dbValues.has(key) ? dbValues.get(key) : fallback,
    set: async (key, value) => { dbValues.set(key, value); return true; },
    findOne: () => ({ lean: async () => ({ value: dbValues.get('aura_scheduled_actions') || [] }) }),
    updateOne: async (query, update) => {
      if (update.$pull?.value) {
        const key = query.key;
        const items = dbValues.get(key) || [];
        const pull = update.$pull.value;
        const match = (item, condition) => Object.entries(condition || {}).every(([field, expected]) => {
          if (expected && typeof expected === 'object' && '$gt' in expected) return Number(item[field]) > expected.$gt;
          return item[field] === expected;
        });
        const selector = query.value?.$elemMatch;
        if (!items.some(item => match(item, selector))) return { acknowledged: true, modifiedCount: 0 };
        const remaining = items.filter(item => !match(item, pull));
        dbValues.set(key, remaining);
        return { acknowledged: true, modifiedCount: items.length - remaining.length };
      }
      dbValues.set(update.$set.key, update.$set.value);
      return { acknowledged: true, modifiedCount: 1 };
    },
  });

  const avancada = require('../src/aura/auraAvancada');
  const regraGlobal = await avancada.aprenderRegra('grupo-1@g.us', 'AURA, não uses emojis', { isOwner: true });
  const regraPreferida = await avancada.aprenderRegra('grupo-1@g.us', 'Prefiro respostas curtas', { isOwner: true });
  const regraLocal = await avancada.aprenderRegra('grupo-2@g.us', 'AURA, não uses caps', { isOwner: false });
  check('o Dono ensina uma preferência global', regraGlobal && (await avancada.regrasGlobais()).includes(regraGlobal));
  check('preferências positivas explícitas também ficam guardadas', regraPreferida && (await avancada.regrasGlobais()).includes(regraPreferida));
  check('correcções de outras pessoas continuam locais', (await avancada.regrasDe('grupo-2@g.us')).includes(regraLocal) && !(await avancada.regrasGlobais()).includes(regraLocal));

  const rulesEngine = require('../src/aura/rulesEngine');
  const sent = [];
  const sock = { user: { id: 'bot@s.whatsapp.net' }, sendMessage: async (...args) => { sent.push(args); return {}; } };
  const msg = { key: { fromMe: false, remoteJid: 'grupo-1@g.us' }, message: {} };
  const learned = await rulesEngine.aprender({
    sock, msg, ctx: { remoteJid: 'grupo-1@g.us', isGroup: true, senderNumber: '111' },
    texto: 'quando eu disser "gótica" responde "já percebi"', isOwner: true,
  });
  const rules = await rulesEngine.listar();
  check('uma regra segura ensinada num grupo fica global', learned && rules.some(r => r.chat === '*' && r.gatilho.texto === 'gótica'));
  const fired = await rulesEngine.aplicar({
    sock, msg, ctx: { remoteJid: 'outro-grupo@g.us', senderNumber: '111' },
    texto: 'gótica', isOwner: true, isCommandLike: false,
  });
  check('a regra global executa noutro chat', fired && sent.at(-1)?.[0] === 'outro-grupo@g.us');
  const refused = await rulesEngine.aprender({
    sock, msg, ctx: { remoteJid: 'grupo-1@g.us', isGroup: true, senderNumber: '111' },
    texto: 'quando alguém disser "pânico" remove a pessoa', isOwner: true,
  });
  const linkRule = await rulesEngine.aprender({
    sock, msg, ctx: { remoteJid: 'grupo-1@g.us', isGroup: true, senderNumber: '111' },
    texto: 'quando alguém disser "convite" manda o link do grupo', isOwner: true,
  });
  const rulesAfterDestructiveTeach = await rulesEngine.listar();
  check('regras de remoção e links de convite ficam limitadas ao grupo', refused && linkRule && rulesAfterDestructiveTeach.some(r => r.acao.tipo === 'remover' && r.chat === 'grupo-1@g.us') && rulesAfterDestructiveTeach.some(r => r.acao.tipo === 'link' && r.chat === 'grupo-1@g.us'));

  const scheduler = require('../src/aura/memory/scheduledActions');
  const storage = { value: [], get: async function () { return this.value; }, set: async function (v) { this.value = v; } };
  scheduler.__test._setStoreForTests(storage);
  const parsed = scheduler.parseScheduleRequest('AURA, daqui a 10 minutos, volta a texto', Date.now());
  check('interpreta prazo relativo e limpa o texto da tarefa', parsed?.actionText === 'volta a texto' && parsed.executeAt > Date.now());
  const luandaDue = scheduler.parseDueAt('amanhã às 09:30', Date.parse('2026-10-15T11:00:00Z'));
  check('interpreta data/hora no fuso Africa/Luanda', luandaDue === Date.parse('2026-10-16T08:30:00Z'));
  check('frase “lembra-me” fica como lembrete, não como acção', scheduler.parseScheduleRequest('lembra-me de comprar pão daqui a 1 minuto')?.reminderOnly === true);

  const schedulerSent = [];
  const taskSock = { user: { id: 'bot@s.whatsapp.net' }, sendMessage: async (...args) => { schedulerSent.push(args); return {}; } };
  const ctx = { remoteJid: '111@s.whatsapp.net', senderNumber: '111', senderJid: '111@s.whatsapp.net', isGroup: false, isPrimaryOwner: true };
  const ownerMsg = { key: { fromMe: false, remoteJid: ctx.remoteJid }, message: {} };
  await scheduler.handleMessage({ sock: taskSock, msg: ownerMsg, ctx, texto: 'AURA, daqui a 1 minuto volta a texto', isOwner: true });
  let task = storage.value[0];
  check('guarda tarefa reconhecida com id e confirmação pendente', task?.actionId === 'modo_so_texto' && task.status === 'scheduled' && schedulerSent.at(-1)?.[1]?.text.includes(task.id));

  task.executeAt = Date.now() - 1000;
  scheduler.arrancar(() => taskSock);
  scheduler.parar();
  await scheduler.__test._tick();
  check('quando vence, pergunta no PV e não executa antes de confirmar', storage.value[0]?.status === 'awaiting_confirmation' && schedulerSent.at(-1)?.[1]?.text.includes(`CONFIRMAR TAREFA ${task.id}`));

  const execPath = require.resolve(path.join(__dirname, '..', 'src/aura/auraExec.js'));
  let execution = null;
  require.cache[execPath] = { id: execPath, filename: execPath, loaded: true, exports: {
    executar: async (id, arg, opts) => { execution = { id, arg, confirmado: opts.confirmado, jid: opts.ctx.remoteJid }; return { ok: true, msg: 'Acção confirmada e simulada.' }; },
  } };
  await scheduler.handleMessage({ sock: taskSock, msg: ownerMsg, ctx, texto: `CONFIRMAR TAREFA ${task.id}`, isOwner: true });
  check('confirmação do Dono executa a tarefa uma única vez e remove-a', execution?.id === 'modo_so_texto' && execution.confirmado === true && execution.jid === ctx.remoteJid && storage.value.length === 0);

  const failureTask = {
    id: 'DEADBEEF', ownerNumber: '111', ownerJid: ctx.remoteJid, targetJid: ctx.remoteJid,
    actionText: 'volta a texto', actionArg: 'volta a texto', actionId: 'modo_so_texto',
    status: 'awaiting_confirmation', confirmExpiresAt: Date.now() + 60_000,
  };
  storage.value = [failureTask];
  storage.set = async () => { throw new Error('persistência indisponível'); };
  execution = null;
  await scheduler.handleMessage({ sock: taskSock, msg: ownerMsg, ctx, texto: 'CONFIRMAR TAREFA DEADBEEF', isOwner: true });
  check('falha ao persistir a confirmação bloqueia a execução', execution === null && storage.value[0]?.id === 'DEADBEEF');
  storage.set = async function (v) { this.value = v; };
  const otherCtx = { ...ctx, remoteJid: '222@s.whatsapp.net', senderNumber: '222' };
  await scheduler.handleMessage({ sock: taskSock, msg: { key: { fromMe: false, remoteJid: otherCtx.remoteJid }, message: {} }, ctx: otherCtx, texto: 'CONFIRMAR TAREFA DEADBEEF', isOwner: false });
  check('outro utilizador não pode confirmar a tarefa do Dono', execution === null && storage.value[0]?.id === 'DEADBEEF');
  await scheduler.handleMessage({ sock: taskSock, msg: ownerMsg, ctx, texto: 'CANCELAR TAREFA DEADBEEF', isOwner: true });
  check('cancelamento explícito remove a tarefa sem executar', execution === null && storage.value.length === 0);

  scheduler.__test._setStoreForTests(null);
  dbValues.set('aura_scheduled_actions', [{ ...failureTask, id: 'BADC0FFE', status: 'awaiting_confirmation', confirmExpiresAt: Date.now() + 60_000 }]);
  await scheduler.handleMessage({ sock: taskSock, msg: ownerMsg, ctx, texto: 'CONFIRMAR TAREFA BADC0FFE', isOwner: true });
  check('confirmação no caminho Mongo remove atomicamente antes da execução', execution?.id === 'modo_so_texto' && dbValues.get('aura_scheduled_actions').length === 0);

  console.log(`\n${passed} verificações passaram.`);
})().catch(err => {
  console.error('❌ Falha:', err.stack || err);
  process.exitCode = 1;
});
