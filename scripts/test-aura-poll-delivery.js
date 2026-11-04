#!/usr/bin/env node
'use strict';
/** Regressão da rota real AURA → auraExec → auraVotacao → payload WhatsApp. */

const assert = require('assert');
const exec = require('../src/aura/auraExec');
const agent = require('../src/aura/auraAgent');

(async () => {
  const sent = [];
  const jid = '120363000000@g.us';
  const sock = {
    sendMessage: async (target, content, options) => {
      sent.push({ target, content, options });
      return { key: { id: 'poll-route-test', remoteJid: target } };
    },
  };
  const text = 'cria uma enquete "Qual formato preferes?" | Áudio | Vídeo | Texto';
  const plan = agent.buildPlan(text);
  assert.strictEqual(plan.steps.length, 1);
  assert.strictEqual(plan.steps[0].actionId, 'criar_enquete', 'planeador escolhe a capacidade real da enquete');
  assert.strictEqual(plan.steps[0].input, text, 'planeador preserva as opções do Dono');

  const result = await exec.executar('criar_enquete', text, {
    sock,
    msg: { key: { id: 'command-test', remoteJid: jid }, message: {} },
    ctx: { remoteJid: jid, isGroup: true, senderNumber: '244900000000' },
    texto: text,
    contextoTexto: text,
    isOwner: true,
    isAdmin: true,
    confirmado: true,
  });

  assert.strictEqual(result.ok, true, 'executor confirma criação');
  assert.strictEqual(sent.length, 1, 'envia uma única mensagem');
  assert.strictEqual(sent[0].target, jid);
  assert.strictEqual(sent[0].content.poll.name, 'Qual formato preferes?');
  assert.deepStrictEqual(sent[0].content.poll.values.map(value => value.optionName), ['Áudio', 'Vídeo', 'Texto']);
  assert.strictEqual(sent[0].content.poll.selectableCount, 1);
  console.log('AURA POLL DELIVERY: executor → parser → payload WhatsApp aprovados.');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
