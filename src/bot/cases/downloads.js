/**
 * DARK BOT v5 — Cases de Downloads
 * Estilo switch/case com ButtonV2 real do @systemzero/baileys
 *
 * play   → busca + card ButtonV2 (Áudio / Vídeo)
 * play2  → mesmo fluxo, resultado alternativo
 * play3  → download directo alta qualidade
 * ytd    → download áudio por URL (disparado pelo botão)
 * gyt    → download vídeo por URL (disparado pelo botão)
 * video  → vídeo HD 720p directo
 * video2 → vídeo FHD 1080p directo
 */

'use strict';

const systemZeroPlay = require('../systemZeroPlay');
const ytdl           = require('../ytdl');
const mediaHandler   = require('../mediaHandler');
const config         = require('../../config');

const SZ_URL = (process.env.SYSTEMZONE_API_URL || 'https://systemzone.store').replace(/\/$/, '');
const SZ_KEY = process.env.SYSTEMZONE_API_KEY || 'freekey';

// ── Helper: envia áudio com card de metadados ─────────────────
async function sendAudioCard(sock, jid, quoted, r) {
  const { sendAudioWithCard } = require('../nativeCommands').__helpers || {};

  const title    = r.title    || 'Áudio';
  const author   = r.author   || '';
  const duration = r.duration || '';
  const mime     = r.mimetype || 'audio/mpeg';
  const ext      = mime.includes('mp4') ? 'm4a' : 'mp3';
  const fileName = `${title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.${ext}`;

  let thumbBuf = null;
  if (r.thumb || r.thumbnail) {
    try {
      thumbBuf = await mediaHandler.fetchBuffer(r.thumb || r.thumbnail);
      if (!thumbBuf || thumbBuf.length < 100) thumbBuf = null;
    } catch {}
  }

  const contextInfo = thumbBuf ? {
    externalAdReply: {
      title,
      body: [author && `👤 ${author}`, duration && `⏱️ ${duration}`].filter(Boolean).join('  •  ') || '🎵 DARK BOT',
      mediaType: 2,
      thumbnail: thumbBuf,
      mediaUrl: '',
      sourceUrl: '',
      renderLargerThumbnail: false,
    },
  } : undefined;

  const audioBuffer = r.buffer && Buffer.isBuffer(r.buffer)
    ? r.buffer
    : await mediaHandler.fetchBuffer(r.url);

  if (!audioBuffer || audioBuffer.length < 1024) throw new Error('áudio vazio');

  return sock.sendMessage(jid, { audio: audioBuffer, mimetype: mime, fileName, ptt: false, contextInfo }, { quoted });
}

// ── Helper: envia vídeo MP4 ──────────────────────────────────
async function sendVideoFile(sock, jid, quoted, buf, caption, title) {
  if (!buf || buf.length < 4096) throw new Error('vídeo vazio');
  // Detecta se é MP4 real
  const isMP4 = buf.slice(4, 8).toString() === 'ftyp';
  if (isMP4) {
    return sock.sendMessage(jid, { video: buf, caption, mimetype: 'video/mp4' }, { quoted });
  }
  // Fallback: envia como documento
  return sock.sendMessage(jid, {
    document: buf, fileName: `${(title || 'video').slice(0, 50)}.mp4`,
    mimetype: 'video/mp4', caption,
  }, { quoted });
}

