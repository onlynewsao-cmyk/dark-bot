'use strict';

/**
 * AURA — tarefas pontuais persistentes.
 * Uma tarefa reconhecida só é executada na hora marcada depois de
 * confirmação explícita do Dono no PV: CONFIRMAR TAREFA <id>.
 * Tarefas sem capacidade real ficam como lembretes; nunca se afirma
 * que uma acção foi feita se não houver resultado confirmado.
 */

const crypto = require('crypto');

const STORAGE_KEY = 'aura_scheduled_actions';
const TIME_ZONE = 'Africa/Luanda';
const CACHE_TTL_MS = 5 * 1000;
const TICK_MS = 15 * 1000;
const CONFIRM_TTL_MS = 15 * 60 * 1000;
const MAX_TASKS = 200;
const MAX_PER_OWNER = 20;
const MIN_DELAY_MS = 30 * 1000;
const MAX_DELAY_MS = 90 * 24 * 60 * 60 * 1000;

// Estas acções dependem da mensagem original/citação, que não deve ser
// guardada nem substituída pela mensagem de confirmação futura.
const NEEDS_ORIGINAL_MESSAGE = new Set([
  'reagir_msg', 'foto_grupo', 'foto_perfil', 'canal_foto', 'reencaminhar',
]);

let _cache = null;
let _cacheTs = 0;
let _loadOk = true;
let _timer = null;
let _getSock = null;
let _storeOverride = null; // apenas para testes isolados

function _digits(value) { return String(value || '').replace(/\D/g, ''); }
function _localParts(timestamp) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}

function _timezoneOffset(timestamp) {
  const rounded = Math.floor(timestamp / 1000) * 1000;
  const p = _localParts(rounded);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - rounded;
}

function _localDateTimeToEpoch(year, month, day, hour, minute) {
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let instant = wallClockAsUtc - _timezoneOffset(wallClockAsUtc);
  // Recalcula o offset no instante resultante; protege contra fusos com DST.
  instant = wallClockAsUtc - _timezoneOffset(instant);
  return instant;
}

/** Interpreta intervalos e hora local de Luanda. Retorna null se inválido. */
function parseDueAt(text, now = Date.now()) {
  const t = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let m = t.match(/\b(?:daqui\s+(?:a\s+)?|em\s+)(\d{1,4})\s*(segundos?|seg|minutos?|min|horas?|h|dias?|d|semanas?|sem)\b/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const factor = /^seg/.test(unit) ? 1000
      : /^min/.test(unit) ? 60 * 1000
        : /^(h|hora)/.test(unit) ? 60 * 60 * 1000
          : /^(d|dia)/.test(unit) ? 24 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000;
    const due = now + n * factor;
    return due - now >= MIN_DELAY_MS && due - now <= MAX_DELAY_MS ? due : null;
  }

  // "hoje às 18:30", "amanhã às 9h"; aceita também "às 18:30"
  m = t.match(/\b(hoje|amanha)\s+as\s+(\d{1,2})(?:(?::(\d{2})|h(?:\s*(\d{2}))?))?\b/i);
  let dayOffset = 0;
  let hour;
  let minute;
  if (m) {
    dayOffset = m[1] === 'amanha' ? 1 : 0;
    hour = Number(m[2]);
    minute = Number(m[3] || m[4] || 0);
  } else {
    m = t.match(/\bas\s+(\d{1,2})(?::(\d{2})|h(?:\s*(\d{2}))?)\b/i);
    if (!m) return null;
    hour = Number(m[1]);
    minute = Number(m[2] || m[3] || 0);
  }
  if (hour > 23 || minute > 59) return null;

  const localNow = _localParts(now);
  const d = new Date(Date.UTC(+localNow.year, +localNow.month - 1, +localNow.day + dayOffset));
  let due = _localDateTimeToEpoch(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hour, minute);
  // Sem dia explícito, "às 18:30" significa a próxima ocorrência.
  if (!/^.*\b(?:hoje|amanha)\b/.test(t) && due <= now) {
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
    due = _localDateTimeToEpoch(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), hour, minute);
  }
  return due - now >= MIN_DELAY_MS && due - now <= MAX_DELAY_MS ? due : null;
}

