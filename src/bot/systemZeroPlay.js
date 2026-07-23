/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   DARK BOT — SystemZero Play Engine v1                  ║
 * ║   play / play2 / play3 com ButtonV2 real                ║
 * ║   Usa @systemzero/baileys para botões clicáveis         ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Fluxo:
 *  1. Busca a música na API ytsearch do systemzone.store
 *  2. Mostra card com thumbnail + 2 botões (Áudio / Vídeo)
 *  3. Quando clica num botão → dispara !ytd (áudio) ou !gyt (vídeo)
 *  4. !ytd e !gyt chamam a API ytmp3 / ytmp4 do systemzone.store
 *
 * Fallback (se ButtonV2 falhar):
 *  → Envia texto formatado com os comandos para o utilizador copiar
 */

const mediaHandler = require('./mediaHandler');
const config = require('../config');

const SYSTEMZONE_API_URL = (process.env.SYSTEMZONE_API_URL || 'https://systemzone.store').replace(/\/$/, '');
const SYSTEMZONE_API_KEY = process.env.SYSTEMZONE_API_KEY || 'freekey';

// ─────────────────────────────────────────────
// LAZY LOAD ButtonV2 (só quando necessário)
// ─────────────────────────────────────────────
let _ButtonV2 = null;
function getButtonV2() {
  if (_ButtonV2) return _ButtonV2;
  try {
    const mod = require('@systemzero/baileys/lib/MB.cjs');
    _ButtonV2 = mod.ButtonV2;
    return _ButtonV2;
  } catch (e) {
    console.warn('[SystemZeroPlay] @systemzero/baileys não instalado:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// API: BUSCA YOUTUBE
// ─────────────────────────────────────────────
async function ytSearch(query) {
  const url = `${SYSTEMZONE_API_URL}/api/ytsearch?text=${encodeURIComponent(query)}&apikey=${encodeURIComponent(SYSTEMZONE_API_KEY)}`;
  const data = await mediaHandler.fetchJson(url, 20000);
  if (!data?.resultados?.length) throw new Error('Nenhum resultado encontrado para: ' + query);
  return data.resultados;
}

// ─────────────────────────────────────────────
// API: DOWNLOAD ÁUDIO
// ─────────────────────────────────────────────
async function ytAudio(urlOrQuery) {
  // Tenta ytmp3
  try {
    const endpoint = `${SYSTEMZONE_API_URL}/api/ytmp3?text=${encodeURIComponent(urlOrQuery)}&apikey=${encodeURIComponent(SYSTEMZONE_API_KEY)}`;
    const data = await mediaHandler.fetchJson(endpoint, 65000);
    const r = data?.result || data?.data || data;
    const u = r?.download || r?.download_url || r?.url || data?.download_url;
    if ((data?.status === 'sucesso' || data?.status === true) && u) {
      return {
        url: String(u).replace(/^http:\/\//i, 'https://'),
        title: r?.title || data?.title || 'Áudio',
        author: r?.author || data?.artist || '',
        duration: r?.duration || data?.duration || '',
        thumbnail: r?.thumbnail || data?.thumbnail || '',
        source: 'SystemZone-ytmp3',
      };
    }
  } catch (e) {
    console.warn('[ytAudio] ytmp3 falhou:', e.message);
  }
  throw new Error('Download de áudio falhou. Tente de novo em alguns segundos.');
}

// ─────────────────────────────────────────────
// API: DOWNLOAD VÍDEO
// ─────────────────────────────────────────────
async function ytVideo(urlOrQuery, quality = '720') {
  try {
    const endpoint = `${SYSTEMZONE_API_URL}/api/ytmp4?text=${encodeURIComponent(urlOrQuery)}&apikey=${encodeURIComponent(SYSTEMZONE_API_KEY)}`;
    const data = await mediaHandler.fetchJson(endpoint, 65000);
    const r = data?.result || data?.data || data;
    const u = r?.download || r?.download_url || r?.url;
    if (data?.status && u) {
      return {
        url: String(u).replace(/^http:\/\//i, 'https://'),
        title: r?.title || 'Vídeo',
        duration: r?.duration || '',
        quality: r?.quality || quality + 'p',
        thumbnail: r?.thumbnail || '',
        source: 'SystemZone-ytmp4',
      };
    }
  } catch (e) {
    console.warn('[ytVideo] ytmp4 falhou:', e.message);
  }
  throw new Error('Download de vídeo falhou. Tente de novo.');
}

// ─────────────────────────────────────────────
// HELPER: Texto de fallback formatado
// ─────────────────────────────────────────────
function playFallbackText(video, prefix, mode = 'audio') {
  const audioCmd = `${prefix}ytd ${video.youtube_url}`;
  const videoCmd = `${prefix}gyt ${video.youtube_url} | mp4 | 720`;
  return (
    `🎵 *${video.title}*\n` +
    `👤 ${video.author || 'Desconhecido'}\n` +
    `⏱️ ${video.duration || '?'} • 👁️ ${Number(video.views || 0).toLocaleString('pt-BR')}\n\n` +
    `▶️ Escolha uma opção:\n` +
    `┃ 🎵 Áudio → \`${audioCmd}\`\n` +
    `┃ 🎬 Vídeo → \`${videoCmd}\`\n\n` +
    `💡 Clique no texto para copiar e envia o comando desejado.`
  );
}

// ─────────────────────────────────────────────
// ENVIAR CARD COM BOTÕES (ButtonV2 real)
// ─────────────────────────────────────────────
async function sendPlayCard(sock, jid, video, prefix, quoted = null) {
  const ButtonV2 = getButtonV2();

  const audioCmd = `${prefix}ytd ${video.youtube_url}`;
  const videoCmd = `${prefix}gyt ${video.youtube_url} | mp4 | 720`;

  if (ButtonV2) {
    try {
      const msg = new ButtonV2(sock);
      msg.setTitle(video.title?.slice(0, 60) || 'Música');
      msg.setBody(
        `👤 ${video.author || 'Desconhecido'}\n` +
        `⏱️ ${video.duration || '?'} • 👁️ ${Number(video.views || 0).toLocaleString('pt-BR')}\n\n` +
        `✦ ݁˖ Selecione o formato desejado ✦ ݁˖`
      );
      msg.setFooter(config.bot.name + ' 🕸️ Dark Side Engine');

      if (video.thumbnail) {
        try { msg.setThumbnail(video.thumbnail); } catch {}
      }

      msg.addButton('🎵 Baixar Áudio', audioCmd);
      msg.addButton('🎬 Baixar Vídeo', videoCmd);

      await msg.send(jid, { quoted });
      return true;
    } catch (e) {
      console.warn('[SystemZeroPlay] ButtonV2 falhou:', e.message);
    }
  }

  // Fallback: texto formatado
  await sock.sendMessage(jid, {
    text: playFallbackText(video, prefix),
  }, { quoted });
  return false;
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  ytSearch,
  ytAudio,
  ytVideo,
  sendPlayCard,
  playFallbackText,
  SYSTEMZONE_API_URL,
  SYSTEMZONE_API_KEY,
};
