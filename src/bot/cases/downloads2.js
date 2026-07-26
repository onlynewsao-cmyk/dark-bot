/**
 * DARK BOT v6.16 — Downloads COMPLETOS
 * Todos os comandos de download com lógica real
 * Usa dl/others.js + dl/social.js + dl/helpers.js
 */
'use strict';

const downloader = require('../downloader');
const mediaHandler = require('../mediaHandler');
const config = require('../../config');

// Helper: enviar áudio
async function sendAudio(sock, jid, quoted, r) {
  const buf = r.buffer || await mediaHandler.fetchBuffer(r.url || r.download || r.download_url);
  if (!buf || buf.length < 1024) throw new Error('áudio vazio');
  const title = r.title || 'Áudio';
  const mime = r.mimetype || 'audio/mpeg';
  const ext = mime.includes('mp4') ? 'm4a' : 'mp3';
  return sock.sendMessage(jid, {
    audio: buf, mimetype: mime,
    fileName: `${title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.${ext}`,
    ptt: false,
    contextInfo: r.thumbnail ? {
      externalAdReply: { title, body: r.author || '', mediaType: 2, thumbnail: await mediaHandler.fetchBuffer(r.thumbnail).catch(() => null), mediaUrl: '', sourceUrl: '' },
    } : undefined,
  }, { quoted });
}

// Helper: enviar vídeo
async function sendVideo(sock, jid, quoted, r) {
  const buf = r.buffer || await mediaHandler.fetchBuffer(r.url || r.download || r.download_url);
  if (!buf || buf.length < 4096) throw new Error('vídeo vazio');
  const isMP4 = buf.slice(4, 8).toString() === 'ftyp';
  if (isMP4) return sock.sendMessage(jid, { video: buf, caption: `🎬 *${r.title || 'Vídeo'}*`, mimetype: 'video/mp4' }, { quoted });
  return sock.sendMessage(jid, { document: buf, fileName: `${(r.title || 'video').slice(0, 50)}.mp4`, mimetype: 'video/mp4', caption: `🎬 *${r.title || 'Vídeo'}*` }, { quoted });
}

// Helper: resposta de erro com tema
async function errReply(sock, msg, ctx, text) {
  const RE = require('../renderEngine');
  const t = await RE.getTheme(ctx.remoteJid);
  return sock.sendMessage(ctx.remoteJid, { text: RE.renderBlock(t, 'ERRO', ['❌ ' + text], { botName: config.bot.name }) }, { quoted: msg });
}