function _stripTime(text) {
  return String(text || '')
    .replace(/\b(?:daqui\s+(?:a\s+)?|em\s+)\d{1,4}\s*(?:segundos?|seg|minutos?|min|horas?|h|dias?|d|semanas?|sem)\b/ig, ' ')
    .replace(/\b(?:hoje|amanh(?:ã|a))\s+(?:às?|as)\s+\d{1,2}(?:(?::\d{2}|h(?:\s*\d{2})?))?\b/ig, ' ')
    .replace(/(?:^|[\s,])(?:às?|as)\s+\d{1,2}(?::\d{2}|h(?:\s*\d{2})?)\b/ig, ' ')
    .replace(/\s+/g, ' ').trim();
}

function parseScheduleRequest(text, now = Date.now()) {
  const raw = String(text || '').trim();
  const executeAt = parseDueAt(raw, now);
  if (!executeAt) return null;
  const actionText = _stripTime(raw)
    .replace(/^\s*(?:aura\s*[,;:]?\s*)/i, '')
    .replace(/^\s*(?:lembra[- ]me(?:\s+de)?|lembra[- ]te(?:\s+de)?|marca(?:-me)?|agenda|agendar|programa)\s+/i, '')
    .replace(/^[\s,;:.!?-]+|[\s,;:.!?-]+$/g, '')
    .trim();
  if (actionText.length < 3 || actionText.length > 500) return null;
  const normal = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const reminderOnly = /^\s*(?:aura\s*[,;:]?\s*)?(?:lembra[- ]me|lembra[- ]te)\b/i.test(normal);
  return { executeAt, actionText, reminderOnly };
}

