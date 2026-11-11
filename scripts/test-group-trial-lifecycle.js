#!/usr/bin/env node
/**
 * Regressões de licença ao adicionar/re-adicionar o bot a um grupo.
 * Isolado de MongoDB e WhatsApp reais.
 */
'use strict';
const assert = require('assert/strict');
const Module = require('module');
const originalRequire = Module.prototype.require;
const groups = new Map();

function documentFor(data) {
  const doc = { ...data };
  Object.defineProperty(doc, 'save', {
    enumerable: false,
    value: async () => { groups.set(doc.groupJid, doc); return doc; },
  });
  return doc;
}

Module.prototype.require = function patchedRequire(id) {
  const request = String(id);
  if (request.endsWith('models/GroupSettings')) {
    return {
      findOne: ({ groupJid }) => ({
        lean: async () => {
          const row = groups.get(groupJid);
          return row ? { ...row } : null;
        },
        catch: async () => groups.get(groupJid) || null,
      }),
      create: async (data) => {
        const doc = documentFor(data);
        groups.set(doc.groupJid, doc);
        return doc;
      },
    };
  }
  if (request.endsWith('/config')) {
    return { bot: { name: 'DARK BOT', prefix: '!' }, owner: { name: 'Dono', number: '244900000001' } };
  }
  if (request.endsWith('botConfigCache')) return { get: async (_key, fallback) => fallback, set: async () => {} };
  if (request.endsWith('changeThemes')) return { getTheme: () => ({}) };
  if (request.endsWith('welcomeImage')) return { generateWelcomeImage: async () => null };
  if (request.endsWith('welcomeArt')) return { artCard: async () => null, artGif: async () => null };
  if (request.endsWith('liveBroadcaster')) return { groupEvent: () => {} };
  if (request.endsWith('centralBase')) return { capturarGrupo: () => {} };
  return originalRequire.apply(this, arguments);
};

const G = '120363-trial-lifecycle@g.us';
const botJid = '244900000002@s.whatsapp.net';
const sent = [];
const sock = {
  user: { id: botJid },
  groupMetadata: async () => ({ subject: 'Grupo Trial', participants: [{ id: botJid, admin: 'admin' }] }),
  sendMessage: async (_jid, content) => { sent.push(content); return { key: { id: 'test' } }; },
};

(async () => {
  delete require.cache[require.resolve('../src/bot/groupEvents')];
  const groupEvents = require('../src/bot/groupEvents');
  const addBot = async () => groupEvents.handle(sock, { id: G, action: 'add', participants: [botJid] });

  await addBot();
  const first = groups.get(G);
  const firstExpiry = first?.trialExpiresAt?.getTime();
  assert.ok(first?.trialUsedAt instanceof Date, 'primeira entrada grava trialUsedAt');
  assert.ok(firstExpiry > Date.now() + 6.9 * 86400000, 'primeira entrada concede 7 dias');
  assert.equal(sent.length, 0, 'entrada padrão não anuncia trial sem opt-in');
  console.log('  ✅ primeira entrada concede trial único de 7 dias em silêncio');

  first.trialExpiresAt = new Date(Date.now() - 1000);
  const firstUsedAt = first.trialUsedAt.getTime();
  await addBot();
  const readded = groups.get(G);
  assert.ok(readded.trialExpiresAt.getTime() < Date.now(), 're-add não renova trial expirado');
  assert.equal(readded.trialUsedAt.getTime(), firstUsedAt, 're-add preserva historial de uso');
  console.log('  ✅ re-add não renova trial expirado');

  const legacyJid = '120363-trial-legacy@g.us';
  const legacyExpiry = new Date(Date.now() - 86400000);
  groups.set(legacyJid, documentFor({ groupJid: legacyJid, groupName: 'Legado', isHosted: false, trialExpiresAt: legacyExpiry }));
  await groupEvents.handle(sock, { id: legacyJid, action: 'add', participants: [botJid] });
  const legacy = groups.get(legacyJid);
  assert.equal(legacy.trialExpiresAt.getTime(), legacyExpiry.getTime(), 'histórico legado com data expirada não recicla trial');
  assert.equal(legacy.trialUsedAt, undefined, 'não inventa um novo uso ao re-add legado');
  console.log('  ✅ histórico legado expirado também não recebe novo trial');

  const hostedJid = '120363-trial-hosted@g.us';
  groups.set(hostedJid, documentFor({ groupJid: hostedJid, groupName: 'Permanente', isHosted: true, hostedUntil: null, trialExpiresAt: null }));
  await groupEvents.handle(sock, { id: hostedJid, action: 'add', participants: [botJid] });
  const hosted = groups.get(hostedJid);
  assert.equal(hosted.hostedUntil, null, 're-add não converte aluguel permanente');
  assert.equal(hosted.trialExpiresAt, null, 're-add sob aluguel não cria trial');
  console.log('  ✅ re-add preserva aluguel permanente sem criar trial');

  console.log('\n🎉 GROUP-TRIAL LIFECYCLE: 4 OK / 0 FALHOU\n');
})().catch((error) => {
  console.error('\n💥 GROUP-TRIAL LIFECYCLE:', error.message);
  process.exit(1);
});
