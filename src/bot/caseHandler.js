/**
 * DARK BOT v7 — Case Handler Engine ULTRA DINÂMICO
 * ═══════════════════════════════════════════════════════
 *
 * Suporta TODOS os formatos de cases de QUALQUER bot:
 *
 * FORMATOS SUPORTADOS:
 *
 *   1. Standard switch/case (outros bots):
 *      case "ytplay4": { ... } break
 *      case 'copilot': { ... } break;
 *
 *   2. Module.exports (manga, módulos complexos):
 *      module.exports = { name: "manga", execute(sock, from, msg, args) { ... } }
 *
 *   3. Função solta:
 *      async function meuComando(sock, msg, text) { ... }
 *
 *   4. Código JS puro (sem wrapper):
 *      reply('Olá!');  // adaptado automaticamente
 *
 *   5. Resposta simples (string):
 *      "Olá! Eu sou o bot."
 *
 * VARIÁVEIS DETECTADAS E ADAPTADAS AUTOMATICAMENTE:
 *   lofi, systemZR, conn, client, this.sock → sock
 *   m.chat, m.from, from → ctx.remoteJid
 *   m.sender → ctx.senderJid
 *   m.key → msg.key
 *   m.reply() → reply()
 *   m.react() → react()
 *   m.pushName → ctx.pushName
 *   m.isGroup → ctx.isGroup
 *   m.quoted → quoted
 *   info → msg
 *   q → text
 *   m.makeCode() → makeCode()
 *   m.makeTable() → makeTable()
 *   m.sendRich() → sendRich()
 *
 * COMANDOS DE GESTÃO:
 *   !addcase <cmd> <código>   — adiciona case (qualquer formato)
 *   !removicase <cmd>         — remove case dinâmico
 *   !downcase <cmd>           — ver código do case
 *   !listcases                — listar todos os cases dinâmicos
 *   !runcase <cmd> [args...]  — executar um case directamente
 *   !reloadcases              — recarregar cases dos ficheiros
 *   !testcase <cmd>           — testa se o case compila sem erros
 */

'use strict';

const BotConfig = require('../database/models/BotConfig');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────
// MAPA PRINCIPAL
// ─────────────────────────────────────────────────────
const CASES = new Map();
const CASES_SOURCE = new Map();
const CASES_META = new Map(); // guarda metadata: formato, origem, deps

// ─────────────────────────────────────────────────────
// REGISTRO DE CÓDIGO-FONTE POR FICHEIRO
// Populado durante loadCases() — permite !downcase para QUALQUER comando
// ─────────────────────────────────────────────────────
const FILE_SOURCES = new Map();   // cmd → { file, code, aliases, line }
const COMMAND_REGISTRY = new Map(); // cmd → { aliases, file, source }

// ─────────────────────────────────────────────────────
// WRAPPER "m" — estilo clássico COMPLETO
// ─────────────────────────────────────────────────────
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
    isOwner:  ctx.isOwner  || false,
    quoted,
    ts:       Date.now(),

    reply: async (text) => {
      const RE = require('./renderEngine');
      const themed = await RE.themeText(String(text), jid).catch(() => String(text));
      return sock.sendMessage(jid, { text: themed }, { quoted: msg });
    },
    react: (emoji) => sock.sendMessage(jid, { react: { text: emoji, key } }).catch(() => {}),
    delete: () => sock.sendMessage(jid, { delete: key }).catch(() => {}),

    // ── Rich Response helpers (estilo SystemZero) ──
    makeCode: (lang, code) => ({ type: 'code', lang, code }),
    makeText: (text) => ({ type: 'text', text }),
    makeTable: (rows) => ({ type: 'table', rows }),

    sendRich: async (target, parts, quotedMsg, capabilities) => {
      // Tenta enviar como mensagem formatada; fallback para texto simples
      try {
        let fullText = '';
        for (const part of parts) {
          if (part.type === 'code') {
            fullText += `\`\`\`${part.lang || ''}\n${part.code}\n\`\`\`\n\n`;
          } else if (part.type === 'table') {
            if (part.rows?.length) {
              const header = part.rows[0];
              fullText += header.map(h => `*${h}*`).join(' | ') + '\n';
              fullText += part.rows.slice(1).map(r => r.join(' | ')).join('\n') + '\n\n';
            }
          } else if (part.type === 'text') {
            fullText += part.text + '\n\n';
          }
        }
        return sock.sendMessage(target || jid, { text: fullText.trim() }, { quoted: quotedMsg || msg });
      } catch (e) {
        return sock.sendMessage(target || jid, { text: String(parts) }, { quoted: quotedMsg || msg });
      }
    },
  };

  return { m, quoted };
}

// ─────────────────────────────────────────────────────
// INSTALAÇÃO AUTOMÁTICA DE DEPENDÊNCIAS NPM
// ─────────────────────────────────────────────────────
const _installedDeps = new Set();

