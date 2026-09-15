'use strict';
/**
 * DARK BOT — CARTÃO DE PREFIXO (v7.72, estilo System Zero)
 *
 * Dizer "prefixo"/"prefixos" (a palavra sozinha, sem comando) mostra o
 * cartão com o prefixo actual + botão de copiar (cta_copy, com fallback
 * para texto). O comando !prefixo usa o mesmo cartão — uma só fonte.
 */

// A palavra SOZINHA (com ?/!/. opcionais). Não dispara em frases
// ("muda o prefixo" é ordem para a Aura) nem em comandos (!prefixo,
// setprefix) — esses têm o seu próprio caminho.
const RE_PREFIXO_WORD = /^\s*prefixos?\s*[?!.…]*\s*$/i;

function buildPrefixCard({ prefix = '!', custom = false } = {}) {
  const p = String(prefix || '!');
  const text =
    '┏⍟ 『 PREFIXO DO BOT 』 =⍟\n' +
    `◉ Prefixo atual: ${p}\n` +
    (custom ? '◉ Customizado neste grupo\n' : '') +
    '┗━━━━━━━━━━━━━━━⍟\n' +
    'clique no botão abaixo para copiar';
  return { text, displayText: `copiar prefixo 『 ${p} 』`, copyCode: p };
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
  const c = buildPrefixCard(opts);
  const bh = require('./buttonHandler');
  return bh.sendCopyButton(sock, jid, c.text, c.displayText, c.copyCode, quoted);
}

module.exports = { RE_PREFIXO_WORD, buildPrefixCard, isCustomGroupPrefix, sendPrefixCard };
