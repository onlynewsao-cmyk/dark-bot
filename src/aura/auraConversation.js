'use strict';
/** Local, sender-scoped conversation controls. No provider calls or third-party targets. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function norm(text) {
  return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/^aura[\s,:-]+/, '').replace(/[.!?]+$/g, '').trim();
}
function controlIntent(text) {
  const t = require('./auraDialogue').normalizeRequest(text).replace(/[.!?]+$/g, '').trim();
  if (/^(?:por favor[,]?\s*)?(?:volta (?:a )?(?:responder|falar)(?: comigo)?|podes (?:voltar a )?responder|retoma (?:a )?conversa|nao me ignores|deixa de me ignorar)(?: agora| aqui| neste chat)?$/.test(t)) return 'resume';
  if (/^(?:por favor[,]?\s*)?(?:ignora|ignore)(?:-me| me| a mim| (?:as )?minhas mensagens| (?:tudo (?:o )?que|o que) (?:eu )?(?:vou fazer|fizer|faco|disser|vou dizer|mandar|enviar))(?: (?:a partir de agora|daqui (?:para|pra) a frente|agora|aqui|neste chat|por enquanto))*$/.test(t)) return 'pause';
  if (/^(?:para|pare|deixa) de (?:me responder|responder (?:a mim|as minhas mensagens))(?: agora| por enquanto)?$/.test(t)) return 'pause';
  return null;
}
function scopeKey(ctx = {}) {
  const chat = String(ctx.remoteJid || '');
  const actor = String(ctx.senderJid || ctx.senderLid || ctx.senderNumber || '');
  return chat && actor ? crypto.createHash('sha256').update(JSON.stringify([chat, actor])).digest('hex') : '';
}
function identityReply(text, ctx = {}) {
  if (!/^(?:quem sou eu|sabes quem (?:eu )?sou|tu sabes quem (?:eu )?sou)$/.test(norm(text))) return null;
  if (ctx.isPrimaryOwner === true) return 'És o Dark, o Dono principal configurado. Reconheço a tua conta pelos identificadores verificados, não pelo nome de perfil.';
  if (ctx.isSubOwner === true) return 'Esta conta tem permissões de subdono; não está identificada como o Dark, Dono principal.';
  return 'Não identifiquei esta conta como o Dark, Dono principal. Um nome de perfil ou um número escrito na conversa não prova essa identidade.';
}

function createConversationControls({ file = path.join(__dirname, '../../data/aura-conversation-pauses.json'), storage, maxPaused = 1000, maxReplyAgeMs = Math.max(1000, Math.min(120000, Number(process.env.AURA_REPLY_MAX_AGE_MS) || 60000)) } = {}) {
  let paused = null;
  const turns = new Map();
  const arrivals = new Map();
  let serial = 0;
  const io = storage || {
    load() {
      try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
      catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
    },
    save(data) {
      fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
      const tmp = `${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
      try { fs.writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 }); fs.renameSync(tmp, file); }
      finally { try { fs.unlinkSync(tmp); } catch (_) {} }
    },
  };
  function load() {
    if (paused) return;
    const raw = io.load();
    paused = new Set(Object.keys(raw || {}).filter(k => /^[a-f0-9]{64}$/.test(k) && raw[k] === true));
  }
  function isPaused(ctx) { load(); const key = scopeKey(ctx); return !!key && paused.has(key); }
  function persist() { io.save(Object.fromEntries([...paused].map(k => [k, true]))); }
  function sourceTimestamp(timestamp) {
    try {
      const raw = Number(typeof timestamp?.toNumber === 'function' ? timestamp.toNumber() : timestamp);
      return Number.isFinite(raw) && raw > 0 ? Math.min(Date.now(), raw < 1e12 ? raw * 1000 : raw) : 0;
    } catch (_) { return 0; }
  }
  function cancelTurn(turn) {
    if (turn?.conversational && !turn.signal.aborted) turn.controller.abort();
  }
  function noteIncoming(ctx, { messageId, timestamp } = {}) {
    const key = scopeKey(ctx);
    if (!key || !messageId) return false;
    const previous = arrivals.get(key);
    const ts = sourceTimestamp(timestamp);
    if (previous && Date.now() - previous.receivedAt < 600000 && ts && previous.timestamp && ts < previous.timestamp) return false;
    if (previous?.messageId === String(messageId)) return false;
    arrivals.delete(key);
    arrivals.set(key, { messageId: String(messageId), timestamp: ts, receivedAt: Date.now() });
    while (arrivals.size > 4096) arrivals.delete(arrivals.keys().next().value);
    cancelTurn(turns.get(key));
    return true;
  }
  function begin(ctx, { timestamp, messageId } = {}) {
    const key = scopeKey(ctx);
    const controller = new AbortController();
    const turn = { key, serial: ++serial, conversational: false,
      startedAt: sourceTimestamp(timestamp) || Date.now(), controller, signal: controller.signal };
    const arrival = key && arrivals.get(key);
    const outdated = messageId && arrival && Date.now() - arrival.receivedAt < 600000 && arrival.messageId !== String(messageId);
    if (outdated) { controller.abort(); return turn; }
    if (key) {
      cancelTurn(turns.get(key));
      turns.delete(key); turns.set(key, turn);
      while (turns.size > 4096) {
        const oldest = turns.keys().next().value;
        cancelTurn(turns.get(oldest)); turns.delete(oldest);
      }
    }
    return turn;
  }
  function finish(turn) {
    if (turn?.key && turns.get(turn.key) === turn) turns.delete(turn.key);
    cancelTurn(turn);
  }
  function canDeliver(ctx, turn) {
    if (isPaused(ctx)) return false;
    return !turn?.conversational || (!turn.signal?.aborted && (!turn.key || turns.get(turn.key) === turn) && Date.now() - turn.startedAt <= maxReplyAgeMs);
  }
  function processMessage(text, ctx) {
    load();
    const key = scopeKey(ctx);
    if (!key) return { handled: false };
    const intent = controlIntent(text);
    if (intent === 'pause') {
      cancelTurn(turns.get(key));
      if (!paused.has(key) && paused.size >= maxPaused) return { handled: true, reply: 'Não consegui registar outra pausa. A conversa não foi alterada.' };
      paused.add(key);
      try { persist(); }
      catch (_) { return { handled: true, reply: 'Pausei as respostas nesta instância, mas não consegui guardar a pausa para depois de um reinício. Diz «volta a responder» para retomar.' }; }
      return { handled: true, reply: 'Entendido. Não vou responder às tuas mensagens neste chat até dizeres «volta a responder». A pausa não desfaz acções já iniciadas; a moderação do grupo mantém-se activa.' };
    }
    if (intent === 'resume') {
      paused.delete(key);
      try { persist(); }
      catch (_) { paused.add(key); return { handled: true, reply: 'Não consegui guardar a retoma. Mantive a pausa; tenta novamente mais tarde.' }; }
      return { handled: true, reply: 'Voltei a responder-te neste chat.' };
    }
    return { handled: paused.has(key), silent: paused.has(key) };
  }
  function guardSock(sock, ctx, turn) {
    return new Proxy(sock, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (typeof value === 'function' && (prop === 'sendMessage' || prop === 'relayMessage' || prop === 'sendPresenceUpdate')) {
          return async (...args) => {
            const jid = prop === 'sendPresenceUpdate' ? args[1] : args[0];
            if (jid === ctx.remoteJid && !canDeliver(ctx, turn)) return { suppressed: true };
            return value.apply(target, args);
          };
        }
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }
  return { process: processMessage, noteIncoming, begin, finish, isPaused, canDeliver, guardSock };
}
const controls = createConversationControls();
module.exports = { ...controls, createConversationControls, controlIntent, identityReply, scopeKey, norm };
