'use strict';
/**
 * DARK BOT — CARTÃO DE PREFIXO (v7.72 + v8.5 TEMAS + v9.15 SUPER-CURTO)
 *
 * Dizer "prefixo"/"prefixos" (a palavra sozinha, sem comando) mostra o
 * cartão com o prefixo actual. O comando !prefixo usa o mesmo cartão.
 *
 * v9.15 — DUAS MUDANÇAS ENORMES PEDIDAS PELO DONO:
 *   1. O cartão passou a ser MUITO CURTO (máx. 4 linhas — desenhado para
 *      ser lido num estalar de dedos e copiar à pressão).
 *   2. TRANSPORTE 100% COMPATÍVEL: acabou o `viewOnce + native_flow`
 *      (cta_copy) — nos clientes mais antigos/mods a mensagem «não
 *      abria» (incompatível). Agora sai TEXTO PURO: abre em QUALQUER
 *      WhatsApp, Android, iOS, GB, mods, Business, há 5 anos ou hoje.
 *   3. Novos TEMAS (o cliente troca com !prefixotema <nome>): além de
 *      🕷️ darktoxic e ⍟ classico — 𓂀 egipcio, 𒀭 sumerio, ⛧ oculto,
 *      🌸 floral, シ kawai e ▓▒░ neon. Cada um com texto próprio,
 *      sem repetir uma única palavra entre temas.
 */

// A palavra SOZINHA (com ?/!/. opcionais). Não dispara em frases
// ("muda o prefixo" é ordem para a Aura) nem em comandos (!prefixo,
// setprefix) — esses têm o seu próprio caminho.
const RE_PREFIXO_WORD = /^\s*prefixos?\s*[?!.…]*\s*$/i;

const RODAPE = 'DARK BOT 🕸️';

const TEMAS = {
  darktoxic: {
    nome: 'DARKTOXIC 🕷️☣️',
    card(p, custom) {
      return [
        '☣️◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢☣️',
        `☠️ Prefixo: *${p}*${custom ? ' · grupo ☢️' : ''}`,
        '☣️◤◢◤◢◤◢◤◢◤◢◤◢◤◢◢☣️',
        RODAPE,
      ].join('\n');
    },
    display(p) { return `☣️ segura e copia 『 ${p} 』`; },
  },
  classico: {
    nome: 'CLÁSSICO ⍟',
    card(p, custom) {
      return [
        '┏⍟ 『 PREFIXO 』 ⍟┓',
        `◉ Actual: *${p}*${custom ? ' (do grupo)' : ''}`,
        '┗⍟━━━━━━━『 COPIA AÍ 』⍟┛',
        RODAPE,
      ].join('\n');
    },
    display(p) { return `copiar 『 ${p} 〕`; },
  },
  egipcio: {
    nome: 'EGÍPCIO 𓂀',
    card(p, custom) {
      return [
        '𓉼𓂋 𓆣 𓁹𓋹 Prefixo 𓋹𓁹 𓆣 𓂋𓉽',
        `𓀭 *${p}* 𓀭${custom ? ' 𓉐 selo do grupo 𓉐' : ''}`,
        '𓅃 segura → copia → vive eterno 𓅃',
        RODAPE,
      ].join('\n');
    },
    display(p) { return `𓂀 papiro do 『 ${p} 』`; },
  },
  sumerio: {
    nome: 'SUMÉRIO 𒀭',
    card(p, custom) {
      return [
        '𒁹𒁹𒂗𒈙 𒀭 TÁBUA 𒀭 𒈙𒂗𒁹𒁹',
        `𒁹 Prefixo gravado em argila: *${p}*${custom ? ' 𒌷·grupo' : ''}`,
        '𒄩 cuneiforme não se apaga 𒄩',
        RODAPE,
      ].join('\n');
    },
    display(p) { return `𒀭 tabela de 『 ${p} 』`; },
  },
  oculto: {
    nome: 'OCULTO ⛧',
    card(p, custom) {
      return [
        '⛧ ♆ ⸸ 〃 sigilo 〃 ⸸ ♆ ⛧',
        `⛧ O símbolo que invoca tudo: *${p}*${custom ? ' · círculo próprio ⭕' : ''}`,
        '۝ segura o selo e ele copia-se ۝',
        RODAPE,
      ].join('\n');
    },
    display(p) { return `⛧ selo 『 ${p} 』`; },
  },
  floral: {
    nome: 'FLORAL 🌸',
    card(p, custom) {
      return [
        '❀ꦿ⸼ 🌸⃟ petálas do prefixo ⃟🌸 ⸼ꦿ❀',
        `🌷 Usa-se assim: *${p}*${custom ? ' · podado neste jardim 🌱' : ''}`,
        '🍃 segura na flor → copia o néctar 🍃',
        RODAPE,
      ].join('\n');
    },
    display(p) { return `🌸 ramo de 『 ${p} 』`; },
  },
  kawai: {
    nome: 'KAWAI シ',
    card(p, custom) {
      return [
        '▓▒░ シ P R E F I X O 〆 ░▒▓',
        `ヅ *${p}* ヅ${custom ? ' 〔grupo限定〕' : ''}`,
        'ｷｬ〜 segura e copia sem medo ｷｬ〜',
        RODAPE,
      ].join('\n');
    },
    display(p) { return `シ カード 『 ${p} 』`; },
  },
  neon: {
    nome: 'NEON ▓▒░',
    card(p, custom) {
      return [
        '▛▀▜ ⚡ S O L T A   A   C O R R E N T E ⚡ ▟▙',
        `▌ Prefixo ligado à rede: *${p}*${custom ? ' · voltagem do grupo ⚡' : ''}`,
        '▙▄▟ segura → 1000V de cópia ▛▄▜',
        RODAPE,
      ].join('\n');
    },
    display(p) { return `⚡ alta tensão 『 ${p} 』`; },
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

/**
 * v9.15 — ENVIO TEXTO PURO. Zero interactiveMessage, zero native_flow,
 * zero viewOnce: abre e copia-se em QUALQUER cliente WhatsApp.
 * A linha final com o prefixo entre crases é o «botão de copiar»
 * universal (segura → copiar) — sem dependência de versões.
 */
async function sendPrefixCard(sock, jid, opts = {}, quoted = null) {
  let tema = opts.tema;
  if (!tema) {
    try { tema = await require('./botConfigCache').get('prefix_theme', 'darktoxic'); } catch { tema = 'darktoxic'; }
  }
  const c = buildPrefixCard({ ...opts, tema });
  const corpo = `${c.text}\n\`${c.copyCode}\``;
  return sock.sendMessage(jid, { text: corpo }, { quoted });
}

module.exports = { RE_PREFIXO_WORD, TEMAS, temaActivo, buildPrefixCard, isCustomGroupPrefix, sendPrefixCard };
