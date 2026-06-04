/**
 * gifHelper.js — GIF/MP4 via Tenor API v2
 * Usado por: interactions, family, economy, percentuais
 *
 * Envia como video com gifPlayback:true — reproduz animado no WhatsApp.
 * Fallback automático para texto puro se o GIF não carregar.
 */

const mediaHandler = require('./mediaHandler');

const TENOR_KEY  = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const MAX_BYTES  = 4 * 1024 * 1024;  // 4 MB — limite seguro para gifPlayback
const TIMEOUT_MS = 5000;

/**
 * Busca URL de MP4 no Tenor (usa fetchJson interno = sem curl/execSync)
 */
async function fetchTenorMp4Url(query, limit = 8) {
  try {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=${limit}&media_filter=mp4`;
    const data = await Promise.race([
      mediaHandler.fetchJson(url),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS)),
    ]);
    const results = data?.results || [];
    if (!results.length) return null;
    const chosen = results[Math.floor(Math.random() * results.length)];
    // Prefere mp4 pequeno (tinymp4) para velocidade; se não, usa mp4 normal
    return chosen.media_formats?.tinymp4?.url || chosen.media_formats?.mp4?.url || null;
  } catch {
    return null;
  }
}

/**
 * Baixa o buffer do MP4
 */
async function fetchGifBuffer(query) {
  const url = await fetchTenorMp4Url(query);
  if (!url) return null;
  try {
    const buf = await Promise.race([
      mediaHandler.fetchBuffer(url),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
    ]);
    if (!buf || buf.length < 500 || buf.length > MAX_BYTES) return null;
    return buf;
  } catch {
    return null;
  }
}

/**
 * Envia mensagem com GIF animado (gifPlayback: true).
 * Se o GIF não carregar em tempo, envia só texto.
 *
 * @param {object} sock
 * @param {object} msg
 * @param {object} ctx
 * @param {string} text       - texto da mensagem
 * @param {string[]} mentions - JIDs mencionados
 * @param {string|null} query - termo de busca no Tenor (null = só texto)
 */
async function sendWithGif(sock, msg, ctx, text, mentions, query) {
  mentions = mentions || [];

  if (query) {
    try {
      const buf = await fetchGifBuffer(query);
      if (buf) {
        return sock.sendMessage(ctx.remoteJid, {
          video: buf,
          gifPlayback: true,
          caption: text,
          mentions,
          mimetype: 'video/mp4',
        }, { quoted: msg });
      }
    } catch { /* ignora — cai no fallback */ }
  }

  // Fallback: só texto
  return sock.sendMessage(ctx.remoteJid, { text, mentions }, { quoted: msg });
}

module.exports = { fetchGifBuffer, fetchTenorMp4Url, sendWithGif };
