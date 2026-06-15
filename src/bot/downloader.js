/**
 * Downloader v8 — Cloudflare Worker + APIs funcionais (Junho 2026)
 *
 * Fluxo YouTube:
 *  1. Cloudflare Worker proxy (IPs limpos → URLs de streaming diretas)
 *  2. loader.to API (fallback, pode ter ads)
 *  3. yt-dlp (último resort, provavelmente falha em servidores)
 *
 * Fluxo social: APIs específicas → Cloudflare Worker → yt-dlp
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const yts = require('yt-search');
const mediaHandler = require('./mediaHandler');
const {
  YT_PROXY_URL,
  proxyYoutubeAudio, proxyYoutubeVideo,
  loaderYoutubeAudio, loaderYoutubeVideo,
  externalYoutubeDownload, cobaltDownload, tikwmDownload, spotifydownDownload,
  siputzxPinterest, siputzxPinterestSearch,
  proxySocialDownload,
  fetchMediaBuffer,
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

// ==================== yt-dlp (fallback robusto) ====================
function findNodeBin() {
  if (process.env.NODE_BIN) return process.env.NODE_BIN;
  try { return execFileSync('which', ['node'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return 'node'; }
}

function writeYtCookies(tmpDir) {
  const raw = process.env.YTDLP_COOKIES_BASE64 || process.env.YT_COOKIES_BASE64 || '';
  if (!raw) return '';
  try {
    const cookiePath = path.join(tmpDir || os.tmpdir(), `ytcookies_${Date.now()}.txt`);
    fs.writeFileSync(cookiePath, Buffer.from(raw, 'base64').toString('utf8'));
    return cookiePath;
  } catch { return ''; }
}

function withYtDlpHardening(args, tmpDir = '') {
  const out = [
    '--no-playlist',
    '--force-ipv4',
    '--geo-bypass',
    '--no-check-certificate',
    '--user-agent', process.env.YTDLP_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
    '--add-header', 'Accept-Language:en-US,en;q=0.9,pt;q=0.8',
    // YouTube 2026: yt-dlp precisa de runtime JS/remote EJS para resolver assinatura/n-challenge.
    '--js-runtimes', `node:${findNodeBin()}`,
    '--remote-components', 'ejs:npm',
    '--extractor-args', process.env.YTDLP_EXTRACTOR_ARGS || 'youtube:player_client=default,web_creator,android_vr',
  ];
  if (process.env.YTDLP_PROXY) out.push('--proxy', process.env.YTDLP_PROXY);
  const cookies = writeYtCookies(tmpDir);
  if (cookies) out.push('--cookies', cookies);
  return [...out, ...args];
}

function runYtDlp(args, timeoutMs = 180000, tmpDir = '') {
  const runners = [];
  if (process.env.YTDLP_BIN) runners.push({ cmd: process.env.YTDLP_BIN, prefix: [] });
  runners.push({ cmd: 'python3', prefix: ['-m', 'yt_dlp'] });
  runners.push({ cmd: 'yt-dlp', prefix: [] });

  const hardenedArgs = withYtDlpHardening(args, tmpDir);
  const errors = [];
  for (const runner of runners) {
    try {
      return execFileSync(runner.cmd, [...runner.prefix, ...hardenedArgs], {
        encoding: 'utf8', timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' },
      });
    } catch (e) {
      errors.push(`${runner.cmd}: ${String(e.stderr?.toString?.() || e.message).replace(/\s+/g, ' ').slice(0, 260)}`);
    }
  }
  throw new Error('yt-dlp falhou: ' + errors.slice(0, 3).join(' | '));
}

// ==================== DOWNLOAD AUDIO ====================
async function downloadAudioFile(query, { bitrate = '128k', label = 'áudio', timeoutMs = 180000 } = {}) {
  const media = await resolveMedia(query);

  // 1ª tentativa: Cloudflare Worker proxy (FUNCIONA de servidores!)
  if (YT_PROXY_URL) {
    try {
      const quality = bitrate === '320k' ? '320' : bitrate === '192k' ? '192' : bitrate === '160k' ? '192' : '128';
      const r = await proxyYoutubeAudio(media.url, quality);
      if (r) {
        if (r.buffer && Buffer.isBuffer(r.buffer) && r.buffer.length > 2048) {
          return {
            title: r.title || media.title, duration: media.duration, author: r.author || media.author,
            thumb: r.thumbnail || media.thumb, url: '', buffer: r.buffer, mimetype: r.mimetype || 'audio/mpeg',
            quality: label, fileName: r.fileName || `${safeTitle(r.title || media.title)}.mp3`,
          };
        }
        // Se veio URL mas sem buffer, baixar o buffer
        if (r.url) {
          try {
            const buffer = await fetchMediaBuffer(r.url, 60000);
            if (buffer && buffer.length > 2048) {
              return {
                title: r.title || media.title, duration: media.duration, author: r.author || media.author,
                thumb: r.thumbnail || media.thumb, url: '', buffer, mimetype: r.mimetype || 'audio/mpeg',
                quality: label, fileName: r.fileName || `${safeTitle(r.title || media.title)}.mp3`,
              };
            }
          } catch (e) { console.log('[DL-AUDIO] fetchBuffer falhou:', e.message); }
        }
      }
    } catch (e) { console.log('[DL-AUDIO] CF Worker falhou:', e.message); }
  }

  // 2ª tentativa: APIs externas configuráveis (Cobalt privado, SocialKit, SaveNow, RapidAPI/templates)
  try {
    const quality = bitrate === '320k' ? '320' : bitrate === '192k' ? '192' : bitrate === '160k' ? '192' : '128';
    const r = await externalYoutubeDownload(media.url, 'audio', quality);
    if (r?.url) {
      const buffer = await fetchMediaBuffer(r.url, 90000);
      if (buffer && buffer.length > 2048) {
        return {
          title: r.title || media.title, duration: media.duration, author: r.author || media.author,
          thumb: r.thumbnail || media.thumb, url: '', buffer, mimetype: r.mimetype || 'audio/mpeg',
          quality: `${label} · ${r.source || 'API'}`, fileName: `${safeTitle(r.title || media.title)}.mp3`,
        };
      }
    }
  } catch (e) { console.log('[DL-AUDIO] external API falhou:', e.message); }

  // 3ª tentativa: loader.to (pode retornar HTML com ads)
  try {
    const quality = bitrate === '320k' ? '320' : bitrate === '192k' ? '192' : bitrate === '160k' ? '192' : '128';
    const r = await loaderYoutubeAudio(media.url, quality);
    if (r) {
      if (r.buffer && Buffer.isBuffer(r.buffer) && r.buffer.length > 2048) {
        return {
          title: r.title || media.title, duration: media.duration, author: r.author || media.author,
          thumb: r.thumbnail || media.thumb, url: '', buffer: r.buffer, mimetype: 'audio/mpeg',
          quality: label, fileName: `${safeTitle(r.title || media.title)}.mp3`,
        };
      }
      if (r.url) {
        try {
          const buffer = await fetchMediaBuffer(r.url, 60000);
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

  // 4ª tentativa: Cobalt legacy
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

  // 5ª tentativa: yt-dlp (pode falhar se IP bloqueado)
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-audio-'));
    const outTpl = path.join(tmpDir, 'source.%(ext)s');
    try {
      const ffLoc = getFfmpegBin();
      const ffArgs = ['--no-playlist', '--no-warnings', '--force-overwrites', '--no-part',
        '--retries', '2', '--max-filesize', '35M', '-f', 'bestaudio/best', '-o', outTpl];
      if (ffLoc && ffLoc !== 'ffmpeg') ffArgs.push('--ffmpeg-location', path.dirname(ffLoc));
      ffArgs.push(media.url);
      runYtDlp(ffArgs, timeoutMs, tmpDir);

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

  // Mensagem de erro com instruções para configurar o Worker
  if (!YT_PROXY_URL) {
    throw new Error(
      '❌ Não consegui baixar o áudio.\n' +
      'YouTube bloqueia downloads em servidores.\n\n' +
      '🔧 Para resolver, configure o Cloudflare Worker:\n' +
      '1. Deploy o worker em cloudflare-worker/\n' +
      '2. Adicione a variável YT_PROXY_URL\n\n' +
      'Veja: cloudflare-worker/README.md'
    );
  }

  throw new Error('❌ Não consegui baixar o áudio agora. Configure uma API externa no Render (COBALT_API_URL, SOCIALKIT_API_KEY, SAVENOW_API_KEY ou YOUTUBE_API_URLS) ou use YTDLP_COOKIES_BASE64 se o YouTube bloquear o servidor.');
}

// ==================== DOWNLOAD VIDEO ====================
async function downloadVideoFile(query, { height = 720, label = '720p', timeoutMs = 260000 } = {}) {
  const media = await resolveMedia(query);

  // 1ª tentativa: Cloudflare Worker proxy
  if (YT_PROXY_URL) {
    try {
      const quality = height >= 1080 ? '1080' : height >= 720 ? '720' : height >= 480 ? '480' : '360';
      const r = await proxyYoutubeVideo(media.url, quality);
      if (r) {
        if (r.buffer && Buffer.isBuffer(r.buffer) && r.buffer.length > 4096) {
          return {
            title: r.title || media.title, duration: media.duration, author: r.author || media.author,
            thumb: r.thumbnail || media.thumb, url: '', buffer: r.buffer, mimetype: 'video/mp4',
            quality: label, fileName: r.fileName || `${safeTitle(r.title || media.title)}.mp4`,
          };
        }
        if (r.url) {
          try {
            const buffer = await fetchMediaBuffer(r.url, 120000);
            if (buffer && buffer.length > 4096) {
              return {
                title: r.title || media.title, duration: media.duration, author: r.author || media.author,
                thumb: r.thumbnail || media.thumb, url: '', buffer, mimetype: 'video/mp4',
                quality: label, fileName: `${safeTitle(r.title || media.title)}.mp4`,
              };
            }
          } catch (e) { console.log('[DL-VIDEO] fetchBuffer falhou:', e.message); }
        }
      }
    } catch (e) { console.log('[DL-VIDEO] CF Worker falhou:', e.message); }
  }

  // 2ª tentativa: APIs externas configuráveis (Cobalt privado, SocialKit, SaveNow, RapidAPI/templates)
  try {
    const quality = height >= 1080 ? '1080' : height >= 720 ? '720' : height >= 480 ? '480' : '360';
    const r = await externalYoutubeDownload(media.url, 'video', quality);
    if (r?.url) {
      const buffer = await fetchMediaBuffer(r.url, 160000);
      if (buffer && buffer.length > 4096) {
        return {
          title: r.title || media.title, duration: media.duration, author: r.author || media.author,
          thumb: r.thumbnail || media.thumb, url: '', buffer, mimetype: r.mimetype || 'video/mp4',
          quality: `${label} · ${r.source || 'API'}`, fileName: `${safeTitle(r.title || media.title)}.mp4`,
        };
      }
    }
  } catch (e) { console.log('[DL-VIDEO] external API falhou:', e.message); }

  // 3ª tentativa: loader.to
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
          const buffer = await fetchMediaBuffer(r.url, 120000);
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

  // 4ª tentativa: Cobalt legacy
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

  // 5ª tentativa: yt-dlp
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
      runYtDlp(ffArgs, timeoutMs, tmpDir);

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

  if (!YT_PROXY_URL) {
    throw new Error(
      '❌ Não consegui baixar o vídeo.\n' +
      'YouTube bloqueia downloads em servidores.\n\n' +
      '🔧 Configure o Cloudflare Worker (veja cloudflare-worker/README.md)\n' +
      'Ou tente !play para áudio.'
    );
  }

  throw new Error('❌ Não consegui baixar o vídeo agora. Configure uma API externa no Render (COBALT_API_URL, SOCIALKIT_API_KEY, SAVENOW_API_KEY ou YOUTUBE_API_URLS) ou use YTDLP_COOKIES_BASE64/YTDLP_PROXY.');
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

  // 1. TikWM (melhor para TikTok)
  const tikwmResult = await tikwmDownload(url);
  if (tikwmResult) {
    try {
      const buffer = await fetchMediaBuffer(tikwmResult.noWatermark || tikwmResult.url, 60000);
      if (buffer && buffer.length > 4096) {
        return { title: tikwmResult.title, url: '', buffer, mimetype: 'video/mp4', quality: 'TikTok MP4', fileName: `${safeTitle(tikwmResult.title)}.mp4` };
      }
    } catch (e) {}
    return { title: tikwmResult.title, url: tikwmResult.noWatermark || tikwmResult.url };
  }

  // 2. Cloudflare Worker social endpoint
  const proxyUrl = await proxySocialDownload(url);
  if (proxyUrl) return { title: 'TikTok', url: proxyUrl };

  // 3. Cobalt
  try { const c = await cobaltDownload(url, 'auto'); if (c) return { title: 'TikTok', url: c }; } catch (e) {}
  throw new Error('❌ Não consegui baixar o TikTok.');
}

async function facebook(url) {
  if (!isUrl(url)) throw new Error('❌ Envie link do Facebook.');
  const proxyUrl = await proxySocialDownload(url);
  if (proxyUrl) return { title: 'Facebook', url: proxyUrl };
  try { const c = await cobaltDownload(url, 'auto'); if (c) return { title: 'Facebook', url: c }; } catch (e) {}
  throw new Error('❌ Não consegui baixar do Facebook.');
}

async function twitter(url) {
  if (!isUrl(url)) throw new Error('❌ Envie link do X/Twitter.');
  const proxyUrl = await proxySocialDownload(url);
  if (proxyUrl) return { url: proxyUrl };
  try { const c = await cobaltDownload(url, 'auto'); if (c) return { url: c }; } catch (e) {}
  throw new Error('❌ Não consegui baixar do X/Twitter.');
}

async function instagram(url) {
  if (!isUrl(url)) throw new Error('❌ Envie link do Instagram.');
  const proxyUrl = await proxySocialDownload(url);
  if (proxyUrl) return { type: proxyUrl.includes('.mp4') ? 'video' : 'image', url: proxyUrl };
  try {
    const c = await cobaltDownload(url, 'auto');
    if (c) return { type: c.includes('.mp4') ? 'video' : 'image', url: c };
  } catch (e) {}
  throw new Error('❌ Não consegui baixar do Instagram. Link pode ser privado.');
}

// ==================== SPOTIFY / SOUNDCLOUD ====================
async function spotify(queryOrUrl) {
  if (isUrl(queryOrUrl) && /spotify\.com/.test(queryOrUrl)) {
    const spotResult = await spotifydownDownload(queryOrUrl);
    if (spotResult && spotResult.url) {
      try {
        const buffer = await fetchMediaBuffer(spotResult.url, 60000);
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
    const proxyUrl = await proxySocialDownload(queryOrUrl);
    if (proxyUrl) return { title: 'SoundCloud', url: proxyUrl };
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
