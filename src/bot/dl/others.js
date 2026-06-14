/**
 * Other Downloads v4 — Cloudflare Worker + APIs funcionais (Junho 2026)
 *
 * TikTok: tikwm → Cloudflare Worker → Cobalt
 * Instagram: Cloudflare Worker → Cobalt
 * Facebook: Cloudflare Worker → Cobalt
 * Twitter: Cloudflare Worker → Cobalt
 * Spotify: spotifydown → Cobalt → YouTube fallback
 * SoundCloud: Cloudflare Worker → Cobalt → YouTube fallback
 * Pinterest: siputzx → Cobalt → Bing images
 */
const { tryApis, cobaltDownload, tikwmDownload, spotifydownDownload, siputzxPinterest, siputzxPinterestSearch, proxySocialDownload, loaderYoutubeAudio } = require('./helpers');

// ==================== TIKTOK ====================
async function tiktok(url) {
  const tikwmResult = await tikwmDownload(url);
  if (tikwmResult && tikwmResult.noWatermark) return { title: tikwmResult.title, url: tikwmResult.noWatermark };
  if (tikwmResult && tikwmResult.url) return { title: tikwmResult.title, url: tikwmResult.url };

  const proxyUrl = await proxySocialDownload(url);
  if (proxyUrl) return { title: 'TikTok', url: proxyUrl };

  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) return { title: 'TikTok', url: cobaltUrl };
  } catch (e) {}

  throw new Error('❌ Não consegui baixar o TikTok.');
}

// ==================== INSTAGRAM ====================
async function instagram(url) {
  const proxyUrl = await proxySocialDownload(url);
  if (proxyUrl) {
    const isVideo = typeof proxyUrl === 'string' && proxyUrl.includes('.mp4');
    return { type: isVideo ? 'video' : 'image', url: proxyUrl };
  }

  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) {
      const isVideo = typeof cobaltUrl === 'string' && cobaltUrl.includes('.mp4');
      return { type: isVideo ? 'video' : 'image', url: cobaltUrl };
    }
  } catch (e) {}

  throw new Error('❌ Não consegui baixar do Instagram. Link pode ser privado.');
}

// ==================== FACEBOOK ====================
async function facebook(url) {
  const proxyUrl = await proxySocialDownload(url);
  if (proxyUrl) return { url: proxyUrl, title: 'Facebook' };

  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) return { url: cobaltUrl, title: 'Facebook' };
  } catch (e) {}

  throw new Error('❌ Não consegui baixar do Facebook.');
}

// ==================== TWITTER / X ====================
async function twitter(url) {
  const proxyUrl = await proxySocialDownload(url);
  if (proxyUrl) return { url: proxyUrl };

  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) return { url: cobaltUrl };
  } catch (e) {}

  throw new Error('❌ Não consegui baixar do X/Twitter.');
}

// ==================== SPOTIFY ====================
async function spotify(url) {
  const spotResult = await spotifydownDownload(url);
  if (spotResult && spotResult.url) {
    return { title: spotResult.title, url: spotResult.url, author: spotResult.author, thumbnail: spotResult.thumbnail, duration: spotResult.duration };
  }

  try {
    const cobaltUrl = await cobaltDownload(url, 'audio');
    if (cobaltUrl) return { title: 'Spotify', url: cobaltUrl };
  } catch (e) {}

  throw new Error('❌ Não consegui baixar do Spotify. Use !play <nome> como alternativa.');
}

// ==================== SOUNDCLOUD ====================
async function soundcloud(url) {
  const proxyUrl = await proxySocialDownload(url);
  if (proxyUrl) return { title: 'SoundCloud', url: proxyUrl };

  try {
    const cobaltUrl = await cobaltDownload(url, 'audio');
    if (cobaltUrl) return { title: 'SoundCloud', url: cobaltUrl };
  } catch (e) {}

  throw new Error('❌ Não consegui baixar do SoundCloud. Tente !play <nome>.');
}

// ==================== PINTEREST ====================
async function pinterest(url) {
  if (!/^https?:\/\//i.test(url)) return (await pinterestSearch(url))[0];

  const pinResult = await siputzxPinterest(url);
  if (pinResult && pinResult.url) return pinResult;

  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) return { url: cobaltUrl, title: 'Pinterest' };
  } catch (e) {}

  throw new Error('❌ Não consegui baixar do Pinterest.');
}

async function pinterestSearch(query) {
  const sipResults = await siputzxPinterestSearch(query);
  if (sipResults && sipResults.length) return sipResults;

  try {
    const r = await mediaHandler.fetchJson('https://api.siputzx.my.id/api/s/pinterest?query=' + encodeURIComponent(query), 25000);
    const arr = r?.data || r?.result || r?.results;
    if (Array.isArray(arr) && arr.length) {
      return arr.map(p => {
        const u = typeof p === 'string' ? p : (p.image_url || p.image || p.url || p.src || p.download_url);
        return u ? { url: u } : null;
      }).filter(Boolean).filter(x => /^https?:\/\//i.test(x.url)).slice(0, 10);
    }
  } catch (e) {}

  throw new Error('❌ Pinterest sem resultados.');
}

module.exports = { tiktok, instagram, facebook, twitter, spotify, soundcloud, pinterest, pinterestSearch };
