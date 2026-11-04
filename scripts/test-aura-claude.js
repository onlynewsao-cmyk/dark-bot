#!/usr/bin/env node
'use strict';

const assert = require('assert');
const claude = require('../src/aura/auraClaude');

const env = {
  ANTHROPIC_API_KEY: 'sk-ant-test-key-never-real',
  AURA_CLAUDE_MODEL: 'claude-fable-5-1',
  AURA_CLAUDE_MAX_TOKENS: '1024',
  AURA_CLAUDE_TIMEOUT_MS: '5000',
};
const capabilities = [
  { id: 'criar_enquete', desc: 'Criar enquete', risco: 'seguro', arg: 'depois', nivel: 'dono' },
  { id: 'canal_apagar', desc: 'Apagar canal', risco: 'destrutivo', arg: 'nenhum', nivel: 'dono' },
];

(async () => {
  const absent = claude.status({});
  assert.strictEqual(absent.configured, false, 'sem segredo, Claude permanece desligado');
  assert.strictEqual(absent.model, 'claude-fable-5-1');
  await assert.rejects(() => claude.planTask({ request: 'cria enquete', capabilities, env: {} }), /não está configurada/);

  let captured = null;
  const fetchOk = async (url, options) => {
    captured = { url, options };
    return {
      ok: true,
      json: async () => ({
        model: 'claude-fable-5-1',
        content: [{
          type: 'tool_use', name: 'propose_agent_plan', id: 'toolu_test',
          input: {
            summary: 'Criar uma enquete pedida pelo Dono.',
            steps: [
              { actionId: 'criar_enquete', input: 'cria uma enquete', reason: 'É uma capacidade autorizada.' },
              { actionId: 'inexistente', input: 'não vale' },
            ],
          },
        }],
      }),
    };
  };
  const proposal = await claude.planTask({ request: 'cria uma enquete', capabilities, env, fetchImpl: fetchOk });
  assert.strictEqual(proposal.model, 'claude-fable-5-1');
  assert.deepStrictEqual(proposal.steps, [{
    actionId: 'criar_enquete', input: 'cria uma enquete', reason: 'É uma capacidade autorizada.',
  }], 'resposta filtra ids fora do catálogo');
  assert.strictEqual(captured.url, 'https://api.anthropic.com/v1/messages');
  assert.strictEqual(captured.options.headers['x-api-key'], env.ANTHROPIC_API_KEY, 'chave segue somente no header da API');
  const serialized = captured.options.body;
  assert.ok(!serialized.includes(env.ANTHROPIC_API_KEY), 'chave nunca entra no payload nem em eventos');
  const body = JSON.parse(serialized);
  assert.strictEqual(body.model, 'claude-fable-5-1');
  assert.strictEqual(body.tool_choice.name, 'propose_agent_plan');
  assert.deepStrictEqual(body.tools[0].input_schema.properties.steps.items.properties.actionId.enum, ['criar_enquete', 'canal_apagar']);

  let reviewBody = null;
  const fetchReview = async (_url, options) => {
    reviewBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ model: 'claude-fable-5-1', content: [{
        type: 'tool_use', name: 'assess_agent_step', id: 'toolu_review',
        input: {
          verdict: 'continue', summary: 'A enquete foi criada pelo executor.',
          recommendedNextActionId: 'criar_enquete', reason: 'Não há bloqueio técnico.',
        },
      }] }),
    };
  };
  const assessment = await claude.reviewStep({
    request: 'cria enquete',
    task: { request: 'cria enquete', steps: [{ index: 1, actionId: 'criar_enquete', status: 'concluida' }] },
    step: { index: 1, actionId: 'criar_enquete' }, execution: { ok: true, message: 'Executor confirmou.' },
    capabilities, env, fetchImpl: fetchReview,
  });
  assert.deepStrictEqual(assessment, {
    model: 'claude-fable-5-1', verdict: 'continue', summary: 'A enquete foi criada pelo executor.',
    recommendedNextActionId: 'criar_enquete', reason: 'Não há bloqueio técnico.',
  }, 'supervisão vem em ferramenta estruturada e não executa ação');
  assert.strictEqual(reviewBody.tool_choice.name, 'assess_agent_step');
  assert.ok(!JSON.stringify(reviewBody).includes(env.ANTHROPIC_API_KEY), 'chave não entra na supervisão');

  const fetchBad = async () => ({ ok: true, json: async () => ({ model: 'x', content: [{ type: 'text', text: 'texto solto' }] }) });
  await assert.rejects(
    () => claude.planTask({ request: 'cria enquete', capabilities, env, fetchImpl: fetchBad }),
    error => error?.code === 'invalid_response',
    'texto livre nunca é convertido em ação'
  );

  const fetchDenied = async () => ({ ok: false, status: 401, json: async () => ({ error: { type: 'authentication_error', message: 'segredo não deve vazar' } }) });
  await assert.rejects(
    () => claude.planTask({ request: 'cria enquete', capabilities, env, fetchImpl: fetchDenied }),
    error => error?.code === 'authentication_error' && !error.message.includes('segredo'),
    'erro remoto é sanitizado'
  );

  console.log('AURA CLAUDE: cliente API, plano estruturado e proteção de segredo aprovados.');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
