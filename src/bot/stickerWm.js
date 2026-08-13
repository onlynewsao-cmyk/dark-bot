/**
 * DARK BOT — Marca d'água / descrição de stickers por grupo
 *
 * .definestickwm  → define pack + author de TODAS as figurinhas
 *                   que o bot manda naquele chat.
 *
 * Descrição dos stickers (NÃO leva o nome do canal):
 *   DARK NET 🕸️
 *   O melhor canal do mundo
 *   <link do canal/grupo>
 *   Siga o canal
 *
 * Activa por nome ou por link — o bot detecta canal ou grupo.
 */
'use strict';

const DEFAULT_BRAND = 'DARK NET 🕸️';
const DEFAULT_PACK = 'DARK NET 🕸️';
const DEFAULT_SLOGAN = 'O melhor canal do mundo';
const DEFAULT_CTA = 'Siga o canal';

const CHANNEL_RE = /(?:https?:\/\/)?(?:www\.)?(?:whatsapp\.com|wa\.me)\/channel\/([A-Za-z0-9_-]{10,})(?:\/\S*)?/i;
const GROUP_RE = /(?:https?:\/\/)?(?:www\.)?chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_-]{10,})/i;

let _bound = null;

function bind(ctx = {}) {
  _bound = {
    remoteJid: ctx.remoteJid || '',
    pushName: ctx.pushName || '',
  };
  try {
    const rc = require('./requestCache');
    rc.put('sticker_ctx', _bound);
  } catch {}
}

function currentCtx() {
  try {
    const rc = require('./requestCache');
    const cached = rc.get && rc.get('sticker_ctx');
    if (cached && cached.remoteJid) return cached;
  } catch {}
  return _bound;
}

