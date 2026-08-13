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
    react('⏳');
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
      react('✅');
    } catch (e) { react('❌'); reply('❌ ' + e.message); }
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
    react('⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage(srcMsg);
      const stk = await stickerMaker.create(buf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false, full: true,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: m.msg });
      react('✅');
    } catch (e) { react('❌'); reply('❌ ' + e.message); }
  });

  // ── !toimg — Sticker → Imagem ─────────────────────────────────────
  registerCase(['toimg', 'stickertoimg', 'sticker2img'], async ({ m, sock, ctx, reply, react }) => {
    const raw = m.msg?.message || {};
    const quoted = raw.extendedTextMessage?.contextInfo?.quotedMessage;
    const stkMsg = raw.stickerMessage
      ? m.msg
      : quoted?.stickerMessage ? { message: quoted } : null;
    if (!stkMsg) return reply('🖼️ Responda um sticker com *!toimg*');
    react('⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage(stkMsg);
      await sock.sendMessage(ctx.remoteJid, { image: buf, caption: '🖼️ Sticker convertido!' }, { quoted: m.msg });
      react('✅');
    } catch (e) { react('❌'); reply('❌ ' + e.message); }
  });

  // ── !figubug2 — Sticker IA ────────────────────────────────────────
  registerCase(['figubug2', 'aisticker', 'iatig'], async ({ m, sock, ctx, args, reply, react }) => {
    const prompt = args.join(' ').trim() || `DARK BOT logo sticker, cyberpunk purple neon, ${ctx.pushName}`;
    react('🎨');
    try {
      const img = await ai.generateImage(prompt);
      const stk = await stickerMaker.create(img, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false, full: true,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: m.msg });
      react('✅');
    } catch (e) { react('❌'); reply('❌ ' + e.message); }
  });

  // ── !stickerrename — Renomear pack ────────────────────────────────
  registerCase(['stickerrename', 'renamesticker', 'packname'], async ({ m, sock, ctx, args, prefix, reply, react }) => {
    const raw = m.msg?.message || {};
    const quoted = raw.extendedTextMessage?.contextInfo?.quotedMessage;
    const stkMsg = raw.stickerMessage || quoted?.stickerMessage;
    if (!stkMsg) return reply(`🎨 Responde a um sticker com: *${prefix}stickerrename* <pack> | <autor>`);
    const [pack = '', author = ''] = args.join(' ').split('|').map(x => x.trim());
    if (!pack) return reply(`🎨 Ex: *${prefix}stickerrename* Dark Pack | Dark Net`);
    react('⏳');
    try {
      const buf = await mediaHandler.downloadFromMessage({ message: { stickerMessage: stkMsg } });
      const stk = await stickerMaker.create(buf, {
        botName: pack.slice(0, 25), ownerName: author.slice(0, 25) || ctx.pushName,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false,
        packName: pack.slice(0, 80), authorName: (author || ctx.pushName).slice(0, 80),
        skipGroupWm: true,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: m.msg });
      react('✅');
      reply(`✅ Pack: *${pack}* | Autor: *${author || ctx.pushName}*`);
    } catch (e) { react('❌'); reply('❌ ' + e.message); }
  });

  // ── !attp — Texto em sticker (animado) ────────────────────────────
  registerCase(['attp', 'textosticker', 'txtsticker'], async ({ m, sock, ctx, args, prefix, reply, react }) => {
    const text = args.join(' ').trim();
    if (!text) return reply(`✍️ Uso: *${prefix}attp* <texto>\nEx: *${prefix}attp* Dark Bot 🕸️`);
    react('⏳');
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
      react('✅');
    } catch {
      try {
        const url2 = `https://fakeimg.pl/512x512/000000/ffffff/?text=${encodeURIComponent(text)}&font_size=60`;
        const buf2 = await mediaHandler.fetchBuffer(url2, 15000);
        const stk2 = await stickerMaker.create(buf2, {
          botName: config.bot.name, ownerName: config.owner.name,
          userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false, full: true,
        });
        await sock.sendMessage(ctx.remoteJid, { sticker: stk2 }, { quoted: m.msg });
        react('✅');
      } catch (e) {
        react('❌');
        reply('❌ Falha a criar sticker de texto: ' + e.message);
      }
    }
  });

  // ── !definestickwm — marca d'água/descrição dos stickers DESTE grupo
  registerCase(['definestickwm', 'setstickwm', 'stickwmgrupo', 'definirmarca'], async ({ sock, ctx, args, prefix, reply, react, isOwner, isAdminFn }) => {
    const wm = require('../stickerWm');
    const jid = ctx.remoteJid;
    const p = prefix || '.';

    if (ctx.isGroup && !isOwner) {
      let ok = false;
      try { ok = typeof isAdminFn === 'function' ? await isAdminFn() : false; } catch {}
      if (!ok) {
        try {
          const meta = ctx.groupMeta || await sock.groupMetadata(jid);
          const snum = String(ctx.senderNumber || '').replace(/\D/g, '');
          ok = !!(meta?.participants || []).some(part => {
            const n = String(part.id || '').split(':')[0].split('@')[0].replace(/\D/g, '');
            return n === snum && (part.admin === 'admin' || part.admin === 'superadmin');
          });
        } catch {}
      }
      if (!ok) return reply('🚫 Só o *Dono* ou *Admins* do grupo podem definir a marca dos stickers.');
    }

    const raw = args.join(' ').trim();
    const sub = (args[0] || '').toLowerCase();

    if (!raw || ['status', 'ver', 'info'].includes(sub)) {
      const saved = await wm.getForJid(jid);
      return reply(wm.statusText(saved, p));
    }

    if (['off', 'reset', 'limpar', 'clear', 'remover'].includes(sub)) {
      await wm.clearForJid(jid);
      return reply('✅ Marca deste chat *apagada*. Os stickers voltam à marca global.');
    }

    const current = await wm.getForJid(jid);
    if (sub === 'pack') {
      const val = args.slice(1).join(' ').trim();
      if (!val) return reply(`Usa: *${p}definestickwm pack* Nome do canal`);
      const saved = await wm.saveForJid(jid, {
        packName: val,
        authorName: current?.authorName || wm.DEFAULT_BRAND,
        brand: current?.brand || wm.DEFAULT_BRAND,
        channelUrl: current?.channelUrl || '',
        channelName: current?.channelName || '',
      });
      return reply(wm.statusText(saved, p));
    }

    if (['author', 'autor', 'marca'].includes(sub)) {
      const val = args.slice(1).join(' ').trim();
      if (!val) return reply(`Usa: *${p}definestickwm author* DARK NET 🕸️`);
      const saved = await wm.saveForJid(jid, {
        packName: current?.packName || current?.channelName || wm.DEFAULT_PACK,
        authorName: val,
        brand: val,
        channelUrl: current?.channelUrl || '',
        channelName: current?.channelName || '',
      });
      return reply(wm.statusText(saved, p));
    }

    react('⏳');
    const link = wm.parseChannelLink(raw);
    if (link) {
      try {
        const ch = await wm.resolveChannel(raw, sock);
        const name = (ch && ch.name) || '';
        if (!name) {
          react('❌');
          return reply(
            `❌ Não consegui ler o nome desse canal.\n` +
            `O link está certo, mas o WhatsApp não devolveu o título.\n\n` +
            `Cola o nome à mão:\n*${p}definestickwm pack* Nome do Canal`
          );
        }
        const saved = await wm.saveForJid(jid, {
          packName: name,
          authorName: wm.DEFAULT_BRAND,
          brand: wm.DEFAULT_BRAND,
          channelUrl: ch.url || link.url,
          channelName: name,
        });
        react('✅');
        return reply(
          `✅ Canal detectado: *${name}*\n\n` +
          wm.statusText(saved, p)
        );
      } catch (e) {
        react('❌');
        return reply('❌ Falha a ler o canal: ' + (e.message || e));
      }
    }

    const saved = await wm.saveForJid(jid, {
      packName: raw.slice(0, 80),
      authorName: current?.authorName || wm.DEFAULT_BRAND,
      brand: current?.brand || wm.DEFAULT_BRAND,
      channelUrl: current?.channelUrl || '',
      channelName: current?.channelName || '',
    });
    react('✅');
    return reply(wm.statusText(saved, p));
  });

  // ── !ttp — Texto em sticker (fundo dark) ─────────────────────────
  registerCase(['ttp', 'texto', 'textsticker'], async ({ m, sock, ctx, args, prefix, reply, react }) => {
    const text = args.join(' ').trim();
    if (!text) return reply(`✍️ Uso: *${prefix}ttp* <texto>`);
    react('⏳');
    try {
      const url = `https://fakeimg.pl/512x512/1a1a2e/8B5CF6/?text=${encodeURIComponent(text)}&font_size=55`;
      const buf = await mediaHandler.fetchBuffer(url, 15000);
      if (!buf || buf.length < 500) throw new Error('sem imagem');
      const stk = await stickerMaker.create(buf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false, full: true,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: m.msg });
      react('✅');
    } catch (e) { react('❌'); reply('❌ ' + e.message); }
  });
};
