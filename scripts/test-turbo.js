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
  if (/models[\\/]GroupSettings/.test(s)) return global.__gsFake || { ...fullModels, findOne: () => { N_GS++; return w({ groupJid: 'g', antispam: false }); } };
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

  // ── 14. v7.59: áudio do botão SEM capa ──
  const FAKE_MP3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(3000)]);
  global.__szpAudio = async () => ({ buffer: FAKE_MP3, title: 'Teste', author: 'Bot', duration: '0:03', mimetype: 'audio/mpeg', thumbnail: 'http://x/y.jpg', source: 'stub' });
  for (const k of Object.keys(require.cache)) if (k.includes('systemZeroPlay')) delete require.cache[k];
  require.cache[require.resolve('../src/bot/systemZeroPlay')] = { exports: { ytAudio: (...a) => global.__szpAudio(...a), ytVideo: async () => ({}) } };
  require('../src/bot/cases/downloads.js')(RC);
  let ytdSent = null;
  const ytdsock = { sendMessage: async (j, c) => { ytdSent = c; return { key: { id: 'x' } }; } };
  C('reg: ytd', collected.has('ytd') && collected.has('gyt'));
  await collected.get('ytd')({ sock: ytdsock, msg: {}, ctx: { remoteJid: 'g@g.us', isGroup: true }, text: 'http://youtu.be/x | 128k', args: [], prefix: '!', command: 'ytd', reply: async t => { got = t; }, react: () => {} });
  C('ytd: envia áudio sem capa', ytdSent && ytdSent.audio === FAKE_MP3 && !ytdSent.contextInfo, JSON.stringify(Object.keys(ytdSent || {})));
  C('ytd: filename mp3', ytdSent && /Teste.*\.mp3/.test(ytdSent.fileName || ''), ytdSent && ytdSent.fileName);

  // ── 15. v7.60: modos + canal + setmenu ──
  const gsStore = {};
  global.__gsFake = {
    findOneAndUpdate: async (q) => {
      const k = q.groupJid;
      gsStore[k] = gsStore[k] || { groupJid: k, save: async () => {} };
      return gsStore[k];
    },
  };
  delete require.cache[require.resolve('../src/bot/cases/grupos.js')];
  require('../src/bot/cases/grupos.js')(RC);
  const mbase = { sock: { groupMetadata: async () => ({ participants: [] }) }, msg: {}, ctx: { isGroup: true, isOwner: true, remoteJid: 'g@g.us' }, prefix: '!', reply: async t => { got = t; } };
  C('reg: modo', collected.has('modo'));
  await collected.get('modo')({ ...mbase, args: [] });
  C('modo: painel lista', got.includes('MODOS DO GRUPO') && /downloads/i.test(got) && got.includes('brincadeiras'), got.slice(0, 120));
  await collected.get('modo')({ ...mbase, args: ['brincadeiras', 'off'] });
  C('modo: desliga brincadeiras', /DESATIVADO/.test(got) && gsStore['g@g.us'].modeZoeira === false, got);
  await collected.get('modo')({ ...mbase, args: ['fun', 'on'] });
  C('modo: alias fun religa', /ATIVADO/.test(got) && gsStore['g@g.us'].modeZoeira === true, got);
  await collected.get('modo')({ ...mbase, args: ['stickers', 'off'] });
  C('modo: desliga stickers', /DESATIVADO/.test(got) && gsStore['g@g.us'].modeStickers === false, got);
  await collected.get('modo')({ ...mbase, args: ['downloads', 'off'] });
  C('modo: downloads não é modo (sempre on)', /desconhecido/.test(got), got);
  await collected.get('modo')({ ...mbase, args: ['xyz', 'on'] });
  C('modo: desconhecido avisa', /desconhecido/.test(got), got);
  await collected.get('modo')({ ...mbase, ctx: { isGroup: false, isOwner: true }, args: [] });
  C('modo: PV recusado', /Só em grupos/.test(got), got);

  require.cache[require.resolve('../src/aura/auraCanais')] = { exports: {
    meuCanal: async () => global.__canalMeu,
    postarCanal: async () => ({ ok: true, msg: 'publicado!' }),
    infoCanal: async () => ({ ok: true, msg: 'INFO-FK' }),
    estatisticasCanal: async () => 'STATS-FK',
    adotarCanal: async () => ({ ok: true, msg: 'adotado!' }),
    criarCanalSeguro: async () => ({ ok: true, jid: 'chan@newsletter', invite: 'inv' }),
    guardarCanal: async () => {},
    renomearCanal: async () => ({ ok: true, msg: 'renomeado!' }),
    descreverCanal: async () => ({ ok: true, msg: 'ok' }),
    fotoCanal: async () => ({ ok: true, msg: 'foto ok' }),
    perguntarSeguidores: async () => ({ ok: true, msg: 'perguntado!' }),
    lerRespostasCanal: async () => ({ ok: true, msg: 'sem respostas' }),
    aceitarConviteCanal: async () => ({ ok: true, msg: 'seguindo!' }),
    deixarCanal: async () => ({ ok: true, msg: 'deixado' }),
    apagarCanal: async () => ({ ok: true, msg: 'apagado' }),
  } };
  require.cache[require.resolve('../src/aura/auraAgenda')] = { exports: {
    criar: async () => ({ ok: true, msg: 'agendado!' }),
    listar: async () => [{ tema: 'news', intervaloMin: 60, proxima: Date.now() }],
    parar: async () => ({ ok: true, msg: 'parado' }),
  } };
  require('../src/bot/cases/canal.js')(RC);
  global.__canalMeu = { jid: 'chan@newsletter', name: 'FK', description: 'd', invite: 'i' };
  const cbase = { sock: {}, m: {}, msg: { message: {} }, ctx: {}, prefix: '!', reply: async t => { got = t; } };
  C('reg: canal', collected.has('canal'));
  await collected.get('canal')({ ...cbase, args: [], text: '', isOwner: false });
  C('canal: ajuda pública', got.includes('AURA CANAIS') && got.includes('FK'), got.slice(0, 100));
  await collected.get('canal')({ ...cbase, args: ['postar'], text: 'postar olá mundo', isOwner: true });
  C('canal: postar dono', /publicado/.test(got), got);
  await collected.get('canal')({ ...cbase, args: ['postar'], text: 'postar x', isOwner: false });
  C('canal: postar free bloqueado', /dono/.test(got), got);
  await collected.get('canal')({ ...cbase, args: ['info'], text: 'info', isOwner: false });
  C('canal: info pública', /INFO-FK/.test(got), got);
  await collected.get('canal')({ ...cbase, args: ['stats'], text: 'stats', isOwner: false });
  C('canal: stats string ok', /STATS-FK/.test(got), got);
  await collected.get('canal')({ ...cbase, args: ['agenda'], text: 'agenda', isOwner: false });
  C('canal: agenda lista', got.includes('AGENDADOS') && got.includes('news'), got.slice(0, 100));
  await collected.get('canal')({ ...cbase, args: ['xyz'], text: 'xyz', isOwner: true });
  C('canal: sub desconhecida', /desconhecido/.test(got), got);

  const SM = require('../src/bot/cases/setmenu.js');
  C('setmenu: resolveTarget', SM.resolveTarget('downloads').key === 'menu_downloads' && SM.resolveTarget('menu_downloads').key === 'menu_downloads' && SM.resolveTarget('menu').main === true && SM.resolveTarget('xyz') === null);
  C('setmenu: detectKind', SM.detectKind(false, true, true) === 'gif' && SM.detectKind(false, true, false) === 'video' && SM.detectKind(true, false, false) === 'foto' && SM.detectKind(false, true, false, 'gif') === 'gif');
  SM(RC);
  C('reg: setmenu', collected.has('setmenu'));
  await collected.get('setmenu')({ isOwner: false, args: [], reply: async t => { got = t; } });
  C('setmenu: free recusado', /dono/.test(got), got);
  await collected.get('setmenu')({ isOwner: true, args: [], prefix: '!', reply: async t => { got = t; } });
  C('setmenu: painel dono', got.includes('MÍDIA DOS MENUS') && got.includes('menu_downloads'), got.slice(0, 120));

  const fsT = require('fs');
  fsT.mkdirSync('assets/menu-media', { recursive: true });
  fsT.writeFileSync('assets/menu-media/__turbo_probe.bin', Buffer.from('PROBE123'));
  const _lb = await mh.fetchBuffer('local:menu-media/__turbo_probe.bin?v=1');
  C('fetchBuffer local:', _lb.toString() === 'PROBE123');
  fsT.unlinkSync('assets/menu-media/__turbo_probe.bin');
  let _ljFail = false;
  try { await mh.fetchBuffer('local:../x'); } catch { _ljFail = true; }
  C('fetchBuffer local: bloqueia ..', _ljFail);

  // ── 16. v7.61: gate de modos por categoria ──
  const MG = require('../src/bot/modeGate');
  C('gate: play sem config passa (fail-open)', MG.check('play', {}).allowed === true);
  C('gate: play passa sem doc', MG.check('play', null).allowed === true);
  C('gate: play passa sempre (principal livre)', MG.check('play', { modeDownloads: false }).allowed === true);
  C('gate: video passa sempre', MG.check('video', {}).allowed === true);
  const gOff = MG.check('sticker', { modeStickers: false });
  C('gate: sticker barrado c/ modo off', gOff.allowed === false && gOff.mode.name === 'stickers');
  C('gate: msg pede ativação', MG.lockedMessage(gOff.mode, '!').includes('!modo stickers on'));
  C('gate: ban passa (admin livre)', MG.check('ban', { modeDownloads: false }).allowed === true);
  C('gate: menu passa (info livre)', MG.check('menu', { modeDownloads: false, modeZoeira: false }).allowed === true);
  C('gate: modo passa (auto-livre)', MG.check('modo', { modeDownloads: false }).allowed === true);
  C('gate: ppt passa, zoeira off não afeta', MG.check('ppt', { modeZoeira: false }).allowed === true);
  C('gate: desconhecido passa (fail-open)', MG.check('xxxyyyzz', { modeStickers: false }).allowed === true);
  C('gate: findMode alias', MG.findMode('fun').name === 'brincadeiras' && MG.findMode('dl') === null && MG.findMode('xyz') === null);
  C('gate: 10 modos (downloads livre)', MG.MODES.length === 10 && !MG.MODES.some(m => m.name === 'downloads'));

  // ── 17. v7.62: aliases do like ──
  require('../src/bot/cases/incomingTools.js')(RC);
  C('reg: like+aliases', ['like', 'likesff', 'likeff', 'fflike', 'likefree'].every(n => collected.has(n)));
  let likeGot = '';
  await collected.get('likesff')({ m: { reply: async t => { likeGot = t; } }, text: '', prefix: '!', command: 'likesff' });
  C('likesff: sem UID mostra uso', /ENVIAR LIKES FF/.test(likeGot) && likeGot.includes('likesff'), likeGot.slice(0, 80));

  // ── 18. v7.63: Aura de volta (IA viva + revoltada) ──
  const AI = require('../src/bot/ai.js');
  C('ia: groq sem llamas mortas', !AI.GROQ_MODELS.some(m => /llama-3\.[13]-/.test(m)));
  C('ia: groq gpt-oss primeiro', AI.GROQ_MODELS[0] === 'openai/gpt-oss-120b');
  C('ia: gemini 3.7 no topo', AI.GEMINI_MODELS[0] === 'gemini-3.7-flash');
  C('ia: openai ligado', typeof AI.chatOpenAI === 'function' && AI.OPENAI_MODELS.includes('gpt-4o-mini'));
  const cfgIA = require('../src/config.js');
  const temChaveIA = ['groqApiKey', 'geminiApiKey', 'openrouterApiKey', 'openaiApiKey', 'huggingfaceKey', 'cerebrasApiKey', 'apifreellmKey'].some(k => cfgIA.ai[k]);
  if (temChaveIA) C('ia: sem chave diz Northflank', true, 'skip (há chaves)');
  else { const msc = await AI.chat('ping'); C('ia: sem chave diz Northflank', msc.includes('Northflank') && !msc.includes('Render'), msc.slice(0, 60)); }
  const AH = require('../src/aura/auraHuman.js');
  AH.setMood('revoltada', 'teste', 'g-turbo@s.whatsapp.net');
  const moodR = AH.getMood('g-turbo@s.whatsapp.net');
  C('aura: revoltada válida', moodR.mood === 'revoltada' && moodR.intensity === 8);
  AH.setMood('humor_que_nao_existe', '', 'g-turbo2@s.whatsapp.net');
  C('aura: inválido cai normal', AH.getMood('g-turbo2@s.whatsapp.net').mood === 'normal');
  AH.clearMood('g-turbo@s.whatsapp.net');
  C('aura: clearMood limpa', AH.getMood('g-turbo@s.whatsapp.net').mood === 'normal');
  const promptR = AH.buildAuraSystemPrompt({ userName: 'Teste', mood: 'revoltada' });
  C('aura: prompt revoltada', promptR.includes('REVOLTADA'));

  // ── 19. v7.64: setmenu persistente + routing downloads + kwai ──
  const D2 = require('../src/bot/cases/downloads2.js');
  C('dl: buf é vídeo', D2.isVideoResult({ buffer: Buffer.alloc(2000), url: '' }) === true);
  C('dl: jpg é foto', D2.isVideoResult({ url: 'https://a.b/c.jpg' }) === false);
  C('dl: mp4 é vídeo', D2.isVideoResult({ url: 'https://a.b/c.mp4' }) === true);
  C('dl: mimetype vídeo', D2.isVideoResult({ url: '', mimetype: 'video/mp4' }) === true);
  const DL = require('../src/bot/downloader.js');
  C('kwai: extrai mp4', (DL.kwaiMp4FromHtml('<a href="https://aws-br-cdn.kwai.net/x_b_abc.mp4?tag=1">v</a>') || '').includes('.mp4'));
  C('kwai: sem mp4 dá null', DL.kwaiMp4FromHtml('<html>nada aqui</html>') === null);
  let kwaiErr = '';
  try { await DL.kwai('nao-e-url'); } catch (e) { kwaiErr = e.message; }
  C('kwai: valida URL (sem rede)', /Envie link do Kwai/.test(kwaiErr));
  const BCC = require('../src/bot/botConfigCache'); // sem .js → usa o mock do turbo (linha 18)
  const NC = require('../src/bot/nativeCommands.js');
  const fakeBin = Buffer.alloc(300, 7);
  await BCC.set('menu_media__turbo_bin', fakeBin.toString('base64'));
  const mmb = await NC.getMenuMediaBuf('_turbo', '');
  C('setmenu: bin do cache', Buffer.isBuffer(mmb) && mmb.equals(fakeBin));
  await BCC.set('menu_media__turbo_bin', '');
  require('../src/bot/cases/setmenu.js')(RC);
  await BCC.set('menu_media_menu_downloads_url', 'local:menu-media/menu_downloads.jpg?v=1');
  await BCC.set('menu_media_menu_downloads_type', 'image');
  await BCC.set('menu_media_menu_downloads_bin', '');
  let panelGot = '';
  await collected.get('setmenu')({ isOwner: true, args: [], prefix: '!', reply: async t => { panelGot = t; } });
  C('setmenu: painel ⚠️ sem bytes', panelGot.includes('⚠️') && panelGot.includes('menu_downloads'));
  await BCC.set('menu_media_menu_downloads_bin', Buffer.alloc(300, 9).toString('base64'));
  await collected.get('setmenu')({ isOwner: true, args: [], prefix: '!', reply: async t => { panelGot = t; } });
  C('setmenu: painel ✅ com bin', /✅ `menu_downloads`/.test(panelGot));
  await BCC.set('menu_media_menu_downloads_url', '');
  await BCC.set('menu_media_menu_downloads_type', 'none');
  await BCC.set('menu_media_menu_downloads_bin', '');
  C('shazam: pick letra', D2.shazamPickLyric({ data: [{ title_short: 'Heroes', artist: { name: 'Bowie' } }] }) === 'Heroes — Bowie');
  C('shazam: vazio dá null', D2.shazamPickLyric({ data: [] }) === null);
  D2(RC);
  let shGot = '';
  await collected.get('shazam')({ sock: {}, msg: { message: {} }, ctx: { remoteJid: 'x' }, args: [], prefix: '!', reply: async t => { shGot = t; }, react: () => {} });
  C('shazam: sem args mostra uso', shGot.includes('shazam <trecho'));

  // ── 20. v7.65: arsenal (Tavily, STT backup, needsWeb) ──
  C('web: pesquisar dispara', AI.needsWeb('pesquisa sobre tubarões') === true);
  C('web: procurar dispara', AI.needsWeb('procura o resultado do jogo') === true);
  C('web: conversa não dispara', AI.needsWeb('oi tudo bem contigo') === false);
  C('web: preço dispara', AI.needsWeb('quanto custa o pão') === true);
  if (cfgIA.ai.tavilyKey) C('tavily: sem chave (skip)', true, 'skip (há chave)');
  else { let tErr = ''; try { await AI.searchTavily('x'); } catch (e) { tErr = e.message; } C('tavily: sem chave falha rápido', /sem chave Tavily/.test(tErr)); }
  let sttErr = '';
  try { await AI.transcribeAudio(Buffer.alloc(50)); } catch (e) { sttErr = e.message; }
  C('stt: áudio vazio valida', /áudio vazio/.test(sttErr));
  C('stt: whisper exportado', typeof AI.transcribeWhisper === 'function');

  // ── 21. v7.66: !setmenu aparece (dynSub + header + órfãs) ──
  const CT = require('../src/bot/cases/dynamicSubmenus.js').CATEGORY_TARGET;
  C('dynsub: mapa base', CT.ia === 'menuia' && CT.downloads === 'menu_downloads' && CT.admin === 'menugrupo' && CT.audio === 'alteradores' && CT.info === 'menustatus' && CT.stickers === 'menu_stickers' && CT.jogos === 'menujogos' && CT.economia === 'menueconomia' && CT.interacoes === 'menuinteracoes' && CT.logos === 'menulogos');
  C('dynsub: mapa novos', CT.zoeira === 'menuzoeira' && CT.texto === 'menutexto' && CT.search === 'menusearch' && CT.owner === 'menudono');
  C('setmenu: novos alvos', SM.resolveTarget('zoeira').key === 'menuzoeira' && SM.resolveTarget('texto').key === 'menutexto' && SM.resolveTarget('search').key === 'menusearch' && SM.resolveTarget('dono').key === 'menudono' && SM.resolveTarget('menuia').key === 'menuia');
  C('setmenu: órfãs fundidas', SM.resolveTarget('diversao').key === 'menuinteracoes' && SM.resolveTarget('familia').key === 'menuinteracoes' && SM.resolveTarget('brincadeiras').key === 'menuinteracoes');
  await collected.get('setmenu')({ isOwner: true, args: [], prefix: '!', reply: async t => { panelGot = t; } });
  C('setmenu: painel sem órfãs', !panelGot.includes('menudiversao') && !panelGot.includes('menufamilia') && !panelGot.includes('brincadeiras') && panelGot.includes('menuzoeira') && panelGot.includes('menutexto') && panelGot.includes('menusearch') && panelGot.includes('menudono'));
  C('sendMenuWithMedia exportado', typeof NC.sendMenuWithMedia === 'function');
  C('helpers não poluem catálogo', !Object.keys(NC).includes('sendMenuWithMedia') && !Object.keys(NC).includes('getMenuMediaBuf'));
  const fsT21 = require('fs');
  C('header interativo usa mídia', fsT21.readFileSync('src/bot/nativeCommands.js', 'utf8').includes('fromObject(subMediaHeader)') && fsT21.readFileSync('src/bot/cases/dynamicSubmenus.js', 'utf8').includes('fromObject(dynHeader)'));
  await BCC.set('menu_media__turbow_url', 'local:menu-media/_turbow.jpg?v=1');
  await BCC.set('menu_media__turbow_type', 'image');
  await BCC.set('menu_media__turbow_bin', Buffer.alloc(300, 5).toString('base64'));
  const wSent = [];
  await NC.sendMenuWithMedia({ sendMessage: async (j, m) => { wSent.push(m); } }, {}, { remoteJid: 'x' }, 'TEXTO-MENU', '_turbow');
  C('envio com foto', wSent.length === 1 && Buffer.isBuffer(wSent[0].image) && String(wSent[0].caption || '').includes('TEXTO-MENU'));
  await BCC.set('menu_media__turbow_url', '');
  await BCC.set('menu_media__turbow_type', 'none');
  await BCC.set('menu_media__turbow_bin', '');
  const dgT0 = Date.now();
  const digest = await AI.getPrettyNewsDigest('');
  C('news: digest resolve <5s', typeof digest === 'string' && digest.includes('DARK NEWS') && (Date.now() - dgT0) < 5000, `${Date.now() - dgT0}ms`);

  // ── 22. v7.67: aluguel system-zero (gate, planos, pedidos) ──
  global.__gsFake = { findOne: () => w(null), findOneAndUpdate: async () => null };
  const RT = require('../src/bot/cases/rental2.js');
  C('gate: funil passa', RT.gateAllows('!alugar', '!') && RT.gateAllows('*trial', '*') && RT.gateAllows('!planos x', '!') && RT.gateAllows('!statusalugar', '!') && RT.gateAllows('!paguei DARK-1', '!') && RT.gateAllows('!vip', '!'));
  C('gate: resto bloqueia', !RT.gateAllows('!menu', '!') && !RT.gateAllows('!play x', '!') && !RT.gateAllows('!ping', '!') && !RT.gateAllows('olá', '!'));
  C('rent: 5 planos trial 7d', RT.RENTAL_PLANS.length === 5 && RT.RENTAL_PLANS[0].dias === 7 && RT.RENTAL_PLANS.every(p => Number.isFinite(p.kz) && Number.isFinite(p.brl)));
  const _pr0 = await RT.getPrices();
  C('rent: precoTxt', RT.precoTxt('trial', _pr0) === 'Grátis' && RT.precoTxt('mensal', _pr0).includes('Kz') && RT.precoTxt('mensal', _pr0).includes('R$'));
  const _r1 = RT.mkPedidoRef(), _r2 = RT.mkPedidoRef();
  C('rent: ref pedido', /^DARK-\d{8}$/.test(_r1) && _r1 !== _r2);
  C('setmenu: alvo alugar', SM.resolveTarget('alugar').key === 'menu_alugar');
  RT(RC);
  const cfgR = { bot: { prefix: '!', name: 'DARK BOT' }, owner: { number: '244900000001' } };
  const gctx = { isGroup: true, remoteJid: 'g@g.us', groupName: 'GT', senderNumber: '244911111111', pushName: 'Zeca' };
  let setpGot = '';
  await collected.get('setpreco')({ ctx: gctx, args: ['mensal', '6000', '20'], isOwner: true, config: cfgR, reply: async t => { setpGot = t; } });
  const _pr1 = await RT.getPrices();
  C('rent: setpreco', /6000/.test(setpGot.replace(/\D/g, m => m === '6' || m === '0' ? m : '')) && _pr1.mensal.kz === 6000 && _pr1.mensal.brl === 20);
  await collected.get('setpagamento')({ ctx: gctx, args: ['pix', 'chave123', 'Zeca'], isOwner: true, config: cfgR, reply: async () => {} });
  const _pay0 = await BCC.get('rent_pay', {});
  C('rent: setpagamento', _pay0.pix === 'chave123' && _pay0.pixNome === 'Zeca');
  let alGot = '';
  const alSock = { user: { id: 'x' }, sendMessage: async (j, m) => { alGot = m.text || m.caption || ''; } };
  await collected.get('alugar')({ sock: alSock, msg: {}, ctx: gctx, args: [], isOwner: false, config: cfgR, reply: async () => {} });
  C('rent: cartão fallback', alGot.includes('ALUGUEL') && alGot.includes('TRIAL') && alGot.includes('MENSAL') && alGot.includes('plano:mensal'));
  let pedGot = '';
  await collected.get('alugar')({ sock: alSock, msg: {}, ctx: gctx, args: ['plano:mensal'], isOwner: false, config: cfgR, reply: async t => { pedGot = t; } });
  const _ref = (pedGot.match(/DARK-\d{8}/) || [])[0];
  C('rent: pedido criado', pedGot.includes('PEDIDO') && !!_ref && RT._pedidos.has(_ref) && pedGot.includes('Kz') && pedGot.includes('chave123'));
  let ownerGot = '', pagGot = '';
  const pagSock = { sendMessage: async (j, m) => { if (String(j).startsWith('244900000001')) ownerGot = m.text || ''; } };
  await collected.get('paguei')({ sock: pagSock, msg: {}, ctx: gctx, args: [_ref, 'ref123'], config: cfgR, reply: async t => { pagGot = t; } });
  C('rent: paguei avisa dono', pagGot.includes('registado') && ownerGot.includes(_ref) && ownerGot.includes('!ativar'));
  let atvGot = '', grpGot = '';
  const atvSock = { sendMessage: async (j, m) => { if (j === 'g@g.us') grpGot = m.text || ''; } };
  await collected.get('ativar')({ sock: atvSock, msg: {}, ctx: gctx, args: [_ref], isOwner: true, config: cfgR, reply: async t => { atvGot = t; } });
  C('rent: ativar liga grupo', atvGot.includes('aprovado') && grpGot.includes('ALUGUEL ATIVADO'));
  RT._pedidos.delete(_ref);
  await BCC.set('rent_preco', {});
  await BCC.set('rent_pay', {});
  C('rent: card interativo', fsT21.readFileSync('src/bot/cases/rental2.js', 'utf8').includes('Escolher Plano'));

  // ── 23. v7.68: cartão fatura nativo (orderMessage) ──
  const _ord = RT.buildPedidoOrder({ orderNum: '75115581', title: 'Fatura via Pix', total1000: 15000, currency: 'BRL', body: 'MENSAL · 30 dias\nPedido DARK-75115581', sellerJid: 'x@s.whatsapp.net', thumb: null });
  const _om = _ord.orderMessage;
  C('order: campos', _om.orderId === '75115581' && _om.itemCount === 1 && _om.totalAmount1000 === 15000 && _om.totalCurrencyCode === 'BRL' && _om.orderTitle === 'Fatura via Pix' && _om.messageVersion === 1 && /^[0-9a-f]{32}$/.test(_om.token) && !('thumbnail' in _om));
  C('order: com thumb', 'thumbnail' in RT.buildPedidoOrder({ orderNum: '1', title: 'F', total1000: 1, currency: 'BRL', body: 'b', sellerJid: 's', thumb: Buffer.alloc(10) }).orderMessage);
  const _th = await RT.getOrderThumb();
  C('order: thumb logo', _th === null || Buffer.isBuffer(_th));
  let ordRelay = null, ordTxt = '';
  const ordSock = { user: { id: 'bot@s.whatsapp.net' }, sendMessage: async () => {}, relayMessage: async (j, m) => { ordRelay = m; } };
  const ordMsg = { key: { remoteJid: 'g@g.us', fromMe: false, id: 'M' }, message: { conversation: '!alugar' } };
  await collected.get('alugar')({ sock: ordSock, msg: ordMsg, ctx: gctx, args: ['plano:semanal'], isOwner: false, config: cfgR, reply: async t => { ordTxt = t; } });
  const _got = ordRelay?.orderMessage;
  C('order: pedido envia cartão', !!_got && _got.itemCount === 1 && /^\d{8}$/.test(_got.orderId) && ordTxt.includes('PEDIDO') && ((ordTxt.match(/DARK-\d{8}/) || [])[0] || '').replace(/\D/g, '') === _got.orderId);
  RT._pedidos.clear();

  // ── 24. v7.69: comprovativo, pixcode, expiração ──
  const MH = require('../src/bot/mediaHandler.js');
  const _dlOrig = MH.downloadFromMessage;
  MH.downloadFromMessage = async () => Buffer.alloc(200, 3);
  let ped2 = '';
  await collected.get('alugar')({ sock: alSock, msg: {}, ctx: gctx, args: ['plano:trimestral'], isOwner: false, config: cfgR, reply: async t => { ped2 = t; } });
  const _ref2 = (ped2.match(/DARK-\d{8}/) || [])[0];
  let ownImg = null, pag2 = '';
  const pagImgSock = { sendMessage: async (j, m) => { if (String(j).startsWith('244900000001')) ownImg = m; } };
  const pagImgMsg = { key: { remoteJid: 'g@g.us', fromMe: false, id: 'M2' }, message: { imageMessage: { caption: `!paguei ${_ref2}` } } };
  await collected.get('paguei')({ sock: pagImgSock, msg: pagImgMsg, ctx: gctx, args: [_ref2], config: cfgR, reply: async t => { pag2 = t; } });
  MH.downloadFromMessage = _dlOrig;
  C('rent: paguei com foto', !!_ref2 && Buffer.isBuffer(ownImg?.image) && String(ownImg.caption || '').includes(_ref2) && pag2.includes('comprovativo') && RT._pedidos.get(_ref2)?.paid?.receipt === true);
  await collected.get('setpagamento')({ ctx: gctx, args: ['pixcode', 'CODIGO-PIX-123'], isOwner: true, config: cfgR, reply: async () => {} });
  C('rent: pixcode', (await BCC.get('rent_pay', {})).pixCode === 'CODIGO-PIX-123');
  let ped3 = '';
  await collected.get('alugar')({ sock: alSock, msg: {}, ctx: gctx, args: ['plano:semanal'], isOwner: false, config: cfgR, reply: async t => { ped3 = t; } });
  C('rent: pedido mostra pixcode', ped3.includes('copia-e-cola') && ped3.includes('CODIGO-PIX-123'));
  await BCC.set('rent_pay', {});
  const _now = Date.now(), _D = 86400000;
  const _gsRows = [
    { groupJid: 'w3@g.us', groupName: 'W3', isHosted: true, hostedUntil: new Date(_now + 2 * _D) },
    { groupJid: 'w1@g.us', groupName: 'W1', isHosted: true, hostedUntil: new Date(_now + 12 * 3600000) },
    { groupJid: 'exp@g.us', groupName: 'EX', isHosted: true, hostedUntil: new Date(_now - _D) },
    { groupJid: 'ok@g.us', groupName: 'OK', isHosted: true, hostedUntil: new Date(_now + 30 * _D) },
  ];
  global.__gsFake = {
    findOne: () => w(null),
    find: () => w(_gsRows),
    findOneAndUpdate: async (q, u) => { const r = _gsRows.find(x => x.groupJid === q.groupJid); if (r && u) Object.assign(r, u); return null; },
  };
  delete require.cache[require.resolve('../src/bot/cases/rental2.js')];
  const RT2 = require('../src/bot/cases/rental2.js');
  const _sent = [];
  const _expSock = { sendMessage: async (j, m) => { _sent.push([j, m.text || '']); } };
  const _rExp1 = await RT2.checkExpiries(_expSock);
  const _t3 = (_sent.find(s => s[0] === 'w3@g.us') || [])[1] || '', _t1 = (_sent.find(s => s[0] === 'w1@g.us') || [])[1] || '', _te = (_sent.find(s => s[0] === 'exp@g.us') || [])[1] || '';
  C('rent: expira avisa', _rExp1.warned3.includes('w3@g.us') && _rExp1.warned1.includes('w1@g.us') && _rExp1.expired.includes('exp@g.us') && _t3.includes('2 dias') && _t1.includes('1 dia') && _te.includes('EXPIRADO') && !_sent.some(s => s[0] === 'ok@g.us') && _gsRows.find(x => x.groupJid === 'exp@g.us').isHosted === false);
  const _n0 = _sent.length;
  await RT2.checkExpiries(_expSock);
  C('rent: expira sem duplicar', _sent.length === _n0);
  RT._pedidos.clear();

  console.log(`\nTURBO: ${ok} OK / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
