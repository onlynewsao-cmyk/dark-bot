/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   DARK BOT — YT Download Engine v4                      ║
 * ║   yt-dlp + ffmpeg-static + yt-search                    ║
 * ║   Sem APIs pagas, sem keys externas                     ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Fluxo de download:
 *  1. yt-search → encontra o vídeo por nome ou URL
 *  2. yt-dlp   → descarrega o áudio/vídeo (melhor formato)
 *  3. ffmpeg   → converte para mp3/mp4 limpo
 *
 * APIs gratuitas em cascata para busca:
 *  - yt-search (npm, sem key)
 *  - systemzone.store /api/ytsearch (freekey)
 *  - noembed.com (metadata)
 */

'use strict';

const path      = require('path');
const fs        = require('fs');
const os        = require('os');
const { spawnSync, execFileSync } = require('child_process');
const yts       = require('yt-search');

// ─────────────────────────────────────────────
// PATHS
// ─────────────────────────────────────────────
let _ffmpeg = null;
function getFfmpeg() {
  if (_ffmpeg) return _ffmpeg;
  try { _ffmpeg = require('ffmpeg-static'); return _ffmpeg; } catch {}
  for (const p of ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']) {
    if (fs.existsSync(p)) { _ffmpeg = p; return _ffmpeg; }
  }
  _ffmpeg = 'ffmpeg';
  return _ffmpeg;
}

