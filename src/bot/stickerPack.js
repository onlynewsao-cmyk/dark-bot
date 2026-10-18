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
  const list = stickers.filter((b) => b && b.length > 50 && b.length < 1024 * 1024).slice(0, 60);
  if (!list.length) return false;
  const packName = name || 'Dark Net Ao';
  const packPublisher = publisher || 'Dark Net Ao';
  const packDesc = description || packPublisher;
  const channel = channelUrl || packUrl || '';
  const website = publisherWebsite || channel;
  const payloadStickers = list.map((data) => ({ data, emojis: ['✨'] }));
  const attempts = [
    {
      cover: list[0],
      stickers: payloadStickers,
      name: packName,
      publisher: packPublisher,
      description: packDesc,
      packId,
      stickerPackId: packId,
      publisherWebsite: website,
      androidAppStoreLink: androidStoreUrl || '',
      iosAppStoreLink: iosStoreUrl || '',
    },
    {
      cover: list[0],
      stickers: payloadStickers,
      name: packName,
      publisher: packPublisher,
      description: packDesc,
    },
    {
      stickerPack: {
        name: packName,
        publisher: packPublisher,
        description: packDesc,
        stickerPackId: packId,
        cover: list[0],
        stickers: payloadStickers.map((s) => ({ sticker: s.data, emojis: s.emojis })),
      },
    },
  ];
  for (const payload of attempts) {
    try {
      await sock.sendMessage(jid, payload, { quoted });
      return true;
    } catch (e) {
      console.warn('[stickerPack] nativo:', String(e.message || e).slice(0, 160));
    }
  }
  return false;
}

function buildPackOffer(meta = {}) {
  const links = [
    meta.channelUrl || meta.packUrl ? `Canal/grupo: ${meta.channelUrl || meta.packUrl}` : '',
    meta.androidStoreUrl ? `App Android: ${meta.androidStoreUrl}` : '',
    meta.iosStoreUrl ? `App iOS: ${meta.iosStoreUrl}` : '',
  ].filter(Boolean);
  if (!links.length) return '';
  const title = meta.channelName || meta.packName || meta.brand || 'Dark Net Ao';
  return `📦 *Ver pacote completo — ${title}*\n${links.join('\n')}`;
}

async function sendPackOffer(sock, jid, meta = {}, quoted) {
  const text = buildPackOffer(meta);
  if (!sock || !jid || !text) return false;
  await sock.sendMessage(jid, { text }, quoted ? { quoted } : {});
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

async function finishSearchPack(stickers, { query, jid, packId } = {}) {
  const wm = require('./stickerWm');
  const maker = require('./stickerMaker');
  const saved = jid ? await wm.resolvePack(jid).catch(() => null) : await wm.getGlobalDefault().catch(() => null);
  const meta = wm.composeSearchPack(query, saved);
  const id = packId || meta.packId || (typeof maker.makePackId === 'function' ? maker.makePackId(query) : `com.darkbot.pack.${Date.now().toString(16)}`);
  let out = stickers || [];
  if (typeof maker.stampPack === 'function' && out.length) {
    out = await maker.stampPack(out, {
      pack: meta.packName,
      author: meta.authorName,
      packId: id,
      packUrl: meta.channelUrl,
      channelUrl: meta.channelUrl,
      publisherWebsite: meta.channelUrl,
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
    packUrl: meta.channelUrl,
    androidStoreUrl: meta.androidStoreUrl,
    iosStoreUrl: meta.iosStoreUrl,
    theme: meta.theme,
    metadataEnabled: meta.metadataEnabled,
    packId: id,
    wm: saved,
  };
}

async function sendFinishedPack(sock, jid, stickers, opts = {}) {
  const finished = await finishSearchPack(stickers, { query: opts.query, jid, packId: opts.packId });
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
    publisherWebsite: finished.channelUrl,
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
    publisherWebsite: pack.channelUrl,
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
