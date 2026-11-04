#!/usr/bin/env node
'use strict';
/** Regressão: !addai só confirma Meta AI após validação no metadata do grupo. */
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const META = '867051314767696@bot';
const target = path.join(__dirname, '..', 'src', 'bot', 'cases', 'online.js');
const registered = new Map();
require(target)((names, fn) => [].concat(names).forEach((name) => registered.set(name, fn)));
const addai = registered.get('addai');
assert.strictEqual(typeof addai, 'function', '!addai deve ter handler canónico');

async function execute({ before = [], result = [{ jid: META, status: '200' }], after = [META], isAdmin = true }) {
  const replies = [];
  const calls = [];
  let reads = 0;
  const sock = {
    groupMetadata: async () => {
      reads++;
      const ids = reads === 1 ? before : after;
      return { participants: ids.map((id) => ({ id })) };
    },
    groupParticipantsUpdate: async (jid, jids, action) => {
      calls.push({ jid, jids, action });
      return result;
    },
  };
  await addai({
    m: { reply: async (text) => replies.push(text) }, sock,
    ctx: { isGroup: true, isOwner: false, remoteJid: 'grupo@g.us' },
    isOwner: false, isAdminFn: async () => isAdmin,
  });
  return { replies, calls, reads };
}

(async () => {
  let r = await execute({});
  assert.strictEqual(r.calls.length, 1, 'tenta adicionar uma vez');
  assert.deepStrictEqual(r.calls[0].jids, [META], 'usa o bot-JID oficial da Meta AI');
  assert.strictEqual(r.calls[0].action, 'add');
  assert.strictEqual(r.reads, 2, 'confirma o participante após a solicitação');
  assert(/adicionada e confirmada/i.test(r.replies[0]), 'só anuncia sucesso confirmado');

  r = await execute({ result: [{ jid: META, status: '403' }], after: [] });
  assert.strictEqual(r.reads, 1, 'não finge confirmação após recusa');
  assert(/não pôde ser adicionada/i.test(r.replies[0]), 'recusa recebe explicação honesta');
  assert(/status 403/i.test(r.replies[0]), 'status do WhatsApp fica visível para diagnóstico');

  r = await execute({ before: [META] });
  assert.strictEqual(r.calls.length, 0, 'não tenta adicionar novamente quando já é participante');
  assert(/já está neste grupo/i.test(r.replies[0]), 'informa que Meta AI já existe');

  r = await execute({ isAdmin: false });
  assert.strictEqual(r.calls.length, 0, 'não tenta sem admin');
  assert(/Só admins/i.test(r.replies[0]), 'exige admin');

  const allSources = ['extraCases.js', 'ia2.js', 'online.js']
    .map((file) => fs.readFileSync(path.join(__dirname, '..', 'src', 'bot', 'cases', file), 'utf8'))
    .join('\n');
  assert.strictEqual((allSources.match(/registerCase\(\['addai/g) || []).length, 1, 'não existem handlers !addai duplicados');
  console.log('META AI: adição confirmada, recusa honesta e handler único aprovados.');
})().catch((error) => {
  console.error('META AI: FAIL:', error.stack || error.message);
  process.exitCode = 1;
});
