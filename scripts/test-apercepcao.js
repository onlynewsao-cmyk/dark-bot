#!/usr/bin/env node
/**
 * Teste: Aura Percepção (v7.95) 🧠
 *  • frases sociais («manda em texto», «qual é o meu @?», «representa-me
 *    num sticker») classificam certo
 *  • modo texto persiste e a voz pedida fura-o
 *  • sticker pendente consome uma vez e caduca
 *  • hooks no commandHandler + cérebro existem no código-fonte
 */
'use strict';

const assert = require('assert');
const fs2 = require('fs');
const path2 = require('path');

const perc = require('../src/aura/auraPercepcao');

console.log('=== Aura Percepção (v7.95) ===');

// ── 1. Classificação social ───────────────────────────────────
assert.ok(perc.pedeTexto('rui manda em texto tem muito barulho'), 'manda em texto');
assert.ok(perc.pedeTexto('só texto pf'), 'só texto');
assert.ok(perc.pedeTexto('não consigo ouvir nada'), 'não consigo ouvir');
assert.ok(perc.pedeTexto('aí tem muito barulho'), 'barulho');
assert.ok(!perc.pedeTexto('qual o tema do grupo?'), 'texto negativo limpo');

assert.ok(perc.pedeVoz('manda audio para mim'), 'manda audio');
assert.ok(perc.pedeVoz('grava uma nota de voz'), 'nota de voz');
assert.ok(!perc.pedeVoz('responde em texto tem muito barulho'), 'texto vence voz');
assert.ok(!perc.pedeVoz('sem audio nao consigo ouvir'), 'sem áudio não é voz');

assert.ok(perc.perguntaMeuArroba('aura qual é o meu @?'), 'qual é o meu @');
assert.ok(perc.perguntaMeuArroba('meu @'), 'meu @');
assert.ok(perc.perguntaMeuArroba('qual o meu número?'), 'meu número');
assert.ok(!perc.perguntaMeuArroba('@meu bot aqui'), '@ genérico não');

assert.ok(perc.pedidoStickerProprio('Me representa em um sticker'), 'representa-me');
assert.ok(perc.pedidoStickerProprio('transforma-me em figurinha'), 'transforma-me');
assert.ok(!perc.pedidoStickerProprio('manda stickers para o canal'), 'canal não é de-mim');

assert.ok(perc.pedidoStickerTema('manda um sticker de gato'), 'sticker de gato');
assert.ok(!perc.pedidoStickerTema('kkk adorei'), 'conversa limpa');
console.log('✔ classificação social (10 frases)');

// ── 2. Estado por chat+pessoa ─────────────────────────────────
perc._reset();
const k = perc.chave('123@g.us', '244900000000');
assert.strictEqual(perc.modoTexto(k), false, 'começa sem modo texto');
perc.definirModoTexto(k, true);
assert.strictEqual(perc.modoTexto(k), true, 'modo texto ON');
assert.strictEqual(perc.modoTexto(perc.chave('123@g.us', '244999')), false, 'outra pessoa não herda');
assert.strictEqual(perc.modoTexto(perc.chave('777@g.us', '244900000000')), false, 'outro chat não herda');
perc.definirModoTexto(k, false);
assert.strictEqual(perc.modoTexto(k), false, 'manda voz cancela');
console.log('✔ modo texto por chat+pessoa');

// ── 3. Sticker pendente ───────────────────────────────────────
perc._reset();
assert.strictEqual(perc.temStickerPendente(k), false, 'sem pendente');
perc.marcarStickerPendente(k);
assert.strictEqual(perc.temStickerPendente(k), true, 'marcado');
assert.strictEqual(perc.consumirSticker(k), true, 'consome 1 vez');
assert.strictEqual(perc.temStickerPendente(k), false, 'depois de consumir não há');
assert.strictEqual(perc.consumirSticker(k), false, 'não consome duas vezes');
console.log('✔ sticker pendente consome uma vez');

// ── 4. Hooks no código-fonte ──────────────────────────────────
const ch = fs2.readFileSync(path2.join(__dirname, '..', 'src', 'bot', 'commandHandler.js'), 'utf8');
assert.ok(/v7\.95: PERCEPÇÃO/.test(ch), 'hook percepção no commandHandler');
assert.ok(/temStickerPendente\(_pkAura\)/.test(ch), 'consumo de sticker pendente');
assert.ok(/perguntaMeuArroba\(cleanText\)/.test(ch), 'resposta ao «meu @»');
assert.ok(/pedidoStickerProprio\(cleanText\)/.test(ch), 'intenção de sticker-me');
assert.ok(/pediuAudio = \(_modoSoAudio/.test(ch) && /_mtVoz && !_pedidoExplicito/.test(ch), 'gate da voz modo-texto');
assert.ok(/actionSticker && _querStk/.test(ch), 'gate do [STICKER:] da IA');
assert.ok(/actionImage && _querImg/.test(ch), 'gate do [IMAGE:] da IA');
assert.ok(/falsa\?\.tipo === 'audio' && !_mtA/.test(ch), 'gate falsa-audio');
assert.ok(/falsa\?\.tipo === 'sticker' && falsa\.termo && _querStickerA/.test(ch), 'gate falsa-sticker');

const cer = fs2.readFileSync(path2.join(__dirname, '..', 'src', 'aura', 'auraCerebro.js'), 'utf8');
assert.ok(/v7\.95: pediu sticker SEM média/.test(cer), 'cérebro: sticker sem média');
assert.ok(/marcarStickerPendente/.test(cer), 'cérebro marca sticker pendente');
console.log('✔ hooks no commandHandler + cérebro');

console.log('\nOK / test-apercepcao — tudo passou (v7.95)');
