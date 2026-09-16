'use strict';
// Domínios oficiais; os caminhos/legendas nunca concedem uma permissão.
const DEFAULT_ALLOWED = Object.freeze([
  'youtube.com', 'youtu.be', 'facebook.com', 'fb.com', 'fb.watch', 'fb.me',
  'kwai.com', 'kw.ai', 'threads.net', 'threads.com', 'spotify.com', 'spotify.link',
  'tiktok.com', 'twitter.com', 'x.com', 't.co', 'instagram.com', 'instagr.am',
]);
const PLATFORM_LABELS = 'YouTube, Facebook, Kwai, Threads, Spotify, TikTok, Twitter/X e Instagram';
// Um URL inteiro é uma unidade: nunca procurar youtube.com dentro de ?next=…
const LINK_RE = /(?:https?:\/\/|www\.)[^\s<>"`]+|(?<![\p{L}\p{N}_@.\-])(?:[\p{L}\p{N}](?:[\p{L}\p{N}\-]*[\p{L}\p{N}])?\.)+[\p{L}]{2,63}(?::\d{1,5})?(?:[/?#][^\s<>"`]*)?/giu;
function host(value) {
  try {
    const s = String(value || '').trim().replace(/[),;.!?\]}*]+$/, '');
    const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    return u.hostname.toLowerCase().replace(/\.$/, '');
  } catch { return ''; }
}
function allowedHost(value, domains) {
  const h = host(value);
  if (!h) return false;
  return domains.some(d => { const a = host(d); return !!a && (h === a || h.endsWith('.' + a)); });
}
function splitAdjacent(text) {
  return String(text || '').replace(/([,;|])(?=(?:https?:\/\/|www\.))/gi, '$1 ');
}
function links(text) { return splitAdjacent(text).match(LINK_RE) || []; }
function excludeAllowed(text, domains = DEFAULT_ALLOWED) {
  return splitAdjacent(text).replace(LINK_RE, url => allowedHost(url, domains) ? ' ' : url);
}
function allWhitelisted(text, domains = []) {
  if (!Array.isArray(domains) || !domains.length) return false;
  const found = links(text);
  return found.length > 0 && found.every(url => allowedHost(url, domains));
}
function notice({ sender, kind = 'link', deleted = false, deleteEnabled = true, warns = 1, maxWarns = 2, kickAttempted = false, removed = false, extraAllowed = false }) {
  const lines = [
    '🛡️ *DARK BOT · ESCUDO DE LINKS*', '',
    `@${sender}, detectei ${kind} fora das permissões deste grupo.`, '',
    `✅ *Permitidos:* ${PLATFORM_LABELS}.`,
  ];
  if (extraAllowed) lines.push('Também são aceites os domínios adicionais autorizados pela administração.');
  lines.push('', deleted ? '🗑️ *Mensagem apagada.*' : deleteEnabled ? '⚠️ Não consegui apagar a mensagem.' : 'ℹ️ A remoção de mensagens está desligada neste grupo.');
  if (kickAttempted) lines.push(removed ? '🚫 Participante removido conforme a regra do grupo.' : '⚠️ Não consegui remover o participante; a administração deve verificar.');
  else lines.push(`⚠️ *Aviso ${warns}/${maxWarns}.* Ao atingir o limite, a regra do grupo prevê remoção.`);
  lines.push('', 'Partilha conteúdo permitido e mantém a conversa aberta. 🌙');
  return lines.join('\n');
}
module.exports = { DEFAULT_ALLOWED, PLATFORM_LABELS, host, allowedHost, links, excludeAllowed, allWhitelisted, notice };
