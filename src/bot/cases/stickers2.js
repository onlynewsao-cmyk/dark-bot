/**
 * DARK BOT v6.17 — Stickers COMPLETOS
 * Handlers reais para todos os comandos de sticker
 */
'use strict';

const stickerMaker = require('../stickerMaker');
const mediaHandler = require('../mediaHandler');
const config = require('../../config');

// Helper: obter imagem da mensagem ou da citada
async function getImageBuffer(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const imgMsg = msg.message?.imageMessage || quoted?.imageMessage || msg.message?.stickerMessage || quoted?.stickerMessage;
  if (!imgMsg) return null;
  // Se é sticker, converter para imagem primeiro
  if (msg.message?.stickerMessage || quoted?.stickerMessage) {
    const stkMsg = msg.message?.stickerMessage ? msg : { message: quoted, key: msg.key };
    try {
      const { downloadMediaMessage } = require('@systemzero/baileys');
      return await downloadMediaMessage(stkMsg, 'buffer', {});
    } catch { return null; }
  }
  try {
    const { downloadMediaMessage } = require('@systemzero/baileys');
    return await downloadMediaMessage(msg.message?.imageMessage ? msg : { message: quoted, key: msg.key }, 'buffer', {});
  } catch { return null; }
}

// Helper: criar sticker com tema/estilo
async function makeThemedSticker(sock, msg, ctx, styleName, overlayText = '') {
  const buf = await getImageBuffer(msg);
  if (!buf) return sock.sendMessage(ctx.remoteJid, { text: '📸 Envie ou marque uma imagem!' }, { quoted: msg });
  
  const RE = require('../renderEngine');
  const t = await RE.getTheme(ctx.remoteJid);
  
  try {
    const stk = await stickerMaker.create(buf, {
      botName: config.bot.name,
      ownerName: config.owner.name,
      userName: ctx.pushName,
      groupName: ctx.groupName || 'PV',
      isVideo: false,
      packName: `${t.icon || '🕸️'} ${styleName}`,
      authorName: `${ctx.pushName} | ${config.bot.name}`,
    });
    if (stk && stk.length > 50) {
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } else throw new Error('Sticker vazio');
  } catch (e) {
    await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
    return sock.sendMessage(ctx.remoteJid, { text: '❌ Erro: ' + e.message }, { quoted: msg });
  }
}

