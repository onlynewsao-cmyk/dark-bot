#!/usr/bin/env node
'use strict';

const assert = require('assert');
const ch = require('../src/bot/commandHandler');
const san = require('../src/aura/auraSanitizer');
const prefixEngine = require('../src/bot/prefixEngine');
const config = require('../src/config');

let ok = 0;
let fail = 0;
function test(name, condition, extra = '') {
  if (condition) {
    ok++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.error(`  ❌ ${name} ${extra}`);
  }
}

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   TEST: Correção de Comandos em PV e Anti-Leak da AURA   ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// ── 1. Prioridade na Extração de IDs de Botões Interativos ──
console.log('── 1. Extração de Botão Interativo vs Texto de Exibição ──');
const interactiveMsg = {
  key: { remoteJid: '244945280380@s.whatsapp.net', id: 'TEST_IRM' },
  message: {
    extendedTextMessage: { text: 'música, vídeo, redes sociais.' },
    interactiveResponseMessage: {
      nativeFlowResponseMessage: {
        paramsJson: JSON.stringify({ id: '.down' })
      }
    }
  }
};
const extractedInteractive = ch.extractText(interactiveMsg);
test('interactiveResponseMessage id tem prioridade sobre extendedTextMessage', extractedInteractive === '.down', `obteve: ${extractedInteractive}`);

const listMsg = {
  key: { remoteJid: '244945280380@s.whatsapp.net', id: 'TEST_LIST' },
  message: {
    conversation: 'música, vídeo, redes sociais.',
    listResponseMessage: {
      singleSelectReply: { selectedRowId: '.down' }
    }
  }
};
const extractedList = ch.extractText(listMsg);
test('listResponseMessage selectedRowId tem prioridade sobre conversation', extractedList === '.down', `obteve: ${extractedList}`);

const buttonMsg = {
  key: { remoteJid: '244945280380@s.whatsapp.net', id: 'TEST_BTN' },
  message: {
    extendedTextMessage: { text: 'música, vídeo, redes sociais.' },
    buttonsResponseMessage: {
      selectedButtonId: '.down'
    }
  }
};
const extractedBtn = ch.extractText(buttonMsg);
test('buttonsResponseMessage selectedButtonId tem prioridade sobre extendedTextMessage', extractedBtn === '.down', `obteve: ${extractedBtn}`);

// ── 2. Mapeamento de Títulos de Menus em Texto Puro ──
console.log('\n── 2. Mapeamento de Títulos de Linhas de Menus ──');
const sampleMenuTitles = [
  'música, vídeo, redes sociais.',
  '_música, vídeo, redes sociais._',
  'stickers, packs, arte visual.',
  '_stickers, packs, arte visual._',
  'IA com memória, GPT, Claude.',
  '_IA com memória, GPT, Claude._',
  'quiz, forca, casino, mini-games.',
  'coins, bank, RPG, crafting.',
  'conteúdo adulto, só VIPs.',
  '_conteúdo adulto, só VIPs._',
  'planos premium e hospedagem.',
  'informações do criador.',
];

