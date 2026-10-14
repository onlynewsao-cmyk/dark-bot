'use strict';
const assert = require('assert/strict');
const Module = require('module');
const path = require('path');

const confirmationPath = path.resolve(__dirname, '../src/aura/auraConfirmacao.js');
const execPath = path.resolve(__dirname, '../src/aura/auraExec.js');
const destructive = new Map([
  ['canal_apagar', { risco: 'destrutivo', nivel: 'dono' }],
  ['sair_grupo', { risco: 'destrutivo', nivel: 'dono' }],
  ['limpar_chat', { risco: 'destrutivo', nivel: 'dono' }],
]);
const fakeBrain = {
  POR_ID: destructive,
  modos: () => ({}),
  podeFazer: (_cap, { isOwner }) => ({ pode: !!isOwner }),
};
let destructiveEffects = 0;
const fakeMega = {
  leaveGroup: async () => { destructiveEffects++; return { success: true }; },
};
const calls = [];
const fakeExec = {
  executar: async (id, arg, opts) => {
    calls.push({ id, arg, confirmado: opts.confirmado });
    return { ok: true, msg: 'Acção executada.' };
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (parent?.filename === confirmationPath && request === './auraBrain') return fakeBrain;
  if (parent?.filename === confirmationPath && request === './auraExec') return fakeExec;
  if (parent?.filename === execPath && request === './auraBrain') return fakeBrain;
  if (parent?.filename === execPath && request === './actions/megaActions') return fakeMega;
  return originalLoad.call(this, request, parent, isMain);
};
const confirmation = require(confirmationPath);
const auraExec = require(execPath);

const sent = [];
const sock = { sendMessage: async (...args) => { sent.push(args); } };
const ownerCtx = {
  remoteJid: '120363000000000000@g.us',
  senderNumber: '244900000001',
  senderJid: '244900000001@s.whatsapp.net',
  groupName: 'Grupo de teste',
  isGroup: true,
};
const msg = { key: { id: 'msg-confirm' } };

(async () => {
  const request = confirmation.pedir({
    id: 'sair_grupo', arg: '', texto: 'sai do grupo', ctx: ownerCtx, isOwner: true,
  });
  assert.equal(request.necessaria, true);
  assert.match(request.mensagem, /CONFIRMAR/);
  assert.match(request.mensagem, /CANCELAR/);

  const strangerCtx = { ...ownerCtx, senderNumber: '244900000002', senderJid: '244900000002@s.whatsapp.net' };
  assert.equal(await confirmation.processar({ sock, msg, ctx: strangerCtx, texto: 'CONFIRMAR', isOwner: true }), false);
  assert.equal(await confirmation.processar({ sock, msg, ctx: ownerCtx, texto: 'sim', isOwner: true }), false);
  assert.equal(calls.length, 0, 'must not run for another sender or an ambiguous yes');

  assert.equal(await confirmation.processar({ sock, msg, ctx: ownerCtx, texto: 'CONFIRMAR', isOwner: true }), true);
  assert.deepEqual(calls, [{ id: 'sair_grupo', arg: '', confirmado: true }]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], ownerCtx.senderJid, 'leave-group result should be delivered privately');

  const cancelRequest = confirmation.pedir({
    id: 'limpar_chat', texto: 'limpa o chat', ctx: ownerCtx, isOwner: true,
  });
  assert.equal(cancelRequest.necessaria, true);
  assert.equal(await confirmation.processar({ sock, msg, ctx: ownerCtx, texto: 'CANCELAR', isOwner: true }), true);
  assert.equal(calls.length, 1, 'cancel must not execute the destructive action');

  const execCtx = { ...ownerCtx, remoteJid: 'another-group@g.us' };
  const blocked = await auraExec.executar('sair_grupo', '', {
    sock: {}, msg, ctx: execCtx, texto: 'sai do grupo', isOwner: true, isAdmin: false,
  });
  assert.equal(blocked.confirmacaoNecessaria, true);
  assert.equal(destructiveEffects, 0, 'executor must refuse a direct unconfirmed call');
  const allowed = await auraExec.executar('sair_grupo', '', {
    sock: {}, msg, ctx: execCtx, texto: 'sai do grupo', isOwner: true, isAdmin: false, confirmado: true,
  });
  assert.equal(allowed.ok, true);
  assert.equal(destructiveEffects, 1, 'confirmed action should execute exactly once');

  const cerebro = require('../src/aura/auraCerebro');
  const aiCtx = { ...ownerCtx, remoteJid: 'ai-action-group@g.us' };
  const actionResult = await cerebro.executarAcoes([{ id: 'sair_grupo', arg: '' }], {
    sock, msg, ctx: aiCtx, texto: 'sai do grupo', isOwner: true, isAdmin: false,
    isVip: false, caseHandler: null, config: { bot: { prefix: '!' }, owner: {} },
  });
  assert.equal(actionResult.executadas, 0);
  assert.equal(actionResult.respostas.length, 1);
  assert.match(actionResult.respostas[0], /Confirmação necessária/);
  assert.equal(await confirmation.processar({ sock, msg, ctx: aiCtx, texto: 'CONFIRMAR', isOwner: true }), true);
  assert.equal(calls.length, 2, 'AI-originated action must follow the confirmation flow too');

  console.log('AURA CONFIRMATION: OK / 0 falhas');
  Module._load = originalLoad;
})().catch(err => {
  Module._load = originalLoad;
  console.error(err);
  process.exitCode = 1;
});
