/**
 * Pack de figurinhas: envio nativo de uma vez + marca do grupo.
 * Pesquisa (.pinpacks / .stickerly / .packbusca): o nome da busca
 * entra na descrição se o grupo tiver .definestickwm.
 */
'use strict';

const _lastPackByJid = new Map();
const LAST_PACK_TTL_MS = 6 * 60 * 60 * 1000;

function cleanLine(value = '', max = 180) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function sourcePlatformFor(url = '', requested = '') {
  const explicit = cleanLine(requested, 40);
  if (explicit) return explicit;
  try {
    if (new URL(String(url)).hostname.toLowerCase().endsWith('sticker.ly')) return 'Sticker.ly';
  } catch {}
  return '';
}

function nativeBotIdentity(author = '') {
  try { return require('./stickerMaker').withBotDetails(author); } catch { return cleanLine(author || 'DARK BOT', 128); }
}

/** Coloca identidade do bot no cartão, sem perder a fonte original. */
function nativeDescription(description = '', { brand = '', channelUrl = '', sourcePackUrl = '', sourcePlatform = '' } = {}) {
  let botName = 'DARK BOT';
  try { botName = cleanLine(require('../config').bot?.name || botName, 80) || botName; } catch {}
  const lines = String(description || '').split('\n').map((line) => cleanLine(line, 220)).filter(Boolean);
  const platform = sourcePlatformFor(sourcePackUrl, sourcePlatform);
  const additions = [
    `🤖 Gerado por ${botName}`,
    brand ? `🏷️ Marca: ${cleanLine(brand, 80)}` : '',
    channelUrl ? `📣 ${cleanLine(channelUrl, 220)}` : '',
    sourcePackUrl ? `📦 Fonte${platform ? ` ${platform}` : ''}: ${cleanLine(sourcePackUrl, 220)}` : '',
  ].filter(Boolean);
  const unique = [];
  for (const line of [...lines, ...additions]) {
    if (!unique.some((seen) => seen.toLowerCase() === line.toLowerCase())) unique.push(line);
  }
  return unique.join('\n').slice(0, 900);
}

function rememberPack(jid, pack) {
  if (!jid || !pack || !Array.isArray(pack.stickers) || !pack.stickers.length) return false;
  _lastPackByJid.set(String(jid), { ...pack, ts: Date.now() });
  for (const [key, value] of _lastPackByJid) {
    if (Date.now() - value.ts > LAST_PACK_TTL_MS) _lastPackByJid.delete(key);
  }
  while (_lastPackByJid.size > 100) _lastPackByJid.delete(_lastPackByJid.keys().next().value);
  return true;
}

function getLastPack(jid) {
  const pack = _lastPackByJid.get(String(jid || ''));
  if (!pack || Date.now() - pack.ts > LAST_PACK_TTL_MS) {
    _lastPackByJid.delete(String(jid || ''));
    return null;
  }
  return pack;
}

async function sendNativeStickerPack(sock, jid, stickers, {
  name, publisher, description, packId, packUrl, channelUrl,
  androidStoreUrl, iosStoreUrl, publisherWebsite, quoted,
} = {}) {
  if (!sock || !jid || !stickers?.length) return false;
  // StickerPackMessage não é um simples payload de sendMessage: é um ZIP
  // cifrado e hospedado no MMS, seguido de relay protocolar. O helper próprio
  // usa exclusivamente o Baileys oficial activo e retorna false para o
  // fallback individual quando não houver 3 stickers ou o cliente recusar.
  try {
    const native = require('./nativeStickerPack');
    const result = await native.sendNativeStickerPack(sock, jid, stickers, {
      name: cleanLine(name || 'DARK BOT', 80),
      publisher: nativeBotIdentity(publisher),
      description: nativeDescription(description, { channelUrl, sourcePackUrl: packUrl }),
      packId,
      packUrl,
      channelUrl,
      androidStoreUrl,
      iosStoreUrl,
      publisherWebsite,
      quoted,
    });
    return !!result?.ok;
  } catch (error) {
    console.warn('[stickerPack] pack nativo:', String(error?.message || error).slice(0, 180));
    return false;
  }
}

