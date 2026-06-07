const mediaHandler = require('./mediaHandler');
const yts = require('yt-search');
const { execSync } = require('child_process');

async function youtubeSearch(query) {
  if (/^https?:\/\//i.test(query)) return { url: query, title: 'Vídeo YouTube' };
  const r = await yts(query);
  if (r.videos?.[0]) {
    const v = r.videos[0];
    return { url: v.url, title: v.title, thumb: v.thumbnail, duration: v.timestamp, author: v.author?.name || '' };
  }
  throw new Error(`🔍 Não encontrei "${query}"`);
}

/** 
 * DOWNLOADER v9.0 - ALTA PERFORMANCE
 */
module.exports = {
  // --- YOUTUBE ---
  async play160(q) {
    const s = await youtubeSearch(q);
    const r = await mediaHandler.fetchJson(`https://api.vreden.web.id/api/ytmp3?url=${encodeURIComponent(s.url)}`);
    return { ...s, url: r.result?.download?.url || r.result?.url || r.url };
  },
  async playMedium(q) {
    const s = await youtubeSearch(q);
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(s.url)}`);
    return { ...s, url: r.data?.dl || r.result?.url || r.url };
  },
  async play320(q) {
    const s = await youtubeSearch(q);
    const r = await mediaHandler.fetchJson(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(s.url)}`);
    return { ...s, url: r.result?.url || r.data?.url || r.url };
  },
  async videoHD(q) {
    const s = await youtubeSearch(q);
    const r = await mediaHandler.fetchJson(`https://api.vreden.web.id/api/ytmp4?url=${encodeURIComponent(s.url)}`);
    return { ...s, url: r.result?.download?.url || r.result?.url || r.url };
  },
  async videoFHD(q) {
    const s = await youtubeSearch(q);
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(s.url)}`);
    return { ...s, url: r.data?.dl || r.result?.url || r.url };
  },

  // --- REDES SOCIAIS ---
  async tiktok(url) {
    const r = await mediaHandler.fetchJson(`https://api.vreden.web.id/api/tiktok?url=${encodeURIComponent(url)}`);
    return { url: r.result?.video?.noWatermark || r.result?.video || r.result?.url };
  },
  async instagram(url) {
    const r = await mediaHandler.fetchJson(`https://api.vreden.web.id/api/igdl?url=${encodeURIComponent(url)}`);
    return { url: r.result?.[0]?.url || r.result?.url };
  },
  async facebook(url) {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`);
    return { url: r.data?.hd || r.data?.sd || r.data?.url };
  },
  async twitter(url) {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/twitter?url=${encodeURIComponent(url)}`);
    return { url: r.data?.[0]?.url || r.data?.url };
  },

  // --- PINTEREST (10 IMAGENS SEQUENCIAIS) ---
  async pinterestSearch(query) {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`);
    return (r.data || r.result || []).slice(0, 10).map(x => ({ url: x.image || x.url || x }));
  },

  // --- MEDIAFIRE ---
  async mediafire(url) {
    try {
      const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/mediafire?url=${encodeURIComponent(url)}`);
      if (r.data?.url) return { url: r.data.url, title: r.data.name || 'arquivo' };
      // Fallback scraper
      const html = execSync(`curl -sL "${url}" -H "User-Agent: Mozilla/5.0"`).toString();
      const dlLink = html.match(/href="(https:\/\/download\d+\.mediafire\.com\/[^"]+)"/)?.[1];
      const fileName = html.match(/class="filename">(.*?)<\/div>/)?.[1] || 'arquivo';
      return { url: dlLink, title: fileName };
    } catch (e) { throw new Error('Falha no Mediafire'); }
  },

  // --- APK ---
  async apkDownload(q) {
    const r = await mediaHandler.fetchJson(`https://api.ryzendesu.vip/api/downloader/apk?query=${encodeURIComponent(q)}`);
    const app = r.result || r.data?.[0] || r.data;
    if (!app) throw new Error('APK não encontrado');
    return { title: app.name || app.title, url: app.download_url || app.url || app.link, size: app.size };
  },
  
  // --- SOUNDCLOUD ---
  async soundcloud(q) {
    const r = await mediaHandler.fetchJson(`https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(q)}`);
    return { title: r.data?.title || 'SoundCloud', url: r.data?.dl || r.data?.url || r.url };
  }
};
