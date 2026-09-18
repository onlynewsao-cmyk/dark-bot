'use strict';
/** v7.87 — RPG MUNDO FECHADO: grupo sem modo = fechado; sem personagem = só portal */
const Module = require('module');
const orig = Module.prototype.require;

const GS = {};   // jid → settings
const CHARS = {}; // num → player
const COM = { communityJid: 'C@g.us', groups: { arena: 'A@g.us' }, clans: {} };

Module.prototype.require = function (id) {
  if (id === '../hotCache') return { getGroupSettings: async (m, jid) => GS[jid] || null };
  if (id === './community') return { loadState: async () => COM, isCommunityGroup: (j) => j === COM.communityJid || j === COM.groups.arena };
  if (id.endsWith('models/RPGPlayer')) {
    return { findOne: async (f) => CHARS[String(f?.whatsappNumber || '').replace(/\D/g, '')] || null };
  }
  if (id === '../botConfigCache') {
    return { get: async (k, d) => (global.__flag || d), set: async (k, v) => { global.__flag = v; } };
  }
  return orig.apply(this, arguments);
};

const gate = require('../src/bot/rpg/gate');
let ok = 0, fail = 0;
const t = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

const G_ON = '1@g.us', G_OFF = '2@g.us', PV = '244901@s.whatsapp.net';
GS[G_ON] = { groupJid: G_ON, modorpg: true };
GS[G_OFF] = { groupJid: G_OFF, modorpg: false };
CHARS['244901'] = { whatsappNumber: '244901', name: 'Kira', started: true };
CHARS['244902'] = { whatsappNumber: '244902', name: 'Aventureiro', started: false, raceBonusApplied: false };

(async () => {
  const v = (cmd, ctx) => gate.verificar(cmd, ctx);

  t('grupo sem modo: lutar bloqueado', (await v('lutar', { isGroup: true, remoteJid: G_OFF, senderNumber: '244901' }))?.includes('!modorpg on'));
  t('grupo sem modo: até o portal fecha', (await v('rpgstart', { isGroup: true, remoteJid: G_OFF, senderNumber: '244902' }))?.includes('!modorpg on'));
  t('grupo com modo + sem char: lutar pede personagem', (await v('lutar', { isGroup: true, remoteJid: G_ON, senderNumber: '244902' }))?.includes('!rpgstart'));
  t('grupo com modo + char: jogar livre', (await v('lutar', { isGroup: true, remoteJid: G_ON, senderNumber: '244901' })) === null);
  t('char implícita (Aventureiro sem started) não conta', (await v('explorar', { isGroup: true, remoteJid: G_ON, senderNumber: '244902' }))?.includes('!rpgstart'));
  t('PV sem char: pede personagem', (await v('explorar', { isGroup: false, remoteJid: PV, senderNumber: '244902' }))?.includes('!rpgstart'));
  t('PV sem char: portal aberto', (await v('rpgstart', { isGroup: false, remoteJid: PV, senderNumber: '244902' })) === null);
  t('vitrine sem char: rank passa', (await v('rankrpg', { isGroup: true, remoteJid: G_ON, senderNumber: '244902' })) === null);
  t('vitrine sem char: mapa passa', (await v('mapa', { isGroup: true, remoteJid: G_ON, senderNumber: '244902' })) === null);
  t('setup livre: setarena em grupo fechado', (await v('setarena', { isGroup: true, remoteJid: G_OFF, senderNumber: '244902' })) === null);
  t('menus livres: menurpg em grupo fechado', (await v('menurpg', { isGroup: true, remoteJid: G_OFF, senderNumber: '244902' })) === null);
  t('não-RPG passa sempre', (await v('play', { isGroup: true, remoteJid: G_OFF, senderNumber: '244902' })) === null);
  t('char por raceBonusApplied (veterano) conta', (async () => { CHARS['244903'] = { name: 'Aventureiro', raceBonusApplied: true }; return (await v('quest', { isGroup: true, remoteJid: G_ON, senderNumber: '244903' })) === null; })());
  t('char por nome próprio conta', (async () => { CHARS['244904'] = { name: 'Shadow', started: false }; return (await v('inventario', { isGroup: true, remoteJid: G_ON, senderNumber: '244904' })) === null; })());

  // v7.88 — comunidade = mundo internacional sempre aberto
  t('comunidade: grupo principal joga sem modorpg', (await v('lutar', { isGroup: true, remoteJid: 'C@g.us', senderNumber: '244901' })) === null);
  t('comunidade: grupo-arena também aberto', (await v('explorar', { isGroup: true, remoteJid: 'A@g.us', senderNumber: '244901' })) === null);
  t('comunidade: sem char continua a pedir registo', (await v('lutar', { isGroup: true, remoteJid: 'C@g.us', senderNumber: '244902' }))?.includes('!rpgstart'));

  // v7.88 — reset único do mundo
  let del = 0;
  global.__flag = false;
  const prevReq = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id.endsWith('models/RPGPlayer')) return { deleteMany: async () => { del++; return { deletedCount: 3 }; } };
    return prevReq.apply(this, arguments);
  };
  const reset = require('../src/bot/rpg/reset788');
  const r1 = await reset.run();
  const r2 = await reset.run();
  t('reset: 1.ª vez zera o mundo', r1 === true && del === 1);
  t('reset: 2.ª vez não mexe', r2 === false && del === 1);

  console.log(`\n${fail ? '💥' : '🎉'} RPG-MUNDO: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
