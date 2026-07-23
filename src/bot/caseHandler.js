/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   DARK BOT v5 — Case Handler Engine                    ║
 * ║   Sistema de cases estilo switch/case clássico          ║
 * ║   Suporta addcase, delcase, listcases dinâmicos         ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Como funciona:
 *  1. Cases são registados em src/bot/cases/*.js
 *  2. Cada ficheiro exporta um Map de { 'comando' => async fn }
 *  3. addcase() adiciona casos em runtime (pelo dono)
 *  4. O commandHandler tenta este engine ANTES dos nativeCommands
 *
 * Adicionar novo case em runtime (no WhatsApp):
 *   !addcase ping Pong! 🏓
 *   !addcase bemvindo Bem-vindo ao grupo! 👋
 *   !delcase bemvindo
 *   !listcases
 *
 * Criar ficheiro de case (programático):
 *   src/bot/cases/downloads.js  →  ver exemplo abaixo
 */

'use strict';

const BotConfig = require('../database/models/BotConfig');

// ─────────────────────────────────────────────
// REGISTRY — mapa principal de todos os cases
// ─────────────────────────────────────────────
/** @type {Map<string, (ctx: CaseContext) => Promise<any>>} */
const CASES = new Map();

/** Contexto passado a cada case handler */
/**
 * @typedef {Object} CaseContext
 * @property {object}   sock        — socket do Baileys
 * @property {object}   msg         — mensagem raw
 * @property {object}   ctx         — contexto processado
 * @property {string[]} args        — argumentos do comando
 * @property {string}   text        — texto completo após o comando
 * @property {string}   prefix      — prefixo activo
 * @property {string}   command     — nome do comando sem prefixo
 * @property {boolean}  isOwner
 * @property {boolean}  isAdmin
 * @property {object}   config      — configuração do bot
 * @property {Function} reply       — reply rápido
 * @property {Function} react       — reacção emoji
 */

// ─────────────────────────────────────────────
// REGISTO DE CASES
// ─────────────────────────────────────────────

/**
 * Regista um case handler.
 * @param {string|string[]} commands  — nome(s) do comando (sem prefixo)
 * @param {Function}        handler   — async (ctx) => void
 */
function registerCase(commands, handler) {
  const list = Array.isArray(commands) ? commands : [commands];
  for (const cmd of list) {
    CASES.set(String(cmd).toLowerCase().trim(), handler);
  }
}

/**
 * Carrega todos os ficheiros em src/bot/cases/
 */
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
        // exporta função que recebe registerCase
        mod(registerCase);
      } else if (mod instanceof Map) {
        mod.forEach((fn, cmd) => registerCase(cmd, fn));
      } else if (typeof mod === 'object') {
        Object.entries(mod).forEach(([cmd, fn]) => {
          if (typeof fn === 'function') registerCase(cmd, fn);
        });
      }
    } catch (e) {
      console.warn(`[Cases] Falha ao carregar ${file}:`, e.message);
    }
  }
  console.log(`[Cases] ${CASES.size} cases carregados`);
}

// ─────────────────────────────────────────────
// CASES DINÂMICOS (em runtime, guardados no DB)
// ─────────────────────────────────────────────
let _dynamicLoaded = false;

async function loadDynamicCases() {
  try {
    const stored = await BotConfig.get('dynamic_cases', {}).catch(() => ({}));
    if (!stored || typeof stored !== 'object') return;
    for (const [cmd, response] of Object.entries(stored)) {
      if (!CASES.has(cmd)) {
        // Case simples: responde com texto
        registerCase(cmd, async ({ reply, sock, msg, ctx }) => {
          return reply(response);
        });
      }
    }
  } catch {}
  _dynamicLoaded = true;
}

async function addDynamicCase(command, response) {
  const stored = await BotConfig.get('dynamic_cases', {}).catch(() => ({}));
  stored[command] = response;
  await BotConfig.set('dynamic_cases', stored);
  // Regista imediatamente no mapa
  registerCase(command, async ({ reply }) => reply(response));
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
/**
 * Tenta executar um case. Retorna true se executou, false se não existe.
 */
async function runCase(command, caseCtx) {
  // Garante que os cases dinâmicos foram carregados
  if (!_dynamicLoaded) await loadDynamicCases();

  const cmd = String(command || '').toLowerCase().trim();
  const handler = CASES.get(cmd);
  if (!handler) return false;

  try {
    await handler(caseCtx);
    return true;
  } catch (e) {
    console.error(`[Case:${cmd}]`, e.message);
    try { await caseCtx.reply(`❌ Erro no case ${cmd}.`); } catch {}
    return true; // consumiu o comando (mesmo com erro)
  }
}

// ─────────────────────────────────────────────
// CASES DE GESTÃO (addcase, delcase, listcases)
// ─────────────────────────────────────────────
function registerManagementCases() {
  // !addcase <comando> <resposta>
  registerCase(['addcase', 'addcmd'], async ({ args, text, isOwner, reply, prefix }) => {
    if (!isOwner) return reply('🚫 Só o Dono pode adicionar cases.');
    const [cmd, ...rest] = args;
    if (!cmd || !rest.length) return reply(`❌ Uso: *${prefix}addcase* <comando> <resposta>\nEx: *${prefix}addcase oi* Olá! 👋`);
    const command  = cmd.toLowerCase().trim();
    const response = rest.join(' ').trim();
    await addDynamicCase(command, response);
    return reply(`✅ Case *${prefix}${command}* adicionado!\nResposta: _${response}_`);
  });

  // !delcase <comando>
  registerCase(['delcase', 'delcmd', 'remcase'], async ({ args, isOwner, reply, prefix }) => {
    if (!isOwner) return reply('🚫 Só o Dono pode remover cases.');
    const cmd = (args[0] || '').toLowerCase().trim();
    if (!cmd) return reply(`❌ Uso: *${prefix}delcase* <comando>`);
    await delDynamicCase(cmd);
    return reply(`✅ Case *${prefix}${cmd}* removido.`);
  });

  // !listcases
  registerCase(['listcases', 'listcmds', 'mycases'], async ({ isOwner, reply, prefix }) => {
    if (!isOwner) return reply('🚫 Só o Dono pode ver os cases.');
    const list = await listDynamicCases();
    if (!list.length) return reply(`📭 Sem cases dinâmicos. Adiciona com *${prefix}addcase*.`);
    const formatted = list.map((c, i) => `${i + 1}. *${prefix}${c}*`).join('\n');
    return reply(
      `╭━━━〔 🕸️ CASES DINÂMICOS 〕━━━╮\n` +
      `┃ Total: *${list.length}*\n` +
      `┣━━━━━━━━━━━━━━━━━━━━━━\n` +
      formatted +
      `\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
      `• *${prefix}addcase* <cmd> <resposta> — adicionar\n` +
      `• *${prefix}delcase* <cmd> — remover`
    );
  });
}

// ─────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────
function init() {
  registerManagementCases();
  loadCases();
  loadDynamicCases().catch(() => {});
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
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
};
