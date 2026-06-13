/**
 * Download Helpers v2 — APIs atualizadas 2025/2026
 *
 * Substituída a antiga API princetechn.com (offline) por:
 *  1. Cobalt API (open-source, multi-plataforma)
 *  2. tikwm.com (TikTok específico)
 *  3. spotifydown.com (Spotify específico)
 *  4. siputzx (Pinterest específico)
 *  5. ytdl-core (YouTube local fallback — OPCIONAL, requer @distube/ytdl-core)
 *
 * Se @distube/ytdl-core não estiver instalado, as funções que dependem dele
 * fazem fallback automático para APIs externas.
 */

const yts = require('yt-search');
const mediaHandler = require('../mediaHandler');

// ==================== APIs FUNCIONAIS 2025/2026 ====================
const COBALT = 'https://api.cobalt.tools';
const TIKWM = 'https://www.tikwm.com/api';
const SPOTIFYDOWN = 'https://api.spotifydown.com';
const SIPUTZX = 'https://api.siputzx.my.id/api';

// ytdl-core é opcional — o fluxo principal usa yt-dlp via downloader.js
let ytdl = null;
try {
  ytdl = require('@distube/ytdl-core');
} catch (e) {
  console.log('[DL-HELPERS] @distube/ytdl-core não instalado — usando APIs externas como fallback');
}

function extractYtId(url) {
  if (!url) return '';
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return '';
}

async function searchYoutube(query) {
  if (/^https?:\/\//.test(query) || extractYtId(query)) {
    return query.startsWith('http') ? query : 'https://www.youtube.com/watch?v=' + extractYtId(query);
  }
  try {
    const r = await yts(query);
    const v = r.videos && r.videos[0];
    if (v && v.url) { console.log('[YT-SEARCH] ' + query + ' -> ' + v.title); return v.url; }
  } catch (e) {}
  throw new Error('Video nao encontrado: ' + query);
}

async function searchYoutubeFull(query) {
  if (/^https?:\/\//.test(query) || extractYtId(query)) return null;
  try { const r = await yts(query); return (r.videos && r.videos[0]) || null; }
  catch (e) { return null; }
}

/**
 * Tenta múltiplas APIs em sequência, retorna a primeira que entregar URL válida.
 */
async function tryApis(apis, parser, label) {
  label = label || 'API';
  const errors = [];
  for (let i = 0; i < apis.length; i++) {
    try {
      const apiDef = apis[i];
      let r;
      if (typeof apiDef === 'object' && apiDef.method === 'POST') {
        r = await mediaHandler.fetchJsonPost(apiDef.url, apiDef.body, apiDef.headers, 25000);
      } else {
        r = await mediaHandler.fetchJson(typeof apiDef === 'string' ? apiDef : apiDef.url, 25000);
      }
      const result = parser(r);
      if (result && result.url) {
        console.log('[' + label + '] OK API ' + (i + 1));
        return result;
      }
      errors.push('API' + (i + 1) + ':noUrl');
    } catch (e) { errors.push('API' + (i + 1) + ':' + (e.message || e).slice(0, 40)); }
  }
  throw new Error(errors.slice(0, 4).join(' | '));
}

/**
 * Chamada POST ao Cobalt API — suporta YouTube, TikTok, Instagram, Twitter, Facebook,
 * SoundCloud, Pinterest, Reddit e mais.
 * Retorna URL direta do ficheiro.
 */
async function cobaltDownload(url, mode = 'auto') {
  const body = JSON.stringify({
    url: url,
    downloadMode: mode,       // 'auto' | 'audio' | 'mute'
    filenameStyle: 'basic',
  });
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'DARK-BOT/1.0',
  };
  try {
    const r = await mediaHandler.fetchJsonPost(COBALT, body, headers, 30000);
    // Cobalt retorna { status: "redirect"|"stream"|"picker", url: "..." } ou { url: "..." }
    if (r && r.url) return r.url;
    if (r && r.status === 'picker' && r.picker && r.picker.length) {
      // Para carrosséis do Instagram — pega o primeiro item
      return r.picker[0].url || null;
    }
    return null;
  } catch (e) {
    console.log('[COBALT] fallback:', e.message);
    return null;
  }
}

