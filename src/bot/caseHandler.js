/**
 * DARK BOT v5 — Case Handler Engine v3 ULTRA
 * ═══════════════════════════════════════════════════════
 *
 * COMO ADICIONAR UM CASE PELO WHATSAPP:
 *
 *   1. Copia o código do teu case (sem as linhas case 'xxx': { e break; })
 *   2. Envia: !addcase <nome>
 *      e na mesma mensagem (ou na seguinte citando) o código JS
 *
 *   Exemplo (código na mesma mensagem após o nome):
 *   !addcase ping
 *   ---
 *   if (!text) return m.reply('Pong!');
 *   m.reply(`Pong! Latência: ${Date.now() - m.ts}ms`);
 *
 *   Exemplo com código separado (responde ao código com !addcase nome):
 *   (coloca o código numa mensagem, depois responde a ela com !addcase nome)
 *
 * VARIÁVEIS DISPONÍVEIS NO CÓDIGO DO CASE:
 *   m        — wrapper da mensagem (m.reply, m.react, m.quoted, m.chat, m.sender)
 *   sock     — socket Baileys completo
 *   ctx      — contexto (ctx.remoteJid, ctx.senderNumber, ctx.isGroup, ctx.pushName)
 *   text     — texto após o comando
 *   args     — array de argumentos
 *   prefix   — prefixo activo
 *   command  — nome do comando
 *   isOwner  — boolean
 *   reply    — atalho para m.reply
 *   react    — atalho para m.react
 *   q        — alias de text (compatibilidade clássica)
 *   from     — alias de m.chat (compatibilidade clássica)
 *   info     — alias de m.msg (compatibilidade clássica)
 *
 * COMANDOS DE GESTÃO:
 *   !addcase <cmd> <código>   — adiciona case com código JS
 *   !removicase <cmd>         — remove case dinâmico
 *   !downcase <cmd>           — ver/descarregar código do case
 *   !listcases                — listar todos os cases dinâmicos
 *   !runcase <cmd> [args...]  — executar um case directamente
 *   !reloadcases              — recarregar cases dos ficheiros (só Dono)
 */

'use strict';

const BotConfig = require('../database/models/BotConfig');

// ─────────────────────────────────────────────
// MAPA PRINCIPAL
// ─────────────────────────────────────────────
const CASES = new Map();
// Guarda o código fonte dos cases dinâmicos para downcase
const CASES_SOURCE = new Map();

// ─────────────────────────────────────────────
// WRAPPER "m" — estilo clássico
// ─────────────────────────────────────────────
function buildM(sock, msg, ctx) {
  const jid    = ctx.remoteJid;
  const sender = ctx.senderJid || jid;
  const key    = msg.key;

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
    msg:         { message: quotedMsg, key: { id: quotedId, remoteJid: jid, participant: quotedPart, fromMe: false } },
    text: quotedMsg.conversation ||
          quotedMsg.extendedTextMessage?.text ||
          quotedMsg.imageMessage?.caption ||
          quotedMsg.videoMessage?.caption || '',
    isImage:   !!quotedMsg.imageMessage,
    isVideo:   !!quotedMsg.videoMessage,
    isAudio:   !!quotedMsg.audioMessage,
    isSticker: !!quotedMsg.stickerMessage,
    isDoc:     !!quotedMsg.documentMessage,
  } : null;

  const m = {
    key,
    msg,
    chat:     jid,
    sender,
    from:     jid,
    pushName: ctx.pushName || '',
    isGroup:  ctx.isGroup  || false,
    quoted,
    ts:       Date.now(),

    reply: async (text) => { const RE = require('./renderEngine'); const themed = await RE.themeText(String(text), jid).catch(() => String(text)); return sock.sendMessage(jid, { text: themed }, { quoted: msg }); },
    react: (emoji) => sock.sendMessage(jid, { react: { text: emoji, key } }).catch(() => {}),
    delete: () => sock.sendMessage(jid, { delete: key }).catch(() => {}),
  };

  return { m, quoted };
}

