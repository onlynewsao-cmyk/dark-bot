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

const DEFAULT_BRAND = 'Dark Net Ao';
const DEFAULT_PACK = 'Dark Net Ao';
const DEFAULT_SLOGAN = '';
const DEFAULT_CTA = 'Ver pacote completo';
// Não inventar destino nem usar um canal como link de loja. O dono configura
// o canal/grupo e, separadamente, o link da app publicada, se existir.
const DEFAULT_PACK_URL = '';
const DEFAULT_THEME = 'darktoxic';
const STORE_HOSTS = {
  android: new Set([
    'play.google.com', 'amazon.com', 'www.amazon.com', 'apps.samsung.com', 'galaxystore.samsung.com',
    'appgallery.huawei.com', 'consumer.huawei.com', 'f-droid.org', 'www.f-droid.org',
    'apkpure.com', 'www.apkpure.com', 'uptodown.com', 'www.uptodown.com', 'apps.microsoft.com',
  ]),
  ios: new Set(['apps.apple.com', 'itunes.apple.com', 'testflight.apple.com']),
};

function normalizeHttpsUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch { return ''; }
}

function detectStorePlatform(value = '') {
  const url = normalizeHttpsUrl(value);
  if (!url) return '';
  try {
    const host = new URL(url).hostname.toLowerCase();
    for (const [platform, hosts] of Object.entries(STORE_HOSTS)) {
      if (hosts.has(host)) return platform;
    }
  } catch {}
  return '';
}

function validateStoreUrl(value = '', platform = '') {
  const url = normalizeHttpsUrl(value);
  if (!url) return '';
  const detected = detectStorePlatform(url);
  return detected && (!platform || detected === platform) ? url : '';
}

async function verifyStoreUrl(value = '', platform = '') {
  const url = validateStoreUrl(value, platform);
  if (!url) return null;
  const axios = require('axios');
  const validStatus = (status) => status >= 200 && status < 400;
  for (const method of ['head', 'get']) {
    try {
      const response = await axios.request({
        method,
        url,
        timeout: 10000,
        maxRedirects: 4,
        maxContentLength: 1024 * 1024,
        validateStatus: validStatus,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DarkNetAoStickerLinks/1.0)',
          ...(method === 'get' ? { Range: 'bytes=0-1024' } : {}),
        },
      });
      const finalUrl = normalizeHttpsUrl(response?.request?.res?.responseUrl || response?.config?.url || url);
      if (validStatus(response.status) && validateStoreUrl(finalUrl, platform)) {
        return { url: finalUrl, platform: platform || detectStorePlatform(finalUrl), status: response.status };
      }
    } catch {}
  }
  return null;
}

function stablePackId(seed = '') {
  try {
    return require('./stickerMaker').makePackId(seed || DEFAULT_PACK_URL);
  } catch {
    const crypto = require('crypto');
    const h = crypto.createHash('md5').update('darkbot-pack|' + String(seed || DEFAULT_PACK_URL)).digest('hex').slice(0, 16);
    return `com.darkbot.pack.${h}`;
  }
}

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

/** PhotoAppWorld.com / Sticker.ly: o WhatsApp só mostra «Ver pacote» se o publisher for um site. */
function urlToPublisherSite(url = '') {
  const raw = String(url || '').trim();
  if (!raw) return '';
  return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '').slice(0, 120);
}