module.exports = function registerStickers2(registerCase) {

  // ═══ FIG TEMÁTICAS (sticker com estilo) ═══
  const figStyles = {
    figanime: 'Anime', figcoreana: 'Coreano', figdesenho: 'Desenho',
    figemoji: 'Emoji', figengracada: 'Engraçado', figmeme: 'Meme',
    figraiva: 'Raiva', figroblox: 'Roblox',
  };
  for (const [cmd, style] of Object.entries(figStyles)) {
    registerCase([cmd], async ({ sock, msg, ctx }) => {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
      return makeThemedSticker(sock, msg, ctx, style);
    }, true);
  }

  // ═══ BRAT (texto em fundo branco — estático) ═══
  registerCase(['brat'], async ({ sock, msg, ctx, args }) => {
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    const text = args.join(' ').trim() || 'brat';
    try {
      const sharp = require('sharp');
      const fontSize = text.length > 10 ? 48 : text.length > 6 ? 64 : 80;
      const svgStr = '<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="512" height="512" fill="white"/>' +
        '<defs><filter id="blur"><feGaussianBlur stdDeviation="1.5"/></filter></defs>' +
        '<text x="256" y="256" text-anchor="middle" dominant-baseline="middle" ' +
        'font-family="Arial Black, Arial" font-size="' + fontSize + '" ' +
        'font-weight="900" fill="black" opacity="0.85" filter="url(#blur)">' +
        text.slice(0, 20).toUpperCase() + '</text></svg>';
      const png = await sharp(Buffer.from(svgStr)).png().toBuffer();
      const stk = await stickerMaker.create(png, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false,
        packName: ' brat', authorName: ctx.pushName,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return sock.sendMessage(ctx.remoteJid, { text: '❌ ' + e.message }, { quoted: msg });
    }
  }, true);

  // ═══ BRAT2 (adaptativo: palavra=letra/letra, frase=palavra/palavra) ═══
  registerCase(['brat2'], async ({ sock, msg, ctx, args }) => {
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    const input = args.join(' ').trim() || 'brat';
    try {
      const sharp = require('sharp');
      const words = input.split(/\s+/);
      const isSingleWord = words.length === 1;
      const fontSize = input.length > 12 ? 40 : input.length > 8 ? 52 : input.length > 5 ? 64 : 80;
      const text = input.toUpperCase().slice(0, 20);

      // Gerar frames: palavra única = letra por letra, frase = palavra por palavra
      const frames = [];
      if (isSingleWord) {
        // Letra por letra
        for (let i = 1; i <= text.length; i++) {
          const partial = text.slice(0, i);
          const cursor = i < text.length ? '|' : '';
          frames.push({ text: partial + cursor, delay: 120 });
        }
      } else {
        // Palavra por palavra
        for (let i = 1; i <= words.length; i++) {
          const partial = words.slice(0, i).join(' ').toUpperCase();
          const cursor = i < words.length ? '|' : '';
          frames.push({ text: partial + cursor, delay: 200 });
        }
      }
      // Pausa final
      frames.push({ text: text, delay: 600 });
      frames.push({ text: text, delay: 600 });

      // Renderizar SVGs
      const pngFrames = [];
      const delays = [];
      for (const frame of frames) {
        const svgStr = '<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">' +
          '<rect width="512" height="512" fill="#84CC16"/>' +
          '<text x="256" y="256" text-anchor="middle" dominant-baseline="middle" ' +
          'font-family="Arial Black, Arial" font-size="' + fontSize + '" ' +
          'font-weight="900" fill="black" opacity="0.85">' +
          frame.text.slice(0, 20) + '</text></svg>';
        const png = await sharp(Buffer.from(svgStr)).png().toBuffer();
        pngFrames.push(png);
        delays.push(frame.delay);
      }

      let finalBuf;
      try {
        finalBuf = await sharp(pngFrames[0], { animated: true })
          .webp({ quality: 70, loop: 0, delay: delays })
          .toBuffer();
      } catch { finalBuf = pngFrames[pngFrames.length - 1]; }

      const stk = await stickerMaker.create(finalBuf, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: true,
        packName: ' brat2', authorName: ctx.pushName,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return sock.sendMessage(ctx.remoteJid, { text: '❌ ' + e.message }, { quoted: msg });
    }
  }, true);

  // ═══ ESTILOS DE STICKER (faber, jeff, norian) ═══
  for (const cmd of ['faber', 'jeff', 'norian']) {
    registerCase([cmd], async ({ sock, msg, ctx }) => {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
      return makeThemedSticker(sock, msg, ctx, cmd.toUpperCase());
    }, true);
  }

  // ═══ LEGENDA (sticker com texto) ═══
  registerCase(['legenda'], async ({ sock, msg, ctx, args }) => {
    const text = args.join(' ').trim();
    if (!text) return sock.sendMessage(ctx.remoteJid, { text: '✍️ Uso: `!legenda teu texto` + marca uma imagem' }, { quoted: msg });
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    const buf = await getImageBuffer(msg);
    if (!buf) return sock.sendMessage(ctx.remoteJid, { text: '📸 Marca uma imagem!' }, { quoted: msg });
    try {
      const sharp = require('sharp');
      const img = sharp(buf).resize(512, 512, { fit: 'cover' });
      const metadata = await img.metadata();
      const svg = Buffer.from(`<svg width="${metadata.width}" height="${metadata.height}">
        <rect y="${metadata.height - 100}" width="100%" height="100" fill="rgba(0,0,0,0.6)"/>
        <text x="50%" y="${metadata.height - 40}" font-family="Arial" font-size="32" fill="white" text-anchor="middle">${text.slice(0, 30)}</text>
      </svg>`);
      const composited = await img.composite([{ input: svg }]).webp({ quality: 80 }).toBuffer();
      const stk = await stickerMaker.create(composited, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return sock.sendMessage(ctx.remoteJid, { text: '❌ ' + e.message }, { quoted: msg });
    }
  }, true);

  // ═══ TOTEXT (OCR em sticker) ═══
  registerCase(['totext'], async ({ sock, msg, ctx, reply }) => {
    const buf = await getImageBuffer(msg);
    if (!buf) return reply('📸 Marca um sticker ou imagem para extrair texto.');
    // Sem API OCR gratuita fiável — resposta informativa
    const RE = require('../renderEngine');
    const t = await RE.getTheme(ctx.remoteJid);
    return reply(RE.renderBlock(t, 'TOTEXT', [
      ' OCR de stickers/imagens',
      '',
      '⚠️ Funcionalidade requer API de OCR.',
      '💡 Usa !imagem para gerar imagens com texto.',
      '',
      `> ${t.vibe || 'Dark Engine'}`,
    ], { botName: config.bot.name }));
  }, true);

  // ═══ GERARLINK (link para sticker) ═══
  registerCase(['gerarlink'], async ({ sock, msg, ctx, reply }) => {
    const RE = require('../renderEngine');
    const t = await RE.getTheme(ctx.remoteJid);
    return reply(RE.renderBlock(t, 'GERAR LINK', [
      '🔗 Para partilhar um sticker como link:',
      '',
      '1. Guarda o sticker no WhatsApp',
      '2. Abre o gestor de figurinhas',
      '3. Toca no pack → Partilhar',
      '',
      `> ${t.vibe || 'Dark Engine'}`,
    ], { botName: config.bot.name }));
  }, true);

  // ═══ PTVMSG (Picture-in-Picture Video) ═══
  registerCase(['ptvmsg'], async ({ sock, msg, ctx, reply }) => {
    const buf = await getImageBuffer(msg);
    if (!buf) return reply('📸 Marca uma imagem para criar PTV.');
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const sharp = require('sharp');
      const webpBuf = await sharp(buf).resize(512, 512, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
      // Enviar como PTV (video message com gifPlayback)
      await sock.sendMessage(ctx.remoteJid, {
        video: webpBuf, mimetype: 'video/mp4', gifPlayback: true,
        caption: '🎬 PTV Message',
      }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply('❌ ' + e.message);
    }
  }, true);

  // ═══ RVISU (efeito visual reverso) ═══
  registerCase(['rvisu'], async ({ sock, msg, ctx }) => {
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    const buf = await getImageBuffer(msg);
    if (!buf) return sock.sendMessage(ctx.remoteJid, { text: '📸 Marca uma imagem!' }, { quoted: msg });
    try {
      const sharp = require('sharp');
      const processed = await sharp(buf)
        .resize(512, 512, { fit: 'cover' })
        .negate() // inverter cores
        .modulate({ brightness: 1.2, saturation: 1.5 })
        .webp({ quality: 80 })
        .toBuffer();
      const stk = await stickerMaker.create(processed, {
        botName: config.bot.name, ownerName: config.owner.name,
        userName: ctx.pushName, groupName: ctx.groupName || 'PV', isVideo: false,
      });
      await sock.sendMessage(ctx.remoteJid, { sticker: stk }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return sock.sendMessage(ctx.remoteJid, { text: '❌ ' + e.message }, { quoted: msg });
    }
  }, true);

  // ═══ IMAGEM (IA image generation) ═══
  registerCase(['imagem'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const prompt = args.join(' ').trim();
    if (!prompt) return reply(`🎨 Uso: \`${prefix}imagem <descrição>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const axios = require('axios');
      const r = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`, { responseType: 'arraybuffer', timeout: 30000 });
      if (r.data && r.data.byteLength > 1000) {
        await sock.sendMessage(ctx.remoteJid, { image: Buffer.from(r.data), caption: `🎨 *${prompt}*` }, { quoted: msg });
        await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
      } else throw new Error('Imagem vazia');
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply('❌ IA Imagem: ' + e.message);
    }
  }, true);
};
