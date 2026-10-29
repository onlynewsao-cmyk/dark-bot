'use strict';
/**
 * Verifica o encaminhamento real dos pedidos de imagem no commandHandler,
 * sem WhatsApp nem fornecedor de imagens: o provider é mockado.
 */
const assert = require('node:assert/strict');
const compreensao = require('../src/aura/auraCompreensao');
const imageSearch = require('../src/bot/imageSearch');
const handler = require('../src/bot/commandHandler');

const searchCalls = [];
const sent = [];
imageSearch.buscarImagens = async (query, count) => {
  searchCalls.push({ query, count });
  return [{ url: 'https://images.example.test/honkai-reference.jpg', titulo: 'Honkai gameplay reference', fonte: 'mock' }];
};
imageSearch.lembrarTermo = () => {};
const sock = { sendMessage: async (jid, payload, options) => { sent.push({ jid, payload, options }); } };
const msg = { key: { id: 'image-request' }, message: { conversation: 'Me mande uma foto desse jogo aí' } };
const recent = [{ fromMe: true, texto: 'Estou numa live a jogar Honkai: Star Rail.' }];

(async () => {
  const contentIntent = compreensao.interpretarPedidoImagem({
    texto: 'Me mande uma foto desse jogo aí', recentMessages: recent, isDirectToAura: true,
  });
  const contentResult = await handler.fotosPedidas(sock, msg, {
    remoteJid: 'group@g.us', isGroup: true, dest: { directToAura: true }, imageIntent: contentIntent,
  }, 'Me mande uma foto desse jogo aí');
  assert.equal(contentResult, 'enviadas');
  assert.match(searchCalls[0].query, /Honkai: Star Rail/);
  assert.equal(sent[0].payload.image.url, 'https://images.example.test/honkai-reference.jpg');
  assert.match(sent[0].payload.caption, /não é uma captura/i);
  assert.doesNotMatch(sent[0].payload.caption, /live real da AURA/i);

  const countAfterContent = sent.length;
  const personaIntent = compreensao.interpretarPedidoImagem({ texto: 'Manda uma foto tua', isDirectToAura: true });
  const personaResult = await handler.fotosPedidas(sock, msg, {
    remoteJid: '244900000001@s.whatsapp.net', isGroup: false, dest: { directToAura: true }, imageIntent: personaIntent,
  }, 'Manda uma foto tua');
  assert.equal(personaResult, null, 'selfie/persona não pode cair na pesquisa externa');
  assert.equal(sent.length, countAfterContent, 'o sender externo não envia a persona');
  assert.equal(searchCalls.length, 1, 'não pesquisa uma persona como conteúdo');

  const countBeforeUnaddressed = sent.length;
  const unaddressedIntent = compreensao.interpretarPedidoImagem({ texto: 'Manda uma foto de um cavalo', isDirectToAura: false });
  const unaddressedResult = await handler.fotosPedidas(sock, msg, {
    remoteJid: 'group@g.us', isGroup: true, dest: { directToAura: false }, imageIntent: unaddressedIntent,
  }, 'Manda uma foto de um cavalo');
  assert.equal(unaddressedResult, null, 'mensagem do grupo sem destinatário não gera resposta');
  assert.equal(sent.length, countBeforeUnaddressed);
  assert.equal(searchCalls.length, 1, 'mensagem não dirigida não chama o provider');

  const vagueIntent = compreensao.interpretarPedidoImagem({ texto: 'Manda uma foto', isDirectToAura: true });
  const vagueResult = await handler.fotosPedidas(sock, msg, {
    remoteJid: '244900000001@s.whatsapp.net', isGroup: false, dest: { directToAura: true }, imageIntent: vagueIntent,
  }, 'Manda uma foto');
  assert.equal(vagueResult, 'falhou');
  assert.match(sent.at(-1).payload.text, /Queres uma imagem da personagem virtual AURA/i);
  assert.equal(searchCalls.length, 1, 'pedido vago pede esclarecimento, não adivinha');

  console.log('AURA PHOTO ROUTING: 4 cenários OK — conteúdo, persona, silêncio de grupo e pedido ambíguo.');
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
