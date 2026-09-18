'use strict';
/** v7.83 — AURA ATENTA: quem fala com quem (directa/indirecta/entre-si/gíria) */
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

const DD = require('../src/aura/auraDestinatario');
const DEC = require('../src/aura/auraDecide');

// ── 1. analisar: vocativo ──
for (const t of ['aura, tudo bem?', 'oi aura', 'obrigado, aura!', 'ó aura, vem cá', 'aura?', 'aura tudo bem?', 'e ai, aura, beleza?']) {
  const r = DD.analisar({ texto: t, botNum: '999' });
  check(`vocativo "${t.slice(0, 22)}" → paraMim`, r.paraMim === true && r.sobreMim === false);
}
// ── 2. analisar: gíria (não é ela) ──
for (const t of ['minha aura está em baixo', 'que aura boa!', '+100 aura pra ele', 'a aura dela é forte', 'aura dela é fixe', 'perdi aura hoje']) {
  const r = DD.analisar({ texto: t, botNum: '999' });
  check(`gíria "${t.slice(0, 24)}" → nem paraMim nem sobre`, r.paraMim === false && r.sobreMim === false && r.giria === true, `pm=${r.paraMim} sm=${r.sobreMim} g=${r.giria}`);
}
// ── 3. analisar: indirecto (falam DELA) ──
for (const t of ['a aura é fixe', 'onde está a aura?', 'cadê a aura']) {
  const r = DD.analisar({ texto: t, botNum: '999' });
  check(`indirecto "${t}" → sobreMim`, r.paraMim === false && r.sobreMim === true);
}
// ── 4. menções e respostas (jids reais) ──
let r = DD.analisar({ texto: 'olha isto', mentionedJid: ['999@s.whatsapp.net'], botNum: '999' });
check('menção @bot → paraMim (mencionaram-te)', r.paraMim && /mencionaram/.test(r.motivos.join()));
r = DD.analisar({ texto: 'x', quotedParticipant: '999@s.whatsapp.net', botNum: '999' });
check('resposta a msg dela → paraMim', r.paraMim && /responderam/.test(r.motivos.join()));
r = DD.analisar({ texto: 'concordo', mentionedJid: ['111@s.whatsapp.net'], quotedParticipant: '222@s.whatsapp.net', botNum: '999', resolverNome: (j) => ({ '111@s.whatsapp.net': 'Joao', '222@s.whatsapp.net': 'Maria' })[j] || null });
check('entre-si: marcou Joao + respondeu Maria', !r.paraMim && r.mencoes.length === 1 && r.mencoes[0].nome === 'Joao' && r.respostaA.nome === 'Maria');
r = DD.analisar({ texto: 'dark, ajuda aqui', botNum: '999', tambemEu: ['dark'] });
check('nome do bot conta como vocativo', r.paraMim === true);
// ── 5. blocoParaPrompt ──
const b = DD.blocoParaPrompt(DD.analisar({ texto: 'concordo', mentionedJid: ['111@s.whatsapp.net'], quotedParticipant: '222@s.whatsapp.net', quotedTexto: 'o bot é fixe', botNum: '999', resolverNome: () => null }));
check('bloco: entre-si + resposta + marcado + excerto', /não — falam entre si/.test(b) && /\+222/.test(b) && /o bot é fixe/.test(b) && /\+111/.test(b), b.slice(0, 120));
// ── 6. deveResponder com dest ──
const G = { isOwner: false, isGroup: true };
check('dest giria → cala', !DEC.deveResponder({ texto: 'minha aura em baixo', ...G, dest: DD.analisar({ texto: 'minha aura em baixo', botNum: '9' }) }).responde);
const ri = DEC.deveResponder({ texto: 'a aura é fixe', ...G, dest: DD.analisar({ texto: 'a aura é fixe', botNum: '9' }) });
check('dest indirecto → responde leve', ri.responde === true && ri.leve === true);
check('dest marcou-outro → cala', !DEC.deveResponder({ texto: 'vem cá', isOwner: true, isGroup: true, dest: DD.analisar({ texto: 'vem cá', mentionedJid: ['1@s.whatsapp.net'], botNum: '9' }) }).responde);
check('dest vocativo → responde', DEC.deveResponder({ texto: 'oi aura', ...G, dest: DD.analisar({ texto: 'oi aura', botNum: '9' }) }).responde);
// ── 7. legado intacto ──
check('legado: nome responde', DEC.deveResponder({ texto: 'aura tudo bem?', isOwner: true, isGroup: true }).responde);
check('legado: @outro cala', !DEC.deveResponder({ texto: '@244111222333 vem cá', isOwner: true, isGroup: true }).responde);
// ── 8. citado() paridade ──
const H = require('../src/aura/auraHistorico');
const qm = (inner) => ({ message: inner });
check('citado lê sticker', H.citado(qm({ stickerMessage: { contextInfo: { participant: '1@s.whatsapp.net', quotedMessage: { conversation: 'zz' } } } }))?.jid === '1@s.whatsapp.net');
check('citado lê áudio', H.citado(qm({ audioMessage: { contextInfo: { participant: '2@s.whatsapp.net' } } }))?.jid === '2@s.whatsapp.net');

console.log(`\n${fail ? '💥' : '🎉'} AURA-DESTINO: ${ok} OK / ${fail} FALHOU\n`);
process.exit(fail ? 1 : 0);