function composeMeta({
  brand = DEFAULT_BRAND,
  slogan = DEFAULT_SLOGAN,
  link = '',
  channelUrl = '',
  cta = DEFAULT_CTA,
  channelName = '',
  androidStoreUrl = '',
  iosStoreUrl = '',
  theme = DEFAULT_THEME,
  visibleWatermark = false,
} = {}) {
  const brandClean = String(brand || DEFAULT_BRAND).trim().slice(0, 80) || DEFAULT_BRAND;
  const sloganClean = String(slogan || '').trim().slice(0, 80);
  const url = normalizeHttpsUrl(channelUrl || link).slice(0, 200);
  const ctaClean = String(cta || DEFAULT_CTA).trim().slice(0, 80) || DEFAULT_CTA;
  const nameClean = String(channelName || '').trim().slice(0, 80);
  const androidStore = validateStoreUrl(androidStoreUrl, 'android');
  const iosStore = validateStoreUrl(iosStoreUrl, 'ios');
  const themeClean = ['darktoxic', 'clean'].includes(String(theme || '').toLowerCase())
    ? String(theme).toLowerCase()
    : DEFAULT_THEME;
  const title = nameClean || brandClean;
  const description = [...new Set([title, brandClean, sloganClean, url].filter(Boolean))].join('\n');
  return {
    packName: title,
    authorName: brandClean,
    brand: brandClean,
    slogan: sloganClean,
    channelUrl: url,
    packUrl: url,
    androidStoreUrl: androidStore,
    iosStoreUrl: iosStore,
    packId: stablePackId(url || nameClean || brandClean),
    cta: ctaClean,
    channelName: nameClean,
    publisherSite: url,
    theme: themeClean,
    visibleWatermark: !!visibleWatermark,
    description,
  };
}

