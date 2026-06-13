/**
 * Downloader v7 — YouTube via loader.to + APIs (Junho 2026)
 *
 * yt-dlp NÃO FUNCIONA para YouTube (bot detection).
 * Fluxo principal para YouTube: loader.to API → Buffer MP3/MP4 direto
 * Fluxo para social: APIs específicas → yt-dlp último resort
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const yts = require('yt-search');
const mediaHandler = require('./mediaHandler');
const {
  loaderYoutubeAudio, loaderYoutubeVideo,
  cobaltDownload, tikwmDownload, spotifydownDownload,
  siputzxPinterest, siputzxPinterestSearch,
} = require('./dl/helpers');

function safeTitle(name = 'media') {
  return String(name || 'media').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80) || 'media';
}

function isUrl(input) {
  return /^https?:\/\//i.test(String(input || ''));
}

function getFfmpegBin() {
  try { return require('ffmpeg-static') || 'ffmpeg'; }
  catch { return 'ffmpeg'; }
}

function findDownloadedFile(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => !f.endsWith('.part') && !f.endsWith('.ytdl') && !f.endsWith('.json'))
    .map(f => path.join(dir, f))
    .filter(f => fs.statSync(f).isFile())
    .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
  return files[0] || null;
}

// ==================== BUSCA YOUTUBE ====================
async function youtubeSearch(query) {
  if (isUrl(query)) {
    return { url: query, title: query, thumb: '', duration: '', author: '', seconds: 0 };
  }

  async function searchOnce(q, maxSeconds = 12 * 60) {
    const r = await yts(q);
    const videos = (r.videos || []).filter(v => v?.url && v.seconds > 0);
    return videos.find(v => v.seconds >= 30 && v.seconds <= maxSeconds) || null;
  }

  let v = await searchOnce(query, 12 * 60);
  if (!v) v = await searchOnce(`${query} song short`, 12 * 60);
  if (!v) v = await searchOnce(query, 60 * 60);

  if (!v) throw new Error(`🔍 Não encontrei "${query}" no YouTube.`);
  return {
    url: v.url, title: v.title, id: v.videoId,
    thumb: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
    duration: v.timestamp || '', seconds: v.seconds || 0,
    author: v.author?.name || v.author || '', views: v.views || 0,
  };
}

async function resolveMedia(input) {
  if (isUrl(input)) return { url: input, title: input, duration: '', author: '', thumb: '', seconds: 0 };
  return youtubeSearch(input);
}

// ==================== yt-dlp (último resort) ====================
function runYtDlp(args, timeoutMs = 180000) {
  const runners = [];
  if (process.env.YTDLP_BIN) runners.push({ cmd: process.env.YTDLP_BIN, prefix: [] });
  runners.push({ cmd: 'python3', prefix: ['-m', 'yt_dlp'] });
  runners.push({ cmd: 'yt-dlp', prefix: [] });

  const errors = [];
  for (const runner of runners) {
    try {
      return execFileSync(runner.cmd, [...runner.prefix, ...args], {
        encoding: 'utf8', timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e) {
      errors.push(`${runner.cmd}: ${String(e.stderr?.toString?.() || e.message).slice(0, 180)}`);
    }
  }
  throw new Error('yt-dlp falhou: ' + errors.slice(0, 2).join(' | '));
}

async function downloadAudioFile(query, { bitrate = '128k', label = 'áudio', timeoutMs = 180000 } = {}) {
  const media = await resolveMedia(query);

  // 1ª tentativa: loader.to (FUNCIONA de servidores!)
  try {
    const quality = bitrate === '320k' ? '320' : bitrate === '192k' ? '192' : bitrate === '160k' ? '192' : '128';
    const r = await loaderYoutubeAudio(media.url, quality);
    if (r) {
      // Se já veio buffer, retorna direto
      if (r.buffer && Buffer.isBuffer(r.buffer) && r.buffer.length > 2048) {
        return {
          title: r.title || media.title, duration: media.duration, author: r.author || media.author,
          thumb: r.thumbnail || media.thumb, url: '', buffer: r.buffer, mimetype: 'audio/mpeg',
          quality: label, fileName: `${safeTitle(r.title || media.title)}.mp3`,
        };
      }
      // Se veio URL, baixar o buffer
      if (r.url) {
        try {
          const buffer = await mediaHandler.fetchBuffer(r.url);
          if (buffer && buffer.length > 2048) {
            return {
              title: r.title || media.title, duration: media.duration, author: r.author || media.author,
              thumb: r.thumbnail || media.thumb, url: '', buffer, mimetype: 'audio/mpeg',
              quality: label, fileName: `${safeTitle(r.title || media.title)}.mp3`,
            };
          }
        } catch (e) { console.log('[DL] fetchBuffer falhou:', e.message); }
      }
    }
  } catch (e) { console.log('[DL-AUDIO] loader.to falhou:', e.message); }

  // 2ª tentativa: Cobalt
  try {
    const cobaltUrl = await cobaltDownload(media.url, 'audio');
    if (cobaltUrl) {
      const buffer = await mediaHandler.fetchBuffer(cobaltUrl);
      if (buffer && buffer.length > 2048) {
        return {
          title: media.title, duration: media.duration, author: media.author,
          thumb: media.thumb, url: '', buffer, mimetype: 'audio/mpeg',
          quality: label, fileName: `${safeTitle(media.title)}.mp3`,
        };
      }
    }
  } catch (e) {}

  // 3ª tentativa: yt-dlp (pode falhar se IP bloqueado)
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-audio-'));
    const outTpl = path.join(tmpDir, 'source.%(ext)s');
    try {
      const ffLoc = getFfmpegBin();
      const ffArgs = ['--no-playlist', '--no-warnings', '--force-overwrites', '--no-part',
        '--retries', '2', '--max-filesize', '35M', '-f', 'bestaudio/best', '-o', outTpl];
      if (ffLoc && ffLoc !== 'ffmpeg') ffArgs.push('--ffmpeg-location', path.dirname(ffLoc));
      ffArgs.push(media.url);
      runYtDlp(ffArgs, timeoutMs);

      const input = findDownloadedFile(tmpDir);
      if (!input) throw new Error('yt-dlp não gerou arquivo');

      const out = path.join(tmpDir, 'audio.mp3');
      execFileSync(getFfmpegBin(), ['-y', '-i', input, '-vn', '-b:a', bitrate, '-ar', '44100', '-ac', '2', '-f', 'mp3', out],
        { stdio: 'ignore', timeout: 180000 });

      const buffer = fs.readFileSync(out);
      if (buffer && buffer.length > 2048) {
        return {
          title: media.title, duration: media.duration, author: media.author,
          thumb: media.thumb, url: '', buffer, mimetype: 'audio/mpeg',
          quality: label, fileName: `${safeTitle(media.title)}.mp3`,
        };
      }
    } finally { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} }
  } catch (e) { console.log('[DL-AUDIO] yt-dlp falhou:', e.message); }

  throw new Error('❌ Não consegui baixar o áudio. YouTube está bloqueando downloads no servidor. Tente novamente em alguns minutos.');
}

async function downloadVideoFile(query, { height = 720, label = '720p', timeoutMs = 260000 } = {}) {
  const media = await resolveMedia(query);

  // 1ª tentativa: loader.to
  try {
    const quality = height >= 1080 ? '1080' : height >= 720 ? '720' : height >= 480 ? '480' : '360';
    const r = await loaderYoutubeVideo(media.url, quality);
    if (r) {
      if (r.buffer && Buffer.isBuffer(r.buffer) && r.buffer.length > 4096) {
        return {
          title: r.title || media.title, duration: media.duration, author: r.author || media.author,
          thumb: r.thumbnail || media.thumb, url: '', buffer: r.buffer, mimetype: 'video/mp4',
          quality: label, fileName: `${safeTitle(r.title || media.title)}.mp4`,
        };
      }
      if (r.url) {
        try {
          const buffer = await mediaHandler.fetchBuffer(r.url);
          if (buffer && buffer.length > 4096) {
            return {
              title: r.title || media.title, duration: media.duration, author: r.author || media.author,
              thumb: r.thumbnail || media.thumb, url: '', buffer, mimetype: 'video/mp4',
              quality: label, fileName: `${safeTitle(r.title || media.title)}.mp4`,
            };
          }
        } catch (e) {}
      }
    }
  } catch (e) { console.log('[DL-VIDEO] loader.to falhou:', e.message); }

  // 2ª tentativa: Cobalt
  try {
    const cobaltUrl = await cobaltDownload(media.url, 'auto');
    if (cobaltUrl) {
      const buffer = await mediaHandler.fetchBuffer(cobaltUrl);
      if (buffer && buffer.length > 4096) {
        return {
          title: media.title, duration: media.duration, author: media.author,
          thumb: media.thumb, url: '', buffer, mimetype: 'video/mp4',
          quality: label, fileName: `${safeTitle(media.title)}.mp4`,
        };
      }
    }
  } catch (e) {}

  // 3ª tentativa: yt-dlp
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-video-'));
    const outTpl = path.join(tmpDir, 'source.%(ext)s');
    try {
      const format = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`;
      const ffLoc = getFfmpegBin();
      const ffArgs = ['--no-playlist', '--no-warnings', '--force-overwrites', '--no-part',
        '--retries', '2', '--max-filesize', height >= 1080 ? '140M' : '90M',
        '-f', format, '-o', outTpl];
      if (ffLoc && ffLoc !== 'ffmpeg') ffArgs.push('--ffmpeg-location', path.dirname(ffLoc));
      ffArgs.push(media.url);
      runYtDlp(ffArgs, timeoutMs);

      const input = findDownloadedFile(tmpDir);
      if (!input) throw new Error('yt-dlp não gerou arquivo');

      const out = path.join(tmpDir, 'video.mp4');
      execFileSync(getFfmpegBin(), [
        '-y', '-i', input, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', out,
      ], { stdio: 'ignore', timeout: 260000 });

      const buffer = fs.readFileSync(out);
      if (buffer && buffer.length > 4096) {
        return {
          title: media.title, duration: media.duration, author: media.author,
          thumb: media.thumb, url: '', buffer, mimetype: 'video/mp4',
          quality: label, fileName: `${safeTitle(media.title)}.mp4`,
        };
      }
    } finally { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} }
  } catch (e) {}

  throw new Error('❌ Não consegui baixar o vídeo. Tente !play para áudio.');
}

// ==================== COMANDOS YOUTUBE ====================
async function youtubeAudio(query) { return downloadAudioFile(query, { bitrate: '96k', label: 'baixo 96kbps' }); }
async function youtubeAudioSavefrom(query) { return downloadAudioFile(query, { bitrate: '160k', label: 'médio 160kbps' }); }
async function youtubeAudioAuto(query) { return downloadAudioFile(query, { bitrate: '320k', label: 'alta 320kbps' }); }
async function youtubeVideo(query) { return downloadVideoFile(query, { height: 720, label: '720p HD' }); }
async function youtubeVideoSavefrom(query) { return downloadVideoFile(query, { height: 1080, label: '1080p FHD', timeoutMs: 320000 }); }

// ==================== SOCIAL VIDEO ====================
async function tiktok(url) {
  if (!isUrl(url)) throw new Error('❌ Envie link do TikTok.');
  const tikwmResult = await tikwmDownload(url);
  if (tikwmResult) {
    try {
      const buffer = await mediaHandler.fetchBuffer(tikwmResult.noWatermark || tikwmResult.url);
      if (buffer && buffer.length > 4096) {
        return { title: tikwmResult.title, url: '', buffer, mimetype: 'video/mp4', quality: 'TikTok MP4', fileName: `${safeTitle(tikwmResult.title)}.mp4` };
      }
    } catch (e) {}
    return { title: tikwmResult.title, url: tikwmResult.noWatermark || tikwmResult.url };
  }
  try { const c = await cobaltDownload(url, 'auto'); if (c) return { title: 'TikTok', url: c }; } catch (e) {}
  try { return await downloadVideoFile(url, { height: 720, label: 'TikTok' }); } catch (e) {}
  throw new Error('❌ Não consegui baixar o TikTok.');
}

async function facebook(url) {
  if (!isUrl(url)) throw new Error('❌ Envie link do Facebook.');
  try { const c = await cobaltDownload(url, 'auto'); if (c) return { title: 'Facebook', url: c }; } catch (e) {}
  try { return await downloadVideoFile(url, { height: 720, label: 'Facebook' }); } catch (e) {}
  throw new Error('❌ Não consegui baixar do Facebook.');
}

async function twitter(url) {
  if (!isUrl(url)) throw new Error('❌ Envie link do X/Twitter.');
  try { const c = await cobaltDownload(url, 'auto'); if (c) return { url: c }; } catch (e) {}
  try { return await downloadVideoFile(url, { height: 720, label: 'X/Twitter' }); } catch (e) {}
  throw new Error('❌ Não consegui baixar do X/Twitter.');
}

async function instagram(url) {
  if (!isUrl(url)) throw new Error('❌ Envie link do Instagram.');
  try {
    const c = await cobaltDownload(url, 'auto');
    if (c) return { type: c.includes('.mp4') ? 'video' : 'image', url: c };
  } catch (e) {}
  try { const r = await downloadVideoFile(url, { height: 720, label: 'Instagram' }); return { ...r, type: 'video' }; } catch (e) {}
  throw new Error('❌ Não consegui baixar do Instagram.');
}

// ==================== SPOTIFY / SOUNDCLOUD ====================
async function spotify(queryOrUrl) {
  if (isUrl(queryOrUrl) && /spotify\.com/.test(queryOrUrl)) {
    const spotResult = await spotifydownDownload(queryOrUrl);
    if (spotResult && spotResult.url) {
      try {
        const buffer = await mediaHandler.fetchBuffer(spotResult.url);
        if (buffer && buffer.length > 2048) {
          return { title: spotResult.title, author: spotResult.author, thumb: spotResult.thumbnail, url: '', buffer, mimetype: 'audio/mpeg', quality: 'Spotify 160kbps', fileName: `${safeTitle(spotResult.title)}.mp3` };
        }
      } catch (e) {}
      return { title: spotResult.title, url: spotResult.url, author: spotResult.author };
    }
    try { const c = await cobaltDownload(queryOrUrl, 'audio'); if (c) return { title: 'Spotify', url: c }; } catch (e) {}
  }
  const query = isUrl(queryOrUrl) ? queryOrUrl : `${queryOrUrl} audio`;
  try { return await downloadAudioFile(query, { bitrate: '160k', label: 'Spotify fallback' }); }
  catch { return downloadAudioFile(String(queryOrUrl).replace(/https?:\/\/\S+/g, '').trim() || 'spotify', { bitrate: '160k', label: 'Spotify fallback' }); }
}

async function soundcloud(queryOrUrl) {
  if (isUrl(queryOrUrl)) {
    try { const c = await cobaltDownload(queryOrUrl, 'audio'); if (c) return { title: 'SoundCloud', url: c }; } catch (e) {}
  }
  try {
    if (isUrl(queryOrUrl)) return await downloadAudioFile(queryOrUrl, { bitrate: '160k', label: 'SoundCloud' });
    return await downloadAudioFile(`${queryOrUrl} song short`, { bitrate: '160k', label: 'SoundCloud' });
  } catch { return downloadAudioFile(queryOrUrl, { bitrate: '160k', label: 'fallback' }); }
}

// ==================== PINTEREST ====================
async function pinterest(url) {
  if (!isUrl(url)) return (await pinterestSearch(url))[0];
  const pinResult = await siputzxPinterest(url);
  if (pinResult && pinResult.url) return pinResult;
  try { const c = await cobaltDownload(url, 'auto'); if (c) return { url: c, title: 'Pinterest' }; } catch (e) {}
  return { url };
}

async function pinterestSearch(query) {
  const sipResults = await siputzxPinterestSearch(query);
  if (sipResults && sipResults.length) return sipResults;
  try {
    const r = await mediaHandler.fetchJson('https://api.siputzx.my.id/api/s/pinterest?query=' + encodeURIComponent(query), 25000);
    const arr = r?.data || r?.result || r?.results;
    if (Array.isArray(arr) && arr.length) {
      return arr.map(p => { const u = typeof p === 'string' ? p : (p.image_url || p.image || p.url || p.src); return u ? { url: u } : null; }).filter(Boolean).slice(0, 10);
    }
  } catch (e) {}
  throw new Error('❌ Pinterest sem resultados.');
}

// ==================== MEDIAFIRE / APK ====================
async function mediafire(url) {
  if (!/mediafire\.com/i.test(url)) throw new Error('❌ Envie um link do MediaFire.');
  try {
    const html = execSync(`curl -sL "${url}" -H "User-Agent: Mozilla/5.0"`, { timeout: 15000 }).toString();
    const match = html.match(/href="(https:\/\/download\d+\.mediafire\.com\/[^"]+)"/);
    if (match) {
      const fileName = decodeURIComponent(match[1].split('/').pop() || 'mediafire_file');
      const fileSize = html.match(/class="details"[^>]*>\s*\(([^)]+)\)/)?.[1] || '';
      return { url: match[1], title: fileName, size: fileSize };
    }
    throw new Error('Link não encontrado.');
  } catch (e) { throw new Error('❌ Não consegui acessar o MediaFire.\n' + e.message); }
}

async function liteapks(query) {
  const results = [];
  try {
    const html = execSync(`curl -sL "https://liteapks.com/?s=${encodeURIComponent(query)}" -H "User-Agent: Mozilla/5.0" --max-time 10`, { timeout: 15000 }).toString();
    const regex = /href="(https:\/\/liteapks\.com\/[a-z0-9]+-?[a-z0-9-]*\.html)"/g;
    let m;
    while ((m = regex.exec(html)) !== null && results.length < 4) {
      const url = m[1];
      if (!url.includes('page/') && !results.find(r => r.url === url)) {
        results.push({ name: url.split('/').pop().replace('.html', '').replace(/-/g, ' '), url, source: 'LiteAPKs' });
      }
    }
  } catch {}
  if (!results.length) throw new Error(`❌ Não encontrei "${query}".`);
  return results;
}

async function apkDownload(query) {
  const results = await liteapks(query);
  const first = results[0];
  return { isPage: true, title: first.name, url: first.url, source: first.source };
}

// Compatibilidade
async function play160(q) { return youtubeAudio(q); }
async function playMedium(q) { return youtubeAudioSavefrom(q); }
async function play320(q) { return youtubeAudioAuto(q); }
async function videoHD(q) { return youtubeVideo(q); }
async function videoFHD(q) { return youtubeVideoSavefrom(q); }
async function youtubeYtdlp(q, type = 'audio', quality = '720') {
  return type === 'audio' ? downloadAudioFile(q, { bitrate: '160k', label: 'audio' }) : downloadVideoFile(q, { height: Number(quality) || 720, label: `${quality}p` });
}

module.exports = {
  youtubeAudio, youtubeAudioSavefrom, youtubeAudioAuto,
  youtubeVideo, youtubeVideoSavefrom, youtubeSearch,
  play160, playMedium, play320, videoHD, videoFHD, youtubeYtdlp,
  tiktok, instagram, facebook, twitter,
  spotify, soundcloud, pinterest, pinterestSearch,
  mediafire, liteapks, apkDownload,
};
