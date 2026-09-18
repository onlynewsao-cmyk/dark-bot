'use strict';
/**
 * v7.91 — LISTA CLICÁVEL (estilo submenu) para resultados de pesquisa.
 * mostrar() envia single_select (toque → LISTANUM_<n>) com fallback para
 * "responde com o número"; o clique resolve o mesmo pendente que o número.
 */
let OUT = [], ROWS = [];
const sock = {
  user: { id: '244949@s.whatsapp.net' },
  sendMessage: async (j, c) => { const t = c?.text || c?.caption || ''; if (t) OUT.push(t); return { key: {} }; },
  relayMessage: async (j, m) => {
    const im = m?.viewOnceMessage?.message?.interactiveMessage || m?.interactiveMessage;
    OUT.push(im?.body?.text || '[INTERACTIVO]');
    ROWS = [];
    for (const b of im?.nativeFlowMessage?.buttons || []) {
      try { for (const s of JSON.parse(b.buttonParamsJson || '{}').sections || []) for (const r of s.rows || []) ROWS.push(r.rowId); } catch {}
    }
    return {};
  },
};
const msg = { key: { remoteJid: '1@g.us', participant: '244001@s.whatsapp.net', id: 'X' }, message: { conversation: 'oi' } };
const ctx = { remoteJid: '1@g.us', senderNumber: '244001', senderJid: '244001@s.whatsapp.net' };

const lista = require('../src/bot/listaEscolha');
let ok = 0, fail = 0;
const t = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, String(x).slice(0, 90)); } };

(async () => {
  console.log('\n═══ 1. mostrar → lista CLICÁVEL ═══');
  lista._pendentes.clear();
  let escolhido = null;
  const titulos = [
    '*Tampa Range Trailer*\n   👤 Bandeira Records',
    '*Formidable Opponent*\n   👤 Fontaine',
  ];
  const n = await lista.mostrar(sock, msg, ctx, {
    titulo: '💚 *2 resultados* — teste',
    linhas: titulos,
    itens: [{ url: 'a' }, { url: 'b' }],
    tipo: 'spotify',
    aoEscolher: async ({ item, idx }) => { escolhido = { item, idx }; },
  });
  t('registou pendente', lista._pendentes.size === 1 && n === 2, 'n=' + n);
  t('rowIds LISTANUM_1..2', ROWS.join(',') === 'LISTANUM_1,LISTANUM_2', ROWS.join(','));
  t('corpo tem as linhas numeradas', OUT.join(' ').includes('*1.*') && OUT.join(' ').includes('*2.*'), OUT[0]?.slice(0, 60));
  t('texto fala em ESCOLHER (clique)', OUT.join(' ').includes('ESCOLHER'), OUT[0]?.slice(-60));

  console.log('\n═══ 2. clique LISTANUM_2 resolve o pendente ═══');
  const r = await lista.tentarToken(sock, msg, ctx, 'LISTANUM_2');
  t('ação corre com o item certo', r === true && escolhido?.item.url === 'b' && escolhido?.idx === 1, JSON.stringify(escolhido));
  t('pendente morreu (1x só)', lista._pendentes.size === 0, String(lista._pendentes.size));
  const r2 = await lista.tentarToken(sock, msg, ctx, 'LISTANUM_2');
  t('segundo clique não repete', r2 === false && escolhido?.idx === 1, String(r2));
  t('token estranho não consome', (await lista.tentarToken(sock, msg, ctx, 'LISTANUM_X')) === false);

  console.log('\n═══ 3. fallback escrito: número continua a funcionar ═══');
  escolhido = null;
  await lista.mostrar(sock, msg, ctx, {
    titulo: '☁️ *2 resultados*',
    linhas: titulos, itens: [{ url: 'a' }, { url: 'b' }], tipo: 'soundcloud',
    aoEscolher: async ({ item, idx }) => { escolhido = { item, idx }; },
  });
  const rn = await lista.tentarNumero(sock, msg, ctx, '1');
  t('escrita "1" escolhe o 1.º', rn === true && escolhido?.item.url === 'a', JSON.stringify(escolhido));

  console.log('\n═══ 4. expirado / sem pendente ═══');
  lista._pendentes.clear();
  t('sem pendente: false', (await lista.tentarToken(sock, msg, ctx, 'LISTANUM_1')) === false);
  lista._pendentes.set('1@g.us::244001', { itens: [1], ts: Date.now() - 5 * 60 * 1000, tipo: 'x', aoEscolher: async () => {} });
  t('pendente velho expira', (await lista.tentarToken(sock, msg, ctx, 'LISTANUM_1')) === false);

  console.log(`\n${fail ? '💥' : '🎉'} LISTA-CLICK: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('💥 EXCEPÇÃO:', e); process.exit(1); });
