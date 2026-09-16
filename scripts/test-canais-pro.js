'use strict';
/** v7.73 — CANAIS PRO: divulgar, mídia, multi-canal, resumo grupo→canal, agenda Nx */
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

// IA falsa (a agenda pede ../bot/ai na hora de publicar)
const Module = require('module');
const _orig = Module.prototype.require;
let _promptIA = '';
Module.prototype.require = function (id) {
  if (String(id).endsWith('bot/ai')) return { chat: async (p) => { _promptIA = String(p || ''); return 'RESUMO GERADO PELA IA'; } };
  return _orig.apply(this, arguments);
};

const C = require('../src/aura/auraCanais');
const ag = require('../src/aura/auraAgenda');
const { messageCache } = require('../src/bot/messageListener');
const bcc = require('../src/bot/botConfigCache');

const CANAL = '120363999999@newsletter';
const GRUPO = '120363888888@g.us';
function _msg(id, jid, texto, tsMs, de = '244923111222@s.whatsapp.net', pushName = 'Zeca') {
  return { key: { id, remoteJid: jid, fromMe: false, participant: de }, pushName, message: { conversation: texto }, messageTimestamp: Math.floor(tsMs / 1000) };
}

(async () => {
  console.log('\n═══ DIVULGAR ═══');
  let relay = null; const sent = [];
  const sock = {
    sendMessage: async (j, c) => { sent.push([j, c]); return { key: { id: 'x' } }; },
    relayMessage: async (j, m, o) => { relay = [j, m, o]; },
  };
  let r = await C.divulgarNoCanal(sock, { message: { imageMessage: { caption: 'olha', contextInfo: {} } } }, CANAL);
  check('divulga foto citada', r.ok === true && relay?.[0] === CANAL && relay[1].imageMessage.contextInfo.isForwarded === true, JSON.stringify(r));
  relay = null; sent.length = 0;
  r = await C.divulgarNoCanal(sock, { message: { conversation: 'texto simples' } }, CANAL);
  check('texto citado vai como post', r.ok === true && sent.length === 1 && sent[0][0] === CANAL && sent[0][1].text === 'texto simples');
  r = await C.divulgarNoCanal(sock, {}, CANAL);
  check('sem mensagem → erro limpo', r.ok === false);

  console.log('\n═══ POSTAR MÍDIA ═══');
  sent.length = 0;
  const buf = Buffer.alloc(600, 7);
  r = await C.postarMidiaCanal(sock, CANAL, buf, 'image', 'legenda top');
  check('foto com legenda', r.ok === true && sent[0][1].caption === 'legenda top' && sent[0][1].image === buf);
  r = await C.postarMidiaCanal(sock, CANAL, buf, 'video', '');
  check('vídeo sem legenda', r.ok === true && sent[1][1].video === buf && sent[1][1].caption === undefined);
  r = await C.postarMidiaCanal(sock, CANAL, Buffer.alloc(10), 'image', '');
  check('buffer vazio → erro limpo', r.ok === false);

  console.log('\n═══ MULTI-CANAL ═══');
  C._limparCacheCanais();
  await bcc.set('aura_canais', null).catch(() => {});
  await bcc.set('aura_canal', null).catch(() => {});
  await C.guardarCanal({ jid: 'AAA@newsletter', name: 'Canal A' });
  await C.guardarCanal({ jid: 'BBB@newsletter', name: 'Canal B' });
  let d = await C.listarCanais();
  check('adotar 2 → lista com 2, ativo é o último', d.lista.length === 2 && d.ativo === 'BBB@newsletter', JSON.stringify(d.ativo));
  r = await C.ativarCanal('2');
  check('usar 2 → ativa o A', r.ok === true && (await C.meuCanal()).jid === 'AAA@newsletter');
  r = await C.ativarCanal('canal b');
  check('usar por nome → ativa o B', r.ok === true && (await C.meuCanal()).jid === 'BBB@newsletter');
  r = await C.ativarCanal('zzz');
  check('usar inexistente → erro limpo', r.ok === false);
  await C.guardarCanal(null);
  d = await C.listarCanais();
  check('guardar null → remove o ativo', d.lista.length === 1 && d.ativo === 'AAA@newsletter', JSON.stringify(d));
  // migração do formato antigo
  await bcc.set('aura_canais', null).catch(() => {});
  await bcc.set('aura_canal', { jid: 'OLD@newsletter', name: 'Antigo' }).catch(() => {});
  C._limparCacheCanais();
  const mig = await C.meuCanal();
  check('migra canal único antigo', mig?.jid === 'OLD@newsletter', JSON.stringify(mig));
  await bcc.set('aura_canais', null).catch(() => {});
  await bcc.set('aura_canal', null).catch(() => {});
  C._limparCacheCanais();

  console.log('\n═══ RESUMO ═══');
  sent.length = 0;
  const msgs = [{ nome: 'Ana', texto: 'o jogo foi incrível' }, { nome: 'Zeca', texto: 'marcámos 3 golos' }];
  r = await C.resumoGrupoParaCanal(sock, GRUPO, CANAL, { ler: async () => msgs, gerar: async () => 'Vitória por 3!' });
  check('resumo publica no canal', r.ok === true && sent.length === 1 && /RESUMO DO GRUPO/.test(sent[0][1].text) && /Vitória/.test(sent[0][1].text));
  r = await C.resumoGrupoParaCanal(sock, GRUPO, CANAL, { ler: async () => [] });
  check('grupo mudo → erro limpo', r.ok === false);

  console.log('\n═══ AGENDA ═══');
  check('tema resumo_grupo', ag.detectarTema('resumo do grupo todos os dias') === 'resumo_grupo');
  check('tema normal intacto', ag.detectarTema('notícias de hora em hora') === 'noticias');
  check('2x ao dia → 720min', ag.detectarIntervalo('notícias 2x ao dia') === 720);
  check('3x por hora → 20min', ag.detectarIntervalo('x 3x por hora') === 20);
  check('fallback diário intacto', ag.detectarIntervalo('motivação') === 1440);
  r = await ag.criar('resumo do grupo todos os dias', { jid: CANAL });
  check('resumo sem fonte → pede o grupo', r.ok === false);
  r = await ag.criar('resumo do grupo todos os dias', { jid: CANAL, fonte: GRUPO });
  check('resumo com fonte → agenda', r.ok === true);
  const itens = await ag.listar(CANAL);
  check('agenda guarda a fonte', itens.some(a => a.tema === 'resumo_grupo' && a.fonte === GRUPO), JSON.stringify(itens));
  // _publicar resumo: histórico real (messageCache) + IA falsa
  messageCache.clear(); sent.length = 0; _promptIA = '';
  const agora = Date.now();
  messageCache.set('g1', _msg('g1', GRUPO, 'alguém viu o jogo ontem?', agora - 30 * 60000));
  messageCache.set('g2', _msg('g2', GRUPO, 'vi sim, esteve top', agora - 29 * 60000, '244900000111@s.whatsapp.net', 'Ana'));
  await ag._publicar({ tema: 'resumo_grupo', fonte: GRUPO, jid: CANAL }, sock);
  check('tick publica resumo com a conversa', sent.length === 1 && /RESUMO DO GRUPO/.test(sent[0][1].text) && /jogo/.test(_promptIA), _promptIA.slice(0, 60));
  await ag.parar(CANAL);
  check('parar limpa', (await ag.listar(CANAL)).length === 0);

  console.log('\n═══ CASE !canal ═══');
  const collected = {};
  require('../src/bot/cases/canal.js')((names, fn) => names.forEach(n => { collected[n] = fn; }));
  await C.guardarCanal({ jid: CANAL, name: 'Oficial' });
  const saidas = [];
  const base = { sock, msg: {}, m: { msg: {} }, ctx: { remoteJid: GRUPO, isGroup: true }, args: [], text: '', prefix: '!', isOwner: true, reply: async (t) => { saidas.push(t); return t; } };
  await collected['canal']({ ...base, args: ['lista'], text: 'lista' });
  check('!canal lista mostra o adotado', saidas.length === 1 && /Oficial/.test(saidas[0]), saidas[0]?.slice(0, 60));
  relay = null;
  const qmsg = { message: { extendedTextMessage: { text: 'canal divulgar', contextInfo: { quotedMessage: { imageMessage: { caption: 'x' } } } } } };
  await collected['canal']({ ...base, msg: qmsg, m: { msg: qmsg }, args: ['divulgar'], text: 'divulgar' });
  check('!canal divulgar reencaminha', relay?.[0] === CANAL && /Divulguei/.test(saidas[1] || ''), saidas[1]?.slice(0, 60));
  sent.length = 0;
  await collected['canal']({ ...base, args: ['postar'], text: 'postar Olá canal', });
  // (sem resto parseado aqui — o case lê `text`; simulamos resto via text)
  check('!canal postar texto publica', sent.length === 1 && sent[0][1].text === 'Olá canal', JSON.stringify(sent[0]?.[1]));
  await C.guardarCanal(null);

  console.log('\n═══ WIRING ═══');
  const fs = require('fs');
  const src = fs.readFileSync('src/bot/cases/canal.js', 'utf8');
  check('subs PRO ligados', /'divulgar'/.test(src) && /'lista'/.test(src) && /'usar'/.test(src) && /'resumo'/.test(src) && /postarMidiaCanal/.test(src) && /fonte:/.test(src));

  console.log(`\n${fail ? '💥' : '🎉'} CANAIS-PRO: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
