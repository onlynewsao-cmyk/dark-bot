/**
 * AURA AGENTE — etapa 1: controlo do Dono e planeamento auditável.
 *
 * O agente não é proatividade: só existe quando o Dono activa e envia uma
 * tarefa explícita. Esta primeira camada transforma a tarefa num plano de
 * capacidades reais; etapas posteriores executarão cada passo com validação,
 * confirmação de risco e verificação de resultado.
 */
'use strict';

const crypto = require('crypto');

const MAX_STEPS = 6;
const MAX_TASK_CHARS = 700;

function stateKey(jid) {
  const digest = crypto.createHash('sha256').update(String(jid || '')).digest('hex').slice(0, 24);
  return `aura_agent_state_${digest}`;
}

function defaultState() {
  return { enabled: false, task: null, updatedAt: 0 };
}

function cleanState(value) {
  const state = value && typeof value === 'object' ? value : defaultState();
  return {
    enabled: state.enabled === true,
    task: state.task && typeof state.task === 'object' ? state.task : null,
    updatedAt: Number(state.updatedAt) || 0,
  };
}

async function load(jid) {
  const bcc = require('../bot/botConfigCache');
  return cleanState(await bcc.get(stateKey(jid), defaultState()));
}

async function save(jid, state) {
  const bcc = require('../bot/botConfigCache');
  const next = { ...cleanState(state), updatedAt: Date.now() };
  await bcc.set(stateKey(jid), next);
  return next;
}

async function setEnabled(jid, enabled) {
  const state = await load(jid);
  state.enabled = !!enabled;
  if (!enabled) state.task = null;
  return save(jid, state);
}

function makeTaskId() {
  return `AG-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function plainPlanStep(index, text, found = null) {
  const cap = found?.cap || {};
  const risk = cap.risco === 'destrutivo' ? 'destrutiva' : 'segura';
  return {
    index,
    actionId: found?.id || '',
    description: cap.desc || 'Analisar o pedido e identificar a ferramenta necessária.',
    input: String(text || '').trim().slice(0, 300),
    source: found?.via || 'análise',
    risk,
    confirmationRequired: risk === 'destrutiva',
    status: 'pendente',
  };
}

/**
 * Gera plano determinístico a partir do catálogo de capacidades reais.
 * Não chama IA aqui: o agente nunca deve inventar ferramenta/ação antes de
 * uma rota validada existir.
 */
function buildPlan(request, { brain, advanced } = {}) {
  const text = String(request || '').trim().slice(0, MAX_TASK_CHARS);
  if (text.length < 3) throw new Error('Descreve a tarefa que queres executar.');

  const b = brain || require('./auraBrain');
  const a = advanced || require('./auraAvancada');
  let found = [];
  try { found = a.detectarMulti(text, b).slice(0, MAX_STEPS); } catch {}
  if (!found.length) {
    try {
      const one = b.detectarCapacidade(text);
      if (one) found = [one];
    } catch {}
  }

  const steps = found.length
    ? found.map((entry, i) => plainPlanStep(i + 1, entry.texto || text, entry))
    : [plainPlanStep(1, text)];

  return {
    id: makeTaskId(),
    request: text,
    createdAt: Date.now(),
    status: 'planeada',
    steps,
    // A execução será ligada na etapa 2; este campo evita qualquer envio
    // acidental enquanto o plano ainda está a ser revisto pelo Dono.
    executionMode: 'por-etapas',
  };
}

async function createPlan(jid, request, deps = {}) {
  const state = await load(jid);
  if (!state.enabled) throw new Error('Modo Agente está desligado neste chat. Usa !auraagent on.');
  state.task = buildPlan(request, deps);
  await save(jid, state);
  return state.task;
}

function formatPlan(task, prefix = '!') {
  if (!task) return 'Não há tarefa activa. Usa `' + prefix + 'auraagent plano <tarefa>`.';
  const lines = [
    `🤖 *AURA AGENTE — ${task.id}*`,
    `📝 Tarefa: ${task.request}`,
    '',
    '*Plano:*',
  ];
  for (const step of task.steps || []) {
    const risk = step.confirmationRequired ? ' ⚠️ confirmação obrigatória' : '';
    const action = step.actionId ? `\n   Ferramenta: ${step.actionId}` : '';
    lines.push(`${step.index}. ${step.description}${risk}${action}`);
  }
  lines.push('', 'Estado: *planeada*. A execução por etapas será activada na próxima fase do Modo Agente.');
  return lines.join('\n');
}

function formatStatus(state, prefix = '!') {
  const lines = [
    '🤖 *MODO AURA AGENTE*',
    `Estado: ${state?.enabled ? '*ligado*' : '*desligado*'}`,
    'Autonomia: só tarefas explícitas do Dono; nenhuma ação espontânea.',
  ];
  if (state?.task) {
    const done = state.task.steps?.filter(s => s.status === 'concluída').length || 0;
    lines.push(`Tarefa activa: ${state.task.id} — ${done}/${state.task.steps?.length || 0} passos concluídos.`);
  } else {
    lines.push(`Cria um plano: \`${prefix}auraagent plano <tarefa>\`.`);
  }
  return lines.join('\n');
}

module.exports = {
  stateKey, defaultState, cleanState, load, save, setEnabled,
  buildPlan, createPlan, formatPlan, formatStatus,
};
