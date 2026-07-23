/**
 * DARK BOT v5 — Case Handler Engine v2
 * Suporta o estilo clássico switch/case com wrapper "m"
 *
 * COMO USAR (no WhatsApp):
 *   !addcase fakemsg     → adiciona case com texto simples
 *   !delcase fakemsg     → remove case
 *   !listcases           → lista todos os cases dinâmicos
 *
 * CRIAR UM CASE PROGRAMÁTICO em src/bot/cases/meu-ficheiro.js:
 *
 *   module.exports = function(registerCase) {
 *
 *     case 'fakemsg': {
 *       registerCase('fakemsg', async ({ m, sock, text, isOwner, reply }) => {
 *         if (!m.quoted) return m.reply('Marca o utilizador!');
 *         if (!text)     return m.reply('Falta o texto!');
 *         // ... lógica aqui
 *       });
 *     }
 *
 *   };
 *
 * CONTEXTO DISPONÍVEL em cada case:
 *   m          — wrapper estilo classic (m.reply, m.quoted, m.sender, m.chat, m.key, m.isGroup, m.pushName)
 *   sock       — socket do Baileys (@systemzero)
 *   msg        — mensagem raw do Baileys
 *   ctx        — contexto processado (senderNumber, remoteJid, isGroup, pushName, isOwner...)
 *   text       — texto após o comando
 *   args       — array de argumentos
 *   prefix     — prefixo activo
 *   command    — nome do comando (sem prefixo)
 *   isOwner    — boolean
 *   isAdmin    — boolean (calculado por isAdminFn())
 *   isAdminFn  — async () => boolean
 *   config     — configuração do bot
 *   reply      — (text) => Promise  [alias de m.reply]
 *   react      — (emoji) => Promise
 *   quoted     — mensagem citada (raw) ou null
 */

'use strict';

const BotConfig = require('../database/models/BotConfig');

// ─────────────────────────────────────────────
// MAPA PRINCIPAL
// ─────────────────────────────────────────────
/** @type {Map<string, Function>} */
const CASES = new Map();

// ─────────────────────────────────────────────
// CONSTRUIR WRAPPER "m" ESTILO CLÁSSICO
// ─────────────────────────────────────────────
function buildM(sock, msg, ctx) {
  const jid      = ctx.remoteJid;
  const sender   = ctx.senderJid || jid;
  const key      = msg.key;

  // Mensagem citada
  const ctxInfo    = msg.message?.extendedTextMessage?.contextInfo ||
                     msg.message?.interactiveResponseMessage?.contextInfo || {};
  const quotedMsg  = ctxInfo.quotedMessage || null;
  const quotedId   = ctxInfo.stanzaId || null;
  const quotedPart = ctxInfo.participant || null;

  const quoted = quotedMsg ? {
    id:          quotedId,
    sender:      quotedPart || sender,
    participant: quotedPart,
    message:     quotedMsg,
    // Texto da mensagem citada
    text: quotedMsg.conversation ||
          quotedMsg.extendedTextMessage?.text ||
          quotedMsg.imageMessage?.caption ||
          quotedMsg.videoMessage?.caption || '',
    // Tipos
    isImage:  !!quotedMsg.imageMessage,
    isVideo:  !!quotedMsg.videoMessage,
    isAudio:  !!quotedMsg.audioMessage,
    isSticker:!!quotedMsg.stickerMessage,
    isDoc:    !!quotedMsg.documentMessage,
  } : null;

  // Wrapper m
  const m = {
    key,
    chat:      jid,
    sender,
    pushName:  ctx.pushName || '',
    isGroup:   ctx.isGroup || false,
    quoted,

    /** Responde à mensagem */
    reply: (text) => sock.sendMessage(jid, { text: String(text) }, { quoted: msg }),

    /** Reage com emoji */
    react: (emoji) => sock.sendMessage(jid, { react: { text: emoji, key } }).catch(() => {}),

    /** Apaga a mensagem actual */
    delete: () => sock.sendMessage(jid, { delete: key }).catch(() => {}),
  };

  return { m, quoted };
}

// ─────────────────────────────────────────────
// FUNÇÃO isAdmin LAZY
// ─────────────────────────────────────────────
function makeIsAdminFn(sock, ctx) {
  let _cached = null;
  return async () => {
    if (_cached !== null) return _cached;
    if (ctx.isOwner) return (_cached = true);
    if (!ctx.isGroup) return (_cached = false);
    try {
      const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
      const snum = ctx.senderNumber;
      _cached = meta.participants?.some(p =>
        p.id.split('@')[0].replace(/\D/g,'') === snum &&
        (p.admin === 'admin' || p.admin === 'superadmin')
      ) || false;
    } catch { _cached = false; }
    return _cached;
  };
}

// ─────────────────────────────────────────────
// REGISTAR UM CASE
// ─────────────────────────────────────────────
function registerCase(commands, handler) {
  const list = Array.isArray(commands) ? commands : [commands];
  for (const cmd of list) {
    CASES.set(String(cmd).toLowerCase().trim(), handler);
  }
}

