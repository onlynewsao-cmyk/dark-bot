'use strict';
/**
 * v9.15 — CHANGE/não · janela de confirmação da troca de tema.
 *
 * Assim que um tema é aplicado (por `!change <nome>` OU pelo clique na
 * lista CHANGE_THEME_), o bot mostra um cartão curto com dois botões:
 *   🔁 CHANGE — «fica, é este»   (fecha a janela)
 *   ✖ NÃO     — «engano-me»      (reverte TUDO: global ou só o grupo)
 * A janela dura 3 minutos; quem não responde fica com o tema novo na
 * mesma (silêncio = aceite). Só quem pediu (ou o Dono) pode reverter.
 */
const TTL_MS = 3 * 60 * 1000;
const PENDENTES = new Map(); // jid → { prev, prevStyle, grupo, tema, by, until }

function _limparExpirados(jid) {
  const p = PENDENTES.get(jid);
  if (p && p.until < Date.now()) { PENDENTES.delete(jid); return null; }
  return p || null;
}

/**
 * Aplica + pede confirmação. `opts` vem de quem aplicou o tema:
 *   prev/prevStyle — estado ANTES da troca (null = era o default)
 *   grupo          — true = mexeu só em GroupSettings (ADM)
 *   by             — número de quem aplicou (só ele/dono pode reverter)
 */
async function pedirConfirmacao(sock, jid, quoted, { prev = null, prevStyle = null, grupo = false, tema, by = '', who = '' } = {}) {
  PENDENTES.set(jid, { prev, prevStyle, grupo, tema: tema.name, by: String(by || who || ''), until: Date.now() + TTL_MS });
  const corpo =
    `${tema.icon} ─ ⋆⋅ ${tema.accent} ⋅⋆ ─ ${tema.icon}\n` +
    `${grupo ? '📌 Tema do GRUPO' : '🌐 Tema GLOBAL'} → *${tema.name.toUpperCase()}*\n` +
    `${tema.bullet} ${tema.tip}\n` +
    `🕒 3 min para decidir — sem resposta fica este.`;
  const bh = require('./buttonHandler');
  try {
    await bh.sendInteractive(sock, jid, corpo, `${tema.icon} ${tema.vibe.slice(0, 40)}`, [
      { text: '🔁 CHANGE', id: '!change sim' },
      { text: '✖ NÃO', id: '!change nao' },
    ], quoted);
    return;
  } catch {}
  await sock.sendMessage(jid, { text: `${corpo}\n\nResponde \`!change sim\` (fica) ou \`!change nao\` (reverte).` }, { quoted }).catch(() => {});
}

/** Há janela aberta para este chat? */
function temPendente(jid) { return !!_limparExpirados(jid); }

/**
 * Fecha a janela. `who` = número de quem carrega; o Dono manda sempre.
 * @returns 'sem-janela' | 'negado' | 'mantido' | { reversao:{...} }
 */
async function resolver(jid, { who, isOwner, aceitar }) {
  const p = _limparExpirados(jid);
  if (!p) return 'sem-janela';
  if (!isOwner && p.by && String(who || '') !== p.by) return 'negado';
  if (aceitar) { PENDENTES.delete(jid); return 'mantido'; }
  PENDENTES.delete(jid);
  return { reversao: p };
}

module.exports = { pedirConfirmacao, resolver, temPendente, PENDENTES };