function _formatLocal(timestamp) {
  return new Intl.DateTimeFormat('pt-AO', {
    timeZone: TIME_ZONE, weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(timestamp));
}

async function _load(force = false) {
  if (!force && _cache && Date.now() - _cacheTs < CACHE_TTL_MS) {
    _loadOk = true;
    return _cache;
  }
  try {
    let value;
    if (_storeOverride) value = await _storeOverride.get();
    else {
      const BotConfig = require('../../database/models/BotConfig');
      const doc = await BotConfig.findOne({ key: STORAGE_KEY }).lean();
      value = doc?.value;
    }
    _cache = Array.isArray(value) ? value : [];
    _cacheTs = Date.now();
    _loadOk = true;
    return _cache;
  } catch {
    _loadOk = false;
    return _cache || [];
  }
}

async function _save(items) {
  try {
    if (_storeOverride) await _storeOverride.set(items);
    else {
      const BotConfig = require('../../database/models/BotConfig');
      await BotConfig.updateOne({ key: STORAGE_KEY }, { $set: { key: STORAGE_KEY, value: items } }, { upsert: true });
    }
    _cache = items;
    _cacheTs = Date.now();
    _loadOk = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Claim a task by removing it durably before executing/cancelling. In MongoDB,
 * the predicate and $pull run atomically so concurrent confirmations cannot
 * execute the same external action twice. The injected test store uses a fresh
 * read followed by a checked save.
 */
async function _removeTask(task, { onlyIfConfirmable = false, now = Date.now() } = {}) {
  if (!task?.id) return false;
  const matches = item => item?.id === task.id &&
    _digits(item.ownerNumber) === _digits(task.ownerNumber) &&
    String(item.ownerJid || '') === String(task.ownerJid || '') &&
    (!onlyIfConfirmable || (item.status === 'awaiting_confirmation' && Number(item.confirmExpiresAt) > now));
  try {
    if (_storeOverride) {
      const current = await _load(true);
      if (!_loadOk) return false;
      const found = current.find(matches);
      if (!found) return false;
      const saved = await _save(current.filter(item => !matches(item)));
      return saved;
    }

    const condition = {
      id: task.id,
      ownerNumber: _digits(task.ownerNumber),
      ownerJid: String(task.ownerJid || ''),
    };
    if (onlyIfConfirmable) {
      condition.status = 'awaiting_confirmation';
      condition.confirmExpiresAt = { $gt: now };
    }
    const BotConfig = require('../../database/models/BotConfig');
    const result = await BotConfig.updateOne(
      { key: STORAGE_KEY, value: { $elemMatch: condition } },
      { $pull: { value: condition } },
    );
    const removed = Number(result?.modifiedCount ?? result?.nModified ?? result?.n ?? 0) > 0;
    if (removed) { _cache = null; _cacheTs = 0; _loadOk = true; }
    return removed;
  } catch {
    return false;
  }
}

async function _resolvePlan(actionText, reminderOnly) {
  if (reminderOnly) return null;
  try {
    const brain = require('../auraBrain');
    const direct = brain.detectarCapacidade(actionText);
    if (direct) return { id: direct.id, arg: actionText };
    if (!brain.pareceOrdem(actionText)) return null;
    const routed = await brain.rotearComIA(actionText, require('../../bot/ai'));
    if (!routed?.id || !brain.POR_ID.has(routed.id)) return null;
    return { id: routed.id, arg: routed.arg || actionText };
  } catch { return null; }
}

async function _createTask({ actionText, executeAt, reminderOnly = false, ctx, ownerNumber, ownerJid } = {}) {
  const tasks = await _load();
  if (!_loadOk) return { ok: false, msg: 'Não consegui aceder à memória persistente para guardar a tarefa.' };
  const number = _digits(ownerNumber || ctx?.senderNumber);
  const jid = String(ownerJid || ctx?.senderJid || (number ? `${number}@s.whatsapp.net` : '')).trim();
  const targetJid = String(ctx?.remoteJid || '').trim();
  if (!number || !jid || !targetJid) return { ok: false, msg: 'Falta identificar o Dono ou o chat de destino; não agendei.' };
  const now = Date.now();
  if (!Number.isFinite(executeAt) || executeAt - now < MIN_DELAY_MS || executeAt - now > MAX_DELAY_MS) {
    return { ok: false, msg: 'Escolhe um horário pelo menos 30 segundos no futuro e dentro dos próximos 90 dias.' };
  }
  if (tasks.length >= MAX_TASKS || tasks.filter(t => _digits(t.ownerNumber) === number).length >= MAX_PER_OWNER) {
    return { ok: false, msg: `O limite de tarefas pendentes foi atingido (máximo ${MAX_PER_OWNER} por Dono). Cancela uma antes de criar outra.` };
  }
  const plan = await _resolvePlan(actionText, reminderOnly);
  const id = crypto.randomBytes(4).toString('hex').toUpperCase();
  const task = {
    id, ownerNumber: number, ownerJid: jid, targetJid,
    isGroup: !!ctx?.isGroup, groupName: String(ctx?.groupName || '').slice(0, 100),
    actionText: String(actionText || '').slice(0, 500),
    actionId: plan?.id || null, actionArg: String(plan?.arg || '').slice(0, 500),
    executeAt, status: 'scheduled', createdAt: now,
  };
  const saved = await _save([...tasks, task]);
  if (!saved) return { ok: false, msg: 'Não consegui guardar a tarefa; não vou prometer que ficará agendada.' };
  const when = _formatLocal(executeAt);
  if (task.actionId) {
    const cap = require('../auraBrain').POR_ID.get(task.actionId);
    return {
      ok: true, id,
      msg: `Agendado para ${when}: ${cap?.desc || task.actionText}. Na hora envio uma confirmação privada; só executo se responderes *CONFIRMAR TAREFA ${id}*. Para cancelar: *CANCELAR TAREFA ${id}*.`,
    };
  }
  return {
    ok: true, id,
    msg: `Lembrete guardado para ${when}: “${task.actionText}”. Não encontrei uma acção automática segura para este pedido, por isso vou lembrar-te mas não afirmar que o executei. Para cancelar: *CANCELAR TAREFA ${id}*.`,
  };
}

async function handleMessage({ sock, msg, ctx, texto, isOwner = false } = {}) {
  const t = String(texto || '').trim();
  const confirm = t.match(/^\s*(confirmar|cancelar)\s+tarefa\s+([a-f0-9]{8})\s*$/i);
  if (confirm) return await _processConfirmation({ sock, msg, ctx, texto: t, isOwner, match: confirm });

  if (!isOwner || !ctx?.isPrimaryOwner || msg?.key?.fromMe || !t) return false;
  const parsed = parseScheduleRequest(t);
  if (!parsed) return false;
  const result = await _createTask({ ...parsed, ctx, ownerNumber: ctx.senderNumber });
  await sock.sendMessage(ctx.remoteJid, { text: result.msg }, { quoted: msg }).catch(() => {});
  return true;
}

async function _processConfirmation({ sock, msg, ctx, isOwner, match }) {
  const verb = String(match[1] || '').toLowerCase();
  const id = String(match[2] || '').toUpperCase();
  const tasks = await _load(true);
  if (!_loadOk) {
    await sock.sendMessage(ctx.remoteJid, { text: 'Não consegui consultar as tarefas agora; não executei nada.' }, { quoted: msg }).catch(() => {});
    return true;
  }
  const task = tasks.find(t => t.id === id);
  if (!task) {
    await sock.sendMessage(ctx.remoteJid, { text: 'Não encontrei essa tarefa pendente; pode ter expirado ou já ter sido tratada.' }, { quoted: msg }).catch(() => {});
    return true;
  }
  if (!isOwner || !ctx?.isPrimaryOwner || ctx?.isGroup || _digits(ctx.senderNumber) !== _digits(task.ownerNumber) || String(ctx.senderJid || ctx.remoteJid) !== String(task.ownerJid)) {
    await sock.sendMessage(ctx.remoteJid, { text: 'Só o Dono que agendou pode confirmar ou cancelar esta tarefa no seu PV.' }, { quoted: msg }).catch(() => {});
    return true;
  }
  if (verb === 'cancelar') {
    const removed = await _removeTask(task);
    const text = removed
      ? `Tarefa ${id} cancelada. Não executei nada.`
      : `Não consegui registar o cancelamento de ${id}; não executei nada. Tenta novamente.`;
    await sock.sendMessage(ctx.remoteJid, { text }, { quoted: msg }).catch(() => {});
    return true;
  }
  if (task.status === 'scheduled') {
    await sock.sendMessage(ctx.remoteJid, { text: 'A tarefa ainda não está pronta para confirmação; continua agendada. Não executei nada.' }, { quoted: msg }).catch(() => {});
    return true;
  }
  if (task.status !== 'awaiting_confirmation' || Number(task.confirmExpiresAt) <= Date.now()) {
    await _removeTask(task);
    await sock.sendMessage(ctx.remoteJid, { text: 'A janela de confirmação expirou ou já não está activa. A tarefa não foi executada.' }, { quoted: msg }).catch(() => {});
    return true;
  }
  if (!task.actionId) {
    await _removeTask(task);
    await sock.sendMessage(ctx.remoteJid, { text: 'Este lembrete não tinha uma acção automática reconhecida. AURA não executou nada; envia o pedido agora como uma instrução directa.' }, { quoted: msg }).catch(() => {});
    return true;
  }

  // Reclama e remove a tarefa atomicamente antes da acção externa. Se não
  // conseguirmos provar a remoção durável, não executamos.
  const claimed = await _removeTask(task, { onlyIfConfirmable: true });
  if (!claimed) {
    await sock.sendMessage(ctx.remoteJid, { text: 'Não consegui registar esta confirmação de forma segura; não executei nada. Tenta novamente se a tarefa continuar pendente.' }, { quoted: msg }).catch(() => {});
    return true;
  }
  const brain = require('../auraBrain');
  const cap = brain.POR_ID.get(task.actionId);
  if (!cap || NEEDS_ORIGINAL_MESSAGE.has(task.actionId)) {
    await sock.sendMessage(ctx.remoteJid, { text: 'A tarefa já não corresponde a uma capacidade segura disponível. Nada foi executado.' }, { quoted: msg }).catch(() => {});
    return true;
  }

  const actionCtx = {
    ...ctx,
    remoteJid: task.targetJid,
    senderNumber: task.ownerNumber,
    senderJid: task.ownerJid,
    isGroup: !!task.isGroup,
    groupName: task.groupName || '',
    isOwner: true,
    isPrimaryOwner: true,
  };
  if (task.isGroup) {
    try {
      const meta = await sock.groupMetadata(task.targetJid);
      const ownerNum = _digits(task.ownerNumber);
      actionCtx.groupMeta = meta;
      actionCtx.isAdmin = !!meta?.participants?.some(p =>
        _digits(String(p.id || '').split(':')[0].split('@')[0]) === ownerNum && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch { actionCtx.isAdmin = false; }
  }
  const permission = brain.podeFazer(cap, { isOwner: true, isAdmin: !!actionCtx.isAdmin });
  if (!permission.pode) {
    await sock.sendMessage(ctx.remoteJid, { text: `A tarefa já não pode ser executada com segurança: ${permission.motivo || 'permissões insuficientes'}. Nada foi feito.` }, { quoted: msg }).catch(() => {});
    return true;
  }
  const actionMsg = { key: { remoteJid: task.targetJid, id: `scheduled-${id}`, participant: task.ownerJid }, message: {} };
  let result;
  try {
    result = await require('../auraExec').executar(task.actionId, task.actionArg || task.actionText, {
      sock, msg: actionMsg, ctx: actionCtx, texto: task.actionText,
      isOwner: true, isAdmin: !!actionCtx.isAdmin, confirmado: true,
    });
  } catch (e) {
    result = { ok: false, msg: `Não consegui executar: ${String(e?.message || e).slice(0, 120)}` };
  }

  if (result?.msg) {
    const destino = result.mencionar?.length && !result._sentPrivately ? task.targetJid : task.ownerJid;
    const payload = { text: String(result.msg) };
    if (destino === task.targetJid && result.mencionar?.length) payload.mentions = result.mencionar;
    await sock.sendMessage(destino, payload).catch(() => {});
  } else if (!result?.ok && !result?.silencioso) {
    await sock.sendMessage(task.ownerJid, { text: 'A tarefa não foi concluída; não consegui confirmar o resultado.' }).catch(() => {});
  } else if (result?.ok && !result?.silencioso) {
    await sock.sendMessage(task.ownerJid, { text: 'A tarefa foi executada com sucesso.' }).catch(() => {});
  }
  return true;
}

async function getDueActions(now = Date.now()) {
  return (await _load()).filter(task => task.status === 'scheduled' && task.executeAt <= now);
}

async function removeAction(id) {
  const tasks = await _load();
  if (!_loadOk) return false;
  const remaining = tasks.filter(task => task.id !== id);
  return remaining.length !== tasks.length ? _save(remaining) : false;
}

/** Compatibilidade com a API anterior; agora é persistente e exige contexto do Dono. */
async function scheduleAction(action, delayMs, data = {}) {
  const ctx = data.ctx || {};
  const delay = Number(delayMs);
  if (!Number.isFinite(delay) || delay < MIN_DELAY_MS || delay > MAX_DELAY_MS) return { success: false, error: 'delay inválido' };
  const result = await _createTask({
    actionText: String(action || ''), executeAt: Date.now() + delay,
    ctx, ownerNumber: data.ownerNumber || ctx.senderNumber, ownerJid: data.ownerJid,
  });
  return { success: result.ok, id: result.id, error: result.ok ? undefined : result.msg, message: result.msg };
}

async function _tick(now = Date.now()) {
  if (!_getSock) return;
  const sock = _getSock();
  if (!sock?.user) return;
  const tasks = await _load();
  if (!_loadOk || !tasks.length) return;

  let changed = false;
  const active = [];
  const promptIds = [];
  for (const task of tasks) {
    if (task.status === 'awaiting_confirmation' && Number(task.confirmExpiresAt) <= now) {
      changed = true;
      continue;
    }
    if (task.status === 'reminder_pending' && Number(task.promptAttempts || 0) >= 3 && now - Number(task.promptLastAt || 0) >= 60 * 1000) {
      changed = true;
      continue;
    }
    if (task.status === 'scheduled' && Number(task.executeAt) <= now) {
      task.status = task.actionId ? 'awaiting_confirmation' : 'reminder_pending';
      task.dueAt = now;
      task.promptSent = false;
      task.promptAttempts = 0;
      task.promptLastAt = 0;
      if (task.actionId) task.confirmExpiresAt = now + CONFIRM_TTL_MS;
      changed = true;
    }
    const readyToPrompt = ['awaiting_confirmation', 'reminder_pending'].includes(task.status) &&
      !task.promptSent && Number(task.promptAttempts || 0) < 3 &&
      (!task.promptLastAt || now - Number(task.promptLastAt) >= 60 * 1000);
    if (readyToPrompt) {
      task.promptAttempts = Number(task.promptAttempts || 0) + 1;
      task.promptLastAt = now;
      promptIds.push(task.id);
      changed = true;
    }
    active.push(task);
  }
  if (changed && !(await _save(active))) return;

  for (const id of promptIds) {
    const task = active.find(item => item.id === id);
    if (!task) continue;
    const when = _formatLocal(task.executeAt);
    let sent = false;
    if (task.status === 'reminder_pending') {
      sent = await sock.sendMessage(task.ownerJid, {
        text: `⏰ *Lembrete da AURA*\n${task.actionText}\n\nHorário local: ${when}. Não executei nenhuma acção.`,
      }).then(() => true).catch(() => false);
    } else {
      const cap = require('../auraBrain').POR_ID.get(task.actionId);
      const destination = task.isGroup ? (task.groupName || 'o grupo onde pediste') : 'o PV onde pediste';
      sent = await sock.sendMessage(task.ownerJid, {
        text: `⏰ *Tarefa pronta para confirmação*\nPedido: “${task.actionText}”\nAcção detectada: ${cap?.desc || task.actionId}\nDestino: ${destination}\n\nPara executar agora, responde *CONFIRMAR TAREFA ${task.id}*. Para cancelar: *CANCELAR TAREFA ${task.id}*. Sem confirmação nos próximos 15 minutos, não faço nada.`,
      }).then(() => true).catch(() => false);
    }
    if (sent) {
      task.promptSent = true;
      if (task.status === 'reminder_pending') active.splice(active.indexOf(task), 1);
    }
  }
  if (promptIds.length) await _save(active);
}

function arrancar(getSock) {
  _getSock = getSock;
  if (_timer) return;
  _timer = setInterval(() => _tick().catch(() => {}), TICK_MS);
  _timer.unref?.();
  console.log('⏰ Tarefas pontuais da AURA activas');
}

function parar() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

function _setStoreForTests(store) {
  _storeOverride = store;
  _cache = null;
  _cacheTs = 0;
  _loadOk = true;
}

module.exports = {
  scheduleAction, getDueActions, removeAction,
  parseDueAt, parseScheduleRequest, handleMessage, arrancar, parar,
};
Object.defineProperty(module.exports, '__test', {
  enumerable: false,
  value: { _tick, _processConfirmation, _setStoreForTests },
});
