#!/usr/bin/env node
'use strict';

const assert = require('assert');
const advanced = require('../src/aura/auraChannelAdvanced');

const calls = [];
const canais = {
  resolverAlvo: async (_sock, text) => /sem canal/i.test(text) ? null : '123@newsletter',
};
const sorteios = {
  criarQuiz: async (...args) => { calls.push(['quiz', ...args]); return { ok: true, msg: 'quiz criado' }; },
  revelarQuiz: async (...args) => { calls.push(['revelar', ...args]); return { ok: true, msg: 'quiz revelado' }; },
  criarEnqueteMultipla: async (...args) => { calls.push(['multipla', ...args]); return { ok: true, msg: 'enquete criada' }; },
  dashboardEngajamento: async (...args) => { calls.push(['engajamento', ...args]); return { ok: true, msg: 'métricas' }; },
  criarSorteioPorNome: async (...args) => { calls.push(['nome', ...args]); return { ok: true, msg: 'sorteio criado' }; },
  criarSorteioPorSeguir: async (...args) => { calls.push(['seguir', ...args]); return { ok: true, msg: 'sorteio seguidores' }; },
  criarSorteioPorVoto: async (...args) => { calls.push(['voto', ...args]); return { ok: true, msg: 'sorteio voto' }; },
  criarSorteioPorReacao: async (...args) => { calls.push(['reacao', ...args]); return { ok: true, msg: 'sorteio reação' }; },
  executarSorteio: async (...args) => { calls.push(['executar', ...args]); return { ok: true, msg: 'sorteio executado' }; },
};
const deps = { sock: {}, canais, sorteios };

(async () => {
  let spec = advanced.parsePollSpec('cria quiz "Capital de Angola?" | Luanda | Benguela | resposta: Luanda', { quiz: true });
  assert.deepStrictEqual(spec, { ok: true, question: 'Capital de Angola?', options: ['Luanda', 'Benguela'], answer: 'Luanda' });
  spec = advanced.parsePollSpec('cria enquete múltipla "Escolhe" | A');
  assert.strictEqual(spec.ok, false, 'não cria enquete sem duas opções');
  assert.strictEqual(advanced.extractWinners('3 vencedores'), 3);
  assert.strictEqual(advanced.extractPrize('prémio: uma bicicleta | resto'), 'uma bicicleta');

  let result = await advanced.executar('canal_quiz', { ...deps, text: 'cria quiz "Capital de Angola?" | Luanda | Benguela | resposta: Luanda' });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(calls[0][0], 'quiz');
  assert.deepStrictEqual(calls[0][3], { pergunta: 'Capital de Angola?', opcoes: ['Luanda', 'Benguela'], resposta: 'Luanda', premio: '', nVencedores: 1 });

  result = await advanced.executar('canal_enquete_multipla', { ...deps, text: 'cria enquete múltipla "Que dias?" | sexta | sábado | domingo máximo 2' });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(calls[1][0], 'multipla');
  assert.deepStrictEqual(calls[1][3], { pergunta: 'Que dias?', opcoes: ['sexta', 'sábado', 'domingo'], maxSelecoes: 2 });

  result = await advanced.executar('canal_engajamento', { ...deps, text: 'mostra engajamento no meu canal' });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(calls[2][0], 'engajamento');

  result = await advanced.executar('canal_sorteio', { ...deps, text: 'cria sorteio por seguir prémio: camiseta, 2 vencedores' });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(calls[3][0], 'seguir');
  assert.strictEqual(calls[3][3].nVencedores, 2);

  result = await advanced.executar('canal_sorteio', { ...deps, text: 'fecha sorteio nome_ab12cd34' });
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(calls[4], ['executar', {}, 'nome_ab12cd34']);

  const before = calls.length;
  result = await advanced.executar('canal_quiz', { ...deps, text: 'cria quiz sem opções' });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(calls.length, before, 'formato inválido não publica nem chama a API');

  result = await advanced.executar('canal_engajamento', { ...deps, text: 'sem canal' });
  assert.strictEqual(result.ok, false);
  assert.match(result.msg, /Diz em que canal/);

  console.log('AURA CANAL AVANÇADO: quiz, enquete, sorteio e métricas validados.');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
