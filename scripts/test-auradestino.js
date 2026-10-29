'use strict';
/** v7.83 — AURA ATENTA: quem fala com quem (directa/indirecta/entre-si/gíria) */
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✅', n); } else { fail++; console.log('  ❌', n, x); } };

const DD = require('../src/aura/auraDestinatario');
const DEC = require('../src/aura/auraDecide');
const COMP = require('../src/aura/auraCompreensao');
const INTENT = require('../src/aura/auraIntent');
const SMART = require('../src/aura/auraSmart');

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
check('dest indirecto → silêncio sem reacção, marcado como leve', ri.responde === false && ri.leve === true);
check('dest marcou-outro → cala', !DEC.deveResponder({ texto: 'vem cá', isOwner: true, isGroup: true, dest: DD.analisar({ texto: 'vem cá', mentionedJid: ['1@s.whatsapp.net'], botNum: '9' }) }).responde);
check('dest vocativo → responde', DEC.deveResponder({ texto: 'oi aura', ...G, dest: DD.analisar({ texto: 'oi aura', botNum: '9' }) }).responde);
// ── 7. legado intacto ──
check('legado: nome responde', DEC.deveResponder({ texto: 'aura tudo bem?', isOwner: true, isGroup: true }).responde);
check('legado: @outro cala', !DEC.deveResponder({ texto: '@244111222333 vem cá', isOwner: true, isGroup: true }).responde);
// ── 8. citado() paridade ──
const H = require('../src/aura/auraHistorico');
const qm = (inner) => ({ message: inner });
check('citado lê sticker', H.citado(qm({ stickerMessage: { contextInfo: { participant: '1@s.whatsapp.net', quotedMessage: { conversation: 'zz' } } } }))?.jid === '1@s.whatsapp.net');
const audioQuote = H.citado(qm({ extendedTextMessage: { contextInfo: { participant: '2@s.whatsapp.net', remoteJid: 'grupo@g.us', stanzaId: 'q-audio', quotedMessage: { audioMessage: { mimetype: 'audio/ogg' } } } } }));
check('citação identifica autor, origem e tipo de áudio', audioQuote?.jid === '2@s.whatsapp.net' && audioQuote.remoteJid === 'grupo@g.us' && audioQuote.tipo === 'áudio' && audioQuote.media);
check('contextInfo sem quotedMessage não inventa uma citação', H.citado(qm({ audioMessage: { contextInfo: { participant: '2@s.whatsapp.net' } } })) === null);

// ── 9. roteamento multimodal e contexto real ──
const gameRecent = [{ fromMe: true, texto: 'Estou numa live a jogar Honkai: Star Rail.' }];
const gamePhoto = COMP.interpretarPedidoImagem({ texto: 'Me mande uma foto desse jogo aí', recentMessages: gameRecent, isDirectToAura: true });
check('referência ao jogo usa a fala anterior da AURA e não vira selfie', gamePhoto?.target === 'content' && gamePhoto.query === 'Honkai: Star Rail' && /não é uma captura/i.test(gamePhoto.caption));
const gamePhotoFromMemory = COMP.interpretarPedidoImagem({ texto: 'Me mande uma foto desse jogo aí', historyArray: [{ role: 'assistant', content: 'Estou numa live a jogar Honkai: Star Rail.' }], isDirectToAura: true });
check('referência ao jogo também resolve pelo histórico persistente', gamePhotoFromMemory?.query === 'Honkai: Star Rail');
check('pedido vago de foto pede clarificação', COMP.interpretarPedidoImagem({ texto: 'Manda uma foto', isDirectToAura: true })?.target === 'ambiguous');
check('foto tua usa a persona virtual', COMP.interpretarPedidoImagem({ texto: 'Manda uma foto tua', isDirectToAura: true })?.target === 'persona');
check('foto de cavalo é conteúdo externo', COMP.interpretarPedidoImagem({ texto: 'Manda uma foto de um cavalo', isDirectToAura: true })?.target === 'content');
check('foto de "dela" não pesquisa uma pessoa às cegas', COMP.interpretarPedidoImagem({ texto: 'Manda uma foto dela', isDirectToAura: true })?.target === 'ambiguous');
const aboutAura = COMP.analisarDestinatario('aura é fixe', { isGroup: true, botNum: '999' });
const callsAura = COMP.analisarDestinatario('aura, ajuda aqui', { isGroup: true, botNum: '999' });
const toMember = COMP.analisarDestinatario('Maria, olha isto', { isGroup: true, ownerName: 'Dark', knownOtherNames: ['Maria'] });
const toOwner = COMP.analisarDestinatario('Dark, olha isto', { isGroup: true, ownerName: 'Dark', knownOtherNames: ['Maria'] });
check('vocativo do membro não é rotulado como Dono', toMember.targetKind === 'participant' && !toMember.ownerVocative && toMember.otherVocative === 'maria');
check('vocativo do Dono mantém alvo separado', toOwner.targetKind === 'owner' && !!toOwner.ownerVocative);
check('auraIntent classifica 3.ª pessoa como não directa', !INTENT.analyzeIntent('aura é fixe', { isGroup: true, destination: aboutAura }).isDirectToAura);
check('auraIntent reconhece vocativo explícito', INTENT.analyzeIntent('aura, ajuda aqui', { isGroup: true, destination: callsAura }).isDirectToAura);
check('menção antiga + pergunta ao grupo não força destinatário', !INTENT.analyzeIntent('o que achas tu?', { isGroup: true, isOwner: true, mentionedAuraInGroup: true, recentTexts: ['aura, olá'] }).isDirectToAura);
check('elogio isolado recebe classe praise', SMART.classifyMessage('Linda').emotion === 'praise');
check('hint do elogio evita fingir que não percebeu', /não digas que não percebeste/.test(SMART.getAdaptivePromptSuffix(SMART.classifyMessage('Linda'), [], 'chat')));
const quoteFacts = COMP.inspecionarMensagem({
  key: { id: 'current', remoteJid: '244900000001@s.whatsapp.net' },
  message: { extendedTextMessage: { text: 'A foto é verdadeira?', contextInfo: {
    remoteJid: 'grupo@g.us', participant: '21@s.whatsapp.net', stanzaId: 'quoted-1',
    quotedMessage: { imageMessage: { caption: 'Honkai screenshot', contextInfo: { forwardingScore: 1, isForwarded: true } } },
  } } },
});
check('citação distingue autor de origem e conserva mídia/encaminhamento', quoteFacts.citado?.authorJid === '21@s.whatsapp.net' && quoteFacts.citado.sourceRemoteJid === 'grupo@g.us' && quoteFacts.citado.tipo === 'imagem' && quoteFacts.citado.caption === 'Honkai screenshot' && quoteFacts.citado.encaminhamento.encaminhada);
const quoteWithoutBody = COMP.inspecionarMensagem({
  key: { remoteJid: '244900000001@s.whatsapp.net' },
  message: { extendedTextMessage: { text: 'quem mandou?', contextInfo: { remoteJid: 'grupo@g.us', participant: '22@s.whatsapp.net', stanzaId: 'quoted-empty' } } },
});
check('stanzaId sem corpo mantém a resposta, mas não inventa texto', quoteWithoutBody.citado?.authorJid === '22@s.whatsapp.net' && quoteWithoutBody.citado.tipo === 'conteúdo citado indisponível' && !quoteWithoutBody.citado.texto);

console.log(`\n${fail ? '💥' : '🎉'} AURA-DESTINO: ${ok} OK / ${fail} FALHOU\n`);
process.exit(fail ? 1 : 0);
