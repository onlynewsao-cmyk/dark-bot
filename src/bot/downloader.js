/**
 * Downloader v6 — sem APIs externas para YouTube áudio/vídeo.
 *
 * Regra principal dos comandos play/play2/play3/video/video2:
 * - baixar com yt-dlp local
 * - converter com ffmpeg-static
 * - devolver Buffer real para WhatsApp
 *
 * FALLBACK v2: Quando yt-dlp falha, tenta Cobalt API e outras APIs
 * funcionais (2025/2026) antes de dar erro.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const yts = require('yt-search');

const mediaHandler = require('./mediaHandler');

// Importar helpers de API
const { cobaltDownload, tikwmDownload, spotifydownDownload, siputzxPinterest, siputzxPinterestSearch } = require('./dl/helpers');

function safeTitle(name = 'media') {
  return String(name || 'media').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80) || 'media';
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function fetchTextFast(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const text = await res.text();
    if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 160));
    return text;
  } finally { clearTimeout(timer); }
}

async function fetchJsonFast(url, timeoutMs = 15000) {
  const text = await fetchTextFast(url, timeoutMs);
  return JSON.parse(text);
}

function getFfmpegBin() {
  try { return require('ffmpeg-static') || 'ffmpeg'; }
  catch { return 'ffmpeg'; }
}

function ffmpegLocationArg() {
  const bin = getFfmpegBin();
  return bin && bin !== 'ffmpeg' ? path.dirname(bin) : '';
}

function ytdlpRunners() {
  const runners = [];
  if (process.env.YTDLP_BIN) runners.push({ cmd: process.env.YTDLP_BIN, prefix: [] });
  if (process.env.PYTHON_BIN) runners.push({ cmd: process.env.PYTHON_BIN, prefix: ['-m', 'yt_dlp'] });
  runners.push({ cmd: 'python3', prefix: ['-m', 'yt_dlp'] });
  runners.push({ cmd: 'python', prefix: ['-m', 'yt_dlp'] });
  runners.push({ cmd: 'yt-dlp', prefix: [] });
  return runners;
}

function runYtDlp(args, timeoutMs = 180000, options = {}) {
  const errors = [];
  for (const runner of ytdlpRunners()) {
    try {
      return execFileSync(runner.cmd, [...runner.prefix, ...args], {
        encoding: options.encoding || 'utf8',
        timeout: timeoutMs,
        maxBuffer: 20 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e) {
      const err = e.stderr?.toString?.() || e.message;
      errors.push(`${runner.cmd}: ${String(err).slice(0, 180)}`);
    }
  }
  throw new Error('yt-dlp falhou: ' + errors.slice(0, 3).join(' | '));
}

function ytdlpInfo(url, timeoutMs = 45000) {
  try {
    const out = runYtDlp(['--no-playlist', '--dump-json', url], timeoutMs);
    return JSON.parse(out);
  } catch { return null; }
}

function findDownloadedFile(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => !f.endsWith('.part') && !f.endsWith('.ytdl') && !f.endsWith('.json'))
    .map(f => path.join(dir, f))
    .filter(f => fs.statSync(f).isFile())
    .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
  return files[0] || null;
}

function isUrl(input) {
  return /^https?:\/\//i.test(String(input || ''));
}

// ==================== BUSCA YOUTUBE ====================
async function youtubeSearch(query) {
  if (isUrl(query)) return { url: query, title: query, thumb: '', duration: '', author: '', seconds: 0 };

  async function searchOnce(q, maxSeconds = 12 * 60) {
    const r = await yts(q);
    const videos = (r.videos || []).filter(v => v?.url && v.seconds > 0);
    return videos.find(v => v.seconds >= 30 && v.seconds <= maxSeconds) || null;
  }

  let v = await searchOnce(query, 12 * 60);
  if (!v) v = await searchOnce(`${query} song short`, 12 * 60);
  if (!v) v = await searchOnce(`${query} 3 minutes`, 12 * 60);
  if (!v) v = await searchOnce(query, 20 * 60);
  if (!v) v = await searchOnce(query, 60 * 60);

  if (!v) throw new Error(`🔍 Não encontrei "${query}" no YouTube.`);
  return {
    url: v.url,
    title: v.title,
    id: v.videoId,
    thumb: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
    duration: v.timestamp || '',
    seconds: v.seconds || 0,
    author: v.author?.name || v.author || '',
    views: v.views || 0,
  };
}

async function resolveMedia(input) {
  if (isUrl(input)) {
    const info = ytdlpInfo(input) || {};
    return {
      url: input,
      title: info.title || input,
      duration: info.duration_string || '',
      author: info.uploader || '',
      thumb: info.thumbnail || '',
      seconds: info.duration || 0,
    };
  }
  return youtubeSearch(input);
}

function baseYtDlpArgs(url, outTpl, format, maxFileSize = '95M') {
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--force-overwrites',
    '--no-part',
    '--retries', '2',
    '--fragment-retries', '2',
    '--max-filesize', maxFileSize,
    '-f', format,
    '-o', outTpl,
  ];
  const ffLoc = ffmpegLocationArg();
  if (ffLoc) args.push('--ffmpeg-location', ffLoc);
  args.push(url);
  return args;
}

async function downloadAudioFile(query, { bitrate = '128k', label = 'áudio', timeoutMs = 180000 } = {}) {
  const media = await resolveMedia(query);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-audio-'));
  const outTpl = path.join(tmpDir, 'source.%(ext)s');
  try {
    runYtDlp(baseYtDlpArgs(media.url, outTpl, 'bestaudio/best', '35M'), timeoutMs);
    const input = findDownloadedFile(tmpDir);
    if (!input) throw new Error('yt-dlp não gerou arquivo de áudio');

    const out = path.join(tmpDir, 'audio.mp3');
    execFileSync(getFfmpegBin(), [
      '-y', '-i', input,
      '-vn', '-b:a', bitrate, '-ar', '44100', '-ac', '2',
      '-f', 'mp3', out,
    ], { stdio: 'ignore', timeout: 180000 });

    const buffer = fs.readFileSync(out);
    if (!buffer || buffer.length < 2048) throw new Error('MP3 convertido vazio');
    return {
      title: media.title,
      duration: media.duration,
      author: media.author,
      thumb: media.thumb,
      url: '',
      buffer,
      mimetype: 'audio/mpeg',
      quality: label,
      fileName: `${safeTitle(media.title)}.mp3`,
    };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

async function downloadVideoFile(query, { height = 720, label = '720p', timeoutMs = 260000 } = {}) {
  const media = await resolveMedia(query);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-video-'));
  const outTpl = path.join(tmpDir, 'source.%(ext)s');
  try {
    const format = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`;
    runYtDlp(baseYtDlpArgs(media.url, outTpl, format, height >= 1080 ? '140M' : '90M'), timeoutMs);
    const input = findDownloadedFile(tmpDir);
    if (!input) throw new Error('yt-dlp não gerou arquivo de vídeo');

    const out = path.join(tmpDir, 'video.mp4');
    execFileSync(getFfmpegBin(), [
      '-y', '-i', input,
      '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      out,
    ], { stdio: 'ignore', timeout: 260000 });

    const buffer = fs.readFileSync(out);
    if (!buffer || buffer.length < 4096) throw new Error('MP4 convertido vazio');
    return {
      title: media.title,
      duration: media.duration,
      author: media.author,
      thumb: media.thumb,
      url: '',
      buffer,
      mimetype: 'video/mp4',
      quality: label,
      fileName: `${safeTitle(media.title)}.mp4`,
    };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

// ==================== COMANDOS YOUTUBE ====================
async function youtubeAudio(query) {
  return downloadAudioFile(query, { bitrate: '96k', label: 'baixo 96kbps' });
}
async function youtubeAudioSavefrom(query) {
  return downloadAudioFile(query, { bitrate: '160k', label: 'médio 160kbps' });
}
async function youtubeAudioAuto(query) {
  return downloadAudioFile(query, { bitrate: '320k', label: 'alta 320kbps' });
}
async function youtubeVideo(query) {
  return downloadVideoFile(query, { height: 720, label: '720p HD' });
}
async function youtubeVideoSavefrom(query) {
  return downloadVideoFile(query, { height: 1080, label: '1080p FHD', timeoutMs: 320000 });
}

// ==================== SOCIAL VIDEO — yt-dlp + API fallback ====================

/**
 * Tenta baixar vídeo social via yt-dlp primeiro, depois via APIs se falhar.
 * Retorna { buffer, title, ... } ou { url, title, ... }
 */
