'use strict';
/**
 * Test suite for Aura Evolution & Cognitive Engine:
 * 1. State loading & XP progression.
 * 2. Persistent insight storage (Dono, Geral, Canal, Habito).
 * 3. Tag processing ([APRENDI:], [INSIGHT:], [HABITO:]).
 * 4. System prompt injection (forma única de pensar e agir).
 * 5. Case registration for !mente / !evolucao / !ensinar.
 */

const assert = require('assert');
const Module = require('module');

// Mock mongoose e dotenv se não estiverem instalados no sandbox
const _orig = Module.prototype.require;
Module.prototype.require = function (s) {
  if (s === 'dotenv') return { config: () => ({}) };
  if (s === 'mongoose' || s.endsWith('/mongoose')) {
    class Schema {
      constructor() { this.statics = {}; this.methods = {}; }
      index() { return this; } set() { return this; } static() { return this; } method() { return this; }
      static plugin() { return this; }
      static get Types() { return { Mixed: Object, ObjectId: class {} }; }
    }
    const mkModel = () => {
      const M = function () {};
      M.findOne = () => ({ lean: async () => null, sort: () => ({ lean: async () => [] }), exec: async () => null });
      M.find = () => ({ lean: async () => [] });
      M.updateOne = async () => ({});
      M.findOneAndUpdate = async () => ({});
      M.create = async () => ({});
      M.model = M;
      return M;
    };
    return { Schema, model: () => mkModel(), connect: async () => ({}), Types: { ObjectId: class {} }, connection: { readyState: 1 } };
  }
  return _orig.apply(this, arguments);
};

const evolucao = require('../src/aura/auraEvolucao');

async function run() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   TEST: AURA EVOLUÇÃO COGNITIVA & APRENDIZAGEM ILIMITADA ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Test 1: Estado Inicial e Carregamento
  const estado = await evolucao.carregarEstado();
  assert.ok(estado.nivel >= 1, 'Nível deve ser >= 1');
  assert.ok(estado.titulo, 'Deve possuir um título cognitivo');
  assert.ok(Array.isArray(estado.donoInsights), 'Deve possuir donoInsights');
  assert.ok(Array.isArray(estado.insightsGerais), 'Deve possuir insightsGerais');
  console.log(`  ✅ Test 1: Estado inicial carregado — Nível ${estado.nivel} (${estado.titulo})`);

  // Test 2: Ganho de XP e Subida de Nível
  const xpInicial = estado.xp;
  const nivelInicial = estado.nivel;
  const resXP = await evolucao.adicionarXP(120, 'aprendizado profundo');
  assert.ok(resXP.novoNivel >= nivelInicial, 'Nível deve manter ou subir');
  console.log(`  ✅ Test 2: XP adicionado com sucesso (Novo Nível: ${resXP.novoNivel}, Título: ${resXP.titulo})`);

  // Test 3: Gravação de Insights e Epifanias
  const novoInsight = 'O Dark prefere que o bot atenda canais sem falar de forma solta';
  const gravou = await evolucao.gravarInsight('dono', novoInsight);
  assert.strictEqual(gravou, true, 'Deve gravar insight novo');
  const duplicado = await evolucao.gravarInsight('dono', novoInsight);
  assert.strictEqual(duplicado, false, 'Deve evitar duplicados exatos');
  console.log('  ✅ Test 3: Insights assimilados e deduplicados com sucesso');

  // Test 4: Processamento de Tags Cognitivas na Resposta da IA
  const respostaIA = 'Com certeza meu Dark, já anotei isso tudo no meu coração! 🖤 [APRENDI: O Dark adora programar de madrugada] [HABITO: Responder de forma gótica e carinhosa]';
  const { textoLimpo, aprendizados } = await evolucao.processarTagsEvolucao(respostaIA, {
    isOwner: true,
    senderNumber: '244900000000',
    pushName: 'Dark'
  });

  assert.strictEqual(aprendizados.length, 2, 'Deve extrair 2 aprendizados');
  assert.strictEqual(textoLimpo.includes('[APRENDI:'), false, 'Não deve vazar [APRENDI:');
  assert.strictEqual(textoLimpo.includes('[HABITO:'), false, 'Não deve vazar [HABITO:');
  assert.ok(textoLimpo.includes('Com certeza meu Dark'), 'Deve manter o texto principal');
  console.log('  ✅ Test 4: Processamento e higienização de tags cognitivas perfeito');

  // Test 5: Injeção do Bloco de Evolução no System Prompt
  const blocoPrompt = evolucao.obterBlocoPromptSync({ isOwner: true, isGroup: false });
  assert.ok(blocoPrompt.includes('FORMA ÚNICA DA AURA'), 'Bloco deve conter cabeçalho');
  assert.ok(blocoPrompt.includes('Pinkchyu'), 'Bloco deve afirmar a identidade');
  assert.ok(blocoPrompt.includes('O QUE SABES E APRENDESTE SOBRE O DARK'), 'Bloco deve incluir insights do dono');
  console.log('  ✅ Test 5: Injeção síncrona de evolução no prompt operacional');

  // Test 6: Relatório Formatado da Mente
  const relatorio = await evolucao.obterRelatorioEvolucao();
  assert.ok(relatorio.includes('CONSCIÊNCIA & EVOLUÇÃO DA AURA'), 'Relatório deve conter título');
  assert.ok(relatorio.includes('Nível Cognitivo:'), 'Relatório deve conter nível');
  assert.ok(relatorio.includes('Métricas de Aprendizagem:'), 'Relatório deve conter métricas');
  console.log('  ✅ Test 6: Relatório visual para comando !mente / !evolucao gerado');

  // Test 7: Registro do Case de Evolução
  const casesRegistrados = [];
  const fakeRegisterCase = (names, fn) => {
    casesRegistrados.push(...(Array.isArray(names) ? names : [names]));
  };
  require('../src/bot/cases/auraEvolucaoCase')(fakeRegisterCase);
  assert.ok(casesRegistrados.includes('evolucao'), 'Case deve registrar evolucao');
  assert.ok(casesRegistrados.includes('mente'), 'Case deve registrar mente');
  assert.ok(casesRegistrados.includes('ensinar'), 'Case deve registrar ensinar');
  assert.ok(casesRegistrados.includes('insights'), 'Case deve registrar insights');
  console.log('  ✅ Test 7: Case auraEvolucaoCase registrado com sucesso (' + casesRegistrados.length + ' aliases)');

  // Test 8: auraCerebro ferramentas ampliadas
  const cerebro = require('../src/aura/auraCerebro');
  const ferramentas = cerebro.ferramentasParaPrompt({ isOwner: true, isGroup: true });
  assert.ok(ferramentas.includes('cmd_canal'), 'Ferramentas devem incluir cmd_canal');
  assert.ok(ferramentas.includes('cmd_super'), 'Ferramentas devem incluir cmd_super');
  assert.ok(ferramentas.includes('cmd_statuscanal'), 'Ferramentas devem incluir cmd_statuscanal');
  assert.ok(ferramentas.includes('cmd_evolucao'), 'Ferramentas devem incluir cmd_evolucao');
  console.log('  ✅ Test 8: auraCerebro expandido com ferramentas de canal, grupo e evolução');

  console.log('\n🎉 TODOS OS TESTES DE EVOLUÇÃO E COGNIÇÃO PASSARAM (8/8)!');
  process.exit(0);
}

run().catch(err => {
  console.error('Erro na suíte de testes de evolução:', err);
  process.exit(1);
});
