#!/usr/bin/env node
'use strict';

const assert = require('assert');
const Module = require('module');
const originalRequire = Module.prototype.require;
const store = new Map();

Module.prototype.require = function (id) {
  if (id === '../bot/botConfigCache') {
    return {
      get: async (key, fallback) => store.has(key) ? store.get(key) : fallback,
      set: async (key, value) => { store.set(key, value); return value; },
    };
  }
  return originalRequire.apply(this, arguments);
};

const caps = {
  seguro: { id: 'seguro', desc: 'Acção segura de teste', risco: 'seguro', nivel: 'dono' },
  seguro_2: { id: 'seguro_2', desc: 'Segunda acção segura de teste', risco: 'seguro', nivel: 'dono' },
  apagar: { id: 'apagar', desc: 'Acção destrutiva de teste', risco: 'destrutivo', nivel: 'dono' },
};
const brain = {
  POR_ID: new Map(Object.entries(caps)),
  detectarCapacidade: text => {
    const id = /apaga/i.test(text) ? 'apagar' : /segunda/i.test(text) ? 'seguro_2' : /segura/i.test(text) ? 'seguro' : null;
    return id ? { id, cap: caps[id], via: 'catalogo' } : null;
  },
  podeFazer: () => ({ pode: true }),
};
const runtime = {
  isOwner: true,
  isAdmin: true,
  sock: {}, msg: { key: { id: 'm1' } },
  ctx: { remoteJid: '120363111111@g.us', isGroup: true },
};
const advanced = { detectarMulti: () => [] };

(async () => {
  const agent = require('../src/aura/auraAgent');
  const jid = runtime.ctx.remoteJid;
  const invocations = [];
  const executor = {
    executar: async (id, arg, opts) => {
      invocations.push({ id, arg, opts });
      return { ok: true, msg: `Resultado confirmado de ${id}` };
    },
  };
  const services = { brain, executor };

  await agent.setEnabled(jid, true);
  await agent.createPlan(jid, 'ação segura', { brain, advanced });
  let result = await agent.executeStep(jid, undefined, runtime, services);
  assert.strictEqual(result.ok, true, 'executa passo seguro');
  assert.strictEqual(result.step.status, 'concluida');
  assert.strictEqual(result.task.status, 'concluida', 'fecha tarefa só após retorno ok do executor');
  assert.strictEqual(invocations.length, 1);
  assert.strictEqual(invocations[0].opts.confirmado, true, 'executor só recebe acção após gate do agente');

  await agent.createPlan(jid, 'apaga o recurso', { brain, advanced });
  result = await agent.executeStep(jid, 1, runtime, services);
  assert.strictEqual(result.confirmationRequired, true, 'destrutiva pede confirmação antes de executar');
  assert.match(result.code, /^CONF-[A-F0-9]{8}$/);
  assert.strictEqual(invocations.length, 1, 'não chamou executor antes da confirmação');
  await assert.rejects(() => agent.confirmStep(jid, 'CONF-ERRADO', runtime, services), /inválido/);
  assert.strictEqual(invocations.length, 1, 'código errado nunca executa');
  result = await agent.confirmStep(jid, result.code, runtime, services);
  assert.strictEqual(result.ok, true, 'código correcto executa uma vez');
  assert.strictEqual(invocations.length, 2);
  await assert.rejects(() => agent.confirmStep(jid, 'CONF-QUALQUER', runtime, services), /Não há confirmação pendente/);

  await agent.createPlan(jid, 'pedido sem ferramenta real', { brain, advanced });
  result = await agent.executeStep(jid, 1, runtime, services);
  assert.strictEqual(result.blocked, true, 'pedido sem capacidade real fica bloqueado');
  assert.strictEqual(invocations.length, 2, 'nunca inventa nem chama ferramenta inexistente');

  const multi = {
    detectarMulti: () => [
      { id: 'seguro', cap: caps.seguro, via: 'catalogo', texto: 'ação segura' },
      { id: 'seguro_2', cap: caps.seguro_2, via: 'catalogo', texto: 'segunda ação' },
    ],
  };
  await agent.createPlan(jid, 'ação segura e depois segunda ação', { brain, advanced: multi });
  await assert.rejects(() => agent.executeStep(jid, 2, runtime, services), /primeiro o passo 1/);
  result = await agent.executeStep(jid, 1, runtime, services);
  assert.strictEqual(result.task.status, 'planeada', 'mantém plano aberto até todos os passos concluídos');
  result = await agent.executeStep(jid, 2, runtime, services);
  assert.strictEqual(result.task.status, 'concluida');

  await agent.createPlan(jid, 'ação segura', { brain, advanced });
  const failingExecutor = { executar: async () => ({ ok: false, msg: 'Falha verificável do provider' }) };
  result = await agent.executeStep(jid, 1, runtime, { brain, executor: failingExecutor });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.task.status, 'pausada', 'falha pausa em vez de repetir automaticamente');
  await assert.rejects(() => agent.executeStep(jid, 1, runtime, services), /pausada/);

  await agent.setEnabled(jid, false);
  const state = await agent.load(jid);
  assert.strictEqual(state.enabled, false);
  assert.strictEqual(state.task, null, 'desligar remove tarefa activa sem apagar auditoria');
  assert.ok(state.history.length >= 1, 'histórico preserva tarefas arquivadas');
  assert.match(agent.formatHistory(state), /AUDITORIA/);

  console.log('AURA AGENT STEP 2: execução sequencial, confirmação, pausa e auditoria aprovadas.');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
}).finally(() => { Module.prototype.require = originalRequire; });
