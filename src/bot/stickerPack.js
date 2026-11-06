/**
 * Pack de figurinhas: envio nativo de uma vez + marca do grupo.
 * Pesquisa (.pinpacks / .stickerly / .packbusca): o nome da busca
 * entra na descrição se o grupo tiver .definestickwm.
 */
'use strict';

const _lastPackByJid = new Map();
const LAST_PACK_TTL_MS = 6 * 60 * 60 * 1000;

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
      name,
      publisher,
      description,
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
  return [
    add('📦 Ver pacote', source),
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

async function finishSearchPack(stickers, { query, jid, packId, sourcePackUrl = '', sourcePackName = '' } = {}) {
  const wm = require('./stickerWm');
  const maker = require('./stickerMaker');
  const saved = jid ? await wm.resolvePack(jid).catch(() => null) : await wm.getGlobalDefault().catch(() => null);
  const meta = wm.composeSearchPack(query, saved);
  const sourceUrl = typeof wm.normalizeHttpsUrl === 'function' ? wm.normalizeHttpsUrl(sourcePackUrl) : String(sourcePackUrl || '');
  const publicPackUrl = sourceUrl || meta.channelUrl || '';
  const id = packId || meta.packId || (typeof maker.makePackId === 'function' ? maker.makePackId(query) : `com.darkbot.pack.${Date.now().toString(16)}`);
  let out = stickers || [];
  if (typeof maker.stampPack === 'function' && out.length) {
    out = await maker.stampPack(out, {
      pack: meta.packName,
      author: meta.authorName,
      packId: id,
      // Para um pack importado, cada WebP mantém um link de origem verificável.
      // Sem origem externa mantém a configuração de marca/canal já existente.
      packUrl: publicPackUrl,
      channelUrl: meta.channelUrl,
      publisherWebsite: sourceUrl || meta.channelUrl,
      androidStoreUrl: meta.androidStoreUrl,
      iosStoreUrl: meta.iosStoreUrl,
      metadataEnabled: meta.metadataEnabled,
    });
  }
  return {
    stickers: out,
    name: meta.packName,
    publisher: meta.publisher,
    description: meta.description,
    authorName: meta.authorName,
    brand: meta.brand,
    channelName: meta.channelName,
    channelUrl: meta.channelUrl,
    packUrl: publicPackUrl,
    sourcePackUrl: sourceUrl,
    sourcePackName: String(sourcePackName || '').trim().slice(0, 80),
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
  sendNativeStickerPack,
  buildPackOffer,
  sendPackOffer,
  sendStickerWithPackLink,
  finishSearchPack,
  sendFinishedPack,
  sendLastPack,
};