/**
 * Chamada ao TikWM — baixa vídeo do TikTok sem marca d'água.
 * Retorna { title, url, noWatermark }.
 */
async function tikwmDownload(url) {
  try {
    const r = await mediaHandler.fetchJson(TIKWM + '/?url=' + encodeURIComponent(url), 25000);
    if (r && r.data && r.data.play) {
      return {
        title: r.data.title || 'TikTok',
        url: r.data.play,
        noWatermark: r.data.no_watermark || r.data.play,
      };
    }
  } catch (e) {
    console.log('[TIKWM] fallback:', e.message);
  }
  return null;
}

/**
 * Chamada ao SpotifyDown — baixa música do Spotify em MP3.
 * Retorna { title, url, author, thumbnail, duration }.
 */
async function spotifydownDownload(url) {
  try {
    const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
    if (!trackMatch) throw new Error('Link Spotify inválido');
    const trackId = trackMatch[1];

    const r = await mediaHandler.fetchJson(SPOTIFYDOWN + '/download/' + trackId, 25000);
    if (r && r.downloadLink) {
      return {
        title: r.metadata?.title || r.title || 'Spotify',
        url: r.downloadLink,
        author: r.metadata?.artists || r.author || '',
        thumbnail: r.metadata?.cover || '',
        duration: r.metadata?.duration || '',
      };
    }
  } catch (e) {
    console.log('[SPOTIFYDOWN] fallback:', e.message);
  }
  return null;
}

/**
 * Chamada ao Siputzx — baixa vídeo do Pinterest.
 */
async function siputzxPinterest(url) {
  try {
    const r = await mediaHandler.fetchJson(SIPUTZX + '/d/pinterest?url=' + encodeURIComponent(url), 25000);
    if (r && r.data) {
      const d = r.data;
      const videoUrl = d.video || d.download_url || d.url;
      const imageUrl = d.image || d.images?.orig?.url;
      const finalUrl = videoUrl || imageUrl;
      if (finalUrl) {
        return {
          title: d.title || d.caption || 'Pinterest',
          url: finalUrl,
          type: videoUrl ? 'video' : 'image',
        };
      }
    }
  } catch (e) {
    console.log('[SIPUTZX-PIN] fallback:', e.message);
  }
  return null;
}

/**
 * Chamada ao Siputzx — pesquisa imagens no Pinterest.
 */
async function siputzxPinterestSearch(query) {
  try {
    const r = await mediaHandler.fetchJson(SIPUTZX + '/s/pinterest?query=' + encodeURIComponent(query), 25000);
    const arr = r?.data || r?.result || r?.results;
    if (Array.isArray(arr) && arr.length) {
      return arr
        .map(p => {
          const u = typeof p === 'string' ? p : (p.image_url || p.image || p.url || p.src || p.download_url || p.media_url || p.link);
          return u ? { url: u } : null;
        })
        .filter(Boolean)
        .filter(x => /^https?:\/\//i.test(x.url))
        .filter((item, idx, a) => a.findIndex(x => x.url === item.url) === idx)
        .slice(0, 10);
    }
  } catch (e) {
    console.log('[SIPUTZX-SEARCH] fallback:', e.message);
  }
  return null;
}

async function streamToBuffer(stream, maxSize) {
  maxSize = maxSize || 30 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    const chunks = []; let total = 0;
    stream.on('data', c => { chunks.push(c); total += c.length; if (total > maxSize) { stream.destroy(); reject(new Error('Arquivo > 30MB')); } });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    setTimeout(() => { stream.destroy(); reject(new Error('timeout')); }, 120000);
  });
}

module.exports = {
  COBALT, TIKWM, SPOTIFYDOWN, SIPUTZX,
  ytdl, yts, mediaHandler,
  extractYtId, searchYoutube, searchYoutubeFull,
  tryApis, streamToBuffer,
  cobaltDownload, tikwmDownload, spotifydownDownload,
  siputzxPinterest, siputzxPinterestSearch,
};
