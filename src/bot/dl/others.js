/**
 * Other Downloads v2 — APIs atualizadas 2025/2026
 *
 * Todas as referências à API princetechn.com (offline) foram removidas.
 *
 * Estratégia em camadas para cada plataforma:
 *  1. API específica (tikwm, spotifydown, siputzx, etc.)
 *  2. Cobalt API (open-source, multi-plataforma, sem auth)
 *  3. yt-dlp via downloader.js (fallback local)
 */
const { COBALT, tryApis, cobaltDownload, tikwmDownload, spotifydownDownload, siputzxPinterest, siputzxPinterestSearch } = require('./helpers');

// ==================== TIKTOK ====================
async function tiktok(url) {
  // 1ª tentativa: TikWM (específico, sem marca d'água)
  const tikwmResult = await tikwmDownload(url);
  if (tikwmResult && tikwmResult.noWatermark) {
    return { title: tikwmResult.title, url: tikwmResult.noWatermark };
  }
  if (tikwmResult && tikwmResult.url) {
    return { title: tikwmResult.title, url: tikwmResult.url };
  }

  // 2ª tentativa: Cobalt API
  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) return { title: 'TikTok', url: cobaltUrl };
  } catch (e) {}

  throw new Error('❌ Não consegui baixar o TikTok. Tente novamente ou use um link diferente.');
}

// ==================== INSTAGRAM ====================
async function instagram(url) {
  // 1ª tentativa: Cobalt API (suporta Reels, Posts, Stories)
  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) {
      const isVideo = typeof cobaltUrl === 'string' && cobaltUrl.includes('.mp4');
      return { type: isVideo ? 'video' : 'image', url: cobaltUrl };
    }
  } catch (e) {}

  // 2ª tentativa: APIs alternativas
  const apis = [
    'https://api.saveig.app/api/v1/download?url=' + encodeURIComponent(url),
    'https://api.igram.io/api/v1/download?url=' + encodeURIComponent(url),
  ];
  try {
    const r = await tryApis(apis, res => {
      const items = res?.data || res?.result || res?.medias;
      if (Array.isArray(items) && items.length) {
        const vid = items.find(m => m.type === 'video');
        const img = items.find(m => m.type === 'image');
        const pick = vid || img || items[0];
        if (pick && (pick.url || pick.download_url)) {
          return { type: pick.type || (vid ? 'video' : 'image'), url: pick.url || pick.download_url };
        }
      }
      // Fallback para resposta com campo direto
      if (res?.url) return { type: res.type || 'video', url: res.url };
      if (res?.download_url) return { type: 'video', url: res.download_url };
      return null;
    }, 'IG');
    return r;
  } catch (e) {}

  throw new Error('❌ Não consegui baixar do Instagram. Link pode ser privado ou inválido.');
}

// ==================== FACEBOOK ====================
async function facebook(url) {
  // 1ª tentativa: Cobalt API
  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) return { url: cobaltUrl, title: 'Facebook' };
  } catch (e) {}

  // 2ª tentativa: APIs alternativas
  const apis = [
    'https://api.fdown.app/api/v1/download?url=' + encodeURIComponent(url),
  ];
  try {
    return await tryApis(apis, r => {
      const u = (r && r.data && (r.data.hd || r.data.sd || r.data.url)) ||
                (r && r.result && (r.result.hd_video || r.result.sd_video || r.result.url || r.result.download_url)) ||
                (r && r.url);
      if (u) return { url: u, title: (r && r.result && r.result.title) || 'Facebook' };
      return null;
    }, 'FB');
  } catch (e) {}

  throw new Error('❌ Não consegui baixar do Facebook. Tente com link direto do vídeo.');
}

// ==================== TWITTER / X ====================
async function twitter(url) {
  // 1ª tentativa: Cobalt API
  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) return { url: cobaltUrl };
  } catch (e) {}

  // 2ª tentativa: API alternativa
  const apis = [
    'https://api.twitsave.app/api/v1/download?url=' + encodeURIComponent(url),
  ];
  try {
    return await tryApis(apis, r => {
      if (r && r.result && r.result.error) return null;
      const u = (r && r.data && r.data.url) ||
                (r && r.result && (r.result.hd_video || r.result.video || r.result.url)) ||
                (r && r.url);
      if (u) return { url: u };
      return null;
    }, 'TWITTER');
  } catch (e) {}

  throw new Error('❌ Não consegui baixar do X/Twitter. Link pode ser privado ou inválido.');
}

