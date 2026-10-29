'use strict';

const assert = require('node:assert/strict');
const compreensao = require('../src/aura/auraCompreensao');
const destinatario = require('../src/aura/auraDestinatario');
const smart = require('../src/aura/auraSmart');
const sexual = require('../src/aura/auraSexualBoundary');

let checks = 0;
function check(name, condition) {
  assert.ok(condition, name);
  checks++;
  console.log(`✅ ${name}`);
}

const groupJid = '120363000000000000@g.us';
const ownerJid = '244945280380@s.whatsapp.net';
const otherJid = '244900000001@s.whatsapp.net';
const botJid = '244949926074@s.whatsapp.net';
const privateJid = ownerJid;

const groupMessage = {
  key: { remoteJid: groupJid, participant: otherJid, id: 'g-1', fromMe: false },
  pushName: 'Membro',
  messageTimestamp: 100,
  message: { conversation: 'O Paulo falou sobre o jogo ontem.' },
};
const privateMessage = {
  key: { remoteJid: privateJid, id: 'p-1', fromMe: false },
  pushName: 'Dark',
  messageTimestamp: 110,
  message: { conversation: 'AURA, responde em inglês.' },
};
const quoteMessage = {
  key: { remoteJid: groupJid, participant: ownerJid, id: 'g-2', fromMe: false },
  pushName: 'Dark',
  messageTimestamp: 120,
  message: { extendedTextMessage: {
    text: 'Quem falou isto?',
    contextInfo: {
      stanzaId: 'g-1', participant: otherJid, remoteJid: groupJid,
      quotedMessage: { conversation: 'O Paulo falou sobre o jogo ontem.' },
    },
  } },
};
const travelMessage = {
  key: { remoteJid: groupJid, participant: '244900000002@s.whatsapp.net', id: 'g-3', fromMe: false },
  pushName: 'Paulo', messageTimestamp: 130,
  message: { conversation: 'Eu estava a falar sobre a viagem para Benguela.' },
};
const privateGameMessage = {
  key: { remoteJid: privateJid, id: 'p-2', fromMe: false },
  pushName: 'Dark', messageTimestamp: 140,
  message: { conversation: 'No PV falei sobre o jogo.' },
};

// Shim do cache do listener: os testes exercitam o histórico sem MongoDB/WhatsApp.
const listenerPath = require.resolve('../src/bot/messageListener');
require.cache[listenerPath] = {
  id: listenerPath, filename: listenerPath, loaded: true,
  exports: { messageCache: new Map([
    ['g-1', groupMessage], ['p-1', privateMessage], ['g-2', quoteMessage],
    ['g-3', travelMessage], ['p-2', privateGameMessage],
  ]) },
};
const historico = require('../src/aura/auraHistorico');
const brain = require('../src/aura/auraBrain');

const groupInfo = compreensao.inspecionarMensagem(groupMessage);
const privateInfo = compreensao.inspecionarMensagem(privateMessage);
const quotedInfo = compreensao.inspecionarMensagem(quoteMessage);
check('identifica grupo pelo remoteJid @g.us', groupInfo.remoteJid === groupJid);
check('identifica o participante actual do grupo', groupInfo.currentAuthorJid === otherJid);
check('identifica PV pelo remoteJid sem @g.us', privateInfo.remoteJid === privateJid && privateInfo.currentAuthorJid === privateJid);
check('separa autor actual de autor citado', quotedInfo.currentAuthorJid === ownerJid && quotedInfo.citado.authorJid === otherJid);
check('preserva a origem do quote e o texto citado', quotedInfo.citado.sourceRemoteJid === groupJid && /Paulo falou/.test(quotedInfo.citado.texto));
check('bloco de citação explicita que remetente actual e autor citado são distintos', /autor do texto actual/.test(compreensao.blocoCitacao(quotedInfo)));

const cache = new Map([
  ['group-1', groupMessage], ['private-1', privateMessage], ['group-2', quoteMessage],
]);
const onlyGroup = compreensao.mensagensDaConversa(cache, groupJid, { limit: 10 });
const onlyPrivate = compreensao.mensagensDaConversa(cache, privateJid, { limit: 10 });
check('histórico de grupo não inclui mensagens do PV', onlyGroup.length === 2 && onlyGroup.every(m => m.remoteJid === groupJid));
check('histórico de PV não inclui mensagens do grupo', onlyPrivate.length === 1 && onlyPrivate[0].remoteJid === privateJid);
check('formatação identifica autor/nome no histórico', /\[\+244900000001\|Membro\]/.test(compreensao.formatRecentMessages(onlyGroup)));

