'use strict';
// v7.85 — ESCUDO À MEDIDA: cada grupo escolhe que redes aceita (ou nenhuma),
// e se aceita convites de grupos/canais do WhatsApp. O aviso só mostra
// o que aquele grupo realmente permite.
const PLATFORMS = Object.freeze({
  youtube:   { doms: ['youtube.com', 'youtu.be'], short: 'yt' },
  facebook:  { doms: ['facebook.com', 'fb.com', 'fb.watch', 'fb.me'], short: 'fb' },
  kwai:      { doms: ['kwai.com', 'kw.ai'], short: 'kwai' },
  threads:   { doms: ['threads.net', 'threads.com'], short: 'threads' },
  spotify:   { doms: ['spotify.com', 'spotify.link'], short: 'spotify' },
  tiktok:    { doms: ['tiktok.com'], short: 'tiktok' },
  twitter:   { doms: ['twitter.com', 'x.com', 't.co'], short: 'x' },
  instagram: { doms: ['instagram.com', 'instagr.am'], short: 'ig' },
});
const ALL_REDES = Object.freeze(Object.keys(PLATFORMS));
const ALIASES = { yt: 'youtube', youtube: 'youtube', fb: 'facebook', facebook: 'facebook', kwai: 'kwai', threads: 'threads', spotify: 'spotify', tiktok: 'tiktok', tiktok2: 'tiktok', x: 'twitter', twitter: 'twitter', ig: 'instagram', insta: 'instagram', instagram: 'instagram' };

// Domínios oficiais; os caminhos/legendas nunca concedem uma permissão.
const DEFAULT_ALLOWED = Object.freeze(ALL_REDES.flatMap(k => PLATFORMS[k].doms));
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
/** v7.85 — o host pertence a alguma rede social do catálogo (qualquer grupo). */
function eRede(url) {
  const h = host(url);
  if (!h) return false;
  return ALL_REDES.some(k => PLATFORMS[k].doms.some(d => h === d || h.endsWith('.' + d)));
}

/** v7.85 — domínios base para o conjunto de redes escolhido (null/undefined = todas). */
function dominiosPara(redes) {
  if (!Array.isArray(redes)) return [...DEFAULT_ALLOWED];
  return redes.flatMap(k => (PLATFORMS[k] || {}).doms || []);
}

/** v7.85 — lê tokens do comando (`!antilink redes yt tiktok` / `off` / `all`). Puro. */
function parseRedes(tokens) {
  const t = (tokens || []).map(x => String(x).toLowerCase().trim()).filter(Boolean);
  if (!t.length || ['all', 'todas', 'tudo', 'default'].includes(t[0])) return { redes: null };
  if (['off', 'none', 'nenhuma', 'zero', 'nao', 'não'].includes(t[0])) return { redes: [] };
  const out = [];
  for (const tok of t) {
    const k = ALIASES[tok];
    if (!k) return { erro: tok };
    if (!out.includes(k)) out.push(k);
  }
  return { redes: out };
}

/** v7.85 — rótulo do que o grupo aceita; '' = não aceita links de rede nenhuns. */
function rotuloPara(redes, { grupos = false, canais = false } = {}) {
  const r = Array.isArray(redes) ? redes : ALL_REDES;
  const partes = r.filter(k => PLATFORMS[k]).map(k => PLATFORMS[k].short);
  if (grupos) partes.push('grupos');
  if (canais) partes.push('canais');
  return partes.join(' · ');
}

// v7.84 — aviso CURTO e humano (o bloco gigante de antes "ficava feio").
// v7.85 — `aceites` vem do grupo; o que NÃO é permitido não aparece.
const SHORT_ALLOWED = 'yt · fb · kwai · threads · spotify · tiktok · x · ig';
function notice({ sender, kind = 'link', deleted = false, deleteEnabled = true, warns = 1, maxWarns = 2, kickAttempted = false, removed = false, extraAllowed = false, autoDl = true, aceites }) {
  const L = [`🛡️ @${sender} · ${kind} fora da lista`];
  if (kickAttempted) {
    L.push(removed ? '🚫 removido — a regra do grupo manda.' : '⚠️ não consegui remover; admin, verifica.');
  } else {
    L.push(deleted
      ? `🗑️ apagada · ⚠️ aviso ${warns}/${maxWarns}`
      : deleteEnabled
        ? `⚠️ aviso ${warns}/${maxWarns} (não consegui apagar)`
        : `⚠️ aviso ${warns}/${maxWarns} · remoção desligada`);
  }
  const lista = aceites === undefined ? SHORT_ALLOWED : aceites;
  if (lista) L.push('✅ aceites: ' + lista + (extraAllowed ? ' + extras do grupo' : ''));
  else L.push('🚫 este grupo não aceita links — só conversa.');
  if (autoDl && lista) L.push('🕸️ links aceites baixam sozinhos (DARK DL).');
  return L.join('\n');
}
module.exports = { DEFAULT_ALLOWED, PLATFORM_LABELS, ALL_REDES, PLATFORMS, host, allowedHost, links, excludeAllowed, allWhitelisted, notice, eRede, dominiosPara, parseRedes, rotuloPara };
