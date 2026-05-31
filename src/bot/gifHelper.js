/**
 * gifHelper.js — GIF/MP4 via Tenor API v2
 *
 * Usado por: interactions, family, economy, percentuais
 * Retorna MP4 buffer compatível com WhatsApp (gifPlayback: true)
 */

const { execSync } = require('child_process');
const mediaHandler = require('./mediaHandler');

const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const TIMEOUT = 6000; // 6s

/**
 * Busca URL de MP4 no Tenor para uma query
 * @param {string} query - termo de busca
 * @param {number} limit - quantos resultados pegar (escolhe aleatório)
 * @returns {string|null} URL do MP4 ou null se falhar
 */
function fetchTenorMp4Url(query, limit = 8) {
  try {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=${limit}&media_filter=mp4`;
    const json = execSync(`curl -sL "${url}" --max-time 5`, { timeout: TIMEOUT }).toString();
    const data = JSON.parse(json);
    const results = data.results || [];
    if (!results.length) return null;
    const chosen = results[Math.floor(Math.random() * results.length)];
    return chosen.media_formats?.mp4?.url || chosen.media_formats?.tinymp4?.url || null;
  } catch (e) {
    return null;
  }
}

/**
 * Busca e baixa o buffer MP4 do Tenor
 * @param {string} query
 * @returns {Buffer|null}
 */
async function fetchGifBuffer(query) {
  const url = fetchTenorMp4Url(query);
  if (!url) return null;
  try {
    const buf = await mediaHandler.fetchBuffer(url);
    if (!buf || buf.length < 100 || buf.length > MAX_SIZE) return null;
    return buf;
  } catch (e) {
    return null;
  }
}

/**
 * Envia mensagem com GIF MP4 como gifPlayback.
 * Se falhar, envia só texto.
 *
 * @param {object} sock
 * @param {object} msg
 * @param {object} ctx
 * @param {string} text - legenda da mensagem
 * @param {string[]} mentions - JIDs mencionados
 * @param {string} query - query de busca no Tenor
 */
async function sendWithGif(sock, msg, ctx, text, mentions, query) {
  if (query) {
    try {
      const buf = await fetchGifBuffer(query);
      if (buf) {
        return sock.sendMessage(ctx.remoteJid, {
          video: buf,
          gifPlayback: true,
          caption: text,
          mentions: mentions || [],
          mimetype: 'video/mp4',
        }, { quoted: msg });
      }
    } catch (e) {}
  }
  // Fallback: só texto
  return sock.sendMessage(ctx.remoteJid, {
    text,
    mentions: mentions || [],
  }, { quoted: msg });
}

module.exports = { fetchGifBuffer, fetchTenorMp4Url, sendWithGif };
