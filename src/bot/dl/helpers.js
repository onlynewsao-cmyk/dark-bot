/**
 * Download Helpers v3 — APIs 100% funcionais (Junho 2026)
 *
 * YouTube bloqueia IPs de servidores diretamente (yt-dlp e InnerTube falham).
 * Solução: usar serviços de download que rodam em IPs residenciais.
 *
 * Estratégia:
 *  1. loader.to — API gratuita, YouTube + TikTok + Instagram, etc.
 *  2. tikwm.com — TikTok sem marca d'água
 *  3. spotifydown.com — Spotify MP3 direto
 *  4. siputzx — Pinterest download + pesquisa
 *  5. Cobalt API — Multi-plataforma (requer JWT para instância oficial)
 *  6. yt-dlp — Último resort (pode não funcionar se IP bloqueado)
 */

const yts = require('yt-search');
const mediaHandler = require('../mediaHandler');

// ==================== APIs FUNCIONAIS 2025/2026 ====================
const LOADER_TO = 'https://loader.to';
const LOADER_PROGRESS = 'https://lto2.affadaffa.com/api/progress';
const TIKWM = 'https://www.tikwm.com/api';
const SPOTIFYDOWN = 'https://api.spotifydown.com';
const SIPUTZX = 'https://api.siputzx.my.id/api';

// ytdl-core é opcional
let ytdl = null;
try { ytdl = require('@distube/ytdl-core'); } catch (e) {}

// ==================== UTILIDADES ====================

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

// ==================== LOADER.TO — YouTube principal ====================

/**
 * Baixa áudio do YouTube via loader.to
 * Formatos: mp3, 128, 192, 256, 320
 * Retorna { title, url, author, thumbnail, duration, buffer? }
 */
async function loaderYoutubeAudio(url, quality = '128') {
  const videoId = extractYtId(url);
  const format = quality === '320' ? '320' : quality === '256' ? '256' : quality === '192' ? '192' : '128';

  // Passo 1: Iniciar conversão
  const startUrl = `${LOADER_TO}/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}`;
  const startResp = await mediaHandler.fetchJson(startUrl, 30000);

  if (!startResp || !startResp.id) {
    throw new Error('loader.to falhou ao iniciar conversão');
  }

  const taskId = startResp.id;
  const title = startResp.title || 'YouTube Audio';
  const info = startResp.info || {};

  // Passo 2: Polling até conversão terminar
  const downloadUrl = await pollLoaderProgress(taskId, 90000);

  // Passo 3: Baixar o buffer real
  try {
    const buffer = await fetchFinalBuffer(downloadUrl, 60000);
    if (buffer && buffer.length > 2048) {
      return {
        title: title,
        url: downloadUrl,
        author: info.uploader || '',
        thumbnail: info.image || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: '',
        buffer,
        mimetype: 'audio/mpeg',
        fileName: `${String(title).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`,
      };
    }
  } catch (e) {
    console.log('[LOADER] Buffer download falhou, retornando URL direta');
  }

  return { title, url: downloadUrl, author: info.uploader || '' };
}

/**
 * Baixa vídeo do YouTube via loader.to
 * Formatos: 360, 480, 720, 1080
 */
async function loaderYoutubeVideo(url, quality = '720') {
  const videoId = extractYtId(url);
  const format = ['360', '480', '720', '1080'].includes(quality) ? quality : '720';

  const startUrl = `${LOADER_TO}/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}`;
  const startResp = await mediaHandler.fetchJson(startUrl, 30000);

  if (!startResp || !startResp.id) {
    throw new Error('loader.to falhou ao iniciar conversão de vídeo');
  }

  const taskId = startResp.id;
  const title = startResp.title || 'YouTube Video';
  const info = startResp.info || {};

  const downloadUrl = await pollLoaderProgress(taskId, 180000);

  try {
    const buffer = await fetchFinalBuffer(downloadUrl, 120000);
    if (buffer && buffer.length > 4096) {
      return {
        title,
        url: downloadUrl,
        author: info.uploader || '',
        thumbnail: info.image || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        buffer,
        mimetype: 'video/mp4',
        quality: `${quality}p`,
        fileName: `${String(title).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp4`,
      };
    }
  } catch (e) {
    console.log('[LOADER] Video buffer falhou, retornando URL');
  }

  return { title, url: downloadUrl, quality: `${quality}p` };
}

/**
 * Polling do progresso do loader.to
 */
async function pollLoaderProgress(taskId, maxWaitMs = 90000) {
  const startTime = Date.now();
  const pollInterval = 5000;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const resp = await mediaHandler.fetchJson(`${LOADER_PROGRESS}?id=${taskId}`, 15000);
      if (resp && resp.success === 1 && resp.download_url) {
        return resp.download_url;
      }
      if (resp && resp.text === 'Finished' && resp.download_url) {
        return resp.download_url;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, pollInterval));
  }

  throw new Error('Timeout ao aguardar conversão no loader.to');
}

/**
 * Baixa o buffer final de uma URL loader.to (segue redirects)
 */
async function fetchFinalBuffer(url, timeoutMs = 60000) {
  try {
    const buffer = await mediaHandler.fetchBuffer(url);
    return buffer;
  } catch (e) {
    throw new Error('Erro ao baixar arquivo: ' + e.message);
  }
}

// ==================== TIKWM — TikTok ====================

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
  } catch (e) { console.log('[TIKWM] fallback:', e.message); }
  return null;
}

// ==================== SPOTIFYDOWN — Spotify ====================

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
  } catch (e) { console.log('[SPOTIFYDOWN] fallback:', e.message); }
  return null;
}

// ==================== SIPUTZX — Pinterest ====================

async function siputzxPinterest(url) {
  try {
    const r = await mediaHandler.fetchJson(SIPUTZX + '/d/pinterest?url=' + encodeURIComponent(url), 25000);
    if (r && r.data) {
      const d = r.data;
      const videoUrl = d.video || d.download_url || d.url;
      const imageUrl = d.image || d.images?.orig?.url;
      const finalUrl = videoUrl || imageUrl;
      if (finalUrl) {
        return { title: d.title || d.caption || 'Pinterest', url: finalUrl, type: videoUrl ? 'video' : 'image' };
      }
    }
  } catch (e) { console.log('[SIPUTZX-PIN] fallback:', e.message); }
  return null;
}

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
  } catch (e) { console.log('[SIPUTZX-SEARCH] fallback:', e.message); }
  return null;
}

// ==================== COBALT (tentativa) ====================

async function cobaltDownload(url, mode = 'auto') {
  const instances = [
    'https://api.cobalt.tools',
    'https://cobalt.meowing.de',
  ];
  for (const baseUrl of instances) {
    try {
      const body = JSON.stringify({ url, downloadMode: mode, filenameStyle: 'basic', audioFormat: 'mp3' });
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'DARK-BOT/1.0',
      };
      const r = await mediaHandler.fetchJsonPost(baseUrl, body, headers, 30000);
      if (r && r.url) return r.url;
      if (r && r.status === 'picker' && r.picker && r.picker.length) return r.picker[0].url || null;
    } catch (e) {
      console.log(`[COBALT ${baseUrl}] falhou:`, e.message);
    }
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
  LOADER_TO, TIKWM, SPOTIFYDOWN, SIPUTZX,
  ytdl, yts, mediaHandler,
  extractYtId, searchYoutube, searchYoutubeFull,
  tryApis, streamToBuffer,
  loaderYoutubeAudio, loaderYoutubeVideo, pollLoaderProgress,
  cobaltDownload, tikwmDownload, spotifydownDownload,
  siputzxPinterest, siputzxPinterestSearch,
};