// ==================== SPOTIFY ====================
async function spotify(url) {
  // 1ª tentativa: SpotifyDown (específico, alta qualidade)
  const spotResult = await spotifydownDownload(url);
  if (spotResult && spotResult.url) {
    return {
      title: spotResult.title,
      url: spotResult.url,
      author: spotResult.author,
      thumbnail: spotResult.thumbnail,
      duration: spotResult.duration,
    };
  }

  // 2ª tentativa: Cobalt API (modo áudio)
  try {
    const cobaltUrl = await cobaltDownload(url, 'audio');
    if (cobaltUrl) return { title: 'Spotify', url: cobaltUrl };
  } catch (e) {}

  // 3ª tentativa: APIs alternativas
  const apis = [
    'https://api.spotifydown.com/download/' + (url.match(/track\/([a-zA-Z0-9]+)/)?.[1] || ''),
  ];
  try {
    return await tryApis(apis, r => {
      const u = r?.downloadLink || r?.url || r?.link;
      const t = r?.metadata?.title || r?.title || 'Spotify';
      if (u) return { title: t, url: u };
      return null;
    }, 'SPOTIFY');
  } catch (e) {}

  throw new Error('❌ Não consegui baixar do Spotify. Use !play <nome> como alternativa (busca no YouTube).');
}

// ==================== SOUNDCLOUD ====================
async function soundcloud(url) {
  // 1ª tentativa: Cobalt API (suporta SoundCloud)
  try {
    const cobaltUrl = await cobaltDownload(url, 'audio');
    if (cobaltUrl) return { title: 'SoundCloud', url: cobaltUrl };
  } catch (e) {}

  // 2ª tentativa: API alternativa
  const apis = [
    'https://api.kodipy.com/api/v1/soundcloud?url=' + encodeURIComponent(url),
  ];
  try {
    return await tryApis(apis, r => {
      const u = (r && r.result && (r.result.download_url || r.result.url || r.result.audio)) ||
                (r && r.data && (r.data.url || r.data.download)) ||
                (r && r.url);
      const t = (r && r.result && r.result.title) || (r && r.title) || 'SoundCloud';
      if (u) return { title: t, url: u };
      return null;
    }, 'SC');
  } catch (e) {}

  throw new Error('❌ Não consegui baixar do SoundCloud. Tente !play <nome> como alternativa.');
}

// ==================== PINTEREST ====================
async function pinterest(url) {
  // 1ª tentativa: Siputzx (específico para Pinterest)
  const pinResult = await siputzxPinterest(url);
  if (pinResult && pinResult.url) {
    return pinResult;
  }

  // 2ª tentativa: Cobalt API
  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) return { url: cobaltUrl, title: 'Pinterest' };
  } catch (e) {}

  // Se não é URL, assume que é pesquisa
  if (!/^https?:\/\//i.test(url)) {
    return (await pinterestSearch(url))[0];
  }

  throw new Error('❌ Não consegui baixar do Pinterest.');
}

async function pinterestSearch(query) {
  // 1ª tentativa: Siputzx
  const sipResults = await siputzxPinterestSearch(query);
  if (sipResults && sipResults.length) return sipResults;

  // 2ª tentativa: APIs alternativas
  const apis = [
    'https://api.siputzx.my.id/api/s/pinterest?query=' + encodeURIComponent(query),
  ];
  try {
    return await tryApis(apis, r => {
      const arr = (r && r.result) || (r && r.data) || (r && r.results);
      if (Array.isArray(arr) && arr.length) {
        const mapped = arr
          .map(p => {
            const u = typeof p === 'string' ? p : (p.image_url || p.image || p.url || p.src || p.download_url || p.thumbnail);
            return u ? { url: u } : null;
          })
          .filter(Boolean)
          .filter(x => /^https?:\/\//i.test(x.url))
          .filter((item, idx, a) => a.findIndex(x => x.url === item.url) === idx)
          .slice(0, 10);
        if (mapped.length) return mapped;
      }
      return null;
    }, 'PIN-SEARCH');
  } catch (e) {}

  throw new Error('❌ Pinterest sem resultados no momento.');
}

module.exports = { tiktok, instagram, facebook, twitter, spotify, soundcloud, pinterest, pinterestSearch };
