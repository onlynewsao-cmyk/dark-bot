'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const emoji = require('../src/aura/auraEmoji');
const decide = require('../src/aura/auraDecide');

function equal(actual, expected, label) {
  assert.strictEqual(actual, expected, label);
  console.log('  ✓', label);
}
function ok(condition, label, detail = '') {
  assert.ok(condition, `${label}${detail ? ` — ${detail}` : ''}`);
  console.log('  ✓', label);
}

const catalogue = emoji.catalogo();
ok(catalogue.length >= 500, 'catálogo amplo com pelo menos 500 emojis', `${catalogue.length} opções únicas`);
ok(!['😍', '🥰', '😘', '💋'].some(icon => emoji.POOLS.affection.includes(icon)),
  'tom afectuoso não presume intimidade romântica');
ok(!['🤬', '👊', '🥊'].some(icon => emoji.POOLS.anger.includes(icon)),
  'reacções de irritação mantêm-se firmes sem escalar para agressão');

const cases = [
  ['kkkk que engraçado', 'laughter'],
  ['sinto muito, estou contigo', 'empathy'],
  ['parabéns, conseguiste!', 'celebration'],
  ['que fome, vamos comer pizza', 'food'],
  ['manda uma música para ouvir', 'music'],
  ['vou viajar para a praia', 'travel'],
  ['preciso estudar para a prova', 'work'],
  ['que calor hoje', 'weather'],
  ['o jogo de futebol foi intenso', 'sports'],
  ['obrigado, concordo contigo', 'approval'],
];
for (const [text, theme] of cases) {
  ok(emoji.detectarTemas(text).includes(theme), `classifica contexto: ${theme}`, text);
}

const laughPool = emoji.poolPara('kkkk que engraçado', 'normal').contexto;
const laugh = decide.escolherReacao('kkkk que engraçado', { mood: 'normal', random: () => 0 });
ok(laughPool.includes(laugh), 'selector mantém reacção dentro do tema de humor', laugh);

const normalMusic = decide.escolherReacao('vamos ouvir música', { mood: 'normal', random: () => 0 });
const happyMusic = decide.escolherReacao('vamos ouvir música', { mood: 'feliz', random: () => 0 });
equal(normalMusic, '🎵', 'mensagem musical escolhe primeiro do catálogo contextual');
equal(happyMusic, '😊', 'humor da persona altera a variante sem perder o contexto');

const neutralSleepy = decide.escolherReacao('mensagem sem tema reconhecível', {
  mood: 'sonolenta', random: () => 0,
});
equal(neutralSleepy, '😴', 'sem tema forte, o humor da persona orienta a reacção');

const supportive = emoji.poolPara('sinto muito pelo que aconteceu', 'animada');
ok(supportive.temas[0] === 'empathy', 'mensagem sensível continua a ter prioridade');
ok(supportive.estilo.includes('🫂') && !supportive.estilo.includes('🎉'),
  'humor animado usa variante cuidadosa num contexto sensível');

emoji.limparHistorico('repeticao-teste');
const first = emoji.escolherReacao('kkkk', { mood: 'normal', chatId: 'repeticao-teste', random: () => 0 });
const second = emoji.escolherReacao('kkkk', { mood: 'normal', chatId: 'repeticao-teste', random: () => 0 });
ok(first !== second, 'evita repetir as reacções mais recentes no mesmo chat', `${first} → ${second}`);
emoji.limparHistorico();

const root = path.join(__dirname, '..');
const commandHandler = fs.readFileSync(path.join(root, 'src/bot/commandHandler.js'), 'utf8');
const proactive = fs.readFileSync(path.join(root, 'src/aura/auraProativa.js'), 'utf8');
const will = fs.readFileSync(path.join(root, 'src/aura/auraVontade.js'), 'utf8');
ok(commandHandler.includes('function chooseAuraReaction') && commandHandler.includes('{ mood, chatId }'),
  'commandHandler encaminha humor e chat ao selector comum');
ok(!commandHandler.includes('const ownerReacts = [') && !commandHandler.includes('const neutralReacts = ['),
  'remove listas fixas do fluxo conversacional');
ok(proactive.includes('mood: _humorDe(best.key.remoteJid)') && proactive.includes('chatId: best.key.remoteJid'),
  'reacção espontânea também usa humor e evita repetição por chat');
ok(will.includes('_emojiReacao(texto, mood, jid)') && will.includes("require('./auraDecide').escolherReacao"),
  'reacções por saturação/humor usam o repertório central');

console.log(`AURA REACTIONS: OK — ${catalogue.length} emojis únicos, contexto, humor e anti-repetição.`);