async function socialVideoDownload(url, label = 'MP4') {
  // 1ª tentativa: yt-dlp local
  try {
    return await downloadVideoFile(url, { height: 720, label: label + ' MP4' });
  } catch (ytdlpErr) {
    console.log(`[DL] yt-dlp falhou para ${label}: ${ytdlpErr.message}`);
  }

  // 2ª tentativa: Cobalt API
  try {
    const cobaltUrl = await cobaltDownload(url, 'auto');
    if (cobaltUrl) {
      console.log(`[DL] Cobalt OK para ${label}`);
      try {
        const buffer = await mediaHandler.fetchBuffer(cobaltUrl);
        if (buffer && buffer.length > 4096) {
          return {
            title: label,
            url: '',
            buffer,
            mimetype: 'video/mp4',
            quality: label,
            fileName: `${safeTitle(label)}.mp4`,
          };
        }
      } catch (bufErr) {
        console.log(`[DL] Cobalt buffer falhou, usando URL direta`);
      }
      return { title: label, url: cobaltUrl };
    }
  } catch (e) {
    console.log(`[DL] Cobalt falhou para ${label}: ${e.message}`);
  }

  // 3ª tentativa: API específica por plataforma
  // (TikTok, etc. — tratados nas funções específicas abaixo)

  throw new Error(`❌ Não consegui baixar ${label}. Tente novamente ou use link diferente.`);
}

