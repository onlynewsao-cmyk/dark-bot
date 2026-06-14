/**
 * Download Helpers v4 — YouTube via Cloudflare Worker + APIs funcionais (Junho 2026)
 *
 * YouTube bloqueia IPs de servidores. Solução:
 *  1. Cloudflare Worker proxy (IPs limpos da Cloudflare) → URLs de streaming
 *  2. tikwm.com — TikTok sem marca d'água
 *  3. spotifydown.com — Spotify MP3 direto
 *  4. siputzx — Pinterest download + pesquisa
 *  5. loader.to — Fallback YouTube (pode retornar HTML com ads)
 *  6. yt-dlp — Último resort
 */

const yts = require('yt-search');
const mediaHandler = require('../mediaHandler');

// ==================== CONFIG ====================
const YT_PROXY_URL = process.env.YT_PROXY_URL || '';
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

// ==================== CLOUDFLARE WORKER — YouTube principal ====================

/**
 * Baixa áudio do YouTube via Cloudflare Worker proxy.
 * O Worker roda em IPs limpos da Cloudflare e retorna URLs de streaming diretas.
 * Retorna { title, url, author, thumbnail, duration, buffer?, mimetype, fileName }
 */
async function proxyYoutubeAudio(url, quality = '128') {
  const videoId = extractYtId(url);
  if (!videoId) throw new Error('ID do vídeo não encontrado');
  if (!YT_PROXY_URL) throw new Error('YT_PROXY_URL não configurado');

  // Mapear qualidade
  const qMap = { '320': '320', '256': '256', '192': '192', '128': '128', '96': '128', '160': '192' };
  const q = qMap[quality] || '128';

  console.log(`[CF-WORKER] Requesting audio for ${videoId} quality ${q}`);

  // Passo 1: Obter URLs de streaming do Worker
  const proxyResp = await mediaHandler.fetchJson(
    `${YT_PROXY_URL}/audio?id=${videoId}&quality=${q}&key=darknet-engine-2026`,
    30000
  );

  if (!proxyResp?.success || !proxyResp?.formats?.length) {
    throw new Error(proxyResp?.error || 'Worker não retornou URLs de streaming');
  }

  const format = proxyResp.formats[0];
  const streamUrl = format.url;
  const title = proxyResp.title || 'YouTube Audio';
  const author = proxyResp.author || '';
  const thumbnail = proxyResp.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const durationSec = proxyResp.lengthSeconds || 0;
  const duration = durationSec ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}` : '';

  console.log(`[CF-WORKER] Got stream URL: ${streamUrl.slice(0, 80)}... (${format.mimeType})`);

  // Passo 2: Baixar o buffer do stream
  try {
    const buffer = await fetchMediaBuffer(streamUrl, 60000);
    if (buffer && buffer.length > 2048) {
      const isM4A = format.mimeType?.includes('audio/mp4') || format.mimeType?.includes('audio/m4a');
      const ext = isM4A ? 'm4a' : 'mp3';
      const mime = isM4A ? 'audio/mp4' : 'audio/mpeg';
      return {
        title,
        url: streamUrl,
        author,
        thumbnail,
        duration,
        buffer,
        mimetype: mime,
        fileName: `${String(title).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.${ext}`,
      };
    }
  } catch (e) {
    console.log('[CF-WORKER] Buffer download falhou:', e.message);
  }

  // Fallback: retornar URL para o bot tentar baixar
  return { title, url: streamUrl, author, thumbnail, duration };
}

/**
 * Baixa vídeo do YouTube via Cloudflare Worker proxy.
 */
async function proxyYoutubeVideo(url, quality = '720') {
  const videoId = extractYtId(url);
  if (!videoId) throw new Error('ID do vídeo não encontrado');
  if (!YT_PROXY_URL) throw new Error('YT_PROXY_URL não configurado');

  const q = ['360', '480', '720', '1080'].includes(quality) ? quality : '720';

  console.log(`[CF-WORKER] Requesting video for ${videoId} quality ${q}`);

  const proxyResp = await mediaHandler.fetchJson(
    `${YT_PROXY_URL}/video?id=${videoId}&quality=${q}&key=darknet-engine-2026`,
    30000
  );

  if (!proxyResp?.success || !proxyResp?.formats?.length) {
    throw new Error(proxyResp?.error || 'Worker não retornou URLs de streaming');
  }

  const format = proxyResp.formats[0];
  const streamUrl = format.url;
  const title = proxyResp.title || 'YouTube Video';
  const author = proxyResp.author || '';
  const thumbnail = proxyResp.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  console.log(`[CF-WORKER] Got video stream URL: ${streamUrl.slice(0, 80)}...`);

  try {
    const buffer = await fetchMediaBuffer(streamUrl, 120000);
    if (buffer && buffer.length > 4096) {
      return {
        title,
        url: streamUrl,
        author,
        thumbnail,
        buffer,
        mimetype: 'video/mp4',
        quality: `${q}p`,
        fileName: `${String(title).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp4`,
      };
    }
  } catch (e) {
    console.log('[CF-WORKER] Video buffer falhou:', e.message);
  }

  return { title, url: streamUrl, author, thumbnail, quality: `${q}p` };
}

/**
 * Baixa o buffer de uma URL de mídia (segue redirects, aceita qualquer content-type).
 * Diferente do mediaHandler.fetchBuffer, este método aceita qualquer tipo de resposta
 * e verifica se o conteúdo parece ser mídia (não HTML).
 */
async function fetchMediaBuffer(url, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const http = require('http');
    const lib = url.startsWith('https') ? https : http;

    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity', // No compression to get raw bytes
      },
      timeout: timeoutMs,
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        return fetchMediaBuffer(next, timeoutMs).then(resolve, reject);
      }
      if (res.statusCode >= 400) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }

      const chunks = [];
      let totalSize = 0;
      const maxSize = 50 * 1024 * 1024; // 50MB limit

      res.on('data', (c) => {
        totalSize += c.length;
        if (totalSize > maxSize) {
          req.destroy();
          reject(new Error('Arquivo > 50MB'));
          return;
        }
        chunks.push(c);
      });
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        // Verify it's not HTML (ad page redirect)
        const header = buffer.slice(0, 20).toString('utf-8');
        if (header.includes('<!DOCTYPE') || header.includes('<html') || header.includes('<HTML')) {
          return reject(new Error('Resposta é HTML, não mídia'));
        }
        resolve(buffer);
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ==================== LOADER.TO — YouTube fallback ====================

async function loaderYoutubeAudio(url, quality = '128') {
  const videoId = extractYtId(url);
  const format = quality === '320' ? '320' : quality === '256' ? '256' : quality === '192' ? '192' : '128';

  const startUrl = `${LOADER_TO}/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}`;
  const startResp = await mediaHandler.fetchJson(startUrl, 30000);

  if (!startResp || !startResp.id) {
    throw new Error('loader.to falhou ao iniciar conversão');
  }

  const taskId = startResp.id;
  const title = startResp.title || 'YouTube Audio';
  const info = startResp.info || {};

  const downloadUrl = await pollLoaderProgress(taskId, 90000);

  try {
    const buffer = await fetchMediaBuffer(downloadUrl, 60000);
    if (buffer && buffer.length > 2048) {
      return {
        title, url: downloadUrl, author: info.uploader || '',
        thumbnail: info.image || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: '', buffer, mimetype: 'audio/mpeg',
        fileName: `${String(title).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp3`,
      };
    }
  } catch (e) {
    console.log('[LOADER] Buffer download falhou (pode ser página de ads):', e.message);
  }

  return { title, url: downloadUrl, author: info.uploader || '' };
}

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
    const buffer = await fetchMediaBuffer(downloadUrl, 120000);
    if (buffer && buffer.length > 4096) {
      return {
        title, url: downloadUrl, author: info.uploader || '',
        thumbnail: info.image || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        buffer, mimetype: 'video/mp4', quality: `${quality}p`,
        fileName: `${String(title).replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60)}.mp4`,
      };
    }
  } catch (e) {
    console.log('[LOADER] Video buffer falhou:', e.message);
  }

  return { title, url: downloadUrl, quality: `${quality}p` };
}

async function pollLoaderProgress(taskId, maxWaitMs = 90000) {
  const startTime = Date.now();
  const pollInterval = 5000;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const resp = await mediaHandler.fetchJson(`${LOADER_PROGRESS}?id=${taskId}`, 15000);
      if (resp && resp.success === 1 && resp.download_url) return resp.download_url;
      if (resp && resp.text === 'Finished' && resp.download_url) return resp.download_url;
    } catch (e) {}
    await new Promise(r => setTimeout(r, pollInterval));
  }

  throw new Error('Timeout ao aguardar conversão no loader.to');
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

// ==================== SOCIAL MEDIA via Cloudflare Worker ====================

/**
 * Baixa de redes sociais via Cloudflare Worker (se configurado)
 */
async function proxySocialDownload(url) {
  if (!YT_PROXY_URL) return null;
  try {
    const r = await mediaHandler.fetchJson(
      `${YT_PROXY_URL}/social?url=${encodeURIComponent(url)}&key=darknet-engine-2026`,
      25000
    );
    if (r?.success && r?.url) return r.url;
  } catch (e) { console.log('[CF-WORKER-SOCIAL] falhou:', e.message); }
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
  YT_PROXY_URL, TIKWM, SPOTIFYDOWN, SIPUTZX,
  ytdl, yts, mediaHandler,
  extractYtId, searchYoutube, searchYoutubeFull,
  streamToBuffer, fetchMediaBuffer,
  // Cloudflare Worker (primary)
  proxyYoutubeAudio, proxyYoutubeVideo,
  // Loader.to (fallback)
  loaderYoutubeAudio, loaderYoutubeVideo, pollLoaderProgress,
  // Dedicated APIs
  cobaltDownload, tikwmDownload, spotifydownDownload,
  siputzxPinterest, siputzxPinterestSearch,
  // Social via Worker
  proxySocialDownload,
};
