/**
 * DARK BOT v5 — YT Download Engine v5
 * Estratégia:
 *  Áudio: SystemZone ytmp4 → download MP4 → ffmpeg extrai MP3
 *  Vídeo: SystemZone ytmp4 → download MP4 directo
 *  Busca: yt-search (npm) → SystemZone ytsearch (fallback)
 */
'use strict';

const path      = require('path');
const fs        = require('fs');
const os        = require('os');
const { spawnSync } = require('child_process');
const yts       = require('yt-search');

const SZ_URL = (process.env.SYSTEMZONE_API_URL || 'https://systemzone.store').replace(/\/$/, '');
const SZ_KEY = process.env.SYSTEMZONE_API_KEY || 'freekey';
const MAX_SEC = Number(process.env.MAX_YOUTUBE_SECONDS || 5400);

// ─── ffmpeg ──────────────────────────────────────────────────
let _ffmpeg = null;
function ffmpegBin() {
  if (_ffmpeg) return _ffmpeg;
  try { _ffmpeg = require('ffmpeg-static'); return _ffmpeg; } catch {}
  for (const p of ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', 'ffmpeg']) {
    try { const r = spawnSync(p, ['-version'], { timeout: 3000, stdio: 'pipe' }); if (r.status === 0) { _ffmpeg = p; return p; } } catch {}
  }
  _ffmpeg = 'ffmpeg';
  return _ffmpeg;
}

// ─── Helpers ─────────────────────────────────────────────────
function isUrl(s) { return /^https?:\/\//i.test(String(s || '')); }

function safeTitle(s = '') {
  return String(s).replace(/[/\\?%*:|"<>]/g, '-').trim().slice(0, 60) || 'audio';
}

function parseDuration(s = '') {
  if (typeof s === 'number') return s;
  const p = String(s || '').split(':').map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] || 0;
}

async function fetchBuf(url, timeoutMs = 120000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 DarkBot/5.0' },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(t); }
}

// ─── Busca de vídeo ──────────────────────────────────────────
async function searchVideo(query) {
  if (isUrl(query)) {
    return { url: query, videoId: '', title: query, author: '', duration: '', seconds: 0, thumb: '' };
  }

  // yt-search (rápido, sem key)
  try {
    const res = await yts(query);
    const v = res.videos?.find(v => v.seconds > 10 && v.seconds <= MAX_SEC) || res.videos?.[0];
    if (v) return {
      url:      v.url,
      videoId:  v.videoId,
      title:    v.title,
      author:   v.author?.name || '',
      duration: v.duration?.timestamp || '',
      seconds:  v.seconds || 0,
      thumb:    v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
    };
  } catch {}

  // SystemZone ytsearch (fallback)
  try {
    const r = await fetch(
      `${SZ_URL}/api/ytsearch?text=${encodeURIComponent(query)}&apikey=${encodeURIComponent(SZ_KEY)}`,
      { headers: { 'User-Agent': 'DarkBot/5.0' }, signal: AbortSignal.timeout(12000) }
    );
    const d = await r.json();
    const v = d?.resultados?.[0];
    if (v?.youtube_url) return {
      url:      v.youtube_url,
      videoId:  v.youtube_url.match(/[?&]v=([^&]+)/)?.[1] || '',
      title:    v.title || query,
      author:   v.author || '',
      duration: v.duration || '',
      seconds:  parseDuration(v.duration),
      thumb:    v.thumbnail || '',
    };
  } catch {}

  throw new Error(`Nenhum resultado encontrado para: ${query}`);
}

// ─── Download MP4 via SystemZone ─────────────────────────────
async function szDownloadMP4(videoUrl) {
  const r = await fetch(
    `${SZ_URL}/api/ytmp4?text=${encodeURIComponent(videoUrl)}&apikey=${encodeURIComponent(SZ_KEY)}`,
    { headers: { 'User-Agent': 'DarkBot/5.0' }, signal: AbortSignal.timeout(35000) }
  );
  const d = await r.json();
  const url = d?.result?.download || d?.download_url || d?.url;
  if (!d?.status || !url) throw new Error('SystemZone ytmp4 sem URL');
  return { url, title: d?.result?.title || d?.title || '', quality: d?.result?.quality || '720p' };
}

// ─── Extrair áudio MP3 de buffer MP4 ─────────────────────────
function extractAudioFromMp4(mp4Buffer, bitrate = '128k') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-audio-'));
  const inPath  = path.join(tmp, 'input.mp4');
  const outPath = path.join(tmp, 'audio.mp3');
  try {
    fs.writeFileSync(inPath, mp4Buffer);
    const r = spawnSync(ffmpegBin(), [
      '-y', '-i', inPath,
      '-vn', '-ar', '44100', '-ac', '2', '-b:a', bitrate,
      outPath,
    ], { timeout: 120000, stdio: 'pipe' });
    if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 1024) {
      const err = r.stderr?.toString().slice(0, 200) || 'ffmpeg falhou';
      throw new Error(err);
    }
    return fs.readFileSync(outPath);
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
}

// ─── API PÚBLICA ─────────────────────────────────────────────

/** Busca + baixa áudio MP3 */
async function getAudio(query, quality = '128k') {
  const meta = await searchVideo(query);
  if (meta.seconds > MAX_SEC) {
    throw new Error(`⏱️ Vídeo muito longo (${Math.floor(meta.seconds/60)} min). Limite: ${Math.floor(MAX_SEC/60)} min.`);
  }

  // SystemZone: baixa MP4 → extrai MP3 com ffmpeg
  const mp4info = await szDownloadMP4(meta.url);
  const mp4buf  = await fetchBuf(mp4info.url, 120000);
  if (!mp4buf || mp4buf.length < 10240) throw new Error('Download vazio. Tente de novo.');
  const mp3buf  = extractAudioFromMp4(mp4buf, quality);

  return {
    ...meta,
    title:    mp4info.title || meta.title,
    buffer:   mp3buf,
    mimetype: 'audio/mpeg',
    ext:      'mp3',
    quality,
    fileName: `${safeTitle(mp4info.title || meta.title)}.mp3`,
  };
}

/** Busca + baixa vídeo MP4 */
async function getVideo(query, maxHeight = '720') {
  const meta = await searchVideo(query);
  if (meta.seconds > MAX_SEC) {
    throw new Error(`⏱️ Vídeo muito longo (${Math.floor(meta.seconds/60)} min). Limite: ${Math.floor(MAX_SEC/60)} min.`);
  }

  const mp4info = await szDownloadMP4(meta.url);
  const buf     = await fetchBuf(mp4info.url, 180000);
  if (!buf || buf.length < 10240) throw new Error('Download vazio. Tente de novo.');

  return {
    ...meta,
    title:    mp4info.title || meta.title,
    buffer:   buf,
    mimetype: 'video/mp4',
    ext:      'mp4',
    quality:  mp4info.quality || (maxHeight + 'p'),
    fileName: `${safeTitle(mp4info.title || meta.title)}.mp4`,
  };
}

/** Apenas busca (sem download) */
async function search(query, limit = 5) {
  try {
    const res = await yts(query);
    return (res.videos || [])
      .filter(v => v.seconds > 10 && v.seconds <= MAX_SEC)
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
  } catch { return []; }
}

module.exports = { getAudio, getVideo, search, searchVideo };