module.exports = function registerDownloads2(registerCase) {

  // ═══ TIKTOK ═══
  registerCase(['tiktok', 'tt', 'ttk', 'ttk2', 'tiktok2'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const url = args.join(' ').trim();
    if (!url) return reply(`🎶 Uso: \`${prefix}tiktok <url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const dl = require('../dl/others');
      const r = await dl.tiktok(url);
      if (r.video || r.url || r.download) await sendVideo(sock, ctx.remoteJid, msg, r);
      else if (r.images?.length) { for (const img of r.images.slice(0, 10)) await sock.sendMessage(ctx.remoteJid, { image: { url: img } }, { quoted: msg }); }
      else throw new Error('Sem resultado');
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'TikTok: ' + e.message); }
  });

  // ═══ INSTAGRAM ═══
  registerCase(['instagram', 'ig', 'instamp3', 'instamp4', 'igstory'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const url = args.join(' ').trim();
    if (!url) return reply(`📸 Uso: \`${prefix}instagram <url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const dl = require('../dl/others');
      const r = await dl.instagram(url);
      const items = Array.isArray(r) ? r : [r];
      for (const item of items.slice(0, 10)) {
        if (item.video || item.url?.match(/\.mp4/i)) await sendVideo(sock, ctx.remoteJid, msg, item);
        else await sock.sendMessage(ctx.remoteJid, { image: { url: item.image || item.url || item.thumbnail } }, { quoted: msg });
      }
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'Instagram: ' + e.message); }
  });

  // ═══ FACEBOOK ═══
  registerCase(['facebook', 'fb', 'fbvideo', 'fbphoto', 'fbfoto'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const url = args.join(' ').trim();
    if (!url) return reply(`📘 Uso: \`${prefix}facebook <url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const dl = require('../dl/others');
      const r = await dl.facebook(url);
      await sendVideo(sock, ctx.remoteJid, msg, r);
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'Facebook: ' + e.message); }
  });

  // ═══ TWITTER ═══
  registerCase(['twitter', 'tw', 'twitterdl'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const url = args.join(' ').trim();
    if (!url) return reply(`🐦 Uso: \`${prefix}twitter <url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const dl = require('../dl/others');
      const r = await dl.twitter(url);
      const items = Array.isArray(r) ? r : [r];
      for (const item of items.slice(0, 5)) {
        if (item.video || item.url?.match(/\.mp4/i)) await sendVideo(sock, ctx.remoteJid, msg, item);
        else await sock.sendMessage(ctx.remoteJid, { image: { url: item.image || item.url } }, { quoted: msg });
      }
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'Twitter: ' + e.message); }
  });

  // ═══ SPOTIFY ═══
  registerCase(['spotify', 'spotify2', 'sp'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const query = args.join(' ').trim();
    if (!query) return reply(`💚 Uso: \`${prefix}spotify <nome ou url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const dl = require('../dl/others');
      const r = await dl.spotify(query);
      await sendAudio(sock, ctx.remoteJid, msg, r);
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'Spotify: ' + e.message); }
  });

  // ═══ SOUNDCLOUD ═══
  registerCase(['soundcloud', 'sc', 'scdl'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const query = args.join(' ').trim();
    if (!query) return reply(`☁️ Uso: \`${prefix}soundcloud <nome ou url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const dl = require('../dl/others');
      const r = await dl.soundcloud(query);
      await sendAudio(sock, ctx.remoteJid, msg, r);
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'SoundCloud: ' + e.message); }
  });

  // ═══ PINTEREST (imagem/vídeo) ═══
  registerCase(['pinterest2', 'pintemp3', 'pintemp4'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const query = args.join(' ').trim();
    if (!query) return reply(`📌 Uso: \`${prefix}pinterest <busca ou url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const dl = require('../dl/others');
      if (/^https?:\/\//i.test(query)) {
        const r = await dl.pinterest(query);
        if (r.video || r.url?.match(/\.mp4/i)) await sendVideo(sock, ctx.remoteJid, msg, r);
        else await sock.sendMessage(ctx.remoteJid, { image: { url: r.image || r.url || r.image_url } }, { quoted: msg });
      } else {
        const results = await dl.pinterestSearch(query);
        if (results?.length) await sock.sendMessage(ctx.remoteJid, { image: { url: results[0].image_url || results[0].url } }, { quoted: msg });
        else throw new Error('Sem resultados');
      }
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'Pinterest: ' + e.message); }
  });

  // ═══ YOUTUBE AUDIO (aliases de ytd) ═══
  registerCase(['baixaraudio', 'dlmp3', 'ytmp3', 'ytaudio', 'tomp3', 'ytmp3s', 'dlmp3s'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const url = args.join(' ').trim();
    if (!url) return reply(`🎵 Uso: \`${prefix}ytd <url YouTube>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const ytdl = require('../ytdl');
      const r = await ytdl.getAudio(url, '128k');
      await sendAudio(sock, ctx.remoteJid, msg, r);
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'Áudio: ' + e.message); }
  });

  // ═══ YOUTUBE VIDEO (aliases de gyt/video) ═══
  registerCase(['baixarvideo', 'dlmp4', 'ytmp4', 'yt4', 'vid', 'fhd', 'ytmp4s', 'yt4v2', 'yt4k', 'ytplay4'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const url = args.join(' ').trim();
    if (!url) return reply(`🎬 Uso: \`${prefix}video <url ou busca>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const ytdl = require('../ytdl');
      const r = await ytdl.getVideo(url, '720');
      await sendVideo(sock, ctx.remoteJid, msg, r);
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'Vídeo: ' + e.message); }
  });

  // ═══ VIDEO FHD (aliases de video2) ═══
  registerCase(['vid2', 'playvid', 'playvid2'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const query = args.join(' ').trim();
    if (!query) return reply(`📺 Uso: \`${prefix}video2 <busca ou url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const ytdl = require('../ytdl');
      const r = await ytdl.getVideo(query, '1080');
      await sendVideo(sock, ctx.remoteJid, msg, r);
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'FHD: ' + e.message); }
  });

  // ═══ PLAY POR ID ═══
  registerCase(['playid', 'playmax'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const id = args.join(' ').trim();
    if (!id) return reply(`🎵 Uso: \`${prefix}playid <id ou url>\``);
    const url = id.startsWith('http') ? id : `https://youtube.com/watch?v=${id}`;
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const ytdl = require('../ytdl');
      const r = await ytdl.getAudio(url, '128k');
      await sendAudio(sock, ctx.remoteJid, msg, r);
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, e.message); }
  });

  // ═══ GDRIVE ═══
  registerCase(['gdrive'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const url = args.join(' ').trim();
    if (!url) return reply(`📁 Uso: \`${prefix}gdrive <url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const axios = require('axios');
      const id = url.match(/\/d\/([^/]+)/)?.[1] || url.match(/id=([^&]+)/)?.[1];
      if (!id) throw new Error('ID do Google Drive não encontrado');
      const dlUrl = `https://drive.google.com/uc?export=download&id=${id}`;
      const r = await axios.get(dlUrl, { responseType: 'stream', maxRedirects: 5, timeout: 30000 });
      const chunks = [];
      for await (const chunk of r.data) chunks.push(chunk);
      const buf = Buffer.concat(chunks);
      const fname = r.headers['content-disposition']?.match(/filename="?([^"]+)"?/)?.[1] || 'arquivo';
      await sock.sendMessage(ctx.remoteJid, { document: buf, fileName: fname, mimetype: r.headers['content-type'] || 'application/octet-stream' }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'GDrive: ' + e.message); }
  });

  // ═══ MEDIAFIRE ═══
  registerCase(['mediafire'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const url = args.join(' ').trim();
    if (!url) return reply(` Uso: \`${prefix}mediafire <url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const axios = require('axios');
      const page = (await axios.get(url, { timeout: 15000 })).data;
      const dlUrl = page.match(/href="(https:\/\/download[^"]+)"/)?.[1] || page.match(/"download_link"\s*:\s*"([^"]+)"/)?.[1];
      if (!dlUrl) throw new Error('Link de download não encontrado');
      const r = await axios.get(dlUrl.replace(/\\//g, '/'), { responseType: 'stream', timeout: 60000 });
      const chunks = [];
      for await (const chunk of r.data) chunks.push(chunk);
      const buf = Buffer.concat(chunks);
      const fname = url.split('/').pop() || 'arquivo';
      await sock.sendMessage(ctx.remoteJid, { document: buf, fileName: fname, mimetype: r.headers['content-type'] || 'application/octet-stream' }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'MediaFire: ' + e.message); }
  });

  // ═══ SHAZAM ═══
  registerCase(['shazam'], async ({ sock, msg, ctx, args, reply }) => {
    const RE = require('../renderEngine');
    const t = await RE.getTheme(ctx.remoteJid);
    return reply(RE.renderBlock(t, 'SHAZAM', ['🎵 Marca um áudio para identificar a música.', '', `> ${t.vibe || 'Dark Engine'}`], { botName: config.bot.name }));
  });

  // ═══ MYINSTANTS ═══
  registerCase(['myinstants'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const query = args.join(' ').trim();
    if (!query) return reply(`🔊 Uso: \`${prefix}myinstants <nome do som>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const axios = require('axios');
      const r = await axios.get(`https://www.myinstants.com/api/search/?term=${encodeURIComponent(query)}`, { timeout: 10000 });
      const results = r.data?.results;
      if (!results?.length) throw new Error('Sem resultados');
      const mp3Url = `https://www.myinstants.com${results[0].mp3}`;
      const buf = await mediaHandler.fetchBuffer(mp3Url);
      await sock.sendMessage(ctx.remoteJid, { audio: buf, mimetype: 'audio/mpeg', fileName: results[0].name + '.mp3', ptt: true }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'MyInstants: ' + e.message); }
  });

  // ═══ KWAI ═══
  registerCase(['kwai'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const url = args.join(' ').trim();
    if (!url) return reply(`📱 Uso: \`${prefix}kwai <url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const axios = require('axios');
      const r = await axios.get(`https://api.zahwazein.xyz/downloader/kwai?url=${encodeURIComponent(url)}`, { timeout: 15000 });
      const dlUrl = r.data?.result?.url || r.data?.result?.video;
      if (!dlUrl) throw new Error('Sem resultado');
      const buf = await mediaHandler.fetchBuffer(dlUrl);
      await sendVideo(sock, ctx.remoteJid, msg, { buffer: buf, title: 'Kwai' });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'Kwai: ' + e.message); }
  });

  // ═══ MCPLUGIN ═══
  registerCase(['mcplugin'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const query = args.join(' ').trim();
    if (!query) return reply(`⛏️ Uso: \`${prefix}mcplugin <nome do plugin>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const axios = require('axios');
      const r = await axios.get(`https://api.spiget.org/v2/search/resources/${encodeURIComponent(query)}?size=1`, { timeout: 10000 });
      if (!r.data?.length) throw new Error('Plugin não encontrado');
      const plugin = r.data[0];
      const dlUrl = `https://api.spiget.org/v2/resources/${plugin.id}/download`;
      const buf = await mediaHandler.fetchBuffer(dlUrl);
      await sock.sendMessage(ctx.remoteJid, { document: buf, fileName: `${plugin.name}.jar`, mimetype: 'application/java-archive', caption: `⛏️ *${plugin.name}*\n📝 ${plugin.tag || ''}` }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'MCPlugin: ' + e.message); }
  });

  // ═══ TIKTOK SEARCH POR NOME (ttks) ═══
  registerCase(['ttks', 'ttsearch', 'tiktoksearch', 'tts'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const query = args.join(' ').trim();
    if (!query) return reply(`🎶 Uso: \`${prefix}ttks <nome da música ou busca>\`\nEx: \`${prefix}ttks central cee band4band\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '🔍', key: msg.key } });
    try {
      const dl = require('../dl/others');
      const results = await dl.tiktokSearch(query, 3);
      if (!results.length) throw new Error('Nenhum vídeo encontrado para: ' + query);
      
      await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
      
      // Envia o primeiro resultado como vídeo
      const r = results[0];
      if (r.url) {
        await sendVideo(sock, ctx.remoteJid, msg, r);
      } else {
        throw new Error('Sem URL de download');
      }
      
      // Se há mais resultados, informa
      if (results.length > 1) {
        const RE = require('../renderEngine');
        const t = await RE.getTheme(ctx.remoteJid);
        const extra = results.slice(1).map((v, i) => `${i + 2}. ${v.title?.slice(0, 50) || 'TikTok'} — @${v.author || '?'}`).join('\n');
        await reply(RE.renderBlock(t, 'TIKTOK', [`🎬 Mais resultados para "${query}":`, extra, `> Usa ${prefix}ttks <número> para baixar outro`], { botName: config.bot.name }));
      }
      
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return errReply(sock, msg, ctx, 'TikTok Search: ' + e.message);
    }
  });

  // ═══ TIKTOK STALK ═══
  registerCase(['tiktoktxt'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const user = args.join(' ').trim();
    if (!user) return reply(`🎶 Uso: \`${prefix}tiktoktxt <username>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });
    try {
      const axios = require('axios');
      const r = await axios.get(`https://api.zahwazein.xyz/stalker/tiktok?username=${encodeURIComponent(user.replace('@', ''))}`, { timeout: 10000 });
      const d = r.data?.result || r.data;
      if (!d) throw new Error('Utilizador não encontrado');
      const RE = require('../renderEngine');
      const t = await RE.getTheme(ctx.remoteJid);
      const text = RE.renderBlock(t, 'TIKTOK STALK', [
        `👤 *${d.nickname || d.username || user}*`,
        `📝 @${d.username || user}`,
        `👥 Seguidores: ${d.followers || '?'}`,
        `❤️ Likes: ${d.likes || '?'}`,
        `🎬 Vídeos: ${d.videos || '?'}`,
        `📝 Bio: ${(d.bio || 'sem bio').slice(0, 100)}`,
      ], { botName: config.bot.name });
      await sock.sendMessage(ctx.remoteJid, { text }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }); return errReply(sock, msg, ctx, 'TikTok Stalk: ' + e.message); }
  });

  // ═══ REMOVER down/downloads do submenu (são navegação) ═══
  // Estes comandos abrem o submenu, não fazem download
  registerCase(['down', 'downloads'], async ({ sock, msg, ctx, config: cfg }) => {
    // Redireciona para o submenu dinâmico
    const sd = require('../submenuData');
    const ch = require('../caseHandler');
    const allCmds = [...ch.CASES.keys()];
    const items = sd.buildItems(allCmds, 'downloads');
    const RE = require('../renderEngine');
    const t = await RE.getTheme(ctx.remoteJid);
    const pe = require('../prefixEngine');
    const p = await pe.getActivePrefix(ctx.remoteJid).catch(() => (cfg || config).bot.prefix);
    const txtCmds = items.filter(it => it.sel !== true);
    const selCmds = items.filter(it => it.sel === true);
    const textBody = RE.renderSubmenu(t, 'DOWNLOADS', txtCmds.map(it => ({ name: it.cmd, desc: it.desc })), { prefix: p, botName: (cfg || config).bot.name });
    const rows = selCmds.slice(0, 24).map(it => ({ title: `${it.emoji || '📥'} ${p}${it.cmd}`, description: (it.desc || '').slice(0, 72), id: `${p}${it.cmd}` }));
    if (rows.length) {
      try {
        const { generateWAMessageFromContent, proto } = require('@systemzero/baileys');
        const m = generateWAMessageFromContent(ctx.remoteJid, {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.fromObject({ text: textBody }),
            footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: `${t.icon || '🕸️'} ${(cfg || config).bot.name}` }),
            header: proto.Message.InteractiveMessage.Header.fromObject({ title: '', hasMediaAttachment: false }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
              buttons: [{ name: 'single_select', buttonParamsJson: JSON.stringify({ title: `${t.icon || '🕸️'} DOWNLOADS`, sections: [{ title: 'AÇÕES DIRECTAS', rows }] }) }],
            }),
          }),
        }, { userJid: sock.user?.id, quoted: msg });
        await sock.relayMessage(ctx.remoteJid, m.message, { messageId: m.key.id, additionalNodes: [{ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }] }] });
        return;
      } catch {}
    }
    return sock.sendMessage(ctx.remoteJid, { text: textBody }, { quoted: msg });
  });
};