function ensureDeps(code) {
  const requireMatches = code.match(/require\s*\(\s*['"]([^'"./][^'"]*?)['"]\s*\)/g) || [];
  const importMatches = code.match(/from\s+['"]([^'"./][^'"]*?)['"]/g) || [];

  const deps = new Set();
  for (const m of requireMatches) {
    const pkg = m.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/)?.[1];
    if (pkg) {
      // Pega só o nome do pacote (sem subpath)
      const basePkg = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
      deps.add(basePkg);
    }
  }
  for (const m of importMatches) {
    const pkg = m.match(/from\s+['"]([^'"]+)['"]/)?.[1];
    if (pkg && !pkg.startsWith('.')) {
      const basePkg = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
      deps.add(basePkg);
    }
  }

  const missing = [];
  for (const dep of deps) {
    if (_installedDeps.has(dep)) continue;
    try {
      require.resolve(dep);
      _installedDeps.add(dep);
    } catch {
      missing.push(dep);
    }
  }

  return missing;
}

function installMissingDeps(deps) {
  if (!deps.length) return;
  const { execSync } = require('child_process');
  for (const dep of deps) {
    try {
      console.log(`[Cases] 📦 Instalando dependência: ${dep}`);
      execSync(`npm install ${dep} --save --legacy-peer-deps 2>/dev/null`, {
        cwd: path.join(__dirname, '..', '..'),
        timeout: 60000,
        stdio: 'pipe',
      });
      _installedDeps.add(dep);
      console.log(`[Cases] ✅ ${dep} instalado`);
    } catch (e) {
      console.warn(`[Cases] ⚠️ Falha ao instalar ${dep}: ${e.message?.slice(0, 80)}`);
    }
  }
}

// ─────────────────────────────────────────────────────
// DETECTOR DE FORMATO — identifica o tipo de código
// ─────────────────────────────────────────────────────
const FORMAT = {
  SWITCH_CASE: 'switch_case',       // case 'x': { ... } break
  MODULE_EXPORTS: 'module_exports', // module.exports = { execute() {} }
  FUNCTION: 'function',             // async function nome() {}
  RAW_CODE: 'raw_code',             // código JS solto
  STRING: 'string',                 // resposta de texto simples
};

function detectFormat(code) {
  const trimmed = code.trim();

  // 1. String simples (sem código JS)
  if ((trimmed.startsWith('"') || trimmed.startsWith("'") || trimmed.startsWith('`')) &&
      !trimmed.includes('require') && !trimmed.includes('function') && !trimmed.includes('=>') &&
      trimmed.length < 500) {
    return FORMAT.STRING;
  }

  // 2. Module.exports pattern
  if (/module\.exports\s*=/.test(trimmed) || /exports\.\w+\s*=/.test(trimmed)) {
    return FORMAT.MODULE_EXPORTS;
  }

  // 3. Switch/case pattern
  if (/^case\s+['"`]/.test(trimmed) || /case\s+['"`][^'"]+['"]\s*:\s*\{/.test(trimmed)) {
    return FORMAT.SWITCH_CASE;
  }

  // 4. Function declaration
  if (/^(async\s+)?function\s+\w+/.test(trimmed)) {
    return FORMAT.FUNCTION;
  }

  // 5. Raw code
  return FORMAT.RAW_CODE;
}

// ─────────────────────────────────────────────────────
// EXTRATOR DE COMANDO — detecta o nome do case
// ─────────────────────────────────────────────────────
function extractCommandName(code, providedName) {
  if (providedName) return providedName.toLowerCase().trim();

  const trimmed = code.trim();

  // case 'nome': ou case "nome":
  const caseMatch = trimmed.match(/case\s+['"`]([a-zA-Z0-9_]+)['"`]\s*:/);
  if (caseMatch) return caseMatch[1].toLowerCase();

  // module.exports = { name: 'nome' }
  const nameMatch = trimmed.match(/name\s*:\s*['"`]([a-zA-Z0-9_]+)['"`]/);
  if (nameMatch) return nameMatch[1].toLowerCase();

  // function nomeComando(
  const fnMatch = trimmed.match(/(?:async\s+)?function\s+([a-zA-Z0-9_]+)/);
  if (fnMatch) return fnMatch[1].toLowerCase();

  return null;
}

// ─────────────────────────────────────────────────────
// ADAPTADOR UNIVERSAL — converte QUALQUER formato para DARK BOT
// ─────────────────────────────────────────────────────
function adaptCaseCode(code) {
  let c = code;

  // ═══ VARIÁVEIS DE SOCKET (todas → sock) ═══
  // Ordem importa: nomes mais longos primeiro para não substituir parcialmente
  c = c.replace(/\bsystemZR\b/g, 'sock');
  c = c.replace(/\blofi\b/g, 'sock');
  c = c.replace(/\bconn\b(?![a-zA-Z_])/g, 'sock');
  c = c.replace(/\bclient\b(?![a-zA-Z_])/g, 'sock');
  c = c.replace(/\bthis\.sock\b/g, 'sock');

  // ═══ WRAPPER m → variáveis do DARK BOT ═══
  c = c.replace(/\bm\.reply\s*\(/g, 'reply(');
  c = c.replace(/\bm\.react\s*\(/g, 'react(');
  c = c.replace(/\bm\.chat\b/g, 'ctx.remoteJid');
  c = c.replace(/\bm\.from\b/g, 'ctx.remoteJid');
  c = c.replace(/\bm\.key\b/g, 'msg.key');
  c = c.replace(/\bm\.sender\b/g, 'ctx.senderJid');
  c = c.replace(/\bm\.pushName\b/g, 'ctx.pushName');
  c = c.replace(/\bm\.isGroup\b/g, 'ctx.isGroup');
  c = c.replace(/\bm\.isOwner\b/g, 'isOwner');
  c = c.replace(/\bm\.quoted\b/g, 'quoted');
  c = c.replace(/\bm\.msg\b/g, 'msg');

  // ═══ Variáveis clássicas de outros bots ═══
  // from → ctx.remoteJid (MAS não dentro de strings ou como parte de outra palavra)
  c = c.replace(/\bfrom\b(?!\s*['"`\w])/g, 'ctx.remoteJid');
  // info → msg (mensagem raw)
  c = c.replace(/\binfo\b(?!\s*['"`\w])/g, 'msg');
  // q → text (argumentos)
  c = c.replace(/\b(?<!\.)q\b(?!\s*['"`\w])/g, 'text');

  // ═══ Rich Response helpers ═══
  c = c.replace(/sock\.makeCode\s*\(/g, 'm.makeCode(');
  c = c.replace(/sock\.makeText\s*\(/g, 'm.makeText(');
  c = c.replace(/sock\.makeTable\s*\(/g, 'm.makeTable(');
  c = c.replace(/sock\.sendRich\s*\(/g, 'm.sendRich(');

  // ═══ sendMessage(from, → sendMessage(ctx.remoteJid, ═══
  c = c.replace(/sock\.sendMessage\(ctx\.remoteJid/g, 'sock.sendMessage(ctx.remoteJid');

  // ═══ Remove break; no final ═══
  // NOTA: NÃO remover '}' solto — extractCaseCode já trata disso.
  // Remover aqui quebrava o código quando havia if/else/try/catch.
  c = c.replace(/\bbreak\s*;?\s*$/m, '');

  // ═══ Adiciona axios se usado mas não importado ═══
  // Usa 'var' para permitir redeclaração caso o wrapper já o declare
  if (c.includes('axios') && !c.includes("require('axios')") && !c.includes('require("axios")') && !c.includes("require(`axios`)")) {
    c = "var axios = require('./caseAxios').createCaseAxios();\n" + c;
  }

  // ═══ Adiciona cheerio se usado mas não importado ═══
  if (c.includes('cheerio') && !c.includes("require('cheerio')") && !c.includes('require("cheerio")')) {
    c = "var cheerio = require('cheerio');\n" + c;
  }

  return c;
}

// ─────────────────────────────────────────────────────
// COMPILAR CÓDIGO → FUNÇÃO ASYNC
// ─────────────────────────────────────────────────────
function compileCase(code, cmdName) {
  let src = stripCodeFences(decodeHtmlEntities(String(code || '')));
  let format = detectFormat(src);
  // case 'x': { ... } break  NÃO é JS válido fora de switch.
  // Extrai o corpo antes de eval — senão rebenta mesmo com o case certo.
  if (format === FORMAT.SWITCH_CASE) {
    src = extractCaseCode(src);
    format = FORMAT.RAW_CODE;
  }
  const codeForAdapt = src;

  switch (format) {
    case FORMAT.STRING: {
      // String simples → reply direto
      const text = src.trim().replace(/^['"`]|['"`]$/g, '');
      return async ({ m }) => m.reply(text);
    }

    case FORMAT.MODULE_EXPORTS: {
      // module.exports = { execute(sock, from, msg, args, command, config) }
      // → adapta para o wrapper do DARK BOT
      const adapted = adaptCaseCode(codeForAdapt);
      const wrapped = `
        (function() {
          ${adapted}
          const _exp = module.exports;
          // Se tem execute → usa execute com adaptação
          if (_exp && typeof _exp.execute === 'function') {
            return async function caseRun(ctx) {
              const { m, sock, msg, ctx: ctxObj, text, args, prefix, command, isOwner, config, reply, react, q, from, info, quoted } = ctx;
              return _exp.execute(sock, ctxObj.remoteJid, msg, args, command, config);
            };
          }
          // Se tem handleMangaButton → regista como handler de botão
          if (_exp && typeof _exp.handleMangaButton === 'function') {
            return async function caseRun(ctx) {
              const { sock, msg } = ctx;
              return _exp.handleMangaButton(sock, msg);
            };
          }
          return async () => {};
        })()
      `;
      return eval(wrapped);
    }

    case FORMAT.SWITCH_CASE: {
      // case 'nome': { ... } break
      const adapted = adaptCaseCode(codeForAdapt);
      const wrapped = `
        (async function caseRun({ m, sock, msg, ctx, text, args, prefix, command, isOwner, config, reply, react, q, from, info, quoted }) {
          var axios = require('./caseAxios').createCaseAxios();
          var systemZR = sock;
          var conn = sock;
          var lofi = sock;
          var client = sock;
          ${adapted}
        })
      `;
      return eval(wrapped);
    }

    case FORMAT.FUNCTION: {
      // async function nome(sock, msg, text) { ... }
      const adapted = adaptCaseCode(codeForAdapt);
      const wrapped = `
        (function() {
          ${adapted}
          var _fn = ${cmdName || 'meuComando'};
          return async function caseRun(ctx) {
            var { m, sock, msg, ctx: ctxObj, text, args, prefix, command, isOwner, config, reply, react, q, from, info, quoted } = ctx;
            return _fn(sock, msg, text, args, ctxObj, config);
          };
        })()
      `;
      return eval(wrapped);
    }

    case FORMAT.RAW_CODE:
    default: {
      // Código solto → envolve no wrapper
      const adapted = adaptCaseCode(codeForAdapt);
      const wrapped = `
        (async function caseRun({ m, sock, msg, ctx, text, args, prefix, command, isOwner, config, reply, react, q, from, info, quoted }) {
          var axios = require('./caseAxios').createCaseAxios();
          var systemZR = sock;
          var conn = sock;
          var lofi = sock;
          var client = sock;
          ${adapted}
        })
      `;
      return eval(wrapped);
    }
  }
}

// ─────────────────────────────────────────────────────
// REGISTAR UM CASE
// ─────────────────────────────────────────────────────
function registerCase(commands, handler, sourceOrOpts = null) {
  const onlyIfNew = sourceOrOpts === true || (typeof sourceOrOpts === 'object' && sourceOrOpts?.onlyIfNew);
  const source = typeof sourceOrOpts === 'string' ? sourceOrOpts : null;
  const meta = typeof sourceOrOpts === 'object' ? sourceOrOpts : null;
  const list = Array.isArray(commands) ? commands : [commands];
  for (const cmd of list) {
    const key = String(cmd).toLowerCase().trim();
    if (onlyIfNew && CASES.has(key)) continue;
    CASES.set(key, handler);
    if (source) CASES_SOURCE.set(key, source);
    if (meta) CASES_META.set(key, meta);
  }
}

// ─────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────
// EXTRAIR SOURCE DE CADA registerCase() DUM FICHEIRO
// ─────────────────────────────────────────────────────
function extractSourceFromFile(filePath, fileName) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const results = [];
    const regex = /registerCase\s*\(\s*(\[[^\]]+\]|["'`][^"'`]+["'`])\s*,\s*((?:async\s+)?(?:function|\([^)]*\)\s*=>|\w+))/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const cmdsRaw = match[1].trim();
      const startPos = match.index;
      let cmds = [];
      try {
        if (cmdsRaw.startsWith("[")) cmds = JSON.parse(cmdsRaw.replace(/'/g, "\""));
        else cmds = [cmdsRaw.replace(/["']/g, "")];
      } catch { cmds = [cmdsRaw]; }
      let depth = 0, started = false, endPos = startPos;
      for (let j = startPos; j < Math.min(content.length, startPos + 50000); j++) {
        if (content[j] === "(") { depth++; started = true; }
        if (content[j] === ")") { depth--; }
        if (started && depth === 0) { endPos = j + 1; break; }
      }
      let blockCode = content.slice(startPos, endPos);
      let handlerCode = blockCode
        .replace(/^registerCase\s*\(\s*(?:\[[^\]]+\]|["'`][^"'`]+["'`])\s*,\s*/, "")
        .replace(/\s*,\s*(?:true|false|\{[^}]*\})\s*\)\s*;?\s*$/, "")
        .replace(/\)\s*;?\s*$/, "")
        .trim();
      const beforeMatch = content.slice(0, startPos);
      const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;
      results.push({ commands: cmds, code: handlerCode, fullBlock: blockCode, file: fileName, line: lineNum });
    }
    return results;
  } catch (e) {
    console.warn("[Cases] extractSourceFromFile " + fileName + ":", (e.message || "").slice(0, 80));
    return [];
  }
}

// CARREGAR FICHEIROS src/bot/cases/
// ─────────────────────────────────────────────────────
function loadCases() {
  const dir = path.join(__dirname, 'cases');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
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
  // Populate source registries
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const sources = extractSourceFromFile(fullPath, file);
      for (const src of sources) {
        for (const cmd of src.commands) {
          const key = cmd.toLowerCase().trim();
          FILE_SOURCES.set(key, { file, code: src.code, fullBlock: src.fullBlock, line: src.line, aliases: src.commands });
          COMMAND_REGISTRY.set(key, { aliases: src.commands, file, source: "case_file" });
        }
      }
    } catch {}
  }
  console.log(`[Cases] ${CASES.size} cases carregados | ${FILE_SOURCES.size} fontes extraídas`);
}

// ─────────────────────────────────────────────────────
// CASES DINÂMICOS (DB)
// ─────────────────────────────────────────────────────
let _dynamicLoaded = false;

async function loadDynamicCases() {
  try {
    const stored = await BotConfig.get('dynamic_cases_v2', {}).catch(() => ({}));
    if (!stored || typeof stored !== 'object') return;
    for (const [cmd, entry] of Object.entries(stored)) {
      // Cases do dono ganham aos nativos — é o ponto do addcase.
      const source = typeof entry === 'string' ? entry : entry.code || entry;
      const format = entry?.format || detectFormat(source);
      try {
        // Instala dependências automaticamente
        const missing = ensureDeps(source);
        if (missing.length) installMissingDeps(missing);

        const fn = compileCase(source, cmd);
        registerCase(cmd, fn, { source, format, dynamic: true });
      } catch (e) {
        // Case com erro → regista como resposta de texto
        const txt = String(source);
        registerCase(cmd, async ({ m }) => m.reply(txt), { source: txt, format: 'fallback', error: e.message });
      }
    }
  } catch {}
  _dynamicLoaded = true;
}

async function addDynamicCase(command, code) {
  const format = detectFormat(code);
  const stored = await BotConfig.get('dynamic_cases_v2', {}).catch(() => ({}));
  stored[command] = {
    code,
    format,
    addedAt: new Date().toISOString(),
    version: 7,
  };
  await BotConfig.set('dynamic_cases_v2', stored);

  // Instala dependências automaticamente
  const missing = ensureDeps(code);
  if (missing.length) installMissingDeps(missing);

  try {
    const fn = compileCase(code, command);
    registerCase(command, fn, { source: code, format, dynamic: true });
    return { ok: true, format, deps: missing };
  } catch (e) {
    registerCase(command, async ({ m }) => m.reply(code), { source: code, format: 'fallback', error: e.message });
    return { ok: false, format, error: e.message, deps: missing };
  }
}

async function delDynamicCase(command) {
  const stored = await BotConfig.get('dynamic_cases_v2', {}).catch(() => ({}));
  delete stored[command];
  await BotConfig.set('dynamic_cases_v2', stored);
  CASES.delete(command);
  CASES_SOURCE.delete(command);
  CASES_META.delete(command);
  // Se o case tapava um nativo (ex: pin), o nativo volta.
  try { loadCases(); } catch {}
  _dynamicLoaded = false;
  await loadDynamicCases();
}

async function listDynamicCases() {
  const stored = await BotConfig.get('dynamic_cases_v2', {}).catch(() => ({}));
  return Object.entries(stored).map(([cmd, entry]) => ({
    cmd,
    format: entry?.format || 'unknown',
    addedAt: entry?.addedAt || '?',
    version: entry?.version || 1,
    preview: (entry?.code || String(entry)).slice(0, 50),
  }));
}

async function getDynamicCaseSource(command) {
  const stored = await BotConfig.get('dynamic_cases_v2', {}).catch(() => ({}));
  const entry = stored[command];
  if (!entry) return null;
  return entry?.code || String(entry);
}

// ─────────────────────────────────────────────────────
// VALIDAÇÃO DE SINTAXE — testa sem executar
// ─────────────────────────────────────────────────────
function validateCase(code, cmdName) {
  const result = {
    valid: false,
    format: detectFormat(code),
    errors: [],
    warnings: [],
    deps: [],
  };

  try {
    // 1. Detecta dependências
    result.deps = ensureDeps(code);

    // 2. Tenta compilar
    const fn = compileCase(code, cmdName || 'test_cmd');

    // 3. Verifica se é função
    if (typeof fn !== 'function') {
      result.errors.push('Código não resultou numa função executável');
      return result;
    }

    // 4. Verificações de segurança
    const dangerous = ['process.exit', 'process.kill', 'rm -rf', 'rm -r /',
                       'eval(', 'Function(', '__dirname + \'/../..\'',
                       'child_process.execSync', '.execSync('];
    for (const d of dangerous) {
      if (code.includes(d)) {
        result.warnings.push(`⚠️ Código contém padrão perigoso: ${d}`);
      }
    }

    result.valid = true;
  } catch (e) {
    result.errors.push(e.message?.slice(0, 200));
  }

  return result;
}

// ─────────────────────────────────────────────────────
// EXECUTAR UM CASE
// ─────────────────────────────────────────────────────
async function runCase(command, rawCtx) {
  if (!_dynamicLoaded) await loadDynamicCases();

  const cmd = String(command || '').toLowerCase().trim();
  const handler = CASES.get(cmd);
  if (!handler) return false;

  const { msg, ctx, args, text, prefix, isOwner, config } = rawCtx;
  const sock = wrapSockForCases(rawCtx.sock, msg);
  const { m, quoted } = buildM(sock, msg, ctx);

  // isAdmin lazy
  const isAdminFn = async () => {
    if (ctx.isOwner) return true;
    if (!ctx.isGroup) return false;
    try {
      const meta = ctx.groupMeta || await sock.groupMetadata(ctx.remoteJid);
      const snum = ctx.senderNumber;
      return meta.participants?.some(p =>
        p.id.split('@')[0].replace(/\D/g, '') === snum &&
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
    const r = await handler(caseCtx);
    return r !== false;
  } catch (e) {
    console.error(`[Case:${cmd}]`, e.message?.slice(0, 100));
    try { await m.reply(`❌ Erro no case *${cmd}*:\n${e.message?.slice(0, 200)}`); } catch {}
    return true;
  }
}

// ─────────────────────────────────────────────────────
// EXTRAIR CÓDIGO DO CASE
// ─────────────────────────────────────────────────────
function decodeHtmlEntities(s) {
  return String(s || '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripCodeFences(s) {
  let c = String(s || '').trim();
  if (/^```/.test(c)) {
    c = c.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return c.trim();
}

/**
 * Corpo entre { } com strings, template `${}` e comentários.
 * O extractor antigo fazia replace no PRIMEIRO `}` isolado —
 * comia o fecho do if e o case rebentava com Unexpected token '}'.
 */
function extractBalancedBlock(src) {
  if (!src || src[0] !== '{') return null;
  let mode = 'code';
  const braces = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    const nx = src[i + 1];
    if (mode === 'line') { if (ch === '\n') mode = 'code'; i++; continue; }
    if (mode === 'block') {
      if (ch === '*' && nx === '/') { mode = 'code'; i += 2; continue; }
      i++; continue;
    }
    if (mode === 's') {
      if (ch === '\\') { i += 2; continue; }
      if (ch === "'") mode = 'code';
      i++; continue;
    }
    if (mode === 'd') {
      if (ch === '\\') { i += 2; continue; }
      if (ch === '"') mode = 'code';
      i++; continue;
    }
    if (mode === 't') {
      if (ch === '\\') { i += 2; continue; }
      if (ch === '`') { mode = 'code'; i++; continue; }
      if (ch === '$' && nx === '{') { braces.push('interp'); mode = 'code'; i += 2; continue; }
      i++; continue;
    }
    if (ch === '/' && nx === '/') { mode = 'line'; i += 2; continue; }
    if (ch === '/' && nx === '*') { mode = 'block'; i += 2; continue; }
    if (ch === "'") { mode = 's'; i++; continue; }
    if (ch === '"') { mode = 'd'; i++; continue; }
    if (ch === '`') { mode = 't'; i++; continue; }
    if (ch === '{') { braces.push('block'); i++; continue; }
    if (ch === '}') {
      const kind = braces.pop();
      if (kind === 'interp') mode = 't';
      if (braces.length === 0) return src.slice(1, i);
      i++; continue;
    }
    i++;
  }
  return null;
}

function extractCaseCode(rawText) {
  let code = stripCodeFences(decodeHtmlEntities(String(rawText || '').trim()));
  code = code.replace(/^---\s*/m, '').trim();

  const head = code.match(/^case\s+['"`][^'"`]+['"`]\s*:/i);
  if (head) {
    let rest = code.slice(head[0].length).replace(/^\s*/, '');
    if (rest.startsWith('{')) {
      const body = extractBalancedBlock(rest);
      if (body != null) {
        return body.replace(/\bbreak\s*;?\s*$/i, '').trim();
      }
    }
    return rest.replace(/\bbreak\s*;?\s*$/i, '').trim();
  }

  return code.replace(/\bbreak\s*;?\s*$/i, '').trim();
}

function wrapSockForCases(sock, msg) {
  if (!sock || typeof sock.sendMessage !== 'function') return sock;
  const orig = sock.sendMessage.bind(sock);
  return new Proxy(sock, {
    get(target, prop) {
      if (prop === 'sendMessage') {
        return (jid, content, opts = {}) => {
          let o = opts || {};
          if (o.quoted && o.quoted.key && !o.quoted.message && msg) {
            o = { ...o, quoted: msg };
          }
          return orig(jid, content, o);
        };
      }
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    },
  });
}

// ─────────────────────────────────────────────────────
// CASES DE GESTÃO
// ─────────────────────────────────────────────────────
function registerManagementCases() {

  // ── !addcase <cmd> [código] — ULTRA DINÂMICO ─────────────────
  registerCase(['addcase', 'addcmd', 'newcase'], async ({ m, sock, ctx, msg, args, text, isOwner, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono pode adicionar cases.');

    const cmdName = args[0]?.toLowerCase().trim();
    if (!cmdName) return m.reply(
      `❌ *Como adicionar um case:*\n\n` +
      `*Formatos suportados:*\n` +
      `1️⃣ Switch/case de outros bots\n` +
      `2️⃣ module.exports com execute()\n` +
      `3️⃣ Função solta\n` +
      `4️⃣ Código JS puro\n` +
      `5️⃣ Texto simples\n\n` +
      `*Uso:* ${prefix}addcase <nome> <código>\n` +
      `Ou cola o código numa mensagem e responde com:\n` +
      `${prefix}addcase <nome>`
    );

    // Obtém o código: pode vir na mesma mensagem ou na mensagem citada
    let code = args.slice(1).join(' ').trim();

    // Se há um --- separador, o código vem depois
    if (text.includes('\n---\n') || text.includes('\n---')) {
      const parts = text.replace(/^[^\n]+\n/, '').split(/^---\s*$/m);
      code = parts.slice(-1)[0]?.trim() || code;
    }

    // Citação: texto, bloco ```, ou documento .js/.txt
    if (!code && m.quoted) {
      code = (m.quoted.text || '').trim();
      if (!code && m.quoted.isDoc) {
        try {
          const { downloadMediaMessage } = require('@systemzero/baileys');
          const buf = await downloadMediaMessage(m.quoted.msg, 'buffer', {});
          if (buf && buf.length) code = buf.toString('utf8').trim();
        } catch (e) {
          console.warn('[addcase] quoted doc:', e.message?.slice(0, 80));
        }
      }
    }

    if (code) {
      code = stripCodeFences(decodeHtmlEntities(code));
    }

    if (!code) return m.reply(
      `❌ Falta o código!\n\n` +
      `Envia: *${prefix}addcase ${cmdName}*\n` +
      `e o código abaixo de --- ou responde a uma mensagem com o código`
    );

    // O nome é SEMPRE o que o dono escreveu (!addcase pinmp4 → pinmp4).
    // Antes, se o código era `case 'pin':` e só havia um argumento,
    // gravava como `pin` e tapava o comando nativo. Foi isso que
    // rebentou o @pin com o case colado.
    const finalName = cmdName;

    // Sempre passa pelo extractor: tira case/break, entidades HTML, fences.
    const cleanCode = extractCaseCode(code);

    // Mostra progresso
    await m.react('⏳');

    // Validação de sintaxe
    const validation = validateCase(cleanCode, finalName);

    if (!validation.valid) {
      await m.react('❌');
      return m.reply(
        `❌ *Erro de compilação:*\n\n` +
        `${validation.errors.join('\n')}\n\n` +
        `📝 *Formato detectado:* ${validation.format}\n` +
        `💡 Verifica a sintaxe e tenta novamente.`
      );
    }

    // Instala dependências em falta
    if (validation.deps.length > 0) {
      await m.reply(`📦 Instalando dependências: ${validation.deps.join(', ')}...`);
      installMissingDeps(validation.deps);
    }

    // Salva
    const result = await addDynamicCase(finalName, cleanCode);

    if (result.ok) {
      await m.react('✅');
      await m.reply(
        `✅ *Case adicionado com sucesso!*\n\n` +
        `📌 Comando: *${prefix}${finalName}*\n` +
        `📄 Formato: ${result.format}\n` +
        `📝 Linhas: ${cleanCode.split('\n').length}\n` +
        (result.deps.length ? `📦 Deps instaladas: ${result.deps.join(', ')}\n` : '') +
        `\n🧪 Testa com *${prefix}${finalName}*`
      );
    } else {
      await m.react('⚠️');
      await m.reply(
        `⚠️ *Case guardado com aviso:*\n${result.error}\n\n` +
        `📝 Formato: ${result.format}\n` +
        `Usa *${prefix}downcase ${finalName}* para ver o código.`
      );
    }
  });

  // ── !testcase <cmd> — testa compilação ───────────────────────
  registerCase(['testcase', 'testcasecode', 'validarcase'], async ({ m, args, isOwner, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono.');
    const cmd = (args[0] || '').toLowerCase().trim();
    if (!cmd) return m.reply(`❌ Uso: *${prefix}testcase* <comando>`);

    const src = await getDynamicCaseSource(cmd);
    if (!src) return m.reply(`❌ Case *${prefix}${cmd}* não encontrado.`);

    await m.react('🧪');
    const result = validateCase(src, cmd);

    let msg = `🧪 *Teste do case: ${prefix}${cmd}*\n\n`;
    msg += `📝 Formato: \`${result.format}\`\n`;
    msg += `✅ Válido: ${result.valid ? 'SIM' : 'NÃO'}\n`;

    if (result.deps.length) msg += `📦 Deps: ${result.deps.join(', ')}\n`;
    if (result.errors.length) msg += `\n❌ *Erros:*\n${result.errors.map(e => `  • ${e}`).join('\n')}\n`;
    if (result.warnings.length) msg += `\n⚠️ *Avisos:*\n${result.warnings.map(w => `  • ${w}`).join('\n')}\n`;

    if (result.valid) {
      msg += `\n✅ Tudo OK!`;
    }

    await m.reply(msg);
  });

  // ── !removicase / !delcase <cmd> ────────────────────────
  registerCase(['removicase', 'delcase', 'delcmd', 'remcase', 'removecase'], async ({ m, args, isOwner, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono pode remover cases.');
    const cmd = (args[0] || '').toLowerCase().trim();
    if (!cmd) return m.reply(`❌ Uso: *${prefix}removicase* <comando>`);

    const src = await getDynamicCaseSource(cmd);
    if (!src) return m.reply(`❌ Case *${prefix}${cmd}* não encontrado nos cases dinâmicos.`);

    await delDynamicCase(cmd);
    m.reply(`✅ Case *${prefix}${cmd}* removido com sucesso.`);
  });


  // ── !downcase <cmd> — GERADOR UNIVERSAL DE CÓDIGO ──────────────
  registerCase(['downcase', 'getcasecode', 'viewcase', 'showcase', 'vercode'], async ({ m, sock, msg, ctx, args, isOwner, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono.');
    const cmd = (args[0] || '').toLowerCase().trim();
    if (!cmd) return m.reply('Uso: *' + prefix + 'downcase* <comando>');

    await m.react('🔍');

    // ═══ 1. CASES DINÂMICOS (DB) ═══
    const dynSrc = await getDynamicCaseSource(cmd);
    if (dynSrc) {
      const meta = CASES_META.get(cmd) || {};
      const fullCode = "case '" + cmd + "': {\n" + dynSrc + "\nbreak;\n}";
      await sock.sendMessage(ctx.remoteJid, {
        document: Buffer.from(fullCode, 'utf8'),
        fileName: cmd + '_dynamic.js',
        mimetype: 'application/javascript',
        caption: '📄 *' + prefix + cmd + '* — Case Dinâmico\n📝 Formato: ' + (meta.format || detectFormat(dynSrc)) + '\n📊 Linhas: ' + fullCode.split('\n').length,
      }, { quoted: msg });
      await m.react('✅');
      return;
    }

    // ═══ 2. FICHEIRO DE CASES (source registry) ═══
    const fileSrc = FILE_SOURCES.get(cmd);
    if (fileSrc) {
      const aliases = fileSrc.aliases.filter(a => a !== cmd);
      const aliasLine = aliases.length ? '\n📎 Aliases: ' + aliases.map(a => prefix + a).join(', ') : '';
      const fileCode = fileSrc.fullBlock || fileSrc.code;
      await sock.sendMessage(ctx.remoteJid, {
        document: Buffer.from(fileCode, 'utf8'),
        fileName: cmd + '_' + fileSrc.file,
        mimetype: 'application/javascript',
        caption: '📄 *' + prefix + cmd + '* — Case File\n📁 Ficheiro: ' + fileSrc.file + ':' + fileSrc.line + '\n📊 Linhas: ' + fileCode.split('\n').length + aliasLine,
      }, { quoted: msg });
      await m.react('✅');
      return;
    }

    // ═══ 3. COMANDOS NATIVOS ═══
    try {
      const nc = require('./nativeCommands');
      if (nc[cmd] && typeof nc[cmd] === 'function') {
        const fnStr = nc[cmd].toString();
        await sock.sendMessage(ctx.remoteJid, {
          document: Buffer.from(fnStr, 'utf8'),
          fileName: 'native_' + cmd + '.js',
          mimetype: 'application/javascript',
          caption: '📄 *' + prefix + cmd + '* — Comando Nativo\n📊 Tamanho: ' + fnStr.length + ' chars\n⚠️ Código interno — edita com cuidado.',
        }, { quoted: msg });
        await m.react('✅');
        return;
      }
    } catch {}

    // ═══ 4. PACOTES ═══
    const pkgPaths = { interactions: './packages/interactions', family: './packages/family', economy: './packages/economy', games: './packages/games', cheats: './packages/cheats' };
    for (const [pkgName, pkgPath] of Object.entries(pkgPaths)) {
      try {
        const pkg = require(pkgPath);
        if (pkg[cmd] && typeof pkg[cmd] === 'function') {
          const fnStr = pkg[cmd].toString();
          await sock.sendMessage(ctx.remoteJid, {
            document: Buffer.from(fnStr, 'utf8'),
            fileName: pkgName + '_' + cmd + '.js',
            mimetype: 'application/javascript',
            caption: '📄 *' + prefix + cmd + '* — Pacote: ' + pkgName + '\n📊 Tamanho: ' + fnStr.length + ' chars',
          }, { quoted: msg });
          await m.react('✅');
          return;
        }
      } catch {}
    }

    // ═══ 5. NÃO ENCONTRADO ═══
    if (CASES.has(cmd)) {
      m.reply('📄 *' + prefix + cmd + '* existe mas o código-fonte não está acessível.');
    } else {
      const allCmds = Array.from(CASES.keys());
      const similar = allCmds.filter(c => c.includes(cmd) || cmd.includes(c)).slice(0, 5);
      const sug = similar.length ? '\n\n💡 *Comandos parecidos:*\n' + similar.map(c => '  • ' + prefix + c).join('\n') : '';
      m.reply('❌ Comando *' + prefix + cmd + '* não encontrado.' + sug);
    }
  });

  // ── !auditcmds — AUDITORIA DE COMANDOS ──────────────────────────
  registerCase(['auditcmds', 'audit', 'verificarcmds', 'cmdcheck'], async ({ m, sock, msg, ctx, isOwner, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono.');

    await m.react('🔍');

    // Duplicados
    const duplicates = [];
    const cmdSources = new Map();
    for (const [c, meta] of COMMAND_REGISTRY.entries()) {
      if (!cmdSources.has(c)) cmdSources.set(c, []);
      cmdSources.get(c).push(meta.file);
    }
    for (const [c, files] of cmdSources.entries()) {
      const unique = [...new Set(files)];
      if (unique.length > 1) duplicates.push({ cmd: c, files: unique });
    }

    // Aliases excessivos
    const tooManyAliases = [];
    const seen = new Set();
    for (const [c, src] of FILE_SOURCES.entries()) {
      if (seen.has(c)) continue;
      for (const a of src.aliases) seen.add(a);
      if (src.aliases.length > 2) {
        tooManyAliases.push({ cmd: src.aliases[0], aliases: src.aliases, file: src.file, count: src.aliases.length });
      }
    }

    // Contagens
    let nativeCount = 0, pkgCount = 0;
    try { nativeCount = Object.keys(require('./nativeCommands')).filter(k => typeof require('./nativeCommands')[k] === 'function').length; } catch {}
    for (const p of ['interactions', 'family', 'economy', 'games', 'cheats']) {
      try { pkgCount += Object.keys(require('./packages/' + p)).filter(k => typeof require('./packages/' + p)[k] === 'function').length; } catch {}
    }

    // Relatório
    let r = '🕸️ *AUDITORIA DE COMANDOS*\n\n';
    r += '📊 *Resumo:*\n';
    r += '  • Cases: ' + CASES.size + '\n';
    r += '  • Fontes: ' + FILE_SOURCES.size + '\n';
    r += '  • Nativos: ' + nativeCount + '\n';
    r += '  • Pacotes: ' + pkgCount + '\n';
    r += '  • Total: ' + (CASES.size + nativeCount + pkgCount) + '\n\n';

    if (duplicates.length) {
      r += '⚠️ *DUPLICADOS (' + duplicates.length + '):*\n';
      for (const d of duplicates.slice(0, 15)) r += '  🔁 *' + prefix + d.cmd + '* → ' + d.files.join(', ') + '\n';
      if (duplicates.length > 15) r += '  ... +' + (duplicates.length - 15) + '\n';
      r += '\n';
    } else {
      r += '✅ Sem duplicados\n\n';
    }

    if (tooManyAliases.length) {
      r += '📎 *ALIASES >2 (' + tooManyAliases.length + '):*\n';
      for (const a of tooManyAliases.slice(0, 15)) r += '  📌 *' + prefix + a.cmd + '* (' + a.count + '): ' + a.aliases.join(', ') + '\n  📁 ' + a.file + '\n';
      r += '\n';
    } else {
      r += '✅ Todos ≤2 aliases\n\n';
    }

    const fileCounts = {};
    for (const [, s] of FILE_SOURCES.entries()) fileCounts[s.file] = (fileCounts[s.file] || 0) + 1;
    const sorted = Object.entries(fileCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    r += '📁 *Top ficheiros:*\n';
    for (const [f, c] of sorted) r += '  • ' + f + ': ' + c + ' cmds\n';

    if (r.length > 3500) {
      await sock.sendMessage(ctx.remoteJid, { document: Buffer.from(r, 'utf8'), fileName: 'audit.txt', mimetype: 'text/plain', caption: '🕸️ Auditoria: ' + duplicates.length + ' dup, ' + tooManyAliases.length + ' aliases>' }, { quoted: msg });
    } else {
      await m.reply(r);
    }
    await m.react('✅');
  });


  // ── !listcases ──────────────────────────────────────────
  registerCase(['listcases', 'listcmds', 'mycases', 'listcase'], async ({ m, isOwner, prefix }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono pode ver os cases dinâmicos.');
    const list = await listDynamicCases();
    if (!list.length) return m.reply(
      `📭 *Sem cases dinâmicos.*\n\nAdiciona com:\n*${prefix}addcase <nome>*\ne o código abaixo`
    );

    const total = CASES.size;
    const lines = list.map((c, i) =>
      `  ⌬ *${prefix}${c.cmd}* [${c.format}] — _${c.preview}..._`
    ).join('\n');

    m.reply(
      `╔━᳀『 🕸️ CASES DINÂMICOS 』═᳀\n` +
      `\n  Total geral: *${total}* | Dinâmicos: *${list.length}*\n\n` +
      `${lines}\n\n` +
      `╚═━═━═━═━═━═━═━═᳀\n` +
      `> *${prefix}addcase* <cmd> + código\n` +
      `> *${prefix}testcase* <cmd> — testar compilação\n` +
      `> *${prefix}downcase* <cmd> — ver código\n` +
      `> *${prefix}removicase* <cmd> — remover`
    );
  });

  // ── !runcase <cmd> [args] ────────────────────────────────────
  registerCase(['runcase', 'execcase'], async ({ m, sock, msg, ctx, args, prefix, isOwner, config }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono pode executar cases directamente.');
    const cmd = (args[0] || '').toLowerCase().trim();
    if (!cmd) return m.reply(`❌ Uso: *${prefix}runcase* <comando> [args...]`);

    const caseArgs = args.slice(1);
    const caseText = caseArgs.join(' ');
    const rawCtx = { sock, msg, ctx, args: caseArgs, text: caseText, prefix, isOwner, config };
    const handled = await runCase(cmd, rawCtx);
    if (!handled) m.reply(`❌ Case *${prefix}${cmd}* não encontrado.`);
  });

  // ── !reloadcases ──────────────────────────────────────────
  registerCase(['reloadcases', 'recarregarcases', 'refreshcases'], async ({ m, isOwner }) => {
    if (!isOwner) return m.reply('🚫 Só o Dono.');
    const before = CASES.size;
    loadCases();
    await loadDynamicCases();
    m.reply(`✅ Cases recarregados!\nAntes: ${before} | Agora: ${CASES.size}`);
  });
}

// ─────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────
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
  validateCase,
  detectFormat,
  extractCommandName,
  ensureDeps,
  installMissingDeps,
  buildM,
  CASES,
  CASES_SOURCE,
  CASES_META,
  extractCaseCode,
  extractBalancedBlock,
  decodeHtmlEntities,
  stripCodeFences,
  compileCase,
  adaptCaseCode,
  FILE_SOURCES,
  COMMAND_REGISTRY,
  extractSourceFromFile,
  init,
  FORMAT,
};
