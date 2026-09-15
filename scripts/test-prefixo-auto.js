'use strict';
/** v7.72 — PREFIXO AUTO estilo System Zero: dizer "prefixo" mostra o cartão + botão copiar */
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };
const pc = require('../src/bot/prefixCard');

console.log('\n═══ CARTÃO ═══');
const c1 = pc.buildPrefixCard({ prefix: '!' });
check('cartão traz o prefixo', c1.text.includes('Prefixo atual: !') && c1.copyCode === '!' && /copiar prefixo/.test(c1.displayText));
check('sem custom → sem linha de grupo', !/Customizado/.test(c1.text));
const c2 = pc.buildPrefixCard({ prefix: '/', custom: true });
check('custom → linha de grupo', /Customizado neste grupo/.test(c2.text) && c2.copyCode === '/');

console.log('\n═══ TRIGGER (palavra sozinha) ═══');
for (const t of ['prefixo', 'Prefixos', 'PREFIXO?', 'prefixos!!', '  prefixo  ']) {
  check(`dispara em "${t}"`, pc.RE_PREFIXO_WORD.test(t));
}
for (const t of ['muda o prefixo', 'qual é o prefixo?', '!prefixo', 'setprefix', 'prefixo do grupo é?', 'meu prefixo']) {
  check(`NÃO dispara em "${t}"`, !pc.RE_PREFIXO_WORD.test(t));
}

console.log('\n═══ GRUPO CUSTOM ═══');
(async () => {
  check('groupPrefix na base → custom', await pc.isCustomGroupPrefix({}, 'g@g.us', async () => ({ groupPrefix: '/' })) === true);
  check('sem groupPrefix → não custom', await pc.isCustomGroupPrefix({}, 'g@g.us', async () => ({})) === false);
  check('base a arder → não custom (não parte)', await pc.isCustomGroupPrefix({}, 'g@g.us', async () => { throw new Error('mongo down'); }) === false);

  console.log('\n═══ CASE !prefixo ═══');
  const collected = {};
  require('../src/bot/cases/premium.js')((names, fn) => names.forEach(n => { collected[n] = fn; }));
  const sent = [];
  const sock = { sendMessage: async (j, c) => { sent.push(c.text || ''); return { key: { id: 'x' } }; } };
  await collected['prefixo']({ sock, msg: {}, ctx: { remoteJid: 'u@s.whatsapp.net', isGroup: false }, prefix: '!' });
  check('!prefixo envia o cartão', sent.length === 1 && /PREFIXO DO BOT/.test(sent[0]) && /Prefixo atual: !/.test(sent[0]), sent[0]?.slice(0, 60));
  check('fallback traz o código para copiar', /copiar prefixo/.test(sent[0]) && /`!`/.test(sent[0]));

  console.log('\n═══ WIRING ═══');
  const fs = require('fs');
  const src = fs.readFileSync('src/bot/commandHandler.js', 'utf8');
  check('handler: hook antes do gate (RE + send)', /RE_PREFIXO_WORD/.test(src) && /sendPrefixCard\(sock, ctx\.remoteJid/.test(src));

  console.log(`\n${fail ? '💥' : '🎉'} PREFIXO-AUTO: ${ok} OK / ${fail} FALHOU\n`);
  process.exit(fail ? 1 : 0);
})();
