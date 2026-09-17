/**
 * DARK BOT v7.5 — Figurinhas por CATEGORIA + GIF
 *
 * figanime, figcoreana, figdesenho, figemoji, figengracada, figmeme,
 * figraiva, figroblox — busca packs de stickers reais no Sticker.ly
 * pela categoria e envia como pack (estáticos + animados).
 *
 * gif <busca> — envia um GIF real (Tenor → fallback APIs de anime).
 *
 * Estes comandos eram stubs vazios ("Uso: <args>") em stubs.js.
 */
'use strict';

const config = require('../../config');
let _lz_stickerMaker;
const stickerMaker = new Proxy({}, { get: (_, k) => (_lz_stickerMaker ||= require('../stickerMaker'))[k] });

/** Categoria → termos de busca no Sticker.ly */
const CATEGORIAS = {
  figanime: 'anime',
  figcoreana: 'coreano korean aesthetic',
  figdesenho: 'desenho cartoon drawing',
  figemoji: 'emoji',
  figengracada: 'engraçado funny',
  figmeme: 'meme',
  figraiva: 'raiva angry',
  figroblox: 'roblox',
};

async function enviarPackCategoria(sock, msg, ctx, query, react) {
  const sly = require('../stickerly');
  const found = await sly.collectStickers(query, { limit: 24 });
  if (!found.stickers || !found.stickers.length) {
    throw new Error(`Nada encontrado para "${query}"`);
  }

  const packId = stickerMaker.makePackId ? stickerMaker.makePackId(query) : ('fig-' + Date.now().toString(36));
  const searchName = String(found.title || query).replace(/\s+/g, ' ').trim().slice(0, 40);
  // v7.77: fetch+conversão em paralelo (6) — sequencial rebentava os 5s
  const alvos = found.stickers.slice(0, 20);
  async function converterUm(s) {
    try {
      const buf = await require('../mediaHandler').fetchBuffer(s.url);
      if (!buf || buf.length < 500) return null;
      const stk = await stickerMaker.create(buf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV',
        isVideo: !!s.isAnimated,
        packName: searchName,
        searchQuery: searchName,
        remoteJid: ctx.remoteJid,
        packId,
        skipGroupWm: true,
      });
      return stk && stk.length > 50 ? stk : null;
    } catch { return null; }
  }
  const stickers = [];
  for (let i = 0; i < alvos.length; i += 6) {
    const lote = await Promise.all(alvos.slice(i, i + 6).map(converterUm));
    for (const stk of lote) if (stk) stickers.push(stk);
  }

  if (!stickers.length) throw new Error('Nenhuma figurinha convertida');

  const stickerPack = require('../stickerPack');
  await stickerPack.sendFinishedPack(sock, ctx.remoteJid, stickers, {
    query: searchName, packId, quoted: msg,
  });
  return searchName;
}

module.exports = function registerFigCategorias(registerCase) {

  // ═══ figanime / figmeme / figroblox ... — packs por categoria ═══
  for (const [cmd, query] of Object.entries(CATEGORIAS)) {
    registerCase([cmd], async ({ sock, msg, ctx, prefix, reply, react }) => {
      sock.sendMessage(ctx.remoteJid, { react: { text: '🔍', key: msg.key } });
      try {
        const nome = await enviarPackCategoria(sock, msg, ctx, query, react);
        sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
      } catch (e) {
        sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
        return reply('❌ ' + (e.message || e) + `\n\nTenta \`${prefix}stickerly ${query}\``);
      }
    }, true);
  }

  // ═══ GIF — envia um GIF real ═══
  registerCase(['gif'], async ({ sock, msg, ctx, args, prefix, reply, react }) => {
    const query = args.join(' ').trim();
    if (!query) return reply(`🎞️ Uso: \`${prefix}gif <busca>\`\nEx: \`${prefix}gif cachorro\``);
    sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const gifHelper = require('../gifHelper');
      const buf = await gifHelper.fetchGifBuffer(query);
      if (!buf || buf.length < 500) throw new Error('Sem GIF encontrado');
      await sock.sendMessage(ctx.remoteJid, {
        video: buf, gifPlayback: true, mimetype: 'video/mp4',
        caption: `🎞️ *${query.slice(0, 40)}*`,
      }, { quoted: msg });
      sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply('❌ ' + (e.message || e));
    }
  }, true);

};

module.exports.CATEGORIAS = CATEGORIAS;