// ─────────────────────────────────────────────
// CARREGAR FICHEIROS src/bot/cases/
// ─────────────────────────────────────────────
function loadCases() {
  const fs   = require('fs');
  const path = require('path');
  const dir  = path.join(__dirname, 'cases');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const mod = require(path.join(dir, file));
      if (typeof mod === 'function') {
        mod(registerCase);
      } else if (mod instanceof Map) {
        mod.forEach((fn, cmd) => registerCase(cmd, fn));
      } else if (typeof mod === 'object') {
        Object.entries(mod).forEach(([cmd, fn]) => {
          if (typeof fn === 'function') registerCase(cmd, fn);
        });
      }
    } catch (e) {
      console.warn(`[Cases] Falha ao carregar ${file}:`, e.message?.slice(0, 80));
    }
  }
  console.log(`[Cases] ${CASES.size} cases carregados`);
}

// ─────────────────────────────────────────────
// CASES DINÂMICOS (DB)
// ─────────────────────────────────────────────
let _dynamicLoaded = false;

async function loadDynamicCases() {
  try {
    const stored = await BotConfig.get('dynamic_cases', {}).catch(() => ({}));
    if (!stored || typeof stored !== 'object') return;
    for (const [cmd, response] of Object.entries(stored)) {
      if (!CASES.has(cmd)) {
        registerCase(cmd, async ({ m }) => m.reply(response));
      }
    }
  } catch {}
  _dynamicLoaded = true;
}

async function addDynamicCase(command, response) {
  const stored = await BotConfig.get('dynamic_cases', {}).catch(() => ({}));
  stored[command] = response;
  await BotConfig.set('dynamic_cases', stored);
  registerCase(command, async ({ m }) => m.reply(response));
}

async function delDynamicCase(command) {
  const stored = await BotConfig.get('dynamic_cases', {}).catch(() => ({}));
  delete stored[command];
  await BotConfig.set('dynamic_cases', stored);
  CASES.delete(command);
}

async function listDynamicCases() {
  const stored = await BotConfig.get('dynamic_cases', {}).catch(() => ({}));
  return Object.keys(stored);
}

// ─────────────────────────────────────────────
// EXECUTAR UM CASE
// ─────────────────────────────────────────────
async function runCase(command, rawCtx) {
  if (!_dynamicLoaded) await loadDynamicCases();

  const cmd     = String(command || '').toLowerCase().trim();
  const handler = CASES.get(cmd);
  if (!handler) return false;

  const { sock, msg, ctx, args, text, prefix, isOwner, config } = rawCtx;

  // Constrói wrapper m e quoted
  const { m, quoted } = buildM(sock, msg, ctx);

  // Função isAdmin lazy
  const isAdminFn = makeIsAdminFn(sock, ctx);

  // Contexto completo para o case
  const caseCtx = {
    // Wrapper estilo clássico
    m,
    quoted,

    // Raw Baileys
    sock,
    msg,
    ctx,

    // Dados do comando
    args,
    text,
    prefix,
    command: cmd,
    isOwner,
    isAdminFn,

    // Config
    config,

    // Helpers rápidos
    reply:  (t) => m.reply(t),
    react:  (e) => m.react(e),
  };

  try {
    await handler(caseCtx);
    return true;
  } catch (e) {
    console.error(`[Case:${cmd}]`, e.message?.slice(0, 100));
    try { await m.reply(`❌ Erro: ${e.message?.slice(0, 100)}`); } catch {}
    return true;
  }
}

// ─────────────────────────────────────────────
// CASES DE GESTÃO
// ─────────────────────────────────────────────
function registerManagementCases() {

  // !addcase <cmd> <resposta>
  registerCase(['addcase', 'addcmd'], async ({ args, text, isOwner, m, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono pode adicionar cases.');
    const [cmd, ...rest] = args;
    if (!cmd || !rest.length) return m.reply(
      `❌ Uso: *${prefix}addcase* <comando> <resposta>\n` +
      `Ex: *${prefix}addcase oi* Olá! 👋`
    );
    const command  = cmd.toLowerCase().trim();
    const response = rest.join(' ').trim();
    await addDynamicCase(command, response);
    return m.reply(`✅ Case *${prefix}${command}* adicionado!\nResposta: _${response}_`);
  });

  // !delcase <cmd>
  registerCase(['delcase', 'delcmd', 'remcase'], async ({ args, isOwner, m, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono pode remover cases.');
    const cmd = (args[0] || '').toLowerCase().trim();
    if (!cmd) return m.reply(`❌ Uso: *${prefix}delcase* <comando>`);
    await delDynamicCase(cmd);
    return m.reply(`✅ Case *${prefix}${cmd}* removido.`);
  });

  // !listcases
  registerCase(['listcases', 'listcmds', 'mycases'], async ({ isOwner, m, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono pode ver os cases.');
    const list = await listDynamicCases();
    if (!list.length) return m.reply(`📭 Sem cases dinâmicos.\nAdiciona com *${prefix}addcase <cmd> <resposta>*`);
    const lines = list.map((c, i) => `  ⌬ *${prefix}${c}*`).join('\n');
    return m.reply(
      `╔━᳀『 🕸️ CASES DINÂMICOS 』═᳀\n` +
      `\n${lines}\n\n` +
      `╚═━═━═━═━═━═━═━═᳀\n` +
      `> *${prefix}addcase* <cmd> <resposta>\n` +
      `> *${prefix}delcase* <cmd>`
    );
  });
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
function init() {
  registerManagementCases();
  loadCases();
  loadDynamicCases().catch(() => {});
}

module.exports = {
  registerCase,
  runCase,
  loadCases,
  loadDynamicCases,
  addDynamicCase,
  delDynamicCase,
  listDynamicCases,
  CASES,
  init,
  buildM,
};
