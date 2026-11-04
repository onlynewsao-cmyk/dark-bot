'use strict';
/**
 * AURA + CLAUDE — adaptador mínimo e seguro para a Messages API.
 *
 * Não executa ferramentas, não guarda a chave e não faz fallback para outro
 * modelo fingindo ser Claude. Apenas propõe um plano contra um catálogo
 * fechado; o auraAgent valida cada id e continua a controlar a execução.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-fable-5-1';
const DEFAULT_TIMEOUT_MS = 60000;
const MAX_CAPABILITIES = 180;
const MAX_STEPS = 6;

class ClaudeAgentError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ClaudeAgentError';
    this.code = code;
  }
}

function cleanModel(value) {
  const model = String(value || DEFAULT_MODEL).trim();
  return /^claude-[a-z0-9-]{3,80}$/i.test(model) ? model : DEFAULT_MODEL;
}

function boundedInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function settings(env = process.env) {
  const apiKey = String(env.ANTHROPIC_API_KEY || '').trim();
  const disabled = String(env.AURA_CLAUDE_ENABLED || '').trim().toLowerCase() === 'off';
  return {
    configured: !!apiKey && !disabled,
    model: cleanModel(env.AURA_CLAUDE_MODEL),
    maxTokens: boundedInt(env.AURA_CLAUDE_MAX_TOKENS, 2048, 512, 4096),
    timeoutMs: boundedInt(env.AURA_CLAUDE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 5000, 120000),
    apiKey,
  };
}

function status(env = process.env) {
  const cfg = settings(env);
  return {
    configured: cfg.configured,
    model: cfg.model,
    maxTokens: cfg.maxTokens,
    reason: cfg.configured ? null : (!cfg.apiKey ? 'ANTHROPIC_API_KEY ausente' : 'AURA_CLAUDE_ENABLED=off'),
  };
}

function isConfigured(env = process.env) {
  return settings(env).configured;
}

function capabilityList(capabilities) {
  return (Array.isArray(capabilities) ? capabilities : [])
    .slice(0, MAX_CAPABILITIES)
    .filter(cap => cap && typeof cap.id === 'string' && typeof cap.desc === 'string')
    .map(cap => ({
      id: cap.id,
      description: String(cap.desc).slice(0, 300),
      risk: cap.risco === 'destrutivo' ? 'destrutivo' : (cap.risco || 'seguro'),
      argument: cap.arg || 'nenhum',
      level: cap.nivel || 'dono',
    }));
}

function plannerTool(actionIds) {
  return {
    name: 'propose_agent_plan',
    description: 'Propõe um plano de no máximo seis passos usando somente actionId da lista autorizada. Isto NÃO executa ações.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string', maxLength: 500 },
        steps: {
          type: 'array', minItems: 1, maxItems: MAX_STEPS,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              actionId: { type: 'string', enum: actionIds },
              input: { type: 'string', maxLength: 300 },
              reason: { type: 'string', maxLength: 300 },
            },
            required: ['actionId'],
          },
        },
      },
      required: ['steps'],
    },
  };
}

function extractProposal(response, actionIds) {
  const block = (response?.content || []).find(item => item?.type === 'tool_use' && item.name === 'propose_agent_plan');
  if (!block || !block.input || !Array.isArray(block.input.steps)) {
    throw new ClaudeAgentError('invalid_response', 'Claude não devolveu um plano estruturado válido.');
  }
  const allowed = new Set(actionIds);
  const used = new Set();
  const steps = [];
  for (const raw of block.input.steps.slice(0, MAX_STEPS)) {
    const actionId = String(raw?.actionId || '');
    if (!allowed.has(actionId) || used.has(actionId)) continue;
    used.add(actionId);
    steps.push({
      actionId,
      input: String(raw?.input || '').trim().slice(0, 300),
      reason: String(raw?.reason || '').trim().slice(0, 300),
    });
  }
  if (!steps.length) throw new ClaudeAgentError('invalid_plan', 'O plano Claude não referenciou uma capacidade autorizada.');
  return {
    model: String(response?.model || '').slice(0, 100),
    summary: String(block.input.summary || '').trim().slice(0, 500),
    steps,
  };
}

function systemPrompt() {
  return [
    'És o planeador do Modo AURA Agente.',
    'O pedido vem do Dono e só podes propor passos a partir do catálogo fornecido.',
    'Nunca inventes actionId, destinatário, conteúdo, link, número ou contexto que não esteja no pedido.',
    'Não executes nada: usa exclusivamente a ferramenta propose_agent_plan para devolver a proposta.',
    'Inclui ação destrutiva apenas se o pedido a exigir claramente; a confirmação será tratada fora de ti.',
    'Se uma tarefa não tiver capacidade aplicável, não forces uma ação parecida.',
  ].join(' ');
}

async function postMessage(body, cfg, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new ClaudeAgentError('fetch_unavailable', 'Fetch indisponível para contactar a API Claude.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const response = await fetchImpl(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok) {
      const type = String(data?.error?.type || 'request_failed').replace(/[^a-z0-9_.-]/gi, '').slice(0, 60);
      throw new ClaudeAgentError(type || 'request_failed', `A API Claude recusou o pedido (${response.status}).`);
    }
    return data;
  } catch (error) {
    if (error instanceof ClaudeAgentError) throw error;
    if (error?.name === 'AbortError') throw new ClaudeAgentError('timeout', 'A API Claude excedeu o tempo máximo de resposta.');
    throw new ClaudeAgentError('network_error', 'Não foi possível contactar a API Claude.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Devolve proposta estruturada. A chave só é lida no momento da chamada e
 * nunca aparece no retorno, nos erros nem nos eventos de auditoria.
 */
async function planTask({ request, capabilities, fetchImpl, env } = {}) {
  const cfg = settings(env || process.env);
  if (!cfg.configured) throw new ClaudeAgentError('not_configured', 'Claude API não está configurada para a AURA.');
  const task = String(request || '').trim().slice(0, 700);
  if (task.length < 3) throw new ClaudeAgentError('invalid_request', 'Pedido demasiado curto para planear.');
  const catalogue = capabilityList(capabilities);
  if (!catalogue.length) throw new ClaudeAgentError('empty_catalogue', 'Não há capacidades disponíveis para planear.');
  const actionIds = catalogue.map(cap => cap.id);
  const body = {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    system: systemPrompt(),
    messages: [{
      role: 'user',
      content: `PEDIDO EXPLÍCITO DO DONO:\n${task}\n\nCAPACIDADES AUTORIZADAS:\n${JSON.stringify(catalogue)}`,
    }],
    tools: [plannerTool(actionIds)],
    tool_choice: { type: 'tool', name: 'propose_agent_plan', disable_parallel_tool_use: true },
  };
  const response = await postMessage(body, cfg, fetchImpl);
  return extractProposal(response, actionIds);
}

module.exports = {
  DEFAULT_MODEL, ClaudeAgentError, settings, status, isConfigured,
  capabilityList, extractProposal, planTask,
  __test: { cleanModel, boundedInt, plannerTool, systemPrompt, postMessage },
};