function packLinks(meta = {}) {
  const source = meta.sourcePackUrl || meta.sourceUrl || '';
  const channel = meta.channelUrl || meta.packUrl || '';
  const unique = new Set();
  const add = (label, url) => {
    const value = String(url || '').trim();
    if (!/^https:\/\//i.test(value) || unique.has(value)) return null;
    unique.add(value);
    return { label, url: value };
  };
  const sourcePlatform = sourcePlatformFor(source, meta.sourcePlatform);
  return [
    add(sourcePlatform === 'Sticker.ly' ? '📦 Ver no Sticker.ly' : '📦 Ver pacote', source),
    add('📣 Canal/grupo', channel),
    add('🤖 App Android', meta.androidStoreUrl),
    add(' App iPhone', meta.iosStoreUrl),
  ].filter(Boolean);
}

function buildPackOffer(meta = {}) {
  const links = packLinks(meta);
  if (!links.length) return '';
  const title = meta.sourcePackName || meta.channelName || meta.packName || meta.brand || 'Dark Net Ao';
  return `📦 *Ver pacote completo — ${title}*\n` + links.map(({ label, url }) => `${label}: ${url}`).join('\n');
}

async function sendPackOffer(sock, jid, meta = {}, quoted) {
  const text = buildPackOffer(meta);
  const links = packLinks(meta);
  if (!sock || !jid || !text || !links.length) return false;

  // O botão nativo elimina a dependência de o utilizador copiar o URL. O
  // helper tem fallback de texto se o cliente/servidor não aceitar native flow.
  try {
    const buttons = links.slice(0, 3).map(({ label, url }) => ({ text: label, url }));
    await require('./buttonHandler').sendUrlButtons(sock, jid, text, 'DARK BOT 🕸️', buttons, quoted || null);
  } catch {
    await sock.sendMessage(jid, { text }, quoted ? { quoted } : {});
  }
  return true;
}

async function sendStickerWithPackLink(sock, jid, sticker, { quoted, includePackLink = true, meta = null } = {}) {
  if (!sock || !jid || !sticker) return false;
  await sock.sendMessage(jid, { sticker }, quoted ? { quoted } : {});
  if (includePackLink) {
    const packMeta = meta || await require('./stickerWm').resolvePack(jid).catch(() => null);
    if (packMeta) await sendPackOffer(sock, jid, packMeta, quoted).catch(() => false);
  }
  return true;
}

async function finishSearchPack(stickers, { query, jid, packId, sourcePackUrl = '', sourcePackName = '', sourcePackId = '', sourcePlatform = '' } = {}) {
  const wm = require('./stickerWm');
  const maker = require('./stickerMaker');
  const saved = jid ? await wm.resolvePack(jid).catch(() => null) : await wm.getGlobalDefault().catch(() => null);
  const meta = wm.composeSearchPack(query, saved);
  const sourceUrl = typeof wm.normalizeHttpsUrl === 'function' ? wm.normalizeHttpsUrl(sourcePackUrl) : String(sourcePackUrl || '');
  const sourceName = cleanLine(sourcePackName, 80);
  const source = sourcePlatformFor(sourceUrl, sourcePlatform);
  const publicPackUrl = sourceUrl || meta.channelUrl || '';
  // O card nativo mostra o nome do pack escolhido no Sticker.ly; a identidade
  // do bot permanece no publisher e na descrição, inclusive após reenvio.
  const displayName = sourceName || meta.packName;
  const publisher = nativeBotIdentity(meta.authorName || meta.brand);
  const description = nativeDescription(meta.description, {
    brand: meta.brand, channelUrl: meta.channelUrl, sourcePackUrl: sourceUrl, sourcePlatform: source,
  });
  const id = packId || meta.packId || (typeof maker.makePackId === 'function' ? maker.makePackId(query) : `com.darkbot.pack.${Date.now().toString(16)}`);
  let out = stickers || [];
  if (typeof maker.stampPack === 'function' && out.length) {
    out = await maker.stampPack(out, {
      pack: displayName,
      author: publisher,
      packId: id,
      // Para um pack importado, cada WebP mantém um link de origem verificável.
      // Sem origem externa mantém a configuração de marca/canal já existente.
      packUrl: publicPackUrl,
      channelUrl: meta.channelUrl,
      publisherWebsite: sourceUrl || meta.channelUrl,
      androidStoreUrl: meta.androidStoreUrl,
      iosStoreUrl: meta.iosStoreUrl,
      sourcePackId: sourcePackId,
      sourcePlatform: source,
      metadataEnabled: meta.metadataEnabled,
    });
  }
  return {
    stickers: out,
    name: displayName,
    publisher,
    description,
    authorName: publisher,
    brand: meta.brand,
    channelName: meta.channelName,
    channelUrl: meta.channelUrl,
    packUrl: publicPackUrl,
    sourcePackUrl: sourceUrl,
    sourcePackName: sourceName,
    sourcePackId: cleanLine(sourcePackId, 160),
    sourcePlatform: source,
    androidStoreUrl: meta.androidStoreUrl,
    iosStoreUrl: meta.iosStoreUrl,
    theme: meta.theme,
    metadataEnabled: meta.metadataEnabled,
    packId: id,
    wm: saved,
  };
}

async function sendFinishedPack(sock, jid, stickers, opts = {}) {
  const finished = await finishSearchPack(stickers, {
    query: opts.query, jid, packId: opts.packId,
    sourcePackUrl: opts.sourcePackUrl, sourcePackName: opts.sourcePackName,
    sourcePackId: opts.sourcePackId, sourcePlatform: opts.sourcePlatform,
  });
  rememberPack(jid, finished);
  const sent = await sendNativeStickerPack(sock, jid, finished.stickers, {
    name: finished.name,
    publisher: finished.publisher,
    description: finished.description,
    packId: finished.packId,
    packUrl: finished.packUrl,
    channelUrl: finished.channelUrl,
    androidStoreUrl: finished.androidStoreUrl,
    iosStoreUrl: finished.iosStoreUrl,
    publisherWebsite: finished.sourcePackUrl || finished.channelUrl,
    quoted: opts.quoted,
  });
  if (!sent) {
    for (const sticker of finished.stickers) {
      await sock.sendMessage(jid, { sticker }, opts.quoted ? { quoted: opts.quoted } : {});
    }
  }
  const packOfferSent = await sendPackOffer(sock, jid, finished, opts.quoted).catch(() => false);
  return { ...finished, sentAsPack: sent, packOfferSent };
}

async function sendLastPack(sock, jid, { quoted } = {}) {
  const pack = getLastPack(jid);
  if (!pack) return { ok: false, reason: 'missing' };
  const sentAsPack = await sendNativeStickerPack(sock, jid, pack.stickers, {
    name: pack.name || pack.packName,
    publisher: pack.publisher || pack.brand || pack.authorName,
    description: pack.description,
    packId: pack.packId,
    packUrl: pack.packUrl,
    channelUrl: pack.channelUrl,
    androidStoreUrl: pack.androidStoreUrl,
    iosStoreUrl: pack.iosStoreUrl,
    publisherWebsite: pack.sourcePackUrl || pack.channelUrl,
    quoted,
  });
  if (!sentAsPack) {
    for (const sticker of pack.stickers) {
      await sock.sendMessage(jid, { sticker }, quoted ? { quoted } : {});
    }
  }
  const packOfferSent = await sendPackOffer(sock, jid, pack, quoted).catch(() => false);
  return { ok: true, sentAsPack, packOfferSent, pack };
}

module.exports = {
  rememberPack,
  getLastPack,
  nativeBotIdentity,
  nativeDescription,
  sendNativeStickerPack,
  buildPackOffer,
  sendPackOffer,
  sendStickerWithPackLink,
  finishSearchPack,
  sendFinishedPack,
  sendLastPack,
};
