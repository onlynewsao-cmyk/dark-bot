'use strict';
/** v7.52 TURBO — regressão de performance:
 *  humanizer fast (omissão), hotCache (1 query/msg), skip de status,
 *  ffmpeg/yt-dlp async, flags do Node. */
delete process.env.HUMANIZE; // omissão tem de ser fast
process.env.OWNER_NUMBER = '244900000001';
const Module = require('module'); const orig = Module.prototype.require;
let N_USER = 0, N_GS = 0;
// Stubs COMPLETOS (padrão test-planos): o load de cases toca em vários
// métodos dos models; stubs mínimos partem o arranque.
const w = (v) => { const p = Promise.resolve(v); p.lean = () => p; p.select = () => p; p.sort = () => p; p.limit = () => p; p.catch = () => p; return p; };
const fullModels = { find: () => w([]), findOne: () => w(null), findOneAndUpdate: async () => null, countDocuments: async () => 0, create: async () => ({}), get: async (k, d) => d, set: async () => {} };
Module.prototype.require = function (id) {
  const s = String(id);
  if (/models[\\/]User/.test(s)) return { ...fullModels, findOne: () => { N_USER++; return w({ whatsappNumber: '1', role: 'free' }); } };
  if (/models[\\/]GroupSettings/.test(s)) return { ...fullModels, findOne: () => { N_GS++; return w({ groupJid: 'g', antispam: false }); } };
  if (/models[\\/]/.test(s)) return fullModels;
  if (s.endsWith('botConfigCache')) return { get: async (k, d) => d, set: async () => {} };
  return orig.apply(this, arguments);
};
(async () => {
  let ok = 0, fail = 0;
  const C = (n, c, x = '') => { if (c) ok++; else fail++; console.log(c ? '  ✅' : '  ❌', n, c ? '' : String(x).slice(0, 160)); };

  // ── 1. HUMANIZER fast por omissão ──
  const h = require('../src/bot/humanizer');
  C('humanizer omissão = fast', h._cfg.MODE === 'fast' && h._cfg.ON === true, JSON.stringify(h._cfg));
  const ev = [];
  const sock = {
    sendMessage: async (j, c) => { ev.push(['send', Object.keys(c)[0]]); return { key: { id: 'x' } }; },
    sendPresenceUpdate: async (p) => { ev.push(['presence', p]); },
    readMessages: async (k) => { ev.push(['read', k[0].id]); },
  };
  h.wrap(sock);
  h.notaRecebida({ key: { remoteJid: '1@s.whatsapp.net', id: 'M1', fromMe: false } });
  let t0 = Date.now();
  await sock.sendMessage('1@s.whatsapp.net', { text: 'resposta longa '.repeat(60) });
  const dt = Date.now() - t0;
  await new Promise(r => setTimeout(r, 50)); // presença é fire-and-forget
  C('fast: texto longo < 700ms (era 1.1–6.3s)', dt < 700, dt + 'ms');
  C('fast: mostra composing + lido', ev.some(e => e[1] === 'composing') && ev.some(e => e[0] === 'read'), JSON.stringify(ev));
  ev.length = 0; t0 = Date.now();
  await sock.sendMessage('2@s.whatsapp.net', { text: 'sistema' });
  C('fast: envio sistema < 400ms', Date.now() - t0 < 400, (Date.now() - t0) + 'ms');

  // ── 2. HOTCACHE: 1 query por doc por mensagem ──
  const hot = require('../src/bot/hotCache');
  const m1 = { key: { remoteJid: 'g@g.us', id: 'm1' } };
  N_USER = 0; N_GS = 0;
  const [u1, u2, g1, g2] = await Promise.all([
    hot.getUser(m1, '2449111'), hot.getUser(m1, '2449111'),
    hot.getGroupSettings(m1, 'g@g.us'), hot.getGroupSettings(m1, 'g@g.us'),
  ]);
  C('hotCache: 4 leituras paralelas → 1 User + 1 GS', N_USER === 1 && N_GS === 1, `u=${N_USER} gs=${N_GS}`);
  C('hotCache: mesma referência', u1 === u2 && g1 === g2);
  await hot.getUser({ key: { id: 'm2' } }, '2449111');
  C('hotCache: outra mensagem → nova query (sem velhos)', N_USER === 2, `u=${N_USER}`);

  // ── 3. ANTIS partilham o voo (4 módulos → 1 query) ──
  const antiSpam = require('../src/bot/antiSpam');
  const antiLink = require('../src/bot/antiLink');
  const antiTipos = require('../src/bot/antiTipos');
  const antiFoba = require('../src/bot/antiFoba');
  const gm = { key: { remoteJid: 'gg@g.us', participant: '244911111111@s.whatsapp.net', fromMe: false, id: 'mm' }, pushName: 'Z', message: { conversation: 'olá pessoal' } };
  const sock2 = { user: { id: '1:2@s.whatsapp.net' }, groupMetadata: async () => ({ subject: 'G', participants: [] }), sendMessage: async () => ({}), readMessages: async () => ({}) };
  N_GS = 0;
  const rr = await Promise.all([
    antiSpam.check(sock2, gm), antiLink.check(sock2, gm), antiTipos.check(sock2, gm), antiFoba.check(sock2, gm),
  ]);
  C('4 antis em paralelo → 1 GroupSettings.findOne', N_GS === 1, `gs=${N_GS} r=${JSON.stringify(rr)}`);

  // ── 4. ROUTER: status ignorado, resto passa ──
  const ch = require('../src/bot/commandHandler');
  const cham = [];
  const origH = ch.handle;
  ch.handle = async (s, m) => { cham.push(m.key?.remoteJid + '|' + (m.key?.id || '')); return true; };
  require('../src/bot/messageListener').onUpsert = async () => {};
  for (const m of ['../src/bot/antiLink', '../src/bot/antiSpam', '../src/bot/antiTipos', '../src/bot/antiFoba']) require(m).check = async () => false;
  delete require.cache[require.resolve('../src/bot/messageRouter')];
  const router = require('../src/bot/messageRouter');
  const bot = { sock: sock2, io: null };
  const mk = (jid, id, txt, me = false) => ({ key: { remoteJid: jid, id, fromMe: me, ...(jid.endsWith('g.us') ? { participant: '9@s.whatsapp.net' } : {}) }, pushName: 'T', message: { conversation: txt } });
  await router.process(bot, { messages: [mk('status@broadcast', 's1', 'um estado qualquer')] });
  C('status@broadcast: handle NÃO chamado', cham.length === 0, JSON.stringify(cham));
  C('status@broadcast: nem conta como msg', (bot.msgCount || 0) === 0, `msgCount=${bot.msgCount}`);
  await router.process(bot, { messages: [mk('a@s.whatsapp.net', 'p1', 'oi'), mk('b@s.whatsapp.net', 'p2', 'olá')] });
  C('lote 2 chats: ambos passam (paralelo)', cham.length === 2, JSON.stringify(cham));
  ch.handle = origH;

  // ── 5. FFMPEG/YTPROVA async (devolvem Promise, não bloqueiam) ──
  const comp = require('../src/bot/compressor');
  const isA = (f) => f && f.constructor && f.constructor.name === 'AsyncFunction';
  C('compressor: 4 fns async', ['compressImage', 'compressVideo', 'compressAudio', 'autoCompress'].every(k => isA(comp[k])));
  const rP = comp.autoCompress(Buffer.from([0xFF, 0xD8, 0xFF, 0x00]));
  C('autoCompress devolve Promise (não bloqueia)', rP instanceof Promise);
  await rP.catch(() => {}); // sharp não instalado aqui — só prova async
  const ytdl = require('../src/bot/ytdl');
  C('ytdl: getAudio/getVideo async', isA(ytdl.getAudio) && isA(ytdl.getVideo));
  const dl = require('../src/bot/downloader');
  C('downloader: exports youtube async', isA(dl.youtubeAudio) && isA(dl.youtubeVideo));

  // ── 6. HOTCACHE getMeta: 1 groupMetadata por socket ──
  let nM = 0;
  const sA = { groupMetadata: async () => { nM++; return { subject: 'G' }; } };
  await hot.getMeta(sA, 'g@g.us'); await hot.getMeta(sA, 'g@g.us');
  C('getMeta: 2 leituras → 1 query', nM === 1, `n=${nM}`);
  await hot.getMeta({ groupMetadata: async () => { nM++; return { subject: 'G' }; } }, 'g@g.us');
  C('getMeta: outro socket → nova query', nM === 2, `n=${nM}`);

  // ── 7. DOCKERFILE: flags de produção ──
  const fs = require('fs');
  const df = fs.readFileSync('Dockerfile', 'utf8');
  C('docker: heap 1536', /max-old-space-size=1536/.test(df));
  C('docker: UV_THREADPOOL_SIZE', /UV_THREADPOOL_SIZE=8/.test(df));
  C('docker: HOTCACHE_TTL_MS', /HOTCACHE_TTL_MS=45000/.test(df));

  // ── 8. v7.53: TTL entre-mensagens (ligável em runtime) ──
  N_USER = 0;
  process.env.HOTCACHE_TTL_MS = '45000';
  await hot.getUser({ key: { id: 't1' } }, '2449222');
  await hot.getUser({ key: { id: 't2' } }, '2449222'); // outra msg, mesmo número
  C('TTL on: 2 msgs → 1 query', N_USER === 1, `u=${N_USER}`);
  hot.forgetUser('2449222');
  await hot.getUser({ key: { id: 't3' } }, '2449222');
  C('forgetUser fura o TTL', N_USER === 2, `u=${N_USER}`);
  N_GS = 0;
  await hot.getGroupSettings({ key: { id: 't4' } }, 'ttl@g.us');
  C('peekGroup vê o TTL', hot.peekGroup('ttl@g.us') !== undefined);
  hot.forgetGroup('ttl@g.us');
  C('forgetGroup limpa peek', hot.peekGroup('ttl@g.us') === undefined);
  delete process.env.HOTCACHE_TTL_MS;
  await hot.getUser({ key: { id: 't5' } }, '2449222');
  C('TTL off: volta à base (testes intactos)', N_USER === 3, `u=${N_USER}`);

  // ── 9. v7.53: pensando() heartbeat ──
  const pev = [];
  const psock = { sendPresenceUpdate: async (p) => { pev.push(p); return {}; } };
  const stop = h.pensando(psock, 'x@s.whatsapp.net');
  await new Promise(r => setTimeout(r, 30));
  C('pensando: pulso imediato', pev.includes('composing'), JSON.stringify(pev));
  C('pensando: devolve stopper', typeof stop === 'function');
  stop();
  const stop2 = h.pensando(null, null);
  C('pensando: sem sock não rebenta', typeof stop2 === 'function');

  console.log(`\nTURBO: ${ok} OK / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