// ─────────────────────────────────────────────────────────────
// CASES DE DOWNLOADS
// ─────────────────────────────────────────────────────────────
module.exports = function registerDownloadCases(registerCase) {

  // ════════════════════════════════════════════════
  // case 'play' — busca + ButtonV2 (Áudio / Vídeo)
  // ════════════════════════════════════════════════
  registerCase(['play', 'music', 'musica', 'yt', 'ytmp3'], async ({
    sock, msg, ctx, text, prefix, reply, react,
  }) => {
    if (!text) return reply(
      `🎵 *Exemplo:* \`${prefix}play Slash Inferno\`\n\n` +
      `• \`${prefix}play\` — busca e mostra opções\n` +
      `• \`${prefix}play2\` — resultado alternativo\n` +
      `• \`${prefix}play3\` — alta qualidade directa`
    );

    await react('🫡');

    try {
      const { ButtonV2 } = require('@systemzero/baileys/lib/MB.cjs');

      const searchData = await systemZeroPlay.ytSearch(text);
      if (!searchData?.length) {
        await react('❌');
        return reply('❌ Nenhum resultado encontrado.');
      }

      const video = searchData[0];
      const msg2  = new ButtonV2(sock);

      msg2.setTitle(`${video.title}`.slice(0, 60));
      msg2.setBody(
        `👤 ${video.author || 'Desconhecido'}\n` +
        `⏱️ ${video.duration || '?'} • 👁️ ${Number(video.views || 0).toLocaleString('pt-BR')}\n\n` +
        `✦ ݁˖ Selecione o formato desejado ✦ ݁˖`
      );
      msg2.setFooter(`${config.bot.name} 🕸️ Dark Side Engine`);

      if (video.thumbnail) {
        try { msg2.setThumbnail(video.thumbnail); } catch {}
      }

      msg2.addButton('🎵 Baixar Áudio', `${prefix}ytd ${video.youtube_url}`);
      msg2.addButton('🎬 Baixar Vídeo', `${prefix}gyt ${video.youtube_url} | mp4 | 720`);

      await msg2.send(ctx.remoteJid, { quoted: msg });
      await react('✅');

    } catch (e) {
      if (!e.message?.includes('rate-overlimit')) {
        console.error('[PLAY ERROR]', e.message);
        await react('❌');
        return reply('❌ Erro ao buscar: ' + e.message);
      }
    }
  });

  // ════════════════════════════════════════════════
  // case 'play2' — busca o 2º resultado
  // ════════════════════════════════════════════════
  registerCase(['play2', 'music2'], async ({
    sock, msg, ctx, text, prefix, reply, react,
  }) => {
    if (!text) return reply(`🎵 *Exemplo:* \`${prefix}play2 Central Cee Doja\``);

    await react('🫡');
    try {
      const { ButtonV2 } = require('@systemzero/baileys/lib/MB.cjs');
      const results = await systemZeroPlay.ytSearch(text);
      if (!results?.length) { await react('❌'); return reply('❌ Nenhum resultado encontrado.'); }

      const video = results[Math.min(1, results.length - 1)];
      const msg2  = new ButtonV2(sock);

      msg2.setTitle(`${video.title}`.slice(0, 60));
      msg2.setBody(
        `👤 ${video.author || 'Desconhecido'}\n` +
        `⏱️ ${video.duration || '?'} • 👁️ ${Number(video.views || 0).toLocaleString('pt-BR')}\n\n` +
        `✦ ݁˖ Resultado alternativo ✦ ݁˖`
      );
      msg2.setFooter(`${config.bot.name} 🕸️`);

      if (video.thumbnail) { try { msg2.setThumbnail(video.thumbnail); } catch {} }
      msg2.addButton('🎵 Baixar Áudio', `${prefix}ytd ${video.youtube_url}`);
      msg2.addButton('🎬 Baixar Vídeo', `${prefix}gyt ${video.youtube_url} | mp4 | 720`);

      await msg2.send(ctx.remoteJid, { quoted: msg });
      await react('✅');
    } catch (e) {
      await react('❌');
      return reply('❌ ' + e.message);
    }
  });

  // ════════════════════════════════════════════════
  // case 'play3' — alta qualidade directa (320kbps)
  // ════════════════════════════════════════════════
  registerCase(['play3', 'music3', 'hq'], async ({
    sock, msg, ctx, text, prefix, reply, react,
  }) => {
    if (!text) return reply(`🎵 *Alta qualidade (320kbps)*\n\nExemplo: \`${prefix}play3 nome da música\``);

    await react('⏳');
    try {
      const r = await ytdl.getAudio(text, '320k');
      await sendAudioCard(sock, ctx.remoteJid, msg, r);
      await react('✅');
    } catch (e) {
      await react('❌');
      return reply('❌ Falha no download.');
    }
  });

  // ════════════════════════════════════════════════
  // case 'ytd' — download áudio por URL (do botão)
  // ════════════════════════════════════════════════
  registerCase(['ytd', 'baixaraudio', 'dlmp3'], async ({
    sock, msg, ctx, text, args, prefix, reply, react,
  }) => {
    const url = (text || args.join(' ')).trim();
    if (!url) return reply(`🎵 Uso: \`${prefix}ytd <url YouTube>\``);

    await react('⏳');
    try {
      // Tenta SystemZone primeiro (mais rápido)
      let r;
      try {
        r = await systemZeroPlay.ytAudio(url);
      } catch {
        r = await ytdl.getAudio(url, '128k');
      }
      await sendAudioCard(sock, ctx.remoteJid, msg, r);
      await react('✅');
    } catch (e) {
      await react('❌');
      return reply('❌ Falha no download de áudio.');
    }
  });

  // ════════════════════════════════════════════════
  // case 'gyt' — download vídeo por URL (do botão)
  // ════════════════════════════════════════════════
  registerCase(['gyt', 'baixarvideo', 'dlmp4'], async ({
    sock, msg, ctx, text, args, prefix, reply, react,
  }) => {
    // Formato: <url> | mp4 | 720
    const raw   = (text || args.join(' ')).split('|')[0].trim();
    const url   = raw;
    if (!url) return reply(`🎬 Uso: \`${prefix}gyt <url YouTube>\``);

    await react('⏳');
    try {
      let r;
      try {
        r = await systemZeroPlay.ytVideo(url, '720');
        const buf = await mediaHandler.fetchBuffer(r.url);
        r.buffer = buf;
      } catch {
        r = await ytdl.getVideo(url, '720');
      }
      const cap = `🎬 *${r.title || 'Vídeo'}*\n👤 ${r.author || ''}\n⏱️ ${r.duration || '?'} | 📺 ${r.quality || '720p'}`;
      await sendVideoFile(sock, ctx.remoteJid, msg, r.buffer, cap, r.title);
      await react('✅');
    } catch (e) {
      await react('❌');
      return reply('❌ Falha no download de vídeo.');
    }
  });

  // ════════════════════════════════════════════════
  // case 'video' — vídeo HD 720p directo
  // ════════════════════════════════════════════════
  registerCase(['video', 'vid', 'ytmp4', 'yt4'], async ({
    sock, msg, ctx, text, prefix, reply, react,
  }) => {
    if (!text) return reply(
      `🎬 *Exemplo:* \`${prefix}video Naruto AMV\`\n\n` +
      `• \`${prefix}video\`  — 720p HD\n` +
      `• \`${prefix}video2\` — 1080p FHD`
    );
    await react('⏳');
    try {
      const r   = await ytdl.getVideo(text, '720');
      const cap = `🎬 *${r.title}*\n👤 ${r.author || ''} | ⏱️ ${r.duration || '?'} | 📺 720p HD`;
      await sendVideoFile(sock, ctx.remoteJid, msg, r.buffer, cap, r.title);
      await react('✅');
    } catch (e) {
      await react('❌');
      return reply('❌ Falha no download de vídeo.');
    }
  });

  // ════════════════════════════════════════════════
  // case 'video2' — vídeo FHD 1080p
  // ════════════════════════════════════════════════
  registerCase(['video2', 'vid2', 'fhd', 'fullhd'], async ({
    sock, msg, ctx, text, prefix, reply, react,
  }) => {
    if (!text) return reply(`🎬 *Full HD (1080p)*\n\nExemplo: \`${prefix}video2 nome do vídeo\``);
    await react('⏳');
    try {
      const r   = await ytdl.getVideo(text, '1080');
      const cap = `🎬 *${r.title}*\n👤 ${r.author || ''} | ⏱️ ${r.duration || '?'} | 📺 1080p FHD`;
      await sendVideoFile(sock, ctx.remoteJid, msg, r.buffer, cap, r.title);
      await react('✅');
    } catch (e) {
      await react('❌');
      return reply('❌ Falha no download FHD.');
    }
  });
};
