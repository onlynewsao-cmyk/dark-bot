'use strict';
/** v7.49 — NUVEM DO BOT: !mediaup/down/list/del guardam no MongoDB (sem Cloudinary) */
process.env.NODE_ENV = 'test';
delete process.env.CLOUDINARY_CLOUD_NAME;
delete process.env.CLOUDINARY_API_KEY;
delete process.env.CLOUDINARY_API_SECRET;
const Module = require('module');
const orig = Module.prototype.require;
const store = {};
const CloudMock = {
  findOneAndUpdate: async (q, d) => { store[d.name] = { ...d, _id: 'id_' + d.name }; return store[d.name]; },
  findOne: (q) => ({ lean: async () => { const re = q.name.$regex; const k = Object.keys(store).find(n => re.test(n)); return k ? { ...store[k] } : null; } }),
  findOneAndDelete: async (q) => { const re = q.name.$regex; const k = Object.keys(store).find(n => re.test(n)); if (!k) return null; const d = store[k]; delete store[k]; return d; },
  find: () => ({ sort: () => ({ limit: () => ({ lean: async () => Object.values(store) }) }) }),
};
Module.prototype.require = function (id) {
  if (String(id).endsWith('models/CloudMedia')) return CloudMock;
  if (String(id).endsWith('models/Media')) return { findOne: async () => null, find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }) };
  return orig.apply(this, arguments);
};
const nc = require('../src/bot/nativeCommands');
const mh = require('../src/bot/mediaHandler');
let fakeBuf = Buffer.from('imgdata-falsa');
mh.downloadFromMessage = async () => fakeBuf;
const out = [];
const sock = { sendMessage: async (jid, p) => { out.push(p); return { key: { id: 'x' } }; }, groupMetadata: async () => ({ participants: [] }) };
const ctx = { remoteJid: 'g@g.us', isGroup: true, senderNumber: '244900', isOwner: true, prefix: '!' };
const txt = () => out.map(p => p.text || '').join('\n');
const mkImg = () => ({ key: { id: 'i' }, message: { imageMessage: { mimetype: 'image/jpeg', url: 'x' } } });
const mkQuotedVid = () => ({ key: { id: 'v' }, message: { extendedTextMessage: { text: '!mup clipe', contextInfo: { quotedMessage: { videoMessage: { mimetype: 'video/mp4' } } } } } });
const mkQuotedAud = () => ({ key: { id: 'a' }, message: { extendedTextMessage: { text: '!mup som', contextInfo: { quotedMessage: { audioMessage: { mimetype: 'audio/mpeg' } } } } } });
(async () => {
  let ok = 0, fail = 0;
  const C = (n, c, x = '') => { if (c) ok++; else fail++; console.log(c ? '  ✅' : '  ❌', n, c ? '' : x); };
  out.length = 0; await nc.mup({ sock, msg: mkImg(), ctx, args: ['logo'], isOwner: true, config: {} });
  C('mup guarda na nuvem do bot', /Mídia guardada/.test(txt()) && /Nuvem do bot/.test(txt()), txt());
  C('bytes persistidos', store.logo && store.logo.data.length === fakeBuf.length && store.logo.type === 'image', JSON.stringify(Object.keys(store)));
  out.length = 0; await nc.mdown({ sock, msg: { key: { id: 'j' }, message: { conversation: '!mdown logo' } }, ctx, args: ['logo'] });
  C('mdown reenvia o buffer (image)', out.some(p => p.image && Buffer.isBuffer(p.image)), JSON.stringify(out.map(p => Object.keys(p))));
  out.length = 0; await nc.mup({ sock, msg: mkQuotedVid(), ctx, args: ['clipe'], isOwner: true, config: {} });
  C('mup citado deteta vídeo', store.clipe && store.clipe.type === 'video', JSON.stringify(store.clipe && store.clipe.type));
  out.length = 0; await nc.mup({ sock, msg: mkQuotedAud(), ctx, args: ['som'], isOwner: true, config: {} });
  C('mup citado deteta áudio', store.som && store.som.type === 'audio', JSON.stringify(store.som && store.som.type));
  out.length = 0; await nc.mlist({ sock, msg: { key: { id: 'k' }, message: {} }, ctx, isOwner: true });
  C('mlist junta com 🤖', /logo/.test(txt()) && /clipe/.test(txt()) && /🤖/.test(txt()), txt());
  fakeBuf = Buffer.alloc(11 * 1024 * 1024);
  out.length = 0; await nc.mup({ sock, msg: mkImg(), ctx, args: ['grande'], isOwner: true, config: {} });
  C('ficheiro >10MB recusado', /10MB/.test(txt()), txt());
  fakeBuf = Buffer.from('imgdata-falsa');
  C('>10MB não foi persistido', !store.grande);
  out.length = 0; await nc.mup({ sock, msg: mkImg(), ctx, args: ['axb'], isOwner: true, config: {} });
  out.length = 0; await nc.mdown({ sock, msg: { key: { id: 'j2' }, message: {} }, ctx, args: ['a.*'] });
  C('nome com .* não faz match global (regex escapado)', /não encontrada/.test(txt()), txt());
  out.length = 0; await nc.mdel({ sock, msg: { key: { id: 'l' }, message: {} }, ctx, args: ['logo'], isOwner: true });
  C('mdel apaga da nuvem do bot', /apagada da nuvem do bot/.test(txt()), txt());
  out.length = 0; await nc.mdown({ sock, msg: { key: { id: 'j3' }, message: {} }, ctx, args: ['logo'] });
  C('apagado já não existe', /não encontrada/.test(txt()), txt());
  out.length = 0; await nc.mup({ sock, msg: mkImg(), ctx, args: ['x'], isOwner: false, config: {} });
  C('não-dono bloqueado no up', /Só Dono/.test(txt()), txt());
  out.length = 0; await nc.mdel({ sock, msg: { key: { id: 'l2' }, message: {} }, ctx, args: ['x'], isOwner: false });
  C('não-dono bloqueado no del', /Só Dono/.test(txt()), txt());
  out.length = 0; await nc.mup({ sock, msg: { key: { id: 'i2' }, message: { conversation: 'x' } }, ctx, args: [], isOwner: true, config: {} });
  C('mup sem mídia avisa', /Responde\/envias/.test(txt()), txt());
  console.log(`\n${fail ? '💥' : '🎉'} MEDIACLOUD: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