function cleanSearchName(name = '') {
  return String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

/**
 * Pack de pesquisa (.pinpacks, .stickerly, .packbusca, …)
 * Se o grupo tem .definestickwm, o NOME DA PESQUISA vai na descrição.
 */
function composeSearchPack(searchName, saved = null) {
  const query = cleanSearchName(searchName) || 'DARK PACK';
  const cfg = saved || {};
  const brand = String(cfg.brand || DEFAULT_BRAND).trim() || DEFAULT_BRAND;
  const url = normalizeHttpsUrl(cfg.channelUrl || cfg.packUrl || '');
  const channelName = String(cfg.channelName || '').trim().slice(0, 80);
  const title = channelName || query || brand;
  const androidStoreUrl = validateStoreUrl(cfg.androidStoreUrl, 'android');
  const iosStoreUrl = validateStoreUrl(cfg.iosStoreUrl, 'ios');
  return {
    packName: title,
    authorName: brand,
    publisher: brand,
    description: [...new Set([title, brand, query, url].filter(Boolean))].join('\n'),
    searchName: query,
    brand,
    channelUrl: url,
    packUrl: url,
    androidStoreUrl,
    iosStoreUrl,
    packId: cfg.packId || stablePackId(`${url || brand}|${query}`),
    channelName,
    theme: cfg.theme || DEFAULT_THEME,
    visibleWatermark: !!cfg.visibleWatermark,
    metadataEnabled: cfg.metadataEnabled !== false,
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
      return { name, url: link.url, code: link.code, source: 'web', status: r.status };
    } catch {}
  }
  return null;
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
      if (meta && typeof meta === 'object') {
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
  return null;
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
  return null;
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
  const url = normalizeHttpsUrl(gs.stickerChannelUrl || '');
  const androidStoreUrl = validateStoreUrl(gs.stickerAndroidStoreUrl || '', 'android');
  const iosStoreUrl = validateStoreUrl(gs.stickerIosStoreUrl || '', 'ios');
  const enabled = gs.stickerWmEnabled === true || !!url || !!androidStoreUrl || !!iosStoreUrl;
  if (!enabled) return null;
  const composed = composeMeta({
    brand: gs.stickerWmBrand || DEFAULT_BRAND,
    slogan: gs.stickerWmSlogan || '',
    channelUrl: url,
    androidStoreUrl,
    iosStoreUrl,
    cta: gs.stickerWmCta || DEFAULT_CTA,
    channelName: gs.stickerChannelName || '',
    theme: gs.stickerTheme || DEFAULT_THEME,
    visibleWatermark: gs.stickerVisibleWatermark === true,
  });
  return {
    enabled: true,
    ...composed,
    watermarkText: composed.brand,
    packId: String(gs.stickerPackId || '').trim() || composed.packId,
    channelName: String(gs.stickerChannelName || '').trim(),
    linkType: String(gs.stickerWmLinkType || '').trim(),
  };
}

/**
 * Default realmente usado por stickerMaker fora de grupos com pack próprio.
 *
 * sticker_pack_name/sticker_author_name foram as primeiras chaves do bot e
 * ainda são usadas por comandos antigos. As chaves sticker_pack_* mais novas
 * são mantidas em sincronia. Assim, qualquer caminho de criação recebe o
 * mesmo nome e autor, em vez de ter dois "globais" diferentes.
 */
async function getGlobalDefault() {
  try {
    const botConfigCache = require('./botConfigCache');
    const get = (key, fallback) => botConfigCache.get(key, fallback);
    const [urlRaw, brandRaw, sloganRaw, ctaRaw, channelRaw, legacyNameRaw,
      androidRaw, iosRaw, themeRaw, visibleRaw, watermarkTextRaw, metadataEnabledRaw] = await Promise.all([
      get('sticker_pack_url', DEFAULT_PACK_URL),
      get('sticker_pack_brand', ''),
      get('sticker_wm_slogan', DEFAULT_SLOGAN),
      get('sticker_wm_cta', DEFAULT_CTA),
      get('sticker_pack_channel_name', ''),
      get('sticker_pack_name', ''),
      get('sticker_pack_android_store_url', ''),
      get('sticker_pack_ios_store_url', ''),
      get('sticker_pack_theme', DEFAULT_THEME),
      get('sticker_visible_watermark', false),
      get('sticker_watermark_text', ''),
      get('sticker_watermark_enabled', true),
    ]);
    const url = normalizeHttpsUrl(urlRaw || '');
    const legacyName = String(legacyNameRaw || '').trim();
    const brand = String(brandRaw || DEFAULT_BRAND).trim() || DEFAULT_BRAND;
    const looksLikeAutoName = /\s[•|]\s/.test(legacyName) || legacyName.toLowerCase() === 'dark bot';
    const channelName = String(channelRaw || (legacyName && legacyName !== brand && legacyName !== DEFAULT_BRAND && !looksLikeAutoName ? legacyName : '')).trim();
    const textCandidate = String(watermarkTextRaw || '').trim();
    const watermarkText = !textCandidate || /^(dark\s*bot|darkbot)$/i.test(textCandidate) ? brand : textCandidate;
    const composed = composeMeta({
      brand,
      slogan: String(sloganRaw || '').trim(),
      channelUrl: url,
      androidStoreUrl: androidRaw,
      iosStoreUrl: iosRaw,
      cta: String(ctaRaw || DEFAULT_CTA).trim(),
      channelName,
      theme: themeRaw || DEFAULT_THEME,
      visibleWatermark: visibleRaw === true || visibleRaw === 'true' || visibleRaw === 'on' || visibleRaw === 1,
    });
    return {
      ...composed,
      packName: channelName || composed.packName,
      authorName: composed.brand,
      watermarkText,
      metadataEnabled: metadataEnabledRaw !== false && metadataEnabledRaw !== 'false' && metadataEnabledRaw !== 'off' && metadataEnabledRaw !== 0,
    };
  } catch {
    return { ...composeMeta({ brand: DEFAULT_BRAND }), metadataEnabled: true };
  }
}

/** Atualiza parcialmente o pack global e mantém as chaves legadas sincronizadas. */
async function saveGlobalDefault(data = {}) {
  const current = await getGlobalDefault();
  const channelUrl = data.channelUrl ?? data.link ?? data.packUrl ?? current.channelUrl ?? '';
  const brand = data.brand ?? current.brand ?? DEFAULT_BRAND;
  const slogan = data.slogan ?? current.slogan ?? '';
  const cta = data.cta ?? current.cta ?? DEFAULT_CTA;
  const channelName = data.channelName ?? data.packName ?? current.channelName ?? '';
  const androidStoreUrl = data.androidStoreUrl ?? current.androidStoreUrl ?? '';
  const iosStoreUrl = data.iosStoreUrl ?? current.iosStoreUrl ?? '';
  const theme = data.theme ?? current.theme ?? DEFAULT_THEME;
  const visibleWatermark = data.visibleWatermark ?? current.visibleWatermark ?? false;
  const watermarkText = data.watermarkText ?? (current.watermarkText === current.brand ? brand : current.watermarkText || brand);
  const composed = composeMeta({ brand, slogan, channelUrl, androidStoreUrl, iosStoreUrl, cta, channelName, theme, visibleWatermark });
  const authorName = String(data.authorName ?? composed.brand).trim().slice(0, 80) || composed.brand;
  const packName = String(channelName || composed.packName).trim().slice(0, 80) || composed.packName;
  const saved = { ...composed, packName, authorName, channelName, watermarkText };
  const BotConfig = require('../database/models/BotConfig');
  await BotConfig.set('sticker_pack_url', composed.channelUrl);
  await BotConfig.set('sticker_pack_brand', composed.brand);
  await BotConfig.set('sticker_wm_slogan', composed.slogan);
  await BotConfig.set('sticker_wm_cta', composed.cta);
  await BotConfig.set('sticker_pack_id', composed.packId);
  await BotConfig.set('sticker_pack_channel_name', channelName);
  await BotConfig.set('sticker_pack_android_store_url', composed.androidStoreUrl);
  await BotConfig.set('sticker_pack_ios_store_url', composed.iosStoreUrl);
  await BotConfig.set('sticker_pack_theme', composed.theme);
  await BotConfig.set('sticker_visible_watermark', composed.visibleWatermark);
  await BotConfig.set('sticker_watermark_text', String(watermarkText || composed.brand).trim().slice(0, 48));
  // Compatibilidade com comandos e integrações antigas.
  await BotConfig.set('sticker_pack_name', packName);
  await BotConfig.set('sticker_author_name', authorName);
  try { require('./botConfigCache').clear(); } catch {}
  return saved;
}

/** Resolve metadados do grupo > configuração global. URLs de canal e loja ficam separados. */
async function resolvePack(jid) {
  const local = jid ? await getForJid(jid).catch(() => null) : null;
  if (local?.enabled) {
    const global = await getGlobalDefault();
    return {
      ...local,
      metadataEnabled: global.metadataEnabled !== false,
      packUrl: local.channelUrl || local.packUrl || '',
      packId: local.packId || stablePackId(local.channelUrl || local.channelName || local.brand),
    };
  }
  const glob = await getGlobalDefault();
  return {
    ...glob,
    enabled: false,
    packUrl: glob.channelUrl || '',
    packId: glob.packId || stablePackId(glob.channelUrl || glob.channelName || glob.brand),
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
  const jid = opts.remoteJid || opts.jid || opts.ctx?.remoteJid || currentCtx()?.remoteJid;
  const pack = await resolvePack(jid).catch(() => composeMeta({ brand: DEFAULT_BRAND }));
  const search = opts.searchQuery || opts.packSearch || '';
  const brand = String(opts.brand || pack.brand || DEFAULT_BRAND).trim() || DEFAULT_BRAND;
  const channelName = opts.channelName !== undefined ? String(opts.channelName || '').trim() : (pack.channelName || '');
  const slogan = opts.slogan !== undefined ? String(opts.slogan || '').trim() : (pack.slogan || '');
  const searchMeta = search ? composeSearchPack(search, { ...pack, brand, channelName }) : null;
  const packName = opts.packName || searchMeta?.packName || pack.packName || DEFAULT_BRAND;
  const authorName = brand;
  return {
    ...opts,
    packName,
    authorName,
    brand,
    channelName,
    channelUrl: pack.channelUrl || '',
    publisherWebsite: pack.channelUrl || pack.publisherSite || '',
    androidStoreUrl: pack.androidStoreUrl || '',
    iosStoreUrl: pack.iosStoreUrl || '',
    packId: opts.packId || searchMeta?.packId || pack.packId,
    packUrl: pack.channelUrl || pack.packUrl || '',
    theme: opts.theme || pack.theme || DEFAULT_THEME,
    slogan,
    watermarkText: opts.watermarkText || pack.watermarkText || brand,
    visibleWatermark: opts.visibleWatermark ?? pack.visibleWatermark ?? false,
    metadataEnabled: opts.metadataEnabled ?? pack.metadataEnabled ?? true,
    // skipGroupWm mantém apenas o nome de busca/ID; a marca global e os links
    // nunca desaparecem dos stickers enviados em packs.
    skipGroupWm: false,
  };
}

async function saveForJid(jid, data = {}) {
  if (!jid) throw new Error('sem jid');
  const GroupSettings = require('../database/models/GroupSettings');
  const current = await getForJid(jid).catch(() => null);
  const composed = composeMeta({
    brand: data.brand ?? current?.brand ?? DEFAULT_BRAND,
    slogan: data.slogan ?? current?.slogan ?? '',
    channelUrl: data.channelUrl ?? data.link ?? current?.channelUrl ?? '',
    androidStoreUrl: data.androidStoreUrl ?? current?.androidStoreUrl ?? '',
    iosStoreUrl: data.iosStoreUrl ?? current?.iosStoreUrl ?? '',
    cta: data.cta ?? current?.cta ?? DEFAULT_CTA,
    channelName: data.channelName ?? current?.channelName ?? '',
    theme: data.theme ?? current?.theme ?? DEFAULT_THEME,
    visibleWatermark: data.visibleWatermark ?? current?.visibleWatermark ?? false,
  });
  const update = {
    stickerWmEnabled: data.enabled !== false,
    stickerPackName: composed.packName,
    stickerAuthorName: composed.authorName.slice(0, 280),
    stickerChannelUrl: composed.channelUrl,
    stickerChannelName: composed.channelName,
    stickerAndroidStoreUrl: composed.androidStoreUrl,
    stickerIosStoreUrl: composed.iosStoreUrl,
    stickerTheme: composed.theme,
    stickerVisibleWatermark: composed.visibleWatermark,
    stickerWmBrand: composed.brand,
    stickerWmSlogan: composed.slogan,
    stickerWmCta: composed.cta,
    stickerWmLinkType: String(data.linkType || '').slice(0, 20),
    stickerPackId: composed.packId,
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
        stickerAndroidStoreUrl: '',
        stickerIosStoreUrl: '',
        stickerTheme: DEFAULT_THEME,
        stickerVisibleWatermark: false,
        stickerWmBrand: DEFAULT_BRAND,
        stickerWmSlogan: DEFAULT_SLOGAN,
        stickerWmCta: DEFAULT_CTA,
        stickerWmLinkType: '',
        stickerPackId: '',
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
  const pack = saved || {};
  const links = [
    pack.channelUrl ? `Canal/grupo: ${pack.channelUrl}` : '',
    pack.androidStoreUrl ? `Play Store: ${pack.androidStoreUrl}` : '',
    pack.iosStoreUrl ? `App Store: ${pack.iosStoreUrl}` : '',
  ].filter(Boolean);
  return [
    `📦 *PACOTE DARK NET AO*${pack.enabled ? ' — activo' : ''}`,
    '',
    `Marca: *${pack.brand || DEFAULT_BRAND}*`,
    `Nome do canal/pack: *${pack.channelName || pack.packName || DEFAULT_BRAND}*`,
    `Tema: *${pack.theme || DEFAULT_THEME}* · Assinatura visível: *${pack.visibleWatermark ? 'ON' : 'OFF'}*`,
    links.length ? `\n${links.join('\n')}` : '\nNenhum destino configurado; não vou inventar link.',
    '',
    `*${prefix}pack nome* <nome do canal/pack>`,
    `*${prefix}pack autor* <marca>`,
    `*${prefix}pack link* <link de canal/grupo>`,
    `*${prefix}pack loja android|ios* <link da app publicada>`,
    `*${prefix}pack tema* darktoxic|clean`,
    `*${prefix}pack visivel* on|off`,
    `*${prefix}pack reset* — repor os valores Dark Net Ao neste chat`,
  ].join('\n');
}

module.exports = {
  DEFAULT_BRAND,
  DEFAULT_PACK,
  DEFAULT_SLOGAN,
  DEFAULT_CTA,
  DEFAULT_PACK_URL,
  DEFAULT_THEME,
  STORE_HOSTS,
  normalizeHttpsUrl,
  detectStorePlatform,
  validateStoreUrl,
  verifyStoreUrl,
  stablePackId,
  getGlobalDefault,
  saveGlobalDefault,
  resolvePack,
  CHANNEL_RE,
  GROUP_RE,
  bind,
  currentCtx,
  parseChannelLink,
  parseGroupLink,
  parseAnyLink,
  extractChannelNameFromHtml,
  composeMeta,
  composeSearchPack,
  urlToPublisherSite,
  cleanSearchName,
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
