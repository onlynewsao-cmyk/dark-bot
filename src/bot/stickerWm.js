/**
 * DARK BOT — Marca d'água / descrição de stickers por grupo
 *
 * .definestickwm  → define pack + author de TODAS as figurinhas
 *                   que o bot manda naquele chat.
 *
 * Aceita link de canal WhatsApp: o bot tira o nome do canal
 * e junta com a marca do utilizador (DARK NET 🕸️).
 */
'use strict';

const DEFAULT_BRAND = 'DARK NET 🕸️';
const DEFAULT_PACK = 'DARK BOT';

const CHANNEL_RE = /(?:https?:\/\/)?(?:www\.)?(?:whatsapp\.com|wa\.me)\/channel\/([A-Za-z0-9_-]{10,})(?:\/\S*)?/i;

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
    code,
    url: `https://whatsapp.com/channel/${code}`,
  };
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

function composeMeta({ packName = '', authorName = '', channelName = '', brand = DEFAULT_BRAND } = {}) {
  const pack = String(packName || channelName || DEFAULT_PACK).trim().slice(0, 80) || DEFAULT_PACK;
  const brandClean = String(brand || DEFAULT_BRAND).trim().slice(0, 80) || DEFAULT_BRAND;
  const author = String(authorName || brandClean).trim().slice(0, 80) || brandClean;
  return { packName: pack, authorName: author, brand: brandClean };
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
  if (fromSock?.name) return fromSock;
  const fromWeb = await fetchChannelFromWeb(url).catch(() => null);
  if (fromWeb?.name) return fromWeb;
  return {
    name: '',
    url: link.url,
    code: link.code,
    source: fromSock ? 'baileys' : 'unknown',
  };
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
  const pack = String(gs.stickerPackName || gs.stickerChannelName || '').trim();
  const author = String(gs.stickerAuthorName || '').trim();
  const url = String(gs.stickerChannelUrl || '').trim();
  const enabled = gs.stickerWmEnabled === true || !!(pack || url);
  if (!enabled) return null;
  const composed = composeMeta({
    packName: pack,
    authorName: author,
    channelName: gs.stickerChannelName,
    brand: gs.stickerWmBrand || DEFAULT_BRAND,
  });
  return {
    enabled: true,
    ...composed,
    channelUrl: url,
    channelName: String(gs.stickerChannelName || '').trim(),
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
  const update = {
    stickerWmEnabled: data.enabled !== false,
    stickerPackName: String(data.packName || '').slice(0, 80),
    stickerAuthorName: String(data.authorName || DEFAULT_BRAND).slice(0, 80),
    stickerChannelUrl: String(data.channelUrl || '').slice(0, 200),
    stickerChannelName: String(data.channelName || '').slice(0, 80),
    stickerWmBrand: String(data.brand || DEFAULT_BRAND).slice(0, 80),
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
      `Neste chat ainda não há marca definida.\n` +
      `Os stickers usam a marca global do bot.\n\n` +
      `*${prefix}definestickwm* <link do canal>\n` +
      `*${prefix}definestickwm* <nome do pack>\n` +
      `*${prefix}definestickwm pack* Nome\n` +
      `*${prefix}definestickwm author* DARK NET 🕸️\n` +
      `*${prefix}definestickwm off*`
    );
  }
  return (
    `💧 *MARCA DOS STICKERS*\n\n` +
    `📦 Pack: *${saved.packName}*\n` +
    `👤 Author: *${saved.authorName}*\n` +
    (saved.channelName ? `📢 Canal: *${saved.channelName}*\n` : '') +
    (saved.channelUrl ? `🔗 ${saved.channelUrl}\n` : '') +
    `\nTodos os stickers que o bot mandar *neste chat* saem com esta descrição.\n\n` +
    `*${prefix}definestickwm off* — voltar à marca global`
  );
}

module.exports = {
  DEFAULT_BRAND,
  DEFAULT_PACK,
  CHANNEL_RE,
  bind,
  currentCtx,
  parseChannelLink,
  extractChannelNameFromHtml,
  composeMeta,
  resolveChannel,
  fetchChannelFromWeb,
  fetchChannelFromSock,
  getForJid,
  apply,
  saveForJid,
  clearForJid,
  statusText,
};
