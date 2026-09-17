'use strict';
/** v7.76 — CANAL SUPER: blast multi-canal, alvo @x, painel estilo Meta */
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

const C = require('../src/aura/auraCanais');
const CHA = 'CHA111@newsletter', CHB = 'CHB222@newsletter', CHC = 'CHC333@newsletter';

(async () => {
  console.log('\n═══ RESOLVER / ESQUECER ═══');
  await C.guardarCanal({ jid: CHA, name: 'Loja do Zé' });
  await C.guardarCanal({ jid: CHB, name: 'Memes' });
  await C.guardarCanal({ jid: CHC, name: 'Oficial' });
  C._limparCacheCanais();
  check('nº 2 → Memes', await C.resolverRef('2') === CHB);
  check('@mem → Memes', await C.resolverRef('@mem') === CHB);
  check('#3 → Loja', await C.resolverRef('#3') === CHA);
  check('jid direto', await C.resolverRef(CHC) === CHC);
  check('inexistente → null', await C.resolverRef('zzz') === null);

  console.log('\n═══ SUPERPOSTAR (motor) ═══');
  const sent = [], relayed = [];
  const sock = {
    sendMessage: async (j, c) => { if (String(j).includes('CHB')) throw new Error('banido'); sent.push([j, c]); return { key: { id: 'x' } }; },
    relayMessage: async (j, m) => { relayed.push([j, m]); },
  };
  let r = await C.superPostar(sock, { texto: 'PROMO' }, { pausaCanaisMs: 1 });
  check('texto: 2/3 (1 falha, não pára)', r.ok === true && r.enviados === 2 && r.total === 3 && r.resultados[1].ok === false && /Memes/.test(r.resultados[1].name), JSON.stringify(r.resultados.map(x => x.ok)));
  sent.length = 0;
  r = await C.superPostar(sock, { buf: Buffer.alloc(600), kind: 'image', caption: 'leg' }, { pausaCanaisMs: 1 });
  check('mídia: imagem+legenda nos 3', sent.length === 2 && sent.every(s => s[1].image?.length === 600 && s[1].caption === 'leg'), String(sent.length));
  sent.length = 0; relayed.length = 0;
  r = await C.superPostar(sock, { quoted: { message: { conversation: 'oi' } } }, { pausaCanaisMs: 1 });
  check('citada texto → post', sent.length === 2 && sent[0][1].text === 'oi');
  r = await C.superPostar(sock, { quoted: { message: { imageMessage: {} } } }, { pausaCanaisMs: 1 });
  check('citada mídia → relay reencaminhado', relayed.length === 3 && relayed[0][1].imageMessage?.contextInfo?.isForwarded === true, String(relayed.length));
  check('texto vazio → erro', (await C.superPostar(sock, { texto: '  ' }, { pausaCanaisMs: 1 })).ok === false);

  console.log('\n═══ SUPER + GRUPOS ═══');
  sock.user = { id: 'bot:9@s.whatsapp.net' };
  sock.groupFetchAllParticipating = async () => ({
    g1: { id: 'g1@g.us', participants: [{ id: 'bot@s.whatsapp.net', admin: 'admin' }] },
    g2: { id: 'g2@g.us', participants: [{ id: 'bot@s.whatsapp.net' }] },
    g3: { id: 'g3@g.us', participants: [{ id: 'x@s.whatsapp.net' }, { id: 'bot@s.whatsapp.net', admin: 'superadmin' }] },
  });
  sent.length = 0;
  r = await C.superPostar(sock, { texto: 'AVISO' }, { comGrupos: true, pausaCanaisMs: 1, pausaGruposMs: 1 });
  const nosGrupos = sent.filter(s => String(s[0]).endsWith('@g.us'));
  check('só grupos onde é admin (2/3)', r.grupos?.total === 2 && r.grupos?.enviados === 2 && nosGrupos.length === 2, JSON.stringify(r.grupos));

  console.log('\n═══ PAINEL ═══');
  sock.newsletterMetadata = async (how, jid) => ({ subscribers: String(jid).includes('CHA') ? 150 : 20 });
  const p = await C.painelCanais(sock);
  check('3 canais, ativo = Oficial', p.ok === true && p.canais.length === 3 && p.canais.find(c => c.ativo)?.jid === CHC);
  check('seguidores por canal', p.canais.find(c => c.jid === CHA)?.seguidores === 150 && p.canais.find(c => c.jid === CHB)?.seguidores === 20);
  check('agendados é número', p.canais.every(c => typeof c.agendados === 'number'));

  console.log('\n═══ ESQUECER / VAZIO ═══');
  await C.esquecerCanal(CHB);
  let d = await C.listarCanais();
  check('esquece o do meio, ativo intacto', d.lista.length === 2 && d.ativo === CHC);
  await C.esquecerCanal(CHC);
  d = await C.listarCanais();
  check('esquece o ativo → ativo passa ao 1.º', d.ativo === d.lista[0]?.jid && d.lista.length === 1);
  await C.esquecerCanal(CHA);
  check('sem canais: super falha limpo', (await C.superPostar(sock, { texto: 'x' }, { pausaCanaisMs: 1 })).ok === false);
  check('sem canais: painel falha limpo', (await C.painelCanais(sock)).ok === false);

  console.log('\n═══ CASES (canal @x + super) ═══');
  // Agora com o motor FALSO (engine real já testado acima)
  const Module = require('module');
  const _orig = Module.prototype.require;
  const got = {};
  const stub = {
    resolverRef: async (ref) => ({ '@2': CHB, '@loja': CHA }[String(ref).toLowerCase()] || null),
    procurarCanais: async (ref) => { const j = ({ '@2': CHB, '@loja': CHA })[String(ref).toLowerCase()]; return j ? [{ jid: j, name: 'X' }] : []; }, // v7.77
    listarCanais: async () => ({ lista: [{ jid: CHA, name: 'Loja' }, { jid: CHB, name: 'Memes' }, { jid: CHC, name: 'Oficial' }], ativo: CHC }), // v7.77
    meuCanal: async () => null,
    postarCanal: async (s, j, t) => { got.post = [j, t]; return { ok: true, msg: 'Publiquei.' }; },
    estatisticasCanal: async (s, j) => { got.stats = j; return { ok: true, msg: 'STATS' }; },
    painelCanais: async () => ({ ok: true, canais: [{ jid: CHA, name: 'Loja', ativo: false, seguidores: 150, agendados: 2 }, { jid: CHC, name: 'Oficial', ativo: true, seguidores: 9, agendados: 0 }] }),
    deixarCanal: async (s, j) => { got.deixou = j; return { ok: true, msg: 'Deixei.' }; },
    guardarCanal: async () => { got.guardouNull = true; },
    esquecerCanal: async (j) => { got.esqueceu = j; return { ok: true }; },
    superPostar: async (s, pay, o) => { got.super = [pay, o]; return { ok: true, total: 2, enviados: 2, resultados: [{ name: 'A', ok: true }, { name: 'B', ok: true }], grupos: o?.comGrupos ? { total: 1, enviados: 1, falhou: 0 } : null }; },
  };
  Module.prototype.require = function (id) {
    const s = String(id);
    if (s.endsWith('aura/auraCanais')) return stub;
    if (s.endsWith('mediaHandler')) return { downloadFromMessage: async () => Buffer.alloc(600) };
    return _orig.apply(this, arguments);
  };
  const cmds = {};
  require('../src/bot/cases/canal.js')((names, fn) => names.forEach(n => { cmds[n] = fn; }));
  require('../src/bot/cases/canalSuper.js')((names, fn) => names.forEach(n => { cmds[n] = fn; }));
  const base = (over = {}) => ({ sock: {}, m: {}, msg: {}, ctx: {}, args: [], text: '', prefix: '!', isOwner: true, reply: async (t) => t, ...over });

  let t = await cmds['canal'](base({ args: ['@2', 'postar', 'Olá'], text: '@2 postar Olá' }));
  check('canal @2 postar → alvo CHB, texto intacto', got.post?.[0] === CHB && got.post?.[1] === 'Olá', JSON.stringify(got.post));
  t = await cmds['canal'](base({ args: ['@loja', 'stats'], text: '@loja stats', isOwner: false }));
  check('canal @loja stats (leitura, não-dono)', got.stats === CHA && /STATS/.test(t));
  t = await cmds['canal'](base({ args: ['@99', 'postar', 'x'], text: '@99 postar x' }));
  check('canal @99 → não achei', /Não achei/.test(t));
  t = await cmds['canal'](base({ args: ['painel'], text: 'painel', isOwner: false }));
  check('canal painel formata', /PAINEL/.test(t) && /Loja/.test(t) && /150 seguidores/.test(t) && /2 agendados/.test(t) && /@<nº\|nome>/.test(t), t.slice(0, 80));
  t = await cmds['canal'](base({ args: ['@2', 'deixar'], text: '@2 deixar' }));
  check('canal @2 deixar → esquece o alvo (não o ativo)', got.deixou === CHB && got.esqueceu === CHB && got.guardouNull !== true);
  t = await cmds['super'](base({ args: ['promo'], text: 'promo' }));
  check('super texto → payload + relatório', got.super?.[0]?.texto === 'promo' && got.super?.[1]?.comGrupos === false && /SUPER/.test(t) && /2\/2/.test(t));
  t = await cmds['super'](base({ args: ['grupos', 'aviso'], text: 'grupos aviso' }));
  check('super grupos → flag ligada', got.super?.[0]?.texto === 'aviso' && got.super?.[1]?.comGrupos === true && /Grupos: 1\/1/.test(t));
  t = await cmds['super'](base({ args: ['x'], text: 'x', isOwner: false }));
  check('super barra não-dono', /dono/.test(t));
  const qm = { conversation: 'fwd' };
  t = await cmds['super'](base({ args: [], text: '', m: { msg: { message: { extendedTextMessage: { contextInfo: { quotedMessage: qm } } } } } }));
  check('super citada → divulga', got.super?.[0]?.quoted?.message === qm);
  t = await cmds['super'](base({ args: ['leg'], text: 'leg', m: { msg: { message: { imageMessage: {} } } } }));
  check('super foto → mídia + legenda', got.super?.[0]?.buf?.length === 600 && got.super?.[0]?.caption === 'leg');
  t = await cmds['super'](base({ args: [], text: '' }));
  check('super vazio → ajuda', /Usa:/.test(t));

  console.log(`\n${fail ? '💥' : '🎉'} CANAL-SUPER: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
