/**
 * AURA AGENTE — etapas 1 e 2: controlo do Dono, plano auditável e
 * execução sequencial verificável.
 *
 * Não é proatividade: só aceita uma tarefa iniciada pelo Dono. O plano usa
 * unicamente capacidades existentes no auraBrain; a execução passa pelo
 * auraExec já usado pela AURA e persiste cada transição antes de agir.
 */
'use strict';

const crypto = require('crypto');

const MAX_STEPS = 6;
const MAX_TASK_CHARS = 700;
const MAX_HISTORY = 10;
const MAX_EVENTS = 30;
const CONFIRM_TTL_MS = 10 * 60 * 1000;
const FINAL_STEP_STATES = new Set(['concluida', 'falhou', 'bloqueada', 'cancelada']);

function stateKey(jid) {
  const digest = crypto.createHash('sha256').update(String(jid || '')).digest('hex').slice(0, 24);
  return `aura_agent_state_${digest}`;
}

function defaultState() {
  return { enabled: false, task: null, history: [], updatedAt: 0 };
}

function cleanTask(value) {
  if (!value || typeof value !== 'object') return null;
  const task = { ...value };
  task.steps = Array.isArray(task.steps) ? task.steps.slice(0, MAX_STEPS).map((step, i) => ({
    ...step,
    index: Number(step?.index) || i + 1,
    status: typeof step?.status === 'string' ? step.status : 'pendente',
  })) : [];
  task.events = Array.isArray(task.events) ? task.events.slice(-MAX_EVENTS) : [];
  return task;
}

