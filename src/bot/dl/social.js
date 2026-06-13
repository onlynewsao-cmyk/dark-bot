/**
 * Social Downloads (YouTube) v3 — APIs 100% funcionais (Junho 2026)
 *
 * yt-dlp NÃO FUNCIONA em servidores — YouTube bloqueia com "Sign in to confirm"
 * Solução: loader.to API (gratuita, funciona de servidores)
 *
 * Fluxo: searchYoutube → loaderYoutubeAudio/Video → buffer MP3/MP4
 */
const { searchYoutube, searchYoutubeFull, loaderYoutubeAudio, loaderYoutubeVideo, cobaltDownload } = require('./helpers');

// ==================== YOUTUBE AUDIO ====================

async function youtubeAudio(query) {
  const url = await searchYoutube(query);
  const info = await searchYoutubeFull(query);
  const fb = (info && info.title) || 'YouTube Audio';

  // 1ª tentativa: loader.to (funciona de servidores!)
  try {
    const r = await loaderYoutubeAudio(url, '128');
    if (r) return { title: r.title || fb, ...r };
  } catch (e) { console.log('[YT-AUDIO] loader.to falhou:', e.message); }

  // 2ª tentativa: Cobalt API
  try {
    const cobaltUrl = await cobaltDownload(url, 'audio');
    if (cobaltUrl) return { title: fb, url: cobaltUrl };
  } catch (e) {}

  throw new Error('❌ Não consegui baixar o áudio. YouTube está bloqueando downloads no servidor. Tente novamente em alguns minutos.');
}

async function youtubeAudioHD(query) {
  const url = await searchYoutube(query);
  const info = await searchYoutubeFull(query);
  const fb = (info && info.title) || 'YT HD';

  try {
    const r = await loaderYoutubeAudio(url, '320');
    if (r) return { title: r.title || fb, ...r, quality: '320kbps' };
  } catch (e) {}

  try {
    const r = await loaderYoutubeAudio(url, '192');
    if (r) return { title: r.title || fb, ...r, quality: '192kbps' };
  } catch (e) {}

  throw new Error('❌ Não consegui baixar o áudio HD.');
}

async function youtubeAudioBuffer(query) {
  const r = await youtubeAudio(query);
  return { title: r.title, buffer: r.buffer, url: r.url };
}

// ==================== YOUTUBE VIDEO ====================

async function youtubeVideo(query) {
  const url = await searchYoutube(query);
  const info = await searchYoutubeFull(query);
  const fb = (info && info.title) || 'YouTube Video';

  // 1ª tentativa: loader.to 720p
  try {
    const r = await loaderYoutubeVideo(url, '720');
    if (r) return { title: r.title || fb, ...r, quality: r.quality || '720p' };
  } catch (e) { console.log('[YT-VIDEO] loader.to 720p falhou:', e.message); }

  // 2ª tentativa: loader.to 480p
  try {
    const r = await loaderYoutubeVideo(url, '480');
    if (r) return { title: r.title || fb, ...r, quality: r.quality || '480p' };
  } catch (e) {}

  throw new Error('❌ Não consegui baixar o vídeo. Tente !play para áudio.');
}

async function youtubeVideoLow(query) {
  const url = await searchYoutube(query);
  const info = await searchYoutubeFull(query);
  const fb = (info && info.title) || 'YT';

  try {
    const r = await loaderYoutubeVideo(url, '360');
    if (r) return { title: r.title || fb, ...r, quality: 'low' };
  } catch (e) {}

  throw new Error('❌ Não consegui baixar o vídeo em baixa qualidade.');
}

module.exports = { youtubeAudio, youtubeAudioHD, youtubeAudioBuffer, youtubeVideo, youtubeVideoLow };
