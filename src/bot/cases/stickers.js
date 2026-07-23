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

  // case 'sticker' / 's'
  registerCase(['sticker', 's', 'fig', 'figurinha'], async ({
    sock, msg, ctx, isOwner, reply, react,
  }) => {
    const m = msg.message || {};
    const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
    const srcMsg = (m.imageMessage || m.videoMessage)
      ? msg
      : (quoted?.imageMessage || quoted?.videoMessage)
        ? { message: quoted }
        : null;

    if (!srcMsg) return reply('🎨 Envie ou responda uma foto/vídeo com *!sticker*');

    await react('⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage(srcMsg);
      const { detectMime } = require('../stickerMaker');
      const mime = detectMime ? detectMime(buf) : 'image/jpeg';
      const isAnimated = !!(srcMsg.message?.videoMessage || quoted?.videoMessage) || mime === 'image/gif';
      const stk = await stickerMaker.create(buf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'Privado',
        isVideo: isAnimated,
      });
      if (!stk || stk.length < 50) throw new Error('Sticker inválido');
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react('✅');
    } catch (e) {
      await react('❌');
      return reply('❌ Falha no sticker: ' + e.message);
    }
  });

  // case 'sfull' — sem cortar
  registerCase(['sfull', 'stickerful', 'fullsticker'], async ({
    sock, msg, ctx, reply, react,
  }) => {
    const m = msg.message || {};
    const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
    const srcMsg = (m.imageMessage || m.stickerMessage)
      ? msg
      : (quoted?.imageMessage || quoted?.stickerMessage)
        ? { message: quoted }
        : null;

    if (!srcMsg) return reply('🖼️ Responda uma imagem/sticker com *!sfull*');
    await react('⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage(srcMsg);
      const stk = await stickerMaker.create(buf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'Privado',
        isVideo: false, full: true,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react('✅');
    } catch (e) {
      await react('❌');
      return reply('❌ ' + e.message);
    }
  });

  // case 'toimg' — sticker → imagem
  registerCase(['toimg', 'stickertoimg', 'sticker2img'], async ({
    sock, msg, ctx, reply, react,
  }) => {
    const m = msg.message || {};
    const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
    const stkMsg = m.stickerMessage
      ? msg
      : quoted?.stickerMessage ? { message: quoted } : null;

    if (!stkMsg) return reply('🖼️ Responda um sticker com *!toimg*');
    await react('⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage(stkMsg);
      await sock.sendMessage(ctx.remoteJid, { image: buf, caption: '🖼️ Sticker convertido!' }, { quoted: msg });
      await react('✅');
    } catch (e) {
      await react('❌');
      return reply('❌ ' + e.message);
    }
  });

  // case 'figubug2' — IA gera imagem → sticker
  registerCase(['figubug2', 'aisticker', 'iatig'], async ({
    sock, msg, ctx, args, prefix, reply, react,
  }) => {
    const prompt = args.join(' ').trim() || `Dark Net Engine logo sticker, cyberpunk purple neon, ${ctx.pushName}`;
    await react('🎨');
    try {
      const img = await ai.generateImage(prompt);
      const stk = await stickerMaker.create(img, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react('✅');
    } catch (e) {
      await react('❌');
      return reply('❌ ' + e.message);
    }
  });

  // case 'stickerrename' — renomear pack
  registerCase(['stickerrename', 'renamesticker', 'packname'], async ({
    sock, msg, ctx, args, prefix, reply, react,
  }) => {
    const m = msg.message || {};
    const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage;
    const stkMsg = m.stickerMessage || quoted?.stickerMessage;
    if (!stkMsg) return reply(`🎨 Responde a um sticker com:\n*${prefix}stickerrename* <pack> | <autor>`);
    const [pack = '', author = ''] = args.join(' ').split('|').map(x => x.trim());
    if (!pack) return reply(`🎨 Ex: *${prefix}stickerrename* Dark Pack | Dark Net`);
    await react('⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage({ message: { stickerMessage: stkMsg } });
      const stk = await stickerMaker.create(buf, {
        botName: pack.slice(0, 25), ownerName: author.slice(0, 25) || ctx.pushName,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await react('✅');
      return reply(`✅ Pack: *${pack}* | Autor: *${author || ctx.pushName}*`);
    } catch (e) {
      await react('❌');
      return reply('❌ ' + e.message);
    }
  });
};
