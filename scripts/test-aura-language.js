'use strict';
const assert = require('assert/strict');
const path = require('path');
const language = require('../src/aura/auraDialogue');
const { scenarios } = require('./fixtures/aura-language-corpus.json');
const loadIsolated = require('./helpers/load-isolated');
const brain = loadIsolated(path.join(__dirname, '../src/aura/auraBrain.js'), (id, req) => id === './auraDialogue' ? language : id === './auraGrupo' ? require('../src/aura/auraGrupo') : id.startsWith('.') ? {} : req(id));
const decide = require('../src/aura/auraDecide');
const smart = require('../src/aura/auraSmart');
const perception = require('../src/aura/auraPercepcao');
const counters = {};
for (const scenario of scenarios) {
  let actual;
  switch (scenario.kind) {
    case 'literal': actual = language.literalGreeting(scenario.text); break;
    case 'normalize': actual = language.normalizeRequest(scenario.text).replace(/[.!?]+$/g, '').trim(); break;
    case 'nonaction':
      actual = language.nonAction(scenario.text);
      assert.equal(brain.pareceOrdem(scenario.text), false, scenario.text);
      assert.equal(brain.detectarCapacidade(scenario.text), null, scenario.text);
      break;
    case 'format': actual = language.deliveryPreference(scenario.text); break;
    case 'clarification': actual = !!language.clarificationHint(scenario.text); break;
    default: throw new Error('Unknown scenario kind');
  }
  assert.deepEqual(actual, scenario.expected, `case ${scenario.id}: ${scenario.text}`);
  counters[scenario.kind] = (counters[scenario.kind] || 0) + 1;
}
const originalRandom = Math.random;
try {
  Math.random = () => 0; // Old code would select surprise audio every time.
  for (const text of ['Diga oi','oi','como estás?','conta-me o que aconteceu','amo conversar','O quê?']) {
    assert.notEqual(decide.comoResponder({ texto: text, isOwner: true }), 'audio');
  }
  assert.equal(decide.comoResponder({ texto: 'manda áudio', pediuAudio: true }), 'audio');
} finally { Math.random = originalRandom; }
for (const text of ['?','pq?','O quê?','Como assim?']) assert.equal(smart.classifyMessage(text).isQuestion, true);
assert.equal(perception.pedeVoz('Não mande áudio'), false);
assert.equal(perception.pedeTexto('Não mande áudio'), true);
assert.equal(perception.pedeVoz('manda em texto, mas agora manda em áudio'), true);
for (const text of ['Não apague o grupo', 'Como apagar um grupo?', 'Traduza este comando', 'O quê?', 'Diga oi']) {
  assert.equal(language.constrainModelActions('[FAZ:grupo_apagar] Já fiz.', text).includes('[FAZ:'), false);
}
assert.equal(language.constrainModelActions('[CMD:qualquer_comando]', 'faz isto').includes('[CMD:'), false);
assert.ok(scenarios.length > 1000);
console.log(`AURA LANGUAGE: ${scenarios.length} scenarios OK / 0 falhas; ${JSON.stringify(counters)}`);
