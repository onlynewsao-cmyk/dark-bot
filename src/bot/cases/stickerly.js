/**
 * DARK BOT v6.36 — STICKER.LY + PIN + ADAPTADOR
 * Comandos sticker.ly + pin adaptado + sem prefixo nas listas
 */
'use strict';

const config = require('../../config');
const stickerMaker = require('../stickerMaker');

module.exports = function registerStickerlyCases(registerCase) {

  // ═══ STICKER.LY — busca e importa pack ═══
  registerCase(['stickerly', 'sly', 'slypack'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const query = args.join(' ').trim();
    if (!query) return reply('🔍 Uso: ' + prefix + 'stickerly <nome do pack>\nEx: ' + prefix + 'stickerly anime cute');
    await sock.sendMessage(ctx.remoteJid, { react: { text: '🔍', key: msg.key } });
    try {
      const sly = require('../stickerly');
      const packs = await sly.searchPacks(query);
      if (!packs.length) throw new Error('Sem packs encontrados');
      const pack = await sly.getPack(packs[0].id);
      if (!pack.stickers.length) throw new Error('Pack sem stickers');
      const packId = 'sly-' + Date.now().toString(36);
      const packName = '📦 ' + (packs[0].title || query).slice(0, 20);
      const packAuthor = (packs[0].author || 'sticker.ly') + ' via DARK BOT';
      let count = 0;
      for (const s of pack.stickers.slice(0, 30)) {
        try {
          const buf = await require('../mediaHandler').fetchBuffer(s.url);
          if (!buf || buf.length < 500) continue;
          const stk = await stickerMaker.create(buf, {
            botName: config.bot.name, ownerName: config.owner.name,
            userName: ctx.pushName, groupName: ctx.groupName || 'PV',
            isVideo: s.isAnimated, packName, authorName: packAuthor, packId,
          });
          await sock.sendMessage(ctx.remoteJid, { sticker: stk });
          count++;
        } catch {}
      }
      await sock.sendMessage(ctx.remoteJid, {
        text: '✅ Pack *' + (packs[0].title || query) + '*\n📦 ' + count + ' stickers de sticker.ly\n👤 by ' + (packs[0].author || '?'),
      }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply('❌ sticker.ly: ' + e.message);
    }
  }, true);

  // ═══ PIN — Pinterest adaptado (estilo case.txt) ═══
  registerCase(['pin', 'polo'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const text = args.join(' ').trim();
    if (!text) return reply(
      '╔━᳀『 ᴘɪɴᴛʀᴇsᴛ 』═᳀\n' +
      '⌬ Use: *' + prefix + 'pin <termo>*\n' +
      '⌬ Ex: *' + prefix + 'pin gatos*\n' +
      '⌬ Ex: *' + prefix + 'pin gatos |6|vídeo*\n' +
      '⌬ Ex: *' + prefix + 'pin gatos |imagem*\n' +
      '⌬ Manda até 10 mídias em álbum\n' +
      '╚═━═━═━═━═━═━═━═᳀'
    );
    await sock.sendMessage(ctx.remoteJid, { react: { text: '🔎', key: msg.key } });
    try {
      const partes = text.split('|').map(p => p.trim()).filter(Boolean);
      const query = partes.shift();
      let limit = 6;
      let tipo = 'image';
      for (const p of partes) {
        if (/^\d+$/.test(p)) limit = Math.max(1, Math.min(10, parseInt(p, 10)));
        else if (/^v[ií]deos?$/i.test(p)) tipo = 'video';
        else if (/^(imagens?|imagem|fotos?|image)$/i.test(p)) tipo = 'image';
      }
      if (!query) return reply('Uso: ' + prefix + 'pin <termo> |qtd|tipo');

      // Tentar múltiplas APIs
      let results = [];
      const apis = [
        { url: 'https://api.siputzx.my.id/api/s/pinterest?query=' + encodeURIComponent(query), ext: r => r?.data },
        { url: 'https://api.lolhuman.xyz/api/pinterest?query=' + encodeURIComponent(query) + '&apikey=darkbot', ext: r => r?.result },
      ];
      for (const api of apis) {
        try {
          const r = await require('../mediaHandler').fetchJson(api.url, 15000);
          results = (api.ext(r) || []).filter(x => x?.image_url || x?.media_url || x?.url);
          if (results.length) break;
        } catch {}
      }
      if (!results.length) throw new Error('Nenhum resultado encontrado.');

      const items = results.slice(0, limit);
      for (const item of items) {
        const url = item.media_url || item.image_url || item.url;
        if (!url) continue;
        const isVid = item.type === 'video' || tipo === 'video' || /\.mp4/i.test(url);
        if (isVid) {
          const buf = await require('../mediaHandler').fetchBuffer(url);
          await sock.sendMessage(ctx.remoteJid, { video: buf, mimetype: 'video/mp4', caption: '📌 Pinterest — ' + query }, { quoted: msg });
        } else {
          await sock.sendMessage(ctx.remoteJid, { image: { url }, caption: '📌 Pinterest — ' + query }, { quoted: msg });
        }
      }
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply('❌ Pinterest: ' + e.message);
    }
  }, true);
};
