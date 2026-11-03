#!/usr/bin/env node
'use strict';

const assert = require('assert');
const policy = require('../src/aura/auraMediaConsent');

const yes = [
  ['Aura, analisa esse sticker', 'sticker'],
  ['o que está nesta imagem?', 'imagem'],
  ['vê este vídeo e explica', 'video'],
  ['lê este documento e resume', 'documento'],
  ['verifica este link para mim', 'link'],
  ['qual a tua opinião desta foto?', 'imagem'],
];
const no = [
  ['', 'sticker'],
  ['oi Aura', 'sticker'],
  ['@Aura', 'imagem'],
  ['kkk', 'video'],
  ['faz sticker desta foto', 'imagem'],
  ['obrigado', 'documento'],
];

for (const [text, type] of yes) {
  assert.strictEqual(policy.pediuAnaliseDeMidia({ texto: text, tipo: type }), true, `${type}: deveria exigir análise para ${text}`);
}
for (const [text, type] of no) {
  assert.strictEqual(policy.pediuAnaliseDeMidia({ texto: text, tipo: type }), false, `${type}: não é pedido de análise: ${text}`);
}
assert.strictEqual(policy.deveIgnorarMidiaPassiva({ texto: '', tipo: 'sticker' }), true, 'sticker solto é ignorado');
assert.strictEqual(policy.deveIgnorarMidiaPassiva({ texto: 'Aura, olha esse sticker', tipo: 'sticker' }), false, 'pedido explícito autoriza inspeção');
assert.strictEqual(policy.deveIgnorarMidiaPassiva({ texto: 'olá', tipo: 'audio' }), false, 'áudio não entra na política visual passiva');

console.log('AURA MEDIA CONSENT: mídia passiva só é analisada por pedido explícito.');