function cleanState(value) {
  const state = value && typeof value === 'object' ? value : defaultState();
  return {
    enabled: state.enabled === true,
    task: cleanTask(state.task),
    history: Array.isArray(state.history) ? state.history.slice(-MAX_HISTORY).map(cleanTask).filter(Boolean) : [],
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

function archiveTask(state, reason) {
  if (!state.task) return;
  const task = cleanTask(state.task);
  task.status = task.status === 'concluida' ? task.status : reason;
  task.endedAt = Date.now();
  task.events = [...(task.events || []), event('tarefa_' + reason)].slice(-MAX_EVENTS);
  state.history = [...(state.history || []), task].slice(-MAX_HISTORY);
  state.task = null;
}

async function setEnabled(jid, enabled) {
  const state = await load(jid);
  state.enabled = !!enabled;
  if (!enabled) archiveTask(state, 'cancelada');
  return save(jid, state);
}

function makeTaskId() {
  return `AG-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function makeConfirmationCode() {
  return `CONF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function event(type, extra = {}) {
  return { type, at: Date.now(), ...extra };
}

function addEvent(task, type, extra = {}) {
  task.events = [...(task.events || []), event(type, extra)].slice(-MAX_EVENTS);
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
    attempts: 0,
  };
}

/**
 * Gera plano determinístico a partir do catálogo de capacidades reais.
 * Não chama IA: o agente não inventa ferramenta/ação antes de uma rota
 * validada existir. O Claude poderá rever este plano numa etapa posterior.
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
    events: [event('plano_criado', { steps: steps.length })],
    executionMode: 'por-etapas',
  };
}

async function createPlan(jid, request, deps = {}) {
  const state = await load(jid);
  if (!state.enabled) throw new Error('Modo Agente está desligado neste chat. Usa !auraagent on.');
  if (state.task) archiveTask(state, 'substituida');
  state.task = buildPlan(request, deps);
  await save(jid, state);
  return state.task;
}

function nextOpenStep(task) {
  return (task?.steps || []).find(step => !FINAL_STEP_STATES.has(step.status)) || null;
}

function taskProgress(task) {
  const total = task?.steps?.length || 0;
  const done = task?.steps?.filter(step => step.status === 'concluida').length || 0;
  return { total, done };
}

function refreshTaskStatus(task) {
  const progress = taskProgress(task);
  if (progress.total && progress.done === progress.total) task.status = 'concluida';
  else if ((task.steps || []).some(step => ['falhou', 'bloqueada'].includes(step.status))) task.status = 'pausada';
  else if ((task.steps || []).some(step => step.status === 'aguarda_confirmacao')) task.status = 'aguarda_confirmacao';
  else if ((task.steps || []).some(step => step.status === 'em_execucao')) task.status = 'em_execucao';
  else task.status = 'planeada';
  return task.status;
}

function executionContext(runtime) {
  if (!runtime?.isOwner) throw new Error('Só o Dono pode executar tarefas do Modo Agente.');
  if (!runtime?.ctx?.remoteJid) throw new Error('Contexto do chat indisponível; nada foi executado.');
}

function selectStep(task, requestedIndex) {
  const expected = nextOpenStep(task);
  if (!expected) throw new Error('Não há passo pendente nesta tarefa.');
  if (!requestedIndex) return expected;
  const index = Number(requestedIndex);
  const selected = task.steps.find(step => step.index === index);
  if (!selected) throw new Error('Passo inválido.');
  if (selected.index !== expected.index) throw new Error(`Executa primeiro o passo ${expected.index}; o agente mantém a ordem do plano.`);
  return selected;
}

function expiredConfirmation(step, now = Date.now()) {
  return step?.confirmation?.expiresAt && Number(step.confirmation.expiresAt) <= now;
}

async function persistStepStart(jid, state, task, step) {
  step.status = 'em_execucao';
  step.startedAt = Date.now();
  step.attempts = Number(step.attempts || 0) + 1;
  delete step.confirmation;
  task.status = 'em_execucao';
  addEvent(task, 'passo_iniciado', { step: step.index, actionId: step.actionId, attempt: step.attempts });
  await save(jid, state);
}

/**
 * Executa um único passo. O estado "em_execucao" é persistido antes de chamar
 * a ferramenta, para nunca repetir automaticamente uma ação se o processo
 * cair no meio. Erros pausam a tarefa; não há retry silencioso.
 */
async function executeStep(jid, requestedIndex, runtime, services = {}) {
  executionContext(runtime);
  const state = await load(jid);
  if (!state.enabled) throw new Error('Modo Agente está desligado neste chat.');
  const task = state.task;
  if (!task) throw new Error('Não há tarefa activa. Cria primeiro um plano.');
  if (['concluida', 'cancelada', 'pausada'].includes(task.status)) throw new Error(`A tarefa está ${task.status}; nada foi executado.`);

  const step = selectStep(task, requestedIndex);
  const brain = services.brain || require('./auraBrain');
  const executor = services.executor || require('./auraExec');
  const cap = brain.POR_ID?.get(step.actionId);

  if (step.status === 'em_execucao') throw new Error('Este passo já está marcado como em execução. Verifica o resultado antes de tentar novamente.');
  if (!step.actionId || !cap) {
    step.status = 'bloqueada';
    step.finishedAt = Date.now();
    step.result = 'Não existe ferramenta real e validada para este pedido.';
    addEvent(task, 'passo_bloqueado', { step: step.index, reason: 'capacidade_indisponivel' });
    refreshTaskStatus(task);
    await save(jid, state);
    return { ok: false, blocked: true, task, step, message: step.result };
  }

  const permission = typeof brain.podeFazer === 'function'
    ? brain.podeFazer(cap, { isOwner: true, isAdmin: !!runtime.isAdmin })
    : { pode: true };
  if (!permission?.pode) {
    step.status = 'bloqueada';
    step.finishedAt = Date.now();
    step.result = `Permissão insuficiente: ${permission?.precisa || 'ação não autorizada'}.`;
    addEvent(task, 'passo_bloqueado', { step: step.index, reason: 'permissao' });
    refreshTaskStatus(task);
    await save(jid, state);
    return { ok: false, blocked: true, task, step, message: step.result };
  }

  if (cap.risco === 'destrutivo') {
    if (step.status !== 'aguarda_confirmacao' || expiredConfirmation(step)) {
      step.status = 'aguarda_confirmacao';
      step.confirmation = { code: makeConfirmationCode(), expiresAt: Date.now() + CONFIRM_TTL_MS };
      task.status = 'aguarda_confirmacao';
      addEvent(task, 'confirmacao_pedida', { step: step.index, actionId: step.actionId });
      await save(jid, state);
      return {
        ok: false,
        confirmationRequired: true,
        task,
        step,
        code: step.confirmation.code,
        expiresAt: step.confirmation.expiresAt,
      };
    }
    return {
      ok: false,
      confirmationRequired: true,
      task,
      step,
      code: step.confirmation.code,
      expiresAt: step.confirmation.expiresAt,
    };
  }

  await persistStepStart(jid, state, task, step);
  return invokeStep(jid, state, task, step, runtime, executor);
}

async function confirmStep(jid, code, runtime, services = {}) {
  executionContext(runtime);
  const state = await load(jid);
  if (!state.enabled || !state.task) throw new Error('Não há tarefa activa do Modo Agente neste chat.');
  const task = state.task;
  const step = nextOpenStep(task);
  if (!step || step.status !== 'aguarda_confirmacao' || !step.confirmation) throw new Error('Não há confirmação pendente.');
  if (expiredConfirmation(step)) {
    step.status = 'pendente';
    delete step.confirmation;
    refreshTaskStatus(task);
    addEvent(task, 'confirmacao_expirada', { step: step.index });
    await save(jid, state);
    throw new Error('A confirmação expirou. Executa o passo novamente para gerar um novo código.');
  }
  if (String(code || '').trim().toUpperCase() !== String(step.confirmation.code).toUpperCase()) {
    throw new Error('Código de confirmação inválido. Nada foi executado.');
  }

  const brain = services.brain || require('./auraBrain');
  const executor = services.executor || require('./auraExec');
  const cap = brain.POR_ID?.get(step.actionId);
  if (!cap || cap.risco !== 'destrutivo') throw new Error('O passo pendente deixou de ser uma ação destrutiva válida. Nada foi executado.');

  await persistStepStart(jid, state, task, step);
  return invokeStep(jid, state, task, step, runtime, executor);
}

async function invokeStep(jid, state, task, step, runtime, executor) {
  let result;
  try {
    // A confirmação e a validação do Dono já foram feitas pelo agente. O
    // executor continua a ser a única ponte para as acções reais do bot.
    result = await executor.executar(step.actionId, step.input, {
      sock: runtime.sock,
      msg: runtime.msg,
      ctx: runtime.ctx,
      texto: step.input,
      contextoTexto: task.request,
      isOwner: true,
      isAdmin: !!runtime.isAdmin,
      confirmado: true,
    });
  } catch (error) {
    result = { ok: false, msg: String(error?.message || error || 'Erro desconhecido.') };
  }

  step.finishedAt = Date.now();
  step.result = String(result?.msg || (result?.ok ? 'Executor confirmou a conclusão.' : 'Executor não confirmou a conclusão.')).slice(0, 500);
  if (result?.ok) {
    step.status = 'concluida';
    addEvent(task, 'passo_concluido', { step: step.index, actionId: step.actionId });
  } else {
    step.status = 'falhou';
    addEvent(task, 'passo_falhou', { step: step.index, actionId: step.actionId, result: step.result.slice(0, 180) });
  }
  refreshTaskStatus(task);
  if (task.status === 'concluida') task.endedAt = Date.now();
  await save(jid, state);
  return { ok: !!result?.ok, task, step, result, message: step.result };
}

async function cancelTask(jid, runtime) {
  executionContext(runtime);
  const state = await load(jid);
  if (!state.task) throw new Error('Não há tarefa activa para cancelar.');
  const task = state.task;
  if (task.status === 'em_execucao') throw new Error('Há um passo marcado como em execução; verifica o resultado antes de cancelar.');
  archiveTask(state, 'cancelada');
  await save(jid, state);
  return task;
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
    const status = `\n   Estado: *${step.status || 'pendente'}*`;
    lines.push(`${step.index}. ${step.description}${risk}${action}${status}`);
  }
  lines.push('', `Executa em ordem: \`${prefix}auraagent executar [passo]\`.`);
  return lines.join('\n');
}

function formatStatus(state, prefix = '!') {
  const lines = [
    '🤖 *MODO AURA AGENTE*',
    `Estado: ${state?.enabled ? '*ligado*' : '*desligado*'}`,
    'Autonomia: só tarefas explícitas do Dono; nenhuma ação espontânea.',
  ];
  if (state?.task) {
    const progress = taskProgress(state.task);
    lines.push(`Tarefa activa: ${state.task.id} — *${state.task.status}* — ${progress.done}/${progress.total} passos concluídos.`);
    const next = nextOpenStep(state.task);
    if (next) lines.push(`Próximo passo: ${next.index} — ${next.actionId || 'sem ferramenta validada'} (${next.status}).`);
  } else {
    lines.push(`Cria um plano: \`${prefix}auraagent plano <tarefa>\`.`);
  }
  const history = state?.history || [];
  if (history.length) lines.push(`Auditoria guardada: ${history.length} tarefa(s) anterior(es). Usa \`${prefix}auraagent historico\`.`);
  return lines.join('\n');
}

function formatHistory(state) {
  const history = (state?.history || []).slice(-5).reverse();
  if (!history.length) return '📜 Ainda não há tarefas arquivadas neste chat.';
  const lines = ['📜 *AUDITORIA — AURA AGENTE*'];
  for (const task of history) {
    const progress = taskProgress(task);
    lines.push(`• ${task.id} — *${task.status}* — ${progress.done}/${progress.total}\n  ${String(task.request || '').slice(0, 120)}`);
  }
  return lines.join('\n');
}

module.exports = {
  stateKey, defaultState, cleanState, load, save, setEnabled,
  buildPlan, createPlan, executeStep, confirmStep, cancelTask,
  formatPlan, formatStatus, formatHistory, taskProgress, nextOpenStep,
  // Expostos para testes de segurança e auditoria.
  __test: { refreshTaskStatus, selectStep, expiredConfirmation, CONFIRM_TTL_MS },
};