async function tiktok(url) {
  if (!isUrl(url)) throw new Error('❌ Envie link do TikTok.');

  // 1ª tentativa: TikWM (sem marca d'água)
  const tikwmResult = await tikwmDownload(url);
  if (tikwmResult) {
    try {
      const buffer = await mediaHandler.fetchBuffer(tikwmResult.noWatermark || tikwmResult.url);
      if (buffer && buffer.length > 4096) {
        return {
          title: tikwmResult.title || 'TikTok',
          url: '',
          buffer,
          mimetype: 'video/mp4',
          quality: 'TikTok MP4',
          fileName: `${safeTitle(tikwmResult.title || 'tiktok')}.mp4`,
        };
      }
    } catch (e) {}
    return { title: tikwmResult.title || 'TikTok', url: tikwmResult.noWatermark || tikwmResult.url };
  }

  // 2ª tentativa: yt-dlp + Cobalt fallback
  return socialVideoDownload(url, 'TikTok');
}

async function facebook(url) {
  if (!isUrl(url)) throw new Error('❌ Envie link do Facebook.');
  return socialVideoDownload(url, 'Facebook');
}

async function twitter(url) {
  if (!isUrl(url)) throw new Error('❌ Envie link do X/Twitter.');
  return socialVideoDownload(url, 'X/Twitter');
}

async function instagram(url) {
  if (!isUrl(url)) throw new Error('❌ Envie link do Instagram.');
  const r = await socialVideoDownload(url, 'Instagram');
  return { ...r, type: 'video' };
}

// ==================== SPOTIFY / SOUNDCLOUD ====================
async function spotify(queryOrUrl) {
  // Se é URL do Spotify, tenta SpotifyDown primeiro
  if (isUrl(queryOrUrl) && /spotify\.com/.test(queryOrUrl)) {
    const spotResult = await spotifydownDownload(queryOrUrl);
    if (spotResult && spotResult.url) {
      try {
        const buffer = await mediaHandler.fetchBuffer(spotResult.url);
        if (buffer && buffer.length > 2048) {
          return {
            title: spotResult.title,
            author: spotResult.author,
            thumb: spotResult.thumbnail,
            url: '',
            buffer,
            mimetype: 'audio/mpeg',
            quality: 'Spotify 160kbps',
            fileName: `${safeTitle(spotResult.title)}.mp3`,
          };
        }
      } catch (e) {}
      return { title: spotResult.title, url: spotResult.url, author: spotResult.author };
    }

    // Fallback Cobalt
    try {
      const cobaltUrl = await cobaltDownload(queryOrUrl, 'audio');
      if (cobaltUrl) return { title: 'Spotify', url: cobaltUrl };
    } catch (e) {}
  }

  // Fallback YouTube
  const query = isUrl(queryOrUrl) ? queryOrUrl : `${queryOrUrl} audio`;
  try { return await downloadAudioFile(query, { bitrate: '160k', label: 'Spotify fallback 160kbps' }); }
  catch { return downloadAudioFile(String(queryOrUrl).replace(/https?:\/\/\S+/g, '').trim() || 'spotify music', { bitrate: '160k', label: 'Spotify fallback 160kbps' }); }
}