function parseChannelLink(text = '') {
  const raw = String(text || '').trim();
  const m = raw.match(CHANNEL_RE);
  if (!m) return null;
  const code = m[1].replace(/[/?#].*$/, '');
  if (!code || code.length < 10) return null;
  return {
    type: 'channel',
    code,
    url: `https://whatsapp.com/channel/${code}`,
  };
}

function parseGroupLink(text = '') {
  const raw = String(text || '').trim();
  if (CHANNEL_RE.test(raw)) return null;
  const m = raw.match(GROUP_RE);
  if (!m) return null;
  const code = m[1].replace(/[/?#].*$/, '');
  if (!code || code.length < 10) return null;
  return {
    type: 'group',
    code,
    url: `https://chat.whatsapp.com/${code}`,
  };
}

function parseAnyLink(text = '') {
  return parseChannelLink(text) || parseGroupLink(text);
}

function extractChannelNameFromHtml(html = '') {
  const src = String(html || '');
  const pick = (...res) => {
    for (const re of res) {
      const m = src.match(re);
      const v = (m && (m[1] || m[2]) || '').replace(/\s+/g, ' ').trim();
      if (v && !/^whatsapp$/i.test(v)) return decodeHtml(v);
    }
    return '';
  };
  let name = pick(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
    /"newsletter_name"\s*:\s*"([^"]+)"/i,
    /"name"\s*:\s*"([^"]{2,80})"\s*,\s*"description"/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  );
  if (!name) return '';
  name = name
    .replace(/\s*[|\-–—•]\s*WhatsApp.*$/i, '')
    .replace(/^WhatsApp\s*[|\-–—•]\s*/i, '')
    .replace(/\s+on WhatsApp$/i, '')
    .trim();
  return name.slice(0, 80);
}

function decodeHtml(s = '') {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function composeMeta({
  brand = DEFAULT_BRAND,
  slogan = DEFAULT_SLOGAN,
  link = '',
  cta = DEFAULT_CTA,
} = {}) {
  const brandClean = String(brand || DEFAULT_BRAND).trim().slice(0, 80) || DEFAULT_BRAND;
  const sloganClean = String(slogan || DEFAULT_SLOGAN).trim().slice(0, 80) || DEFAULT_SLOGAN;
  const url = String(link || '').trim().slice(0, 200);
  const ctaClean = String(cta || DEFAULT_CTA).trim().slice(0, 80) || DEFAULT_CTA;
  const authorLines = [sloganClean, url, ctaClean].filter(Boolean);
  return {
    packName: brandClean,
    authorName: authorLines.join('\n'),
    brand: brandClean,
    slogan: sloganClean,
    channelUrl: url,
    cta: ctaClean,
    description: [brandClean, ...authorLines].join('\n'),
  };
}

async function fetchChannelFromWeb(url) {
  const link = parseChannelLink(url);
  if (!link) return null;
  const axios = require('axios');
  const pages = [
    link.url,
    `https://www.whatsapp.com/channel/${link.code}`,
  ];
  for (const page of pages) {
    try {
      const r = await axios.get(page, {
        timeout: 12000,
        maxRedirects: 4,
        validateStatus: s => s >= 200 && s < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
        },
      });
      const name = extractChannelNameFromHtml(String(r.data || ''));
      if (name) return { name, url: link.url, code: link.code, source: 'web' };
    } catch {}
  }
  return { name: '', url: link.url, code: link.code, source: 'web' };
}

async function fetchChannelFromSock(sock, url) {
  const link = parseChannelLink(url);
  if (!link || !sock) return null;
  const tryFns = [
    async () => sock.newsletterMetadata?.('invite', link.code),
    async () => sock.newsletterMetadata?.('invite', link.url),
    async () => sock.newsletterMetadata?.('jid', `${link.code}@newsletter`),
  ];
  for (const fn of tryFns) {
    try {
      const meta = await fn();
      const name = meta?.name || meta?.subject || meta?.title || meta?.newsletterName || '';
      if (name) {
        return {
          name: String(name).trim().slice(0, 80),
          url: link.url,
          code: link.code,
          jid: meta.id || meta.jid || '',
          source: 'baileys',
        };
      }
    } catch {}
  }
  return null;
}

async function resolveChannel(url, sock = null) {
  const link = parseChannelLink(url);
  if (!link) return null;
  const fromSock = await fetchChannelFromSock(sock, url).catch(() => null);
  if (fromSock?.name) return { ...fromSock, type: 'channel' };
  const fromWeb = await fetchChannelFromWeb(url).catch(() => null);
  if (fromWeb) return { ...fromWeb, type: 'channel' };
  return {
    type: 'channel',
    name: '',
    url: link.url,
    code: link.code,
    source: fromSock ? 'baileys' : 'unknown',
  };
}

async function resolveGroup(url, sock = null) {
  const link = parseGroupLink(url);
  if (!link) return null;
  if (sock?.groupGetInviteInfo) {
    try {
      const info = await sock.groupGetInviteInfo(link.code);
      const name = info?.subject || info?.name || '';
      return {
        type: 'group',
        name: String(name || '').trim().slice(0, 80),
        url: link.url,
        code: link.code,
        jid: info?.id || '',
        source: 'baileys',
      };
    } catch {}
  }
  return { type: 'group', name: '', url: link.url, code: link.code, source: 'link' };
}

async function resolveAnyLink(text, sock = null) {
  if (parseChannelLink(text)) return resolveChannel(text, sock);
  if (parseGroupLink(text)) return resolveGroup(text, sock);
  return null;
}

async function groupInviteUrl(sock, groupJid) {
  if (!sock || !groupJid || !String(groupJid).endsWith('@g.us')) return '';
  try {
    const code = await sock.groupInviteCode(groupJid);
    return code ? `https://chat.whatsapp.com/${code}` : '';
  } catch {
    return '';
  }
}

async function getGroupDoc(jid) {
  if (!jid) return null;
  const GroupSettings = require('../database/models/GroupSettings');
  const requestCache = require('./requestCache');
  return requestCache.remember(
    requestCache.K.group(jid) + ':doc',
    () => GroupSettings.findOne({ groupJid: jid })
  ).catch(() => null);
}

function fromDoc(gs) {
  if (!gs) return null;
  const url = String(gs.stickerChannelUrl || '').trim();
  const enabled = gs.stickerWmEnabled === true || !!url;
  if (!enabled) return null;
  const composed = composeMeta({
    brand: gs.stickerWmBrand || DEFAULT_BRAND,
    slogan: gs.stickerWmSlogan || DEFAULT_SLOGAN,
    link: url,
    cta: gs.stickerWmCta || DEFAULT_CTA,
  });
  return {
    enabled: true,
    ...composed,
    channelName: String(gs.stickerChannelName || '').trim(),
    linkType: String(gs.stickerWmLinkType || '').trim(),
  };
}

async function getForJid(jid) {
  if (!jid) return null;
  try {
    return fromDoc(await getGroupDoc(jid));
  } catch {
    return null;
  }
}

async function apply(opts = {}) {
  if (opts.skipGroupWm) return opts;
  const jid = opts.remoteJid || opts.jid || opts.ctx?.remoteJid || currentCtx()?.remoteJid;
  if (!jid) return opts;
  const saved = await getForJid(jid);
  if (!saved?.enabled) return opts;
  return {
    ...opts,
    packName: saved.packName,
    authorName: saved.authorName,
  };
}

async function saveForJid(jid, data = {}) {
  if (!jid) throw new Error('sem jid');
  const GroupSettings = require('../database/models/GroupSettings');
  const composed = composeMeta({
    brand: data.brand,
    slogan: data.slogan,
    link: data.channelUrl || data.link,
    cta: data.cta,
  });
  const update = {
    stickerWmEnabled: data.enabled !== false,
    stickerPackName: composed.packName,
    stickerAuthorName: composed.authorName.slice(0, 280),
    stickerChannelUrl: composed.channelUrl,
    stickerChannelName: String(data.channelName || '').slice(0, 80),
    stickerWmBrand: composed.brand,
    stickerWmSlogan: composed.slogan,
    stickerWmCta: composed.cta,
    stickerWmLinkType: String(data.linkType || '').slice(0, 20),
  };
  const doc = await GroupSettings.findOneAndUpdate(
    { groupJid: jid },
    { $set: update },
    { upsert: true, new: true }
  );
  try {
    const requestCache = require('./requestCache');
    requestCache.forget(requestCache.K.group(jid) + ':doc');
    requestCache.put(requestCache.K.group(jid) + ':doc', doc);
  } catch {}
  return fromDoc(doc);
}

async function clearForJid(jid) {
  if (!jid) throw new Error('sem jid');
  const GroupSettings = require('../database/models/GroupSettings');
  const doc = await GroupSettings.findOneAndUpdate(
    { groupJid: jid },
    {
      $set: {
        stickerWmEnabled: false,
        stickerPackName: '',
        stickerAuthorName: '',
        stickerChannelUrl: '',
        stickerChannelName: '',
        stickerWmBrand: DEFAULT_BRAND,
        stickerWmSlogan: DEFAULT_SLOGAN,
        stickerWmCta: DEFAULT_CTA,
        stickerWmLinkType: '',
      },
    },
    { upsert: true, new: true }
  );
  try {
    const requestCache = require('./requestCache');
    requestCache.forget(requestCache.K.group(jid) + ':doc');
    requestCache.put(requestCache.K.group(jid) + ':doc', doc);
  } catch {}
  return null;
}

function statusText(saved, prefix = '.') {
  if (!saved?.enabled) {
    return (
      `💧 *MARCA DOS STICKERS*\n\n` +
      `Neste grupo ainda não está activa.\n` +
      `Quando activares, TODOS os stickers do bot saem assim:\n\n` +
      `*DARK NET 🕸️*\n` +
      `O melhor canal do mundo\n` +
      `<link do canal/grupo>\n` +
      `Siga o canal\n\n` +
      `*${prefix}definestickwm* <link do canal ou grupo>\n` +
      `*${prefix}definestickwm* <nome> — activa e usa o link deste grupo\n` +
      `*${prefix}definestickwm off*`
    );
  }
  return (
    `💧 *MARCA DOS STICKERS* — activa\n\n` +
    `Descrição de todos os stickers deste grupo:\n\n` +
    `\`\`\`\n${saved.description}\n\`\`\`\n\n` +
    `*${prefix}definestickwm off* — desactivar`
  );
}

module.exports = {
  DEFAULT_BRAND,
  DEFAULT_PACK,
  DEFAULT_SLOGAN,
  DEFAULT_CTA,
  CHANNEL_RE,
  GROUP_RE,
  bind,
  currentCtx,
  parseChannelLink,
  parseGroupLink,
  parseAnyLink,
  extractChannelNameFromHtml,
  composeMeta,
  resolveChannel,
  resolveGroup,
  resolveAnyLink,
  groupInviteUrl,
  fetchChannelFromWeb,
  fetchChannelFromSock,
  getForJid,
  apply,
  saveForJid,
  clearForJid,
  statusText,
};
