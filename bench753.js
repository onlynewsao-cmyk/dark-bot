'use strict';
// Bench one-shot v7.53: tempo do pipeline handle() com latências realistas
// (Atlas ~40ms, groupMetadata ~60ms). Correr antes/depois das mudanças.
process.env.OWNER_NUMBER = '244900000001';
const Module = require('module'); const orig = Module.prototype.require;
const LAT = (v, ms) => { const p = new Promise(r => setTimeout(() => r(v), ms)); p.lean = () => p; p.select = () => p; p.sort = () => p; p.limit = () => p; p.catch = () => p; return p; };
Module.prototype.require = function (id) {
  const s = String(id);
  const hydrate = (o) => (o ? { ...o, save: async () => {} } : null); // simula Model.hydrate do mongoose
  const withSave = (o) => ({ ...o, save: async () => {} });
  if (/models[\\/]User/.test(s)) return { findOne: () => LAT(withSave({ whatsappNumber: '1', role: 'free' }), 40), findOneAndUpdate: async () => null, hydrate };
  if (/models[\\/]GroupSettings/.test(s)) return { findOne: () => LAT(withSave({ groupJid: 'g', antispam: false, isHosted: true, hostedUntil: new Date(Date.now() + 86400000) }), 40), findOneAndUpdate: async () => null, create: async () => ({}), hydrate };
  if (/models[\\/]/.test(s)) return { find: () => LAT([], 0), findOne: () => LAT(null, 0), findOneAndUpdate: async () => null, countDocuments: async () => 0, create: async () => ({}), get: async (k, d) => d, set: async () => {} };
  if (s.endsWith('botConfigCache')) return { get: async (k, d) => d, set: async () => {} };
  return orig.apply(this, arguments);
};
(async () => {
  const ch = require('/home/user/darknet-tunnel/src/bot/caseHandler'); ch.loadCases();
  const cmdH = require('/home/user/darknet-tunnel/src/bot/commandHandler');
  const G = '120363000000@g.us', N = '244911111111';
  const mkSock = () => ({
    user: { id: '1:2@s.whatsapp.net' },
    sendMessage: async () => ({ key: { id: 'x' } }),
    groupMetadata: async () => { await new Promise(r => setTimeout(r, 60)); return { subject: 'G', participants: [{ id: N + '@s.whatsapp.net', admin: null }] }; },
  });
  const mkMsg = (t) => ({ key: { remoteJid: G, id: 'm' + Math.random(), fromMe: false, participant: N + '@s.whatsapp.net' }, pushName: 'Z', message: { conversation: t } });
  // warmup: prefixos + groupMeta + cases
  await cmdH.handle(mkSock(), mkMsg('.ping'));
  const ts = [];
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    await cmdH.handle(mkSock(), mkMsg('.ping'));
    ts.push(Date.now() - t0);
  }
  console.log('.ping grupo (Atlas 40ms, meta 60ms):', ts.join('ms, ') + 'ms | média ' + (ts.reduce((a, b) => a + b, 0) / ts.length).toFixed(0) + 'ms');
  process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