// ─────────────────────────────────────────────
// COMPILAR CÓDIGO JS → FUNÇÃO ASYNC
// ─────────────────────────────────────────────
function adaptCaseCode(code) {
  // Adapta código de outros bots para o DARK BOT
  let c = code;
  // Variáveis de socket
  c = c.replace(/\bsystemZR\b/g, 'sock');
  c = c.replace(/\bconn\b(?![a-zA-Z])/g, 'sock');
  c = c.replace(/\bclient\b(?![a-zA-Z])/g, 'sock');
  c = c.replace(/\bthis\.sock\b/g, 'sock');
  // m.reply → reply (já disponível no contexto)
  c = c.replace(/\bm\.reply\(/g, 'reply(');
  // m.chat → ctx.remoteJid
  c = c.replace(/\bm\.chat\b/g, 'ctx.remoteJid');
  // m.key → msg.key
  c = c.replace(/\bm\.key\b/g, 'msg.key');
  // m.sender → ctx.senderJid
  c = c.replace(/\bm\.sender\b/g, 'ctx.senderJid');
  // m.pushName → ctx.pushName
  c = c.replace(/\bm\.pushName\b/g, 'ctx.pushName');
  // m.quoted → quoted
  c = c.replace(/\bm\.quoted\b/g, 'quoted');
  // m.react → react
  c = c.replace(/\bm\.react\(/g, 'react(');
  // m.from → ctx.remoteJid
  c = c.replace(/\bm\.from\b/g, 'ctx.remoteJid');
  // m.isGroup → ctx.isGroup
  c = c.replace(/\bm\.isGroup\b/g, 'ctx.isGroup');
  // m.isOwner → isOwner
  c = c.replace(/\bm\.isOwner\b/g, 'isOwner');
  // m.mention → mentions
  c = c.replace(/\bm\.mention\(/g, '// mention: ');
  // systemZR.sendMessage(m.chat, → sock.sendMessage(ctx.remoteJid,
  c = c.replace(/sock\.sendMessage\(ctx\.remoteJid/g, 'sock.sendMessage(ctx.remoteJid');
  // Remove 'break;' no final
  c = c.replace(/\bbreak\s*;?\s*$/m, '');
  // Adiciona axios se usado mas não importado
  if (c.includes('axios') && !c.includes('require') && !c.includes('import ')) {
    c = 'const axios = require("axios");\n' + c;
  }
  // albumMessage → enviar cada item individualmente
  c = c.replace(/\{\s*albumMessage\s*\}/g, '/* albumMessage handled below */');
  return c;
}

function compileCase(code) {
  const adapted = adaptCaseCode(code);
  const wrapped = `
    (async function caseRun({ m, sock, msg, ctx, text, args, prefix, command, isOwner, config, reply, react, q, from, info, quoted }) {
      const axios = require('axios');
      const systemZR = sock;
      const conn = sock;
      ${adapted}
    })
  `;
  return eval(wrapped);
}

// ─────────────────────────────────────────────
// REGISTAR UM CASE
// ─────────────────────────────────────────────
function registerCase(commands, handler, sourceOrOpts = null) {
  const onlyIfNew = sourceOrOpts === true || (typeof sourceOrOpts === 'object' && sourceOrOpts?.onlyIfNew);
  const source = typeof sourceOrOpts === 'string' ? sourceOrOpts : null;
  const list = Array.isArray(commands) ? commands : [commands];
  for (const cmd of list) {
    const key = String(cmd).toLowerCase().trim();
    if (onlyIfNew && CASES.has(key)) continue; // não sobrescreve existente
    CASES.set(key, handler);
    if (source) CASES_SOURCE.set(key, source);
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
      // Limpar cache para hot reload
      delete require.cache[require.resolve(path.join(dir, file))];
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
    const stored = await BotConfig.get('dynamic_cases_v2', {}).catch(() => ({}));
    if (!stored || typeof stored !== 'object') return;
    for (const [cmd, entry] of Object.entries(stored)) {
      if (CASES.has(cmd)) continue; // não sobrepõe cases de ficheiros
      const source = typeof entry === 'string' ? entry : entry.code || entry;
      try {
        const fn = compileCase(source);
        registerCase(cmd, fn, source);
      } catch (e) {
        // Case com erro → regista como resposta de texto
        const txt = String(source);
        registerCase(cmd, async ({ m }) => m.reply(txt), txt);
      }
    }
  } catch {}
  _dynamicLoaded = true;
}

async function addDynamicCase(command, code) {
  const stored = await BotConfig.get('dynamic_cases_v2', {}).catch(() => ({}));
  stored[command] = { code, addedAt: new Date().toISOString() };
  await BotConfig.set('dynamic_cases_v2', stored);
  try {
    const fn = compileCase(code);
    registerCase(command, fn, code);
  } catch (e) {
    registerCase(command, async ({ m }) => m.reply(code), code);
    throw new Error('Código guardado mas com erro de sintaxe: ' + e.message.slice(0, 100));
  }
}

async function delDynamicCase(command) {
  const stored = await BotConfig.get('dynamic_cases_v2', {}).catch(() => ({}));
  delete stored[command];
  await BotConfig.set('dynamic_cases_v2', stored);
  CASES.delete(command);
  CASES_SOURCE.delete(command);
}

async function listDynamicCases() {
  const stored = await BotConfig.get('dynamic_cases_v2', {}).catch(() => ({}));
  return Object.entries(stored).map(([cmd, entry]) => ({
    cmd,
    addedAt: entry?.addedAt || '?',
    preview: (entry?.code || String(entry)).slice(0, 50),
  }));
}

async function getDynamicCaseSource(command) {
  const stored = await BotConfig.get('dynamic_cases_v2', {}).catch(() => ({}));
  const entry  = stored[command];
  if (!entry) return null;
  return entry?.code || String(entry);
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
  const { m, quoted } = buildM(sock, msg, ctx);

  // isAdmin lazy
  const isAdminFn = async () => {
    if (ctx.isOwner) return true;
    if (!ctx.isGroup) return false;
    try {
      const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
      const snum = ctx.senderNumber;
      return meta.participants?.some(p =>
        p.id.split('@')[0].replace(/\D/g,'') === snum &&
        (p.admin === 'admin' || p.admin === 'superadmin')
      ) || false;
    } catch { return false; }
  };

  const caseCtx = {
    m, quoted, sock, msg, ctx, args,
    text, prefix, command: cmd, isOwner, isAdminFn, config,
    reply: (t) => m.reply(t),
    react: (e) => m.react(e),
    // Aliases clássicos
    q:    text,
    from: ctx.remoteJid,
    info: msg,
  };

  try {
    await handler(caseCtx);
    return true;
  } catch (e) {
    console.error(`[Case:${cmd}]`, e.message?.slice(0, 100));
    try { await m.reply(`❌ Erro no case *${cmd}*:\n${e.message?.slice(0, 200)}`); } catch {}
    return true;
  }
}

// ─────────────────────────────────────────────
// EXTRAIR CÓDIGO DO CASE (remove cabeçalho/rodapé estilo switch)
// ─────────────────────────────────────────────
function extractCaseCode(rawText) {
  let code = rawText.trim();

  // Remove: case 'xxx': {   e   case "xxx": {
  code = code.replace(/^case\s+['"`][^'"`]+['"`]\s*:\s*\{?\s*/i, '');

  // Remove: break; e break  no fim
  code = code.replace(/\bbreak\s*;?\s*$/i, '');

  // Remove: }  isolado no fim (fechamento do case)
  code = code.replace(/^\}\s*$/m, '');

  // Remove delimitador --- (separador entre comando e código)
  code = code.replace(/^---\s*/m, '');

  return code.trim();
}

// ─────────────────────────────────────────────
// CASES DE GESTÃO (addcase, removicase, downcase, listcases, runcase, reloadcases)
// ─────────────────────────────────────────────
function registerManagementCases() {

  // ── !addcase <cmd> [código] ──────────────────────────────────────
  registerCase(['addcase', 'addcmd', 'newcase'], async ({ m, sock, ctx, msg, args, text, isOwner, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono pode adicionar cases.');

    // Obtém o nome do case (primeiro argumento)
    const cmdName = args[0]?.toLowerCase().trim();
    if (!cmdName) return m.reply(
      `❌ *Como adicionar um case:*\n\n` +
      `*Opção 1* — Código na mesma mensagem:\n` +
      `\`\`\`\n${prefix}addcase ping\n---\nm.reply('Pong!');\n\`\`\`\n\n` +
      `*Opção 2* — Responde a uma mensagem com o código:\n` +
      `Coloca o código numa mensagem, depois responde a ela com *${prefix}addcase nome*\n\n` +
      `*Opção 3* — Cole o case completo (com case 'x': { ... break;}):\n` +
      `O bot extrai o código automaticamente`
    );

    // Obtém o código: pode vir na mesma mensagem ou na mensagem citada
    let code = args.slice(1).join(' ').trim();

    // Se há um --- separador, o código vem depois
    if (text.includes('\n---\n') || text.includes('\n---')) {
      const parts = text.replace(/^[^\n]+\n/, '').split(/^---\s*$/m);
      code = parts.slice(-1)[0]?.trim() || code;
    }

    // Se não há código na mensagem mas há citação, usa o texto citado
    if (!code && m.quoted?.text) {
      code = m.quoted.text.trim();
    }

    if (!code) return m.reply(
      `❌ Falta o código!\n\n` +
      `Envia: *${prefix}addcase ${cmdName}*\n` +
      `e o código abaixo de --- ou responde a uma mensagem com o código`
    );

    // Extrai o código se vier em formato switch/case clássico
    const cleanCode = extractCaseCode(code);

    try {
      await addDynamicCase(cmdName, cleanCode);
      await m.reply(
        `✅ *Case adicionado com sucesso!*\n\n` +
        `📌 Comando: *${prefix}${cmdName}*\n` +
        `📄 Código: ${cleanCode.split('\n').length} linhas\n\n` +
        `Testa agora com *${prefix}${cmdName}*`
      );
    } catch (e) {
      await m.reply(
        `⚠️ *Case guardado mas com erro:*\n${e.message}\n\n` +
        `Verifica a sintaxe e usa *${prefix}downcase ${cmdName}* para ver o código.`
      );
    }
  });

  // ── !removicase / !delcase <cmd> ────────────────────────────────
  registerCase(['removicase', 'delcase', 'delcmd', 'remcase', 'removecase'], async ({ m, args, isOwner, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono pode remover cases.');
    const cmd = (args[0] || '').toLowerCase().trim();
    if (!cmd) return m.reply(`❌ Uso: *${prefix}removicase* <comando>`);

    const src = await getDynamicCaseSource(cmd);
    if (!src) return m.reply(`❌ Case *${prefix}${cmd}* não encontrado nos cases dinâmicos.`);

    await delDynamicCase(cmd);
    m.reply(`✅ Case *${prefix}${cmd}* removido com sucesso.`);
  });

  // ── !downcase <cmd> ─────────────────────────────────────────────
  registerCase(['downcase', 'getcasecode', 'viewcase', 'showcase'], async ({ m, args, isOwner, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono.');
    const cmd = (args[0] || '').toLowerCase().trim();
    if (!cmd) return m.reply('❌ Uso: *' + prefix + 'downcase* <comando>');

    // 1. Verifica nos casos dinâmicos (addcase)
    const dynSrc = await getDynamicCaseSource(cmd);
    if (dynSrc) {
      const fullCode = 'case ' + "'" + cmd + "'" + ': {\n' + dynSrc + '\nbreak;\n}';
      await m.reply('📄 *Código do case: ' + prefix + cmd + '* (dinâmico)\n\n\\\\');
      return;
    }

    // 2. Verifica na memória
    const memSrc = CASES_SOURCE.get(cmd);
    if (memSrc) {
      const fullCode = 'case ' + "'" + cmd + "'" + ': {\n' + memSrc + '\nbreak;\n}';
      await m.reply('📄 *Código do case: ' + prefix + cmd + '* (memória)\n\n\\\\');
      return;
    }

    // 3. Procura nos ficheiros de cases
    try {
      const path = require('path');
      const casesDir = path.join(__dirname, 'cases');
      const files = fs.readdirSync(casesDir).filter(f => f.endsWith('.js'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(casesDir, file), 'utf8');
        if (content.includes("'" + cmd + "'") || content.includes('"' + cmd + '"')) {
          // Encontra o registerCase que contem este comando
          const idx = content.indexOf("'" + cmd + "'");
          const idx2 = content.indexOf('"' + cmd + '"');
          const pos = idx >= 0 ? idx : idx2;
          // Recua para encontrar o inicio do registerCase
          let regStart = content.lastIndexOf('registerCase', pos);
          if (regStart === -1) regStart = Math.max(0, pos - 200);
          // Avanca para encontrar o fim (conta chavetas)
          let depth = 0, started = false, regEnd = regStart;
          for (let i = regStart; i < Math.min(content.length, regStart + 10000); i++) {
            if (content[i] === '{') { depth++; started = true; }
            if (content[i] === '}') { depth--; }
            if (started && depth === 0) { regEnd = i + 1; break; }
          }
          let code = content.slice(regStart, regEnd);
          if (code.length > 3500) code = code.slice(0, 3500) + '\n... (truncado — ficheiro completo no GitHub)';
          await m.reply('📄 *Código do case: ' + prefix + cmd + '*\n📁 Ficheiro: ' + file + '\n\n\\\\');
          return;
        }
      }
    } catch (e) {
      console.warn('[downcase] erro:', e.message);
    }

    // 4. Comando existe mas sem source
    if (CASES.has(cmd)) {
      m.reply('📄 *' + prefix + cmd + '* existe mas vem de um pacote nativo.\nCódigo não disponível via downcase.');
    } else {
      m.reply('❌ Comando *' + prefix + cmd + '* não encontrado.');
    }
  });

  // ── !listcases ──────────────────────────────────────────────────
  registerCase(['listcases', 'listcmds', 'mycases', 'listcase'], async ({ m, isOwner, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono pode ver os cases dinâmicos.');
    const list = await listDynamicCases();
    if (!list.length) return m.reply(
      `📭 *Sem cases dinâmicos.*\n\nAdiciona com:\n*${prefix}addcase <nome>*\ne o código abaixo`
    );

    const total = CASES.size;
    const lines = list.map((c, i) =>
      `  ⌬ *${prefix}${c.cmd}* — _${c.preview}..._`
    ).join('\n');

    m.reply(
      `╔━᳀『 🕸️ CASES DINÂMICOS 』═᳀\n` +
      `\n  Total geral: *${total}* | Dinâmicos: *${list.length}*\n\n` +
      `${lines}\n\n` +
      `╚═━═━═━═━═━═━═━═᳀\n` +
      `> *${prefix}addcase* <cmd> + código\n` +
      `> *${prefix}downcase* <cmd> — ver código\n` +
      `> *${prefix}removicase* <cmd> — remover`
    );
  });

  // ── !runcase <cmd> [args] ───────────────────────────────────────
  registerCase(['runcase', 'execcase', 'testcase'], async ({ m, sock, msg, ctx, args, prefix, isOwner, config }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono pode executar cases directamente.');
    const cmd = (args[0] || '').toLowerCase().trim();
    if (!cmd) return m.reply(`❌ Uso: *${prefix}runcase* <comando> [args...]`);

    const caseArgs = args.slice(1);
    const caseText = caseArgs.join(' ');
    const rawCtx = { sock, msg, ctx, args: caseArgs, text: caseText, prefix, isOwner, config };
    const handled = await runCase(cmd, rawCtx);
    if (!handled) m.reply(`❌ Case *${prefix}${cmd}* não encontrado.`);
  });

  // ── !reloadcases ─────────────────────────────────────────────────
  registerCase(['reloadcases', 'recarregarcases', 'refreshcases'], async ({ m, isOwner }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono.');
    const before = CASES.size;
    loadCases();
    await loadDynamicCases();
    m.reply(`✅ Cases recarregados!\nAntes: ${before} | Agora: ${CASES.size}`);
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
  getDynamicCaseSource,
  buildM,
  CASES,
  CASES_SOURCE,
  extractCaseCode,
  init,
};