async function soundcloud(queryOrUrl) {
  // Se é URL do SoundCloud, tenta Cobalt primeiro (suporta SoundCloud)
  if (isUrl(queryOrUrl)) {
    try {
      const cobaltUrl = await cobaltDownload(queryOrUrl, 'audio');
      if (cobaltUrl) {
        try {
          const buffer = await mediaHandler.fetchBuffer(cobaltUrl);
          if (buffer && buffer.length > 2048) {
            return {
              title: 'SoundCloud',
              url: '',
              buffer,
              mimetype: 'audio/mpeg',
              quality: 'SoundCloud 160kbps',
              fileName: 'soundcloud.mp3',
            };
          }
        } catch (e) {}
        return { title: 'SoundCloud', url: cobaltUrl };
      }
    } catch (e) {}
  }

  // Fallback yt-dlp
  try {
    if (isUrl(queryOrUrl)) return await downloadAudioFile(queryOrUrl, { bitrate: '160k', label: 'SoundCloud 160kbps' });
    return await downloadAudioFile(`${queryOrUrl} song short`, { bitrate: '160k', label: 'SoundCloud 160kbps' });
  } catch {
    const yt = await downloadAudioFile(queryOrUrl, { bitrate: '160k', label: 'fallback YouTube 160kbps' });
    return { ...yt, title: `${yt.title} (fallback YouTube)` };
  }
}

// ==================== PINTEREST / IMAGEM ====================
async function pinterest(url) {
  if (!isUrl(url)) return (await pinterestSearch(url))[0];

  // 1ª tentativa: Siputzx
  const pinResult = await siputzxPinterest(url);
  if (pinResult && pinResult.url) {
    try {
      const buffer = await mediaHandler.fetchBuffer(pinResult.url);
      if (buffer && buffer.length > 1024) {
        return {
          title: pinResult.title || 'Pinterest',
          url: '',
          buffer,
          mimetype: pinResult.type === 'video' ? 'video/mp4' : 'image/jpeg',
          quality: 'Pinterest',
          fileName: `${safeTitle(pinResult.title || 'pinterest')}.${pinResult.type === 'video' ? 'mp4' : 'jpg'}`,
        };
      }
    } catch (e) {}
    return pinResult;
  }

  // 2ª tentativa: yt-dlp
  try { return await downloadVideoFile(url, { height: 720, label: 'Pinterest MP4' }); }
  catch { return { url }; }
}

