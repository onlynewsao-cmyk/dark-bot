const mediaHandler = require('./mediaHandler');
const yts = require('yt-search');
const { execSync } = require('child_process');

async function youtubeSearch(query) {
  if (/^https?:\/\//i.test(query)) return { url: query, title: 'Vídeo do YouTube' };
  const r = await yts(query);
  return r.videos?.[0] ? { 
    url: r.videos[0].url, 
    title: r.videos[0].title, 
    thumb: r.videos[0].thumbnail, 
    duration: r.videos[0].timestamp 
  } : null;
}

module.exports = {
  // YOUTUBE AUDIO
  async play160(q) {
    const s = await youtubeSearch(q);
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(s.url)}`);
    return { ...s, url: r.data?.dl || r.result?.url || r.url };
  },
  async play320(q) {
    const s = await youtubeSearch(q);
    const r = await mediaHandler.fetchJson(`https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(s.url)}`);
    return { ...s, url: r.result?.download_url || r.url };
  },

  // YOUTUBE VIDEO
  async videoHD(q) {
    const s = await youtubeSearch(q);
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(s.url)}`);
    return { ...s, url: r.data?.dl || r.result?.url || r.url };
  },

  // PINTEREST (Busca 10 imagens)
  async pinterestSearch(query) {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`);
    return (r.data || r.result || []).slice(0, 10).map(x => ({ url: x.image || x.url || x }));
  },

  // MEDIAFIRE DIRECT (Scraper Forense)
  async mediafire(url) {
    try {
      const html = execSync(`curl -sL "${url}" -H "User-Agent: Mozilla/5.0"`).toString();
      const dlLink = html.match(/href="(https:\/\/download\d+\.mediafire\.com\/[^"]+)"/)?.[1];
      const fileName = html.match(/class="filename">(.*?)<\/div>/)?.[1] || 'arquivo';
      return { url: dlLink, title: fileName };
    } catch (e) { throw new Error('Falha no Scraper Mediafire'); }
  },

  // SOUNDCLOUD
  async soundcloud(q) {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(q)}`);
    return { title: r.data?.title || 'SoundCloud Audio', url: r.data?.dl || r.url };
  }
};