let _ytdlp = null;
function getYtdlp() {
  if (_ytdlp) return _ytdlp;
  const candidates = [
    'yt-dlp',
    path.join(os.homedir(), '.local/bin/yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    path.join(process.cwd(), 'node_modules/.bin/yt-dlp'),
  ];
  for (const c of candidates) {
    try {
      const r = spawnSync(c, ['--version'], { timeout: 3000, stdio: 'pipe' });
      if (r.status === 0) { _ytdlp = c; return c; }
    } catch {}
  }
  _ytdlp = 'yt-dlp';
  return _ytdlp;
}

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────
const MAX_SECONDS   = Number(process.env.MAX_YOUTUBE_SECONDS || 5400); // 90 min
const FFMPEG_DIR    = () => path.dirname(getFfmpeg());

function isUrl(s) {
  return /^https?:\/\//i.test(String(s || ''));
}

function safeTitle(s = '') {
  return String(s).replace(/[/\\?%*:|"<>]/g, '-').trim().slice(0, 60) || 'audio';
}

function parseDuration(s = '') {
  if (typeof s === 'number') return s;
  const parts = String(s || '').split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

// ─────────────────────────────────────────────
// BUSCA DE VÍDEO
// ─────────────────────────────────────────────

/**
 * Busca o vídeo e retorna metadata.
 * Se for URL, tenta extrair metadata com yt-dlp --dump-json.
 */
async function searchVideo(query) {
  if (isUrl(query)) {
    // Extrai metadata da URL via yt-dlp
    try {
      const ytdlp = getYtdlp();
      const r = spawnSync(ytdlp, [
        '--dump-json', '--no-playlist', '--no-warnings', '-q', query,
      ], { timeout: 15000, encoding: 'utf8', stdio: 'pipe' });
      if (r.status === 0 && r.stdout) {
        const d = JSON.parse(r.stdout.split('\n').find(l => l.trim().startsWith('{')));
        return {
          url:      query,
          videoId:  d.id || '',
          title:    d.title || query,
          author:   d.uploader || d.channel || '',
          duration: d.duration ? `${Math.floor(d.duration/60)}:${String(d.duration%60).padStart(2,'0')}` : '',
          seconds:  d.duration || 0,
          thumb:    d.thumbnail || `https://i.ytimg.com/vi/${d.id}/hqdefault.jpg`,
        };
      }
    } catch {}
    return { url: query, videoId: '', title: query, author: '', duration: '', seconds: 0, thumb: '' };
  }

  // Busca por nome com yt-search
  try {
    const res = await yts(query);
    const v = res.videos?.find(v => v.seconds > 10 && v.seconds <= MAX_SECONDS)
           || res.videos?.[0];
    if (v) {
      return {
        url:      v.url,
        videoId:  v.videoId,
        title:    v.title,
        author:   v.author?.name || v.author || '',
        duration: v.duration?.timestamp || '',
        seconds:  v.seconds || 0,
        thumb:    v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      };
    }
  } catch (e) {
    console.warn('[ytdl] yt-search falhou:', e.message);
  }

  // Fallback: systemzone ytsearch
  try {
    const SZ_URL = (process.env.SYSTEMZONE_API_URL || 'https://systemzone.store').replace(/\/$/, '');
    const SZ_KEY = process.env.SYSTEMZONE_API_KEY || 'freekey';
    const resp = await fetch(
      `${SZ_URL}/api/ytsearch?text=${encodeURIComponent(query)}&apikey=${encodeURIComponent(SZ_KEY)}`,
      { headers: { 'User-Agent': 'DarkBot/4.0' }, signal: AbortSignal.timeout(10000) }
    );
    const d = await resp.json();
    const r = d?.resultados?.[0];
    if (r?.youtube_url) {
      return {
        url:      r.youtube_url,
        videoId:  r.youtube_url.match(/[?&]v=([^&]+)/)?.[1] || '',
        title:    r.title || query,
        author:   r.author || '',
        duration: r.duration || '',
        seconds:  parseDuration(r.duration),
        thumb:    r.thumbnail || '',
      };
    }
  } catch {}

  throw new Error(`Nenhum resultado para: ${query}`);
}

// ─────────────────────────────────────────────
// DOWNLOAD COM YT-DLP
// ─────────────────────────────────────────────

function ytdlpRun(args, timeout = 120000) {
  const ytdlp = getYtdlp();
  const ffdir  = FFMPEG_DIR();
  const full   = [...args, '--ffmpeg-location', ffdir, '--no-warnings', '-q'];
  const r = spawnSync(ytdlp, full, { timeout, stdio: 'pipe' });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const err = (r.stderr?.toString() || '').slice(0, 400);
    throw new Error('yt-dlp: ' + (err || 'erro desconhecido'));
  }
  return r;
}

/**
 * Descarrega áudio e converte para MP3.
 * @returns {Buffer} buffer do MP3
 */
async function downloadAudio(videoMeta, { quality = '128k' } = {}) {
  const tmp   = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-audio-'));
  const out   = path.join(tmp, 'audio');
  try {
    // Tenta download directo como m4a (mais rápido, sem converter no yt-dlp)
    ytdlpRun([
      '-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best[acodec!=none]',
      '--extract-audio',
      '-o', `${out}.%(ext)s`,
      '--no-playlist',
      videoMeta.url,
    ], 180000);

    // Encontrar o arquivo descarregado
    const files = fs.readdirSync(tmp).filter(f => f.startsWith('audio.'));
    if (!files.length) throw new Error('yt-dlp não gerou ficheiro de áudio');
    const rawPath = path.join(tmp, files[0]);
    const rawSize = fs.statSync(rawPath).size;

    if (rawPath.endsWith('.mp3') && rawSize > 10240) {
      return fs.readFileSync(rawPath);
    }

    // Converter para MP3 com ffmpeg
    const mp3Path = path.join(tmp, 'audio.mp3');
    const ffr = spawnSync(getFfmpeg(), [
      '-y', '-i', rawPath,
      '-vn', '-ar', '44100', '-ac', '2', '-b:a', quality,
      mp3Path,
    ], { timeout: 90000, stdio: 'pipe' });

    if (!fs.existsSync(mp3Path) || fs.statSync(mp3Path).size < 10240) {
      throw new Error('ffmpeg não gerou MP3 válido');
    }
    return fs.readFileSync(mp3Path);

  } finally {
    // Limpar temp
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
}

/**
 * Descarrega vídeo e converte para MP4.
 * @param {object} videoMeta
 * @param {string} maxHeight - '720', '1080', '480'
 * @returns {Buffer}
 */
async function downloadVideo(videoMeta, { maxHeight = '720' } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-video-'));
  const out = path.join(tmp, 'video');
  try {
    const fmtStr = maxHeight === '1080'
      ? `bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best`
      : `bestvideo[height<=${maxHeight}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${maxHeight}]+bestaudio/best[height<=${maxHeight}]/best`;

    ytdlpRun([
      '-f', fmtStr,
      '-o', `${out}.%(ext)s`,
      '--no-playlist',
      '--merge-output-format', 'mp4',
      videoMeta.url,
    ], 300000);

    const files = fs.readdirSync(tmp).filter(f => f.startsWith('video.'));
    if (!files.length) throw new Error('yt-dlp não gerou ficheiro de vídeo');
    const rawPath = path.join(tmp, files[0]);
    const rawSize = fs.statSync(rawPath).size;
    if (rawSize < 10240) throw new Error('Ficheiro de vídeo vazio');

    if (rawPath.endsWith('.mp4')) return fs.readFileSync(rawPath);

    // Converter para mp4
    const mp4Path = path.join(tmp, 'video.mp4');
    spawnSync(getFfmpeg(), [
      '-y', '-i', rawPath,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      mp4Path,
    ], { timeout: 180000, stdio: 'pipe' });

    if (!fs.existsSync(mp4Path)) throw new Error('ffmpeg não gerou MP4');
    return fs.readFileSync(mp4Path);

  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
}

// ─────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────

/**
 * Busca + baixa áudio MP3.
 * @param {string} query  - nome ou URL
 * @param {string} quality - '96k' | '128k' | '192k' | '320k'
 */
async function getAudio(query, quality = '128k') {
  const meta = await searchVideo(query);
  if (meta.seconds > MAX_SECONDS) {
    throw new Error(
      `⏱️ Vídeo muito longo (${Math.floor(meta.seconds/60)} min). Limite: ${Math.floor(MAX_SECONDS/60)} min.`
    );
  }
  const buffer = await downloadAudio(meta, { quality });
  return { ...meta, buffer, mimetype: 'audio/mpeg', quality, ext: 'mp3' };
}

/**
 * Busca + baixa vídeo MP4.
 * @param {string} query
 * @param {string} maxHeight - '480' | '720' | '1080'
 */
async function getVideo(query, maxHeight = '720') {
  const meta = await searchVideo(query);
  if (meta.seconds > MAX_SECONDS) {
    throw new Error(`⏱️ Vídeo muito longo (${Math.floor(meta.seconds/60)} min). Limite: ${Math.floor(MAX_SECONDS/60)} min.`);
  }
  const buffer = await downloadVideo(meta, { maxHeight });
  return { ...meta, buffer, mimetype: 'video/mp4', quality: `${maxHeight}p`, ext: 'mp4' };
}

/**
 * Apenas busca (sem download) — para exibir info.
 */
async function search(query, limit = 5) {
  try {
    const res = await yts(query);
    return (res.videos || [])
      .filter(v => v.seconds > 10 && v.seconds <= MAX_SECONDS)
      .slice(0, limit)
      .map(v => ({
        url:      v.url,
        videoId:  v.videoId,
        title:    v.title,
        author:   v.author?.name || '',
        duration: v.duration?.timestamp || '',
        seconds:  v.seconds || 0,
        thumb:    v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        views:    v.views || 0,
      }));
  } catch {
    return [];
  }
}

module.exports = { getAudio, getVideo, search, searchVideo, downloadAudio, downloadVideo };
