'use strict';
/**
 * DARK BOT — Conversão de mídia (v8.2) 🛠️
 * Comandos que convertem QUALQUER mídia citada:
 *  • tomp3 / mp4to3 / 4to3              → MP3 (192k)
 *  • tovoice / topt / mp4tovoice / mp3tovoice → nota de voz (OPUS, ptt)
 *  • togif / mp4togif                   → "GIF" (mp4 gifPlayback, ≤10s)
 *  • todoc                              → documento com extensão certa
 *  • videoaimg / mp4toimg / frame       → 1ª frame do vídeo em PNG
 *  (toimg continua nos stickers.js — sticker estático → imagem)
 */
const config = require('../../config');

async function errReply(sock, msg, ctx, text) {
  try {
    const RE = require('../renderEngine');
    const t = await RE.getTheme(ctx.remoteJid);
    return sock.sendMessage(ctx.remoteJid, { text: RE.renderBlock(t, 'ERRO', ['❌ ' + text], { botName: config.bot.name }) }, { quoted: msg });
  } catch {
    return sock.sendMessage(ctx.remoteJid, { text: '❌ ' + text }, { quoted: msg });
  }
}

/**
 * Núcleo partilhado: descarrega a mídia citada/própria, valida o tipo
 * para a conversão pedida, manda para o motor e envia max
 * 50 MB, com react de progresso e de conclusão.
 */
async function converter(caseCtx, modo) {
  const { sock, msg, m, quoted, ctx, prefix } = caseCtx;
  const CE = require('../convertEngine');
  const mediaH = require('../mediaHandler');

  const info = CE.mediaDe(msg, quoted);
  if (!info) {
    const uso = {
      mp3:   `🎵 Responde a um *vídeo/áudio* com \`${prefix}tomp3\``,
      voice: `🎙️ Responde a um *vídeo/áudio* com \`${prefix}tovoice\``,
      gif:   `🎞️ Responde a um *vídeo* (até 10s) com \`${prefix}togif\``,
      img:   `🖼️ Responde a um *vídeo* com \`${prefix}videoaimg\``,
      doc:   `📄 Responde a qualquer *mídia* com \`${prefix}todoc\``,
    };
    return errReply(sock, msg, ctx, uso[modo]);
  }
  if (!CE.ACEITA[modo].includes(info.kind)) {
    return errReply(sock, msg, ctx, `Essa mídia (${info.kind}) não dá para esta conversão — manda vídeo/áudio.`);
  }

  sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } }).catch(() => {});
  try {
    const buf = await mediaH.downloadFromMessage(info.msg);
    if (!buf?.length) throw new Error('a mídia veio vazia');
    if (buf.length > 50 * 1024 * 1024) throw new Error('mídia maior que 50 MB — corta antes 👍');

    const quando = Date.now();
    if (modo === 'mp3') {
      const mp3 = await CE.toMp3(buf, '192k');
      await sock.sendMessage(ctx.remoteJid, {
        audio: mp3, mimetype: 'audio/mpeg', ptt: false,
        fileName: `${modo}_${quando}.mp3`,
      }, { quoted: msg });
    } else if (modo === 'voice') {
      const opus = await CE.toOpus(buf);
      // onda sonora decorativa (64 picos)
      const wave = [];
      for (let i = 0; i < 64; i++) wave.push(Math.round(20 + 80 * Math.abs(Math.sin(i / 3))));
      await sock.sendMessage(ctx.remoteJid, {
        audio: opus, ptt: true,
        mimetype: 'audio/ogg; codecs=opus',
        fileName: `voice_${quando}.opus`,
        waveform: Buffer.from(wave),
      }, { quoted: msg });
    } else if (modo === 'gif') {
      const mp4 = await CE.toGifMp4(buf, 10);
      await sock.sendMessage(ctx.remoteJid, {
        video: mp4, gifPlayback: true, mimetype: 'video/mp4',
        fileName: `gif_${quando}.mp4`,
        caption: '',
      }, { quoted: msg });
    } else if (modo === 'img') {
      const png = await CE.toPng(buf);
      await sock.sendMessage(ctx.remoteJid, {
        image: png, mimetype: 'image/png',
        fileName: `frame_${quando}.png`,
      }, { quoted: msg });
    } else if (modo === 'doc') {
      await sock.sendMessage(ctx.remoteJid, {
        document: buf,
        fileName: `media_${quando}.${info.ext}`,
        mimetype: info.mimetype || 'application/octet-stream',
      }, { quoted: msg });
    }
    sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } }).catch(() => {});
  } catch (e) {
    sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }).catch(() => {});
    return errReply(sock, msg, ctx, e.message);
  }
}

module.exports = function (registerCase) {
  // MP3 local — coberto também pelo case downloads2 tomp3 (aliases isolados)
  registerCase(['mp4to3', '4to3', 'mp4paraaudio', 'videoparamp3'], async (cc) =>
    converter(cc, 'mp3'));

  // Nota de voz
  registerCase(['tovoice', 'topt', 'tovn', 'mp4tovoice', 'mp3tovoice', 'audioparavoice'], async (cc) =>
    converter(cc, 'voice'));

  // GIF (gifPlayback do WhatsApp é um mp4 mudo — até 10s)
  registerCase(['togif', 'mp4togif', 'videoparagif'], async (cc) =>
    converter(cc, 'gif'));

  // 1ª frame do vídeo como imagem (toimg de stickers continua na sua casa)
  registerCase(['videoaimg', 'mp4toimg', 'primeiraframe', 'videoframe'], async (cc) =>
    converter(cc, 'img'));

  // Mídia → documento com a extensão certa
  registerCase(['todoc', 'todocx', 'mediatodoc', 'enviarcomodocumento'], async (cc) =>
    converter(cc, 'doc'));
};
