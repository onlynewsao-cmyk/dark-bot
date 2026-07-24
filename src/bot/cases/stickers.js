/**
 * DARK BOT v5 — Cases de Stickers
 * sticker, sfull, toimg, attp, ttp, figubug, figubug2, stickerrename
 */
'use strict';

const mediaHandler = require('../mediaHandler');
const stickerMaker = require('../stickerMaker');
const config       = require('../../config');
const ai           = require('../ai');

module.exports = function registerStickerCases(registerCase) {

  // ── !sticker / !s — Foto/Vídeo → Sticker ─────────────────────────
  registerCase(['sticker', 's', 'fig', 'figurinha'], async ({ m, sock, ctx, isOwner, reply, react }) => {
    const raw = m.msg?.message || {};
    const quoted = raw.extendedTextMessage?.contextInfo?.quotedMessage;
    const srcMsg = (raw.imageMessage || raw.videoMessage)
      ? m.msg
      : (quoted?.imageMessage || quoted?.videoMessage)
        ? { message: quoted }
        : null;
    if (!srcMsg) return reply('🎨 Envie ou responda uma foto/vídeo com *!sticker*');
    await react('⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage(srcMsg);
      const mime = stickerMaker.detectMime ? stickerMaker.detectMime(buf) : 'image/jpeg';
      const isAnimated = !!(srcMsg.message?.videoMessage || quoted?.videoMessage) || mime === 'image/gif';
      const stk = await stickerMaker.create(buf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: isAnimated,
      });
      if (!stk || stk.length < 50) throw new Error('Sticker inválido');
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: m.msg });
      await react('✅');
    } catch (e) { await react('❌'); reply('❌ ' + e.message); }
  });

  // ── !sfull — Sticker sem cortar ───────────────────────────────────
  registerCase(['sfull', 'stickerful', 'fullsticker'], async ({ m, sock, ctx, reply, react }) => {
    const raw = m.msg?.message || {};
    const quoted = raw.extendedTextMessage?.contextInfo?.quotedMessage;
    const srcMsg = (raw.imageMessage || raw.stickerMessage)
      ? m.msg
      : (quoted?.imageMessage || quoted?.stickerMessage)
        ? { message: quoted }
        : null;
    if (!srcMsg) return reply('🖼️ Responda uma imagem/sticker com *!sfull*');
    await react('⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage(srcMsg);
      const stk = await stickerMaker.create(buf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false, full: true,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: m.msg });
      await react('✅');
    } catch (e) { await react('❌'); reply('❌ ' + e.message); }
  });

  // ── !toimg — Sticker → Imagem ─────────────────────────────────────
  registerCase(['toimg', 'stickertoimg', 'sticker2img'], async ({ m, sock, ctx, reply, react }) => {
    const raw = m.msg?.message || {};
    const quoted = raw.extendedTextMessage?.contextInfo?.quotedMessage;
    const stkMsg = raw.stickerMessage
      ? m.msg
      : quoted?.stickerMessage ? { message: quoted } : null;
    if (!stkMsg) return reply('🖼️ Responda um sticker com *!toimg*');
    await react('⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage(stkMsg);
      await sock.sendMessage(ctx.remoteJid, { image: buf, caption: '🖼️ Sticker convertido!' }, { quoted: m.msg });
      await react('✅');
    } catch (e) { await react('❌'); reply('❌ ' + e.message); }
  });

  // ── !figubug2 — Sticker IA ────────────────────────────────────────
  registerCase(['figubug2', 'aisticker', 'iatig'], async ({ m, sock, ctx, args, reply, react }) => {
    const prompt = args.join(' ').trim() || `DARK BOT logo sticker, cyberpunk purple neon, ${ctx.pushName}`;
    await react('🎨');
    try {
      const img = await ai.generateImage(prompt);
      const stk = await stickerMaker.create(img, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false, full: true,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: m.msg });
      await react('✅');
    } catch (e) { await react('❌'); reply('❌ ' + e.message); }
  });

  // ── !stickerrename — Renomear pack ────────────────────────────────
  registerCase(['stickerrename', 'renamesticker', 'packname'], async ({ m, sock, ctx, args, prefix, reply, react }) => {
    const raw = m.msg?.message || {};
    const quoted = raw.extendedTextMessage?.contextInfo?.quotedMessage;
    const stkMsg = raw.stickerMessage || quoted?.stickerMessage;
    if (!stkMsg) return reply(`🎨 Responde a um sticker com: *${prefix}stickerrename* <pack> | <autor>`);
    const [pack = '', author = ''] = args.join(' ').split('|').map(x => x.trim());
    if (!pack) return reply(`🎨 Ex: *${prefix}stickerrename* Dark Pack | Dark Net`);
    await react('⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage({ message: { stickerMessage: stkMsg } });
      const stk = await stickerMaker.create(buf, {
        botName: pack.slice(0, 25), ownerName: author.slice(0, 25) || ctx.pushName,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: m.msg });
      await react('✅');
      reply(`✅ Pack: *${pack}* | Autor: *${author || ctx.pushName}*`);
    } catch (e) { await react('❌'); reply('❌ ' + e.message); }
  });

  // ── !attp — Texto em sticker (animado) ────────────────────────────
  registerCase(['attp', 'textosticker', 'txtsticker'], async ({ m, sock, ctx, args, prefix, reply, react }) => {
    const text = args.join(' ').trim();
    if (!text) return reply(`✍️ Uso: *${prefix}attp* <texto>\nEx: *${prefix}attp* Dark Bot 🕸️`);
    await react('⏳');
    try {
      // API de texto em imagem → sticker
      const url = `https://api.memegen.link/images/custom/_/${encodeURIComponent(text)}.png?font=impact&width=512&height=512&background=000000&color=ffffff`;
      const buf = await mediaHandler.fetchBuffer(url, 15000);
      if (!buf || buf.length < 500) throw new Error('sem imagem');
      const stk = await stickerMaker.create(buf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false, full: true,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: m.msg });
      await react('✅');
    } catch {
      try {
        const url2 = `https://fakeimg.pl/512x512/000000/ffffff/?text=${encodeURIComponent(text)}&font_size=60`;
        const buf2 = await mediaHandler.fetchBuffer(url2, 15000);
        const stk2 = await stickerMaker.create(buf2, {
          botName: config.bot.name, ownerName: config.owner.name,
          userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false, full: true,
        });
        await sock.sendMessage(ctx.remoteJid, { sticker: stk2 }, { quoted: m.msg });
        await react('✅');
      } catch (e) {
        await react('❌');
        reply('❌ Falha a criar sticker de texto: ' + e.message);
      }
    }
  });

  // ── !ttp — Texto em sticker (fundo dark) ─────────────────────────
  registerCase(['ttp', 'texto', 'textsticker'], async ({ m, sock, ctx, args, prefix, reply, react }) => {
    const text = args.join(' ').trim();
    if (!text) return reply(`✍️ Uso: *${prefix}ttp* <texto>`);
    await react('⏳');
    try {
      const url = `https://fakeimg.pl/512x512/1a1a2e/8B5CF6/?text=${encodeURIComponent(text)}&font_size=55`;
      const buf = await mediaHandler.fetchBuffer(url, 15000);
      if (!buf || buf.length < 500) throw new Error('sem imagem');
      const stk = await stickerMaker.create(buf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false, full: true,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: m.msg });
      await react('✅');
    } catch (e) { await react('❌'); reply('❌ ' + e.message); }
  });
};