async function bingImageFallback(query) {
  const q = encodeURIComponent(`${query} pinterest anime aesthetic`);
  const html = await fetchTextFast(`https://www.bing.com/images/search?q=${q}&form=HDRSC2`, 18000);
  const raw = [
    ...[...html.matchAll(/murl&quot;:&quot;(https?:\/\/.*?)(?:&quot;)/g)].map(m => m[1]),
    ...[...html.matchAll(/"murl":"(https?:\/\/[^"\\]+)"/g)].map(m => m[1]),
  ].map(u => u.replace(/&amp;/g, '&').replace(/\u002f/g, '/'));
  const imgs = raw
    .map(u => { try { return decodeURIComponent(u); } catch { return u; } })
    .filter(u => /^https?:\/\//i.test(u))
    .filter(u => /\.(jpe?g|png|webp)(?:[?#]|$)/i.test(u))
    .filter(u => !/ytimg|youtube|favicon|logo|sprite/i.test(u))
    .map(url => ({ url }));
  const unique = [];
  const seen = new Set();
  for (const item of imgs) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    unique.push(item);
    if (unique.length >= 10) break;
  }
  return unique;
}

async function pinterestSearch(query) {
  // 1ª tentativa: Siputzx
  const sipResults = await siputzxPinterestSearch(query);
  if (sipResults && sipResults.length) return sipResults;

  // 2ª tentativa: Outra API Pinterest
  try {
    const r = await fetchJsonFast(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`, 25000);
    const arr = r?.data || r?.result || r?.results;
    if (Array.isArray(arr) && arr.length) {
      const mapped = arr
        .map(p => {
          const u = typeof p === 'string' ? p : (p.image_url || p.image || p.url || p.src || p.download_url || p.media_url || p.link);
          return u ? { url: u } : null;
        })
        .filter(Boolean)
        .filter(x => /^https?:\/\//i.test(x.url))
        .filter((item, idx, a) => a.findIndex(x => x.url === item.url) === idx)
        .slice(0, 10);
      if (mapped.length) return mapped;
    }
  } catch {}

  // 3ª tentativa: Bing images
  const fallback = await bingImageFallback(query);
  if (fallback.length) return fallback;
  throw new Error('❌ Pinterest sem resultados no momento.');
}

// ==================== MEDIAFIRE / APK SCRAPE ====================
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
    throw new Error('Link não encontrado na página.');
  } catch (e) {
    if (e.message.includes('Link não')) throw e;
    throw new Error('❌ Não consegui acessar o MediaFire.\n' + e.message);
  }
}

async function liteapks(query) {
  const results = [];
  try {
    const html = execSync(`curl -sL "https://liteapks.com/?s=${encodeURIComponent(query)}" -H "User-Agent: Mozilla/5.0" --max-time 10`, { timeout: 15000 }).toString();
    const regex = /href="(https:\/\/liteapks\.com\/[a-z0-9]+-?[a-z0-9-]*\.html)"/g;
    let m;
    while ((m = regex.exec(html)) !== null && results.length < 4) {
      const url = m[1];
      if (!url.includes('page/') && !url.includes('category') && !url.includes('tag/') && !results.find(r => r.url === url)) {
        const name = url.split('/').pop().replace('.html', '').replace(/-/g, ' ');
        results.push({ name, url, source: 'LiteAPKs' });
      }
    }
  } catch {}
  try {
    const html = execSync(`curl -sL "https://apkpure.com/br/search?q=${encodeURIComponent(query + ' mod')}" -H "User-Agent: Mozilla/5.0" --max-time 10`, { timeout: 15000 }).toString();
    const regex = /data-dt-app="[^"]*"[^>]*>[\s\S]*?<\/a>/g;
    let m;
    while ((m = regex.exec(html)) !== null && results.length < 7) {
      const block = m[0];
      const href = block.match(/href="([^"]+)"/)?.[1];
      const title = block.match(/title="([^"]+)"/)?.[1] || block.match(/<p[^>]*>([^<]+)/)?.[1];
      if (href && title) {
        const url = href.startsWith('http') ? href : 'https://apkpure.com' + href;
        if (!results.find(r => r.url === url)) results.push({ name: title.trim(), url, source: 'APKPure' });
      }
    }
  } catch {}
  if (!results.length) throw new Error(`❌ Não encontrei "${query}" nos sites de MOD APK.`);
  return results;
}

async function apkDownload(query) {
  const results = await liteapks(query);
  const first = results[0];
  return { isPage: true, title: first.name || query, url: first.url, source: first.source || 'LiteAPKs/APKPure' };
}

// Compatibilidade com nomes antigos
async function play160(query) { return youtubeAudio(query); }
async function playMedium(query) { return youtubeAudioSavefrom(query); }
async function play320(query) { return youtubeAudioAuto(query); }
async function videoHD(query) { return youtubeVideo(query); }
async function videoFHD(query) { return youtubeVideoSavefrom(query); }
async function youtubeYtdlp(query, type = 'audio', quality = '720') {
  return type === 'audio' ? downloadAudioFile(query, { bitrate: '160k', label: 'audio' }) : downloadVideoFile(query, { height: Number(quality) || 720, label: `${quality}p` });
}

module.exports = {
  youtubeAudio, youtubeAudioSavefrom, youtubeAudioAuto,
  youtubeVideo, youtubeVideoSavefrom, youtubeSearch,
  play160, playMedium, play320, videoHD, videoFHD, youtubeYtdlp,
  tiktok, instagram, facebook, twitter,
  spotify, soundcloud, pinterest, pinterestSearch,
  mediafire, liteapks, apkDownload,
};
