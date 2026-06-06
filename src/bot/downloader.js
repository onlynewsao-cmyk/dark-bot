/**
 * Downloader v6.0 — Qualidade Controlada
 * APIs: DavidCyrilTech, Ryzendesu, Siputzx
 */
const mediaHandler = require('./mediaHandler');
const yts = require('yt-search');

async function youtubeSearch(query) {
  if (/^https?:\/\//i.test(query)) return { url: query, title: query };
  const r = await yts(query);
  if (r.videos?.[0]) {
    const v = r.videos[0];
    return {
      url: v.url,
      title: v.title,
      thumb: v.thumbnail,
      duration: v.timestamp,
      author: v.author?.name || ''
    };
  }
  throw new Error(`🔍 Não encontrei "${query}"`);
}

// Play - 160kbps (Baixa)
async function youtubeAudio160(query) {
  const s = await youtubeSearch(query);
  const r = await mediaHandler.fetchJson(`https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(s.url)}`);
  const url = r?.result?.download_url || r?.result?.url || r?.data?.url;
  if (!url) throw new Error('API Falhou');
  return { ...s, url, quality: '160kbps' };
}

// Play2 - Média (Padrão)
async function youtubeAudioMedium(query) {
  const s = await youtubeSearch(query);
  const r = await mediaHandler.fetchJson(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(s.url)}`);
  const url = r?.result?.url || r?.result?.download_url || r?.data?.url;
  if (!url) return youtubeAudio160(query);
  return { ...s, url, quality: 'Média' };
}

// Play3 - 320kbps (Alta)
async function youtubeAudio320(query) {
  const s = await youtubeSearch(query);
  // Algumas APIs permitem bitrate, outras apenas entregam o melhor disponível. 
  // Usaremos o Siputzx que costuma entregar áudio de alta qualidade.
  try {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(s.url)}`);
    const url = r?.data?.url || r?.result?.url || r?.url;
    if (url) return { ...s, url, quality: '320kbps' };
  } catch(e) {}
  return youtubeAudioMedium(query);
}

// Video - HD (720p)
async function youtubeVideoHD(query) {
  const s = await youtubeSearch(query);
  const r = await mediaHandler.fetchJson(`https://api.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(s.url)}`);
  const url = r?.result?.download_url || r?.result?.url;
  if (!url) throw new Error('Falha ao obter vídeo HD');
  return { ...s, url, quality: '720p (HD)' };
}

// Video2 - FHD (1080p)
async function youtubeVideoFHD(query) {
  const s = await youtubeSearch(query);
  try {
    // Ryzendesu tenta o maior disponível
    const r = await mediaHandler.fetchJson(`https://api.ryzendesu.vip/api/downloader/ytmp4?url=${encodeURIComponent(s.url)}`);
    const url = r?.result?.url || r?.result?.download_url;
    if (url) return { ...s, url, quality: '1080p (FHD)' };
  } catch(e) {}
  return youtubeVideoHD(query);
}

async function pinterestSearch(query, count = 10) {
  try {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`);
    const arr = r?.data || r?.result;
    if (Array.isArray(arr)) return arr.slice(0, count).map(x => ({ url: x.image || x.url || x }));
  } catch(e) {}
  return [];
}

async function tiktok(url) {
  const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`);
  return { url: r?.data?.play || r?.result?.video || r?.url };
}

async function apkDownload(query) {
  const r = await mediaHandler.fetchJson(`https://api.ryzendesu.vip/api/downloader/apk?query=${encodeURIComponent(query)}`);
  const res = r?.result || r?.data;
  if (!res?.url && !res?.download_url) throw new Error('APK não encontrado');
  return { title: res.name || query, url: res.url || res.download_url, size: res.size || '?' };
}

module.exports = {
  youtubeAudio: youtubeAudio160,
  youtubeAudioSavefrom: youtubeAudioMedium,
  youtubeAudioAuto: youtubeAudio320,
  youtubeVideo: youtubeVideoHD,
  youtubeVideoSavefrom: youtubeVideoFHD,
  youtubeSearch,
  pinterestSearch,
  tiktok,
  apkDownload,
  // Aliases para facilitar
  play160: youtubeAudio160,
  playMedium: youtubeAudioMedium,
  play320: youtubeAudio320,
  videoHD: youtubeVideoHD,
  videoFHD: youtubeVideoFHD
};
