'use strict';
/**
 * DARK BOT — CARTÃO DE PREFIXO (v7.72 + v8.5 TEMAS)
 *
 * Dizer "prefixo"/"prefixos" (a palavra sozinha, sem comando) mostra o
 * cartão com o prefixo actual + botão de copiar (cta_copy, com fallback
 * para texto). O comando !prefixo usa o mesmo cartão — uma só fonte.
 *
 * v8.5 — TEMAS: o cartão ganha arte (o activo lê-se de botConfigCache
 * 'prefix_theme'; o dono muda com `!prefixotema <tema>`):
 *   · 🕷️ darktoxic  — tema da casa: veneno violeta + neón tóxico (DEFEITO)
 *   · ⍟ classico   — o design original System Zero (v7.72)
 */

// A palavra SOZINHA (com ?/!/. opcionais). Não dispara em frases
// ("muda o prefixo" é ordem para a Aura) nem em comandos (!prefixo,
// setprefix) — esses têm o seu próprio caminho.
const RE_PREFIXO_WORD = /^\s*prefixos?\s*[?!.…]*\s*$/i;

const TEMAS = {
  darktoxic: {
    nome: 'DARKTOXIC 🕷️☣️',
    card(p, custom) {
      return [
        '☣️◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢☣️',
        '',
        '   ☠️ *DARKTOXIC* ☠️',
        '',
        `◈ Prefixo actual: *${p}*`,
        (custom ? '◈ Customizado neste grupo ☢️' : null),
        '',
        '◈ Cópia num toque — veneno incluído 🕷️',
        '',
        '☣️◤◢◤◢◤◢◤◢◤◢◤◢◤◢◢☣️',
        '',
        'DARK BOT 🕸️',
      ].filter((l) => l !== null).join('\n');
    },
    display(p) { return `☢️ copiar prefixo 『 ${p} 』`; },
  },
  classico: {
    nome: 'CLÁSSICO ⍟',
    card(p, custom) {
      return '┏⍟ 『 PREFIXO DO BOT 』 =⍟\n' +
        `◉ Prefixo atual: ${p}\n` +
        (custom ? '◉ Customizado neste grupo\n' : '') +
        '┗━━━━━━━━━━━━━━━⍟\n' +
        'clique no botão abaixo para copiar';
    },
    display(p) { return `copiar prefixo 『 ${p} 〕`; },
  },
};

function temaActivo(nome) { return TEMAS[String(nome || '').toLowerCase()] || TEMAS.darktoxic; }

function buildPrefixCard({ prefix = '!', custom = false, tema = 'darktoxic' } = {}) {
  const p = String(prefix || '!');
  const t = temaActivo(tema);
  return {
    text: t.card(p, custom),
    displayText: t.display(p),
    copyCode: p,
    tema: t.nome,
  };
}

/** True se o grupo tem prefixo próprio (groupPrefix na base). */
async function isCustomGroupPrefix(msg, groupJid, loadGroup = null) {
  try {
    const load = loadGroup || require('./hotCache').getGroupDoc;
    const g = await load(msg, groupJid).catch(() => null);
    return !!(g && g.groupPrefix);
  } catch { return false; }
}

async function sendPrefixCard(sock, jid, opts = {}, quoted = null) {
  let tema = opts.tema;
  if (!tema) {
    try { tema = await require('./botConfigCache').get('prefix_theme', 'darktoxic'); } catch { tema = 'darktoxic'; }
  }
  const c = buildPrefixCard({ ...opts, tema });
  const bh = require('./buttonHandler');
  return bh.sendCopyButton(sock, jid, c.text, c.displayText, c.copyCode, quoted);
}

module.exports = { RE_PREFIXO_WORD, TEMAS, temaActivo, buildPrefixCard, isCustomGroupPrefix, sendPrefixCard };
