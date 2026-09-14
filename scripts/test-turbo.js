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
  if (s.endsWith('botConfigCache')) { const _m = global.__turboCfg || (global.__turboCfg = {}); return { get: async (k, d) => (k in _m ? _m[k] : d), set: async (k, v) => { _m[k] = v; } }; }
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

  // ── 10. v7.55: comandos fantasma implementados ──
  const collected = new Map();
  const RC = (names, fn) => names.forEach(n => collected.set(n, fn));
  require('../src/bot/cases/info.js')(RC);
  require('../src/bot/cases/premium.js')(RC);
  require('../src/bot/cases/random.js')(RC);
  require('../src/bot/cases/downloads2.js')(RC);
  require('../src/bot/cases/stickers.js')(RC);
  require('../src/bot/cases/audioAdmin2.js')(RC);
  for (const c of ['info', 'restart', 'blacklist', 'unblacklist', 'setpremium', 'qrcode', 'horoscopo', 'decrypt', 'statusvideo', 'figura', 'x', 'bass']) C('reg: ' + c, collected.has(c));
  let got = '';
  await collected.get('info')({ prefix: '!', reply: async t => { got = t; } });
  C('info: mostra versão+uptime', got.includes(require('../package.json').version) && got.includes('Uptime'), got.slice(0, 40));
  await collected.get('restart')({ isOwner: false, reply: async t => { got = t; } });
  C('restart: nega não-dono', /dono/i.test(got));
  process.env.DARK_NO_EXIT = '1';
  await collected.get('restart')({ isOwner: true, reply: async t => { got = t; } });
  delete process.env.DARK_NO_EXIT;
  C('restart: dono confirmado sem sair', /reiniciar/i.test(got));
  const mrep = [];
  const mm = { reply: async t => mrep.push(t) };
  await collected.get('blacklist')({ m: mm, args: ['999000111'], isOwner: true });
  await collected.get('blacklist')({ m: mm, args: [], isOwner: true });
  C('blacklist: adiciona e lista', mrep[1].includes('999000111'), mrep[1].slice(0, 40));
  await collected.get('unblacklist')({ m: mm, args: ['999000111'], isOwner: true });
  C('blacklist: remove', /removido/.test(mrep[2]));
  let img = null;
  const fakeSock = { sendMessage: async (jid, content) => { img = content.image; return {}; } };
  await collected.get('qrcode')({ sock: fakeSock, msg: {}, ctx: { remoteJid: 'x' }, text: 'dark-test', reply: async () => {} });
  C('qrcode: gera PNG', Buffer.isBuffer(img) && img[0] === 0x89 && img[1] === 0x50, img?.length + 'B');
  await collected.get('horoscopo')({ text: 'leão', reply: async t => { got = t; } });
  C('horoscopo: leão resolve', got.includes('Leao') && got.includes('Sorte'));
  await collected.get('horoscopo')({ text: 'xyz', reply: async t => { got = t; } });
  C('horoscopo: inválido mostra uso', /Uso/.test(got));
  await collected.get('decrypt')({ args: [], isOwner: false, reply: async t => { got = t; } });
  C('decrypt: mostra formatos', got.includes('.ehi') && got.includes('bdnet'));
  await collected.get('statusvideo')({ sock: fakeSock, msg: { message: {} }, quoted: null, ctx: {}, args: [], prefix: '!', reply: async t => { got = t; } });
  C('statusvideo: sem mídia mostra uso', /Uso/.test(got));

  // ── 11. v7.56: validação de mídia (áudio nunca-invisível) ──
  const mh = require('../src/bot/mediaHandler');
  const mp3 = Buffer.concat([Buffer.from([0xFF, 0xFB, 0x90, 0x00]), Buffer.alloc(2000)]);
  const id3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(2000)]);
  const html = Buffer.concat([Buffer.from('<html>'), Buffer.alloc(2000)]);
  C('isAudioBytes: MP3 ok', mh.isAudioBytes(mp3) === true);
  C('isAudioBytes: ID3 ok', mh.isAudioBytes(id3) === true);
  C('isAudioBytes: HTML rejeitado', mh.isAudioBytes(html) === false);
  C('isAudioBytes: curto rejeitado', mh.isAudioBytes(Buffer.alloc(100)) === false);
  const jpg = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(5000)]);
  C('cleanThumb: JPEG pequeno ok', mh.cleanThumb(jpg) === jpg);
  C('cleanThumb: grande rejeitado', mh.cleanThumb(Buffer.concat([Buffer.from([0xFF, 0xD8]), Buffer.alloc(200000)])) === null);
  C('cleanThumb: lixo rejeitado', mh.cleanThumb(html) === null);
  C('reg: musictest', collected.has('musictest'));
  await collected.get('musictest')({ isOwner: false, args: [], reply: async t => { got = t; } });
  C('musictest: free recusado', /dono/.test(got));

  // ── 12. v7.57: admins — lista + verifica um ──
  require('../src/bot/cases/grupos.js')(RC);
  const gparts = [
    { id: '244900000001@s.whatsapp.net', admin: 'superadmin' },
    { id: '244911111111@s.whatsapp.net', admin: 'admin' },
    { id: '244922222222@s.whatsapp.net', admin: null },
  ];
  let gotMen = [];
  const gsock = {
    groupMetadata: async () => ({ participants: gparts }),
    sendMessage: async (j, c) => { got = c.text; gotMen = c.mentions || []; return { key: { id: 'x' } }; },
  };
  const gbase = { sock: gsock, msg: { message: {} }, ctx: { isGroup: true, remoteJid: 'g@g.us' }, reply: async t => { got = t; } };
  C('reg: eadmin', collected.has('eadmin') && collected.has('checkadm') && collected.has('veradmin'));
  await collected.get('admins')({ ...gbase, m: {}, args: [], command: 'admins' });
  C('admins: lista 2/3 + menciona', got.includes('Admins do grupo') && got.includes('2/3') && gotMen.length === 2, got);
  await collected.get('eadmin')({ ...gbase, m: { quoted: { sender: '244911111111@s.whatsapp.net' } }, args: [], command: 'eadmin' });
  C('eadmin: reply admin detetado', /É ADMIN/.test(got), got);
  const gmen = { message: { extendedTextMessage: { contextInfo: { mentionedJid: ['244922222222@s.whatsapp.net'] } } } };
  await collected.get('admins')({ ...gbase, m: {}, msg: gmen, args: [], command: 'admins' });
  C('admins: menção membro = não admin', /NÃO é admin/.test(got), got);
  await collected.get('eadmin')({ ...gbase, m: {}, args: ['244900000001'], command: 'eadmin' });
  C('eadmin: número fundador = dono', /DONO\/FUNDADOR/.test(got), got);
  await collected.get('eadmin')({ ...gbase, m: {}, args: [], command: 'eadmin' });
  C('eadmin: sem alvo mostra uso', /Marca ou responde/.test(got), got);
  await collected.get('admins')({ ...gbase, m: {}, ctx: { isGroup: false }, args: [], command: 'admins' });
  C('admins: PV recusado', /Só em grupos/.test(got), got);

  // ── 13. v7.58: react colado (disparo imediato, sem await de config) ──
  const RX = require('../src/bot/reactions');
  let rxSent = [];
  const rxsock = { sendMessage: async (j, c) => { rxSent.push(c); return { key: { id: 'x' } }; } };
  const rxmsg = { key: { remoteJid: 'g@g.us', id: 'M1', participant: 'u@s.whatsapp.net' } };
  await RX.react(rxsock, rxmsg, '⚡');
  C('react: payload reactionMessage', rxSent.length === 1 && rxSent[0].react?.text === '⚡' && rxSent[0].react?.key === rxmsg.key, JSON.stringify(rxSent[0]));
  rxSent = [];
  await RX.reactStart(rxsock, rxmsg, 'menu');
  C('reactStart: menu não reage', rxSent.length === 0);
  await RX.reactStart(rxsock, rxmsg, 'sticker');
  C('reactStart: sticker reage 🎨', rxSent.length === 1 && rxSent[0].react?.text === '🎨', JSON.stringify(rxSent[0]));
  rxSent = [];
  await RX.reactSuccess(rxsock, rxmsg, 'sticker');
  await RX.reactError(rxsock, rxmsg, 'sticker');
  C('reactSuccess/Error: ✅/❌', rxSent.length === 2 && rxSent[0].react?.text === '✅' && rxSent[1].react?.text === '❌');
  C('getProcessingEmoji: play→🎵, xyz→⏳', RX.getProcessingEmoji('play') === '🎵' && RX.getProcessingEmoji('xyz') === '⏳');

  console.log(`\nTURBO: ${ok} OK / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
