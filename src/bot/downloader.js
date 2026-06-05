/**
 * Downloader v5.0 - Focado em MP4 + Thumbnails corretas
 */
const mediaHandler = require('./mediaHandler');
const yts = require('yt-search');

const PRINCE = 'https://api.princetechn.com/api/download';

async function tryApis(apis, parser) {
  for (const { url, name, method, body } of apis) {
    try {
      let r;
      if (method === 'POST') {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body
        });
        r = await res.json();
      } else {
        r = await mediaHandler.fetchJson(url);
      }
      const result = parser(r);
      if (result?.url) return result;
    } catch (e) {}
  }
  throw new Error('Todas as APIs falharam');
}

async function youtubeSearch(query) {
  if (/^https?:\/\//i.test(query)) return { url: query, title: query, thumb: '', duration: '', author: '' };
  const r = await yts(query);
  if (r.videos?.[0]) {
    const v = r.videos[0];
    return {
      url: v.url,
      title: v.title,
      id: v.videoId,
      thumb: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.timestamp || '',
      author: v.author?.name || v.author || '',
    };
  }
  throw new Error(`Não encontrei "${query}"`);
}

// ==================== ÁUDIO ====================
async function youtubeAudio(query) {
  const search = await youtubeSearch(query);
  return tryApis([
    { url: `${PRINCE}/dlmp3?apikey=prince&url=${encodeURIComponent(search.url)}`, name: 'prince' },
    { url: `https://api.siputzx.my.id/api/d/youtube?url=${encodeURIComponent(search.url)}&format=mp3`, name: 'siputzx' },
  ], r => {
    const u = r?.result?.download_url || r?.result?.url || r?.data?.url;
    if (u) return { title: search.title, url: u, thumb: search.thumb, duration: search.duration, author: search.author };
    return null;
  });
}

// ==================== VÍDEO (MP4) ====================
async function youtubeVideo(query) {
  const search = await youtubeSearch(query);

  const apis = [
    // Cobalt (melhor atualmente)
    {
      url: 'https://co.wuk.sh/api/json',
      name: 'cobalt',
      method: 'POST',
      body: JSON.stringify({ url: search.url, vQuality: '720' })
    },
    // Siputzx
    {
      url: `https://api.siputzx.my.id/api/d/youtube?url=${encodeURIComponent(search.url)}&format=mp4`,
      name: 'siputzx'
    },
    // PrinceTech
    {
      url: `${PRINCE}/dlmp4?apikey=prince&url=${encodeURIComponent(search.url)}`,
      name: 'prince'
    }
  ];

  return tryApis(apis, r => {
    const u = r?.url || r?.result?.download_url || r?.result?.url || r?.data?.url;
    if (u) {
      return {
        title: search.title,
        url: u,
        quality: '720p',
        thumb: search.thumb,
        duration: search.duration,
        author: search.author
      };
    }
    return null;
  });
}

module.exports = {
  youtubeSearch,
  youtubeAudio,
  youtubeVideo
};
