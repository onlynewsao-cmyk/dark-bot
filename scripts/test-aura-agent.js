#!/usr/bin/env node
'use strict';

const assert = require('assert');
const Module = require('module');
const originalRequire = Module.prototype.require;
const store = new Map();

Module.prototype.require = function (id) {
  if (id === '../bot/botConfigCache' || id === '../../bot/botConfigCache') {
    return {
      get: async (key, fallback) => store.has(key) ? store.get(key) : fallback,
      set: async (key, value) => { store.set(key, value); return value; },
    };
  }
  return originalRequire.apply(this, arguments);
};

(async () => {
  const agent = require('../src/aura/auraAgent');
  const jid = '120363000000@g.us';
  assert.notStrictEqual(agent.stateKey(jid), agent.stateKey('outro@g.us'), 'estado é isolado por chat');

  let state = await agent.load(jid);
  assert.strictEqual(state.enabled, false, 'agente começa desligado');
  await agent.setEnabled(jid, true);
  state = await agent.load(jid);
  assert.strictEqual(state.enabled, true, 'Dono liga o agente por chat');

  const cap = { id: 'criar_enquete', desc: 'Criar uma enquete no grupo', risco: 'seguro' };
  const plan = agent.buildPlan('cria uma enquete e depois fecha o grupo', {
    brain: { detectarCapacidade: () => null },
    advanced: { detectarMulti: () => [{ id: cap.id, cap, via: 'catalogo', texto: 'cria uma enquete' }] },
  });
  assert.strictEqual(plan.steps.length, 1, 'plano usa somente capacidades reais reconhecidas');
  assert.strictEqual(plan.steps[0].actionId, 'criar_enquete');
  assert.match(agent.formatPlan(plan, '!'), /criar_enquete/);

  const unknown = agent.buildPlan('resolve tudo magicamente', {
    brain: { detectarCapacidade: () => null }, advanced: { detectarMulti: () => [] },
  });
  assert.strictEqual(unknown.steps[0].actionId, '', 'não inventa ferramenta para tarefa desconhecida');

  const destructive = agent.buildPlan('apaga o canal', {
    brain: { detectarCapacidade: () => ({ id: 'canal_apagar', cap: { id: 'canal_apagar', desc: 'Apagar canal', risco: 'destrutivo' }, via: 'catalogo' }) },
    advanced: { detectarMulti: () => [] },
  });
  assert.strictEqual(destructive.steps[0].confirmationRequired, true, 'plano destaca confirmação para acção destrutiva');

  const saved = await agent.createPlan(jid, 'cria uma enquete', {
    brain: { detectarCapacidade: () => ({ id: cap.id, cap, via: 'catalogo' }) },
    advanced: { detectarMulti: () => [] },
  });
  assert.ok(saved.id.startsWith('AG-'), 'tarefa recebe ID auditável');
  assert.match(agent.formatStatus(await agent.load(jid), '!'), /Tarefa activa/);

  let registered = null;
  require('../src/bot/cases/auraAgent')((aliases, fn) => { registered = { aliases, fn }; });
  assert.deepStrictEqual(registered.aliases, ['auraagent', 'agenteaura', 'agentmode'], 'case regista todos os aliases');
  const replies = [];
  await registered.fn({ args: [], text: '', prefix: '!', isOwner: false, reply: async text => replies.push(text) });
  assert.match(replies[0], /exclusivo do Dono/, 'case bloqueia não-Dono antes de qualquer acção');
  replies.length = 0;
  await registered.fn({ args: [], text: '', prefix: '!', isOwner: true, reply: async text => replies.push(text) });
  assert.match(replies[0], /etapas 1 e 2/, 'case mostra uso auditável ao Dono');

  const executeStepOriginal = agent.executeStep;
  let receivedStep = null;
  agent.executeStep = async (_jid, step, runtime) => {
    receivedStep = { step, runtime };
    return { ok: true, step: { index: step, description: 'Teste', actionId: 'criar_enquete' }, message: 'Executor confirmou.' };
  };
  replies.length = 0;
  await registered.fn({
    args: ['executar', '2'], text: 'executar 2', prefix: '!', isOwner: true,
    isAdminFn: async () => true, sock: {}, msg: {}, ctx: { remoteJid: jid },
    reply: async text => replies.push(text),
  });
  assert.strictEqual(receivedStep.step, 2, 'case encaminha o número do passo ao executor do agente');
  assert.strictEqual(receivedStep.runtime.isOwner, true, 'case preserva contexto de Dono na execução');
  assert.match(replies[0], /concluído e verificado/, 'case apresenta resultado verificado');
  agent.executeStep = async () => ({ ok: true, silent: true, step: { index: 1 }, message: 'não deve ser enviado' });
  replies.length = 0;
  await registered.fn({
    args: ['executar'], text: 'executar', prefix: '!', isOwner: true,
    isAdminFn: async () => true, sock: {}, msg: {}, ctx: { remoteJid: jid },
    reply: async text => replies.push(text),
  });
  assert.strictEqual(replies.length, 0, 'entrega nativa silenciosa não recebe texto extra do agente');
  agent.executeStep = executeStepOriginal;

  const recoverTaskOriginal = agent.recoverTask;
  let recoveredRuntime = null;
  agent.recoverTask = async (_jid, runtime) => {
    recoveredRuntime = runtime;
    return { steps: [{ index: 1 }] };
  };
  replies.length = 0;
  await registered.fn({
    args: ['recuperar'], text: 'recuperar', prefix: '!', isOwner: true,
    isAdminFn: async () => true, sock: {}, msg: {}, ctx: { remoteJid: jid },
    reply: async text => replies.push(text),
  });
  assert.strictEqual(recoveredRuntime.isOwner, true, 'case protege a recuperação com contexto de Dono');
  assert.match(replies[0], /resultado incerto/, 'case explica que recuperação não repete a ação');
  agent.recoverTask = recoverTaskOriginal;

  await agent.setEnabled(jid, false);
  state = await agent.load(jid);
  assert.strictEqual(state.enabled, false);
  assert.strictEqual(state.task, null, 'desligar limpa tarefa pendente');

  console.log('AURA AGENT STEP 1: controlo do Dono, plano auditável e estado isolado aprovados.');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
}).finally(() => { Module.prototype.require = originalRequire; });