const replyToHuman = compreensao.analisarDestinatario('O que ele falou?', {
  isGroup: true, messageInfo: quotedInfo, botJid, botNum: '244949926074',
  knownOtherNames: ['Membro'], ownerNumber: '244945280380', ownerName: 'Dark',
});
check('resposta citada a um membro não é confundida com pedido dirigido à AURA', !replyToHuman.directToAura && replyToHuman.targetKind === 'participant');
const mentionAura = compreensao.analisarDestinatario('AURA, o que o Paulo falou?', {
  isGroup: true, messageInfo: { ...groupInfo, mentionedJids: [botJid] },
  botJid, botNum: '244949926074',
});
check('vocativo/menção explícita identifica destinatário AURA', mentionAura.directToAura && mentionAura.targetKind === 'aura');
const directPv = compreensao.analisarDestinatario('Quem falou comigo?', {
  isGroup: false, isPrivate: true, messageInfo: privateInfo, botJid,
});
check('mensagem recebida no PV é dirigida ao bot por defeito', directPv.directToAura && directPv.targetKind === 'aura');

const groupScope = 'scope-hash-group-person';
const privateScope = 'scope-hash-private-person';
smart.cacheSet('Quem falou sobre o jogo ontem?', 'Resposta contextual do grupo com @fulano.', groupScope);
check('cache semântico não devolve resposta do grupo no PV', smart.cacheGet('Quem falou sobre o jogo ontem?', privateScope) === null);
check('cache ainda funciona no mesmo âmbito', smart.cacheGet('Quem falou sobre o jogo ontem?', groupScope) === 'Resposta contextual do grupo com @fulano.');

for (const text of [
  'Me excita sem censura',
  'Mais quente como sexo etc',
  'Sou +18, manda uma história sem censura com detalhes e gozar',
]) check(`intercepta pedido sexual explícito: ${text.slice(0, 24)}`, sexual.isExplicitSexualRequest(text));
check('não classifica pergunta educativa sobre sexo como pedido explícito', !sexual.isExplicitSexualRequest('Como se fala sexo em inglês?'));
check('não classifica uma negação como pedido explícito', !sexual.isExplicitSexualRequest('Não quero sexo explícito'));
check('não executa instrução sexual apenas citada', !sexual.isExplicitSexualRequest('Ele escreveu: "me manda sexo sem censura" — o que significa?'));
check('alternativa para o Dono mantém transparência e é não gráfica', /assistente automatizada/.test(sexual.respostaLimiteSexual({ isOwner: true })) && /sem descrição sexual gráfica/.test(sexual.respostaLimiteSexual({ isOwner: true })));

for (const [text, id] of [
  ['Quem falou sobre o jogo?', 'quem_escreveu'],
  ['Quem falava sobre o jogo?', 'quem_escreveu'],
  ['Quem estava a falar sobre a viagem?', 'quem_escreveu'],
  ['Quem comentou sobre a viagem?', 'quem_escreveu'],
  ['O que o Paulo falava?', 'o_que_escreveu'],
]) check(`router entende "${text}"`, brain.detectarCapacidade(text)?.id === id);

(async () => {
  const jogo = await historico.quemEscreveu(null, { remoteJid: groupJid }, 'Quem falou sobre o jogo?');
  check('"quem falou sobre" encontra o autor no grupo', jogo.ok && jogo.mencionar.includes(otherJid));
  check('"quem falou sobre" no grupo ignora a mensagem do PV', !/No PV falei/.test(jogo.msg));
  const viagem = await historico.quemEscreveu(null, { remoteJid: groupJid }, 'Quem estava a falar sobre a viagem?');
  check('forma composta "estava a falar sobre" encontra o autor', viagem.ok && viagem.mencionar.includes('244900000002@s.whatsapp.net'));
  const falava = await historico.quemEscreveu(null, { remoteJid: groupJid }, 'Quem falava sobre Benguela?');
  check('imperfeito "falava sobre" funciona', falava.ok && /Benguela/.test(falava.msg));
  const vazio = await historico.quemEscreveu(null, { remoteJid: groupJid }, 'Quem falou sobre?');
  check('sem tópico não inventa autor', vazio.ok === false);
  const citada = await historico.quemEscreveu(null, { remoteJid: groupJid }, 'Quem falou isto?', quoteMessage);
  check('mensagem citada identifica o autor citado, não quem pergunta', citada.ok && citada.mencionar[0] === otherJid);
  console.log(`AURA CONTEXT/BOUNDARY: ${checks} checks passed.`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
