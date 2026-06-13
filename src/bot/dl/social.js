/**
 * Social Downloads (YouTube) v2 — APIs atualizadas 2025/2026
 *
 * Estratégia em camadas:
 *  1. Cobalt API (open-source, sem auth, multi-plataforma)
 *  2. ytdl-core (npm local, sem API externa)
 *  3. Fallback genérico
 *
 * A antiga API princetechn.com foi completamente removida.
 */
const { ytdl, COBALT, searchYoutube, searchYoutubeFull, tryApis, streamToBuffer, cobaltDownload } = require('./helpers');

// ==================== YOUTUBE AUDIO ====================

async function youtubeAudio(query) {
  const url = await searchYoutube(query);
  const info = await searchYoutubeFull(query);
  const fb = (info && info.title) || 'YouTube Audio';

  // 1ª tentativa: Cobalt API (modo áudio)
  try {
    const cobaltUrl = await cobaltDownload(url, 'audio');
    if (cobaltUrl) {
      return { title: fb, url: cobaltUrl };
    }
  } catch (e) { console.log('[YT-AUDIO] Cobalt falhou:', e.message); }

  // 2ª tentativa: APIs REST alternativas
  const apis = [
    'https://p.oceansaver.in/ajax/download.php?format=mp3&url=' + encodeURIComponent(url),
    'https://api.mp3download.to/v1/download?url=' + encodeURIComponent(url) + '&format=mp3',
  ];
  try {
    return await tryApis(apis, r => {
      const u = (r && r.result && (r.result.download_url || r.result.url)) ||
                (r && r.data && r.data.dl) || (r && r.url) ||
                (r && r.link) || (r && r.download_url);
      return u ? { title: (r && r.result && r.result.title) || (r && r.title) || fb, url: u } : null;
    }, 'YT-AUDIO');
  } catch (e) {
    // 3ª tentativa: ytdl-core local
    try {
      const vi = await ytdl.getInfo(url);
      const fmts = ytdl.filterFormats(vi.formats, 'audioonly');
      const best = fmts.find(f => f.audioBitrate >= 128) || fmts[0];
      if (best && best.url) return { title: vi.videoDetails.title || fb, url: best.url };
    } catch (er) {}
    throw e;
  }
}

async function youtubeAudioHD(query) {
  const url = await searchYoutube(query);
  const info = await searchYoutubeFull(query);
  const fb = (info && info.title) || 'YT HD';

  // 1ª tentativa: Cobalt API (modo áudio, alta qualidade)
  try {
    const cobaltUrl = await cobaltDownload(url, 'audio');
    if (cobaltUrl) {
      return { title: fb, url: cobaltUrl, quality: '320kbps+' };
    }
  } catch (e) {}

  // 2ª tentativa: ytdl-core local (melhor bitrate)
  try {
    const vi = await ytdl.getInfo(url);
    const best = ytdl.filterFormats(vi.formats, 'audioonly')
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
    if (best && best.url) return { title: vi.videoDetails.title || fb, url: best.url, quality: best.audioBitrate + 'kbps' };
  } catch (er) {}

  // 3ª tentativa: API genérica
  const apis = [
    'https://p.oceansaver.in/ajax/download.php?format=mp3&quality=320&url=' + encodeURIComponent(url),
  ];
  try {
    return await tryApis(apis, r => {
      const u = (r && r.result && (r.result.download_url || r.result.url)) || (r && r.url);
      return u ? { title: (r && r.result && r.result.title) || fb, url: u, quality: (r && r.result && r.result.quality) || '192kbps+' } : null;
    }, 'YT-AUDIO-HD');
  } catch (e) { throw e; }
}

async function youtubeAudioBuffer(query) {
  const url = await searchYoutube(query);
  const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
  const buffer = await streamToBuffer(stream);
  const info = await ytdl.getBasicInfo(url).catch(() => null);
  return { title: (info && info.videoDetails && info.videoDetails.title) || 'YouTube', buffer };
}

// ==================== YOUTUBE VIDEO ====================

async function youtubeVideo(query) {
  const url = await searchYoutube(query);
  const info = await searchYoutubeFull(query);
  const fb = (info && info.title) || 'YouTube Video';

  // 1ª tentativa: Cobalt API (modo vídeo)
  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) {
      return { title: fb, url: cobaltUrl, quality: '720p' };
    }
  } catch (e) {}

  // 2ª tentativa: ytdl-core local
  try {
    const vi = await ytdl.getInfo(url);
    const fmts = ytdl.filterFormats(vi.formats, 'audioandvideo')
      .filter(f => f.container === 'mp4')
      .sort((a, b) => (parseInt(b.qualityLabel) || 0) - (parseInt(a.qualityLabel) || 0));
    const best = fmts.find(f => parseInt(f.qualityLabel) <= 480) || fmts[0];
    if (best && best.url) return { title: vi.videoDetails.title || fb, url: best.url, quality: best.qualityLabel };
  } catch (er) {}

  throw new Error('Não consegui obter o vídeo. Tente !play para áudio ou !video2 para FHD.');
}

async function youtubeVideoLow(query) {
  const url = await searchYoutube(query);
  const info = await searchYoutubeFull(query);
  const fb = (info && info.title) || 'YT';

  // 1ª tentativa: Cobalt API
  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) {
      return { title: fb, url: cobaltUrl, quality: 'low' };
    }
  } catch (e) {}

  // 2ª tentativa: ytdl-core local (qualidade baixa)
  try {
    const vi = await ytdl.getInfo(url);
    const fmts = ytdl.filterFormats(vi.formats, 'audioandvideo')
      .filter(f => f.container === 'mp4' && parseInt(f.qualityLabel) <= 360)
      .sort((a, b) => (parseInt(a.qualityLabel) || 999) - (parseInt(b.qualityLabel) || 999));
    if (fmts[0] && fmts[0].url) return { title: vi.videoDetails.title || fb, url: fmts[0].url, quality: fmts[0].qualityLabel };
  } catch (er) {}

  throw new Error('Não consegui obter o vídeo em baixa qualidade.');
}

module.exports = { youtubeAudio, youtubeAudioHD, youtubeAudioBuffer, youtubeVideo, youtubeVideoLow };
