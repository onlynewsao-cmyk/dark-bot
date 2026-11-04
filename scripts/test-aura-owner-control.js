#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vontade = require('../src/aura/auraVontade');

// Mesmo sob saturação extrema, o Dono não pode ser ignorado.
for (let i = 0; i < 10; i++) vontade.registar('grupo@g.us', '244900000001', 'responde agora');
const owner = vontade.querResponder({
  jid: 'grupo@g.us', num: '244900000001', texto: 'responde agora',
  isOwner: true, isGroup: true, mood: 'com_raiva', perguntaDirecta: false,
});
assert.strictEqual(owner.responde, true, 'Dono nunca é ignorado por saturação/humor');

const ownerPrompt = vontade.instrucao({ isOwner: true, isGroup: true, sat: 1, mood: 'com_raiva' });
assert.match(ownerPrompt, /AUTORIDADE DO DONO/);
assert.match(ownerPrompt, /não executes nada que ele não tenha pedido/i);
assert.match(ownerPrompt, /Não uses \[SILENCIO\]/i);

// Guardas estruturais das três vias de autonomia: silêncio do modelo,
// comandos nativos inventados e mensagens proativas sem opt-in.
const handler = fs.readFileSync('src/bot/commandHandler.js', 'utf8');
const cerebro = fs.readFileSync('src/aura/auraCerebro.js', 'utf8');
const proativa = fs.readFileSync('src/aura/auraProativa.js', 'utf8');
assert.match(handler, /const _pvForca = isOwner \|\| _forcarContextual/);
assert.match(cerebro, /if \(!brain\.pareceOrdem\(texto\)\) continue/);
assert.match(proativa, /aura_proactive_opt_in', false/);

console.log('AURA OWNER CONTROL: Dono não é ignorado; autonomia exige opt-in e ordem explícita.');