const chFile = require('fs').readFileSync('./src/bot/commandHandler.js', 'utf8');
for (const title of sampleMenuTitles) {
  const norm = title.replace(/[_*~`]/g, '').trim().toLowerCase();
  test(`MENU_TITLES_MAP contém '${norm}'`, chFile.includes(`'${norm}':`), `faltando: ${norm}`);
}

// ── 3. Detecção de Comandos (pareceComando) ──
console.log('\n── 3. Classificação de Mensagens de Comando ──');
test('+down é detectado como comando', ch.pareceComando('+down') === true);
test('!down é detectado como comando', ch.pareceComando('!down') === true);
test('.down é detectado como comando', ch.pareceComando('.down') === true);
test('/central é detectado como comando', ch.pareceComando('/central') === true);
test('#menu é detectado como comando', ch.pareceComando('#menu') === true);
test('$play é detectado como comando', ch.pareceComando('$play') === true);
test('música, vídeo, redes sociais. NÃO é comando por si só', ch.pareceComando('música, vídeo, redes sociais.') === false);
test('Oi Aura, como vai você? NÃO é comando', ch.pareceComando('Oi Aura, como vai você?') === false);

// ── 4. Anti-Leak de Prompt e Raciocínio (Chain-of-Thought) ──
console.log('\n── 4. Anti-Leak de Raciocínio e Diretrizes do Sistema ──');
const screenshotLeak = `O Dark mandou "+down".
Isto é um comando com prefixo (+), mas o prompt diz:
"NUNCA respondas a mensagens que começam com prefixo (. ! /)". Porém '+' não está explicitamente na lista (. ! /), mas pode ser um comando do bot antigo ou de download.
Espera, "NUNCA respondas a mensagens que começam com prefixo (. ! /)".
Mas em O QUE SABES DESTA PESSOA AQUI:
"últimas dela: "+central" · "+down""
Na mensagem anterior ele mandou "+central" e eu respondi ativando o menu .
Agora ele mandou "+down".
"+down" normalmente é comando de download de mídia / redes sociais no bot.
Mas o que ele quer baixar se não mandou link?
"JULGAMENTO: se a conversa já dá a certeza do que ela quer, executa; se falta algo, PERGUNTA a falha (1 pergunta) em vez de adivinhar."
Se ele mandou só "+down" sem link nem vídeo citado:`;

test('eVazamento detecta o vazamento do screenshot', san.eVazamento(screenshotLeak) === true);
const cleanedLeak = san.limparResposta(screenshotLeak);
test('limparResposta esvazia vazamento puro de raciocínio', cleanedLeak === '', `sobrou: "${cleanedLeak}"`);

const thinkTagLeak = `<think>
Analisando a mensagem do usuário...
Ele quer baixar um vídeo do youtube.
</think>
Aqui está o seu download!`;
test('limparResposta remove bloco <think> e mantém resposta do usuário', san.limparResposta(thinkTagLeak).trim() === 'Aqui está o seu download!');

const thoughtTagLeak = `<thought>
Raciocínio interno aqui.
</thought>
Tô aqui, Dark.`;
test('limparResposta remove bloco <thought>', san.limparResposta(thoughtTagLeak).trim() === 'Tô aqui, Dark.');

const reasoningTagLeak = `<reasoning>
Internal chain of thought...
</reasoning>
Olá, meu amor! 🖤`;
test('limparResposta remove bloco <reasoning>', san.limparResposta(reasoningTagLeak).trim() === 'Olá, meu amor! 🖤');

// ── 5. Preservação de Conversas Humanas Legítimas ──
console.log('\n── 5. Preservação de Conversas Legítimas da Aura ──');
const legitMsgs = [
  'Oi meu amor, como foi seu dia?',
  'rawr! tô jogando um joguinho aqui no PC, e você? 🖤',
  'Adorei essa foto que você mandou!',
  'Diz aí, o que você tá aprontando hoje? hehe',
];
for (const m of legitMsgs) {
  test(`Conversa legítima não é rotulada como vazamento: "${m.slice(0, 30)}..."`, san.eVazamento(m) === false);
  test(`Conversa legítima é preservada: "${m.slice(0, 30)}..."`, san.limparResposta(m) === m);
}

// ── 6. Invariantes de Bloqueio da Aura para Comandos ──
console.log('\n── 6. Bloqueio Estrito de Comandos na Aura ──');
test('commandHandler tem bloqueio de _pareceCmd para _auraMayReply', chFile.includes('if (_pareceCmd || prefixInfo) {') && chFile.includes('_auraMayReply = false;'));
test('commandHandler tem verificação de !_pareceCmd no atalho do Dono no PV', chFile.includes('isOwner && isPv && !_pareceCmd && _superIntent.directScore >= 20'));
test('commandHandler faz checagem sanCheck.eVazamento antes de sendMessage', chFile.includes('sanCheck.eVazamento(finalAnswer)'));

console.log('\n──────────────────────────────────────────────────────────');
console.log((fail === 0 ? '🎉' : '💥') + ` RESULTADO: ${ok} OK / ${fail} FALHAS\n`);
process.exit(fail === 0 ? 0 : 1);
