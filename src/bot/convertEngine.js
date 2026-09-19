'use strict';
/**
 * DARK BOT — Motor de conversão (v8.2) 🛠️
 * Converte qualquer mídia citada pelo utilizador:
 *  vídeo/áudio/documento de áudio → MP3 · nota de voz (OPUS) ·
 *  vídeo/sticker animado → GIF (mp4, gifPlayback) ·
 *  vídeo → imagem (1ª frame PNG) · mídia → documento.
 * Tudo via ffmpeg-static, sem shell; ficheiros temporários limpos.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const execFileAsync = require('util').promisify(execFile);

let _ffmpeg = null;
function ffmpegBin() {
  if (_ffmpeg) return _ffmpeg;
  if (process.env.FFMPEG_PATH) { _ffmpeg = process.env.FFMPEG_PATH; return _ffmpeg; }
  try { _ffmpeg = require('ffmpeg-static'); if (_ffmpeg) return _ffmpeg; } catch {}
  _ffmpeg = 'ffmpeg';
  return _ffmpeg;
}

/**
 * Corre o ffmpeg com tmp in/out. Injecção p/ testes: opts.platform
 * ('posix' por omissão). Devolve o Buffer do ficheiro de saída.
 */
async function ffmpegRun(buf, args, outExt, opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-conv-'));
  const inPath = path.join(dir, 'in.' + (opts.inExt || 'bin'));
  const outPath = path.join(dir, 'out.' + outExt);
  try {
    fs.writeFileSync(inPath, buf);
    const r = await execFileAsync(ffmpegBin(), ['-y', '-i', inPath, ...args, outPath],
      { stdio: 'pipe', timeout: opts.timeout || 180000 });
    if (!fs.existsSync(outPath) || fs.statSync(outPath).size < (opts.minBytes || 16)) {
      throw new Error('ffmpeg não produziu saída válida' + (r.stderr ? ': ' + String(r.stderr).slice(-120) : ''));
    }
    return fs.readFileSync(outPath);
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

// ── conversões principais ─────────────────────────────────────
/** qualquer vídeo/áudio → MP3 estéreo */
async function toMp3(buf, bitrate = '192k') {
  return ffmpegRun(buf, ['-vn', '-ar', '44100', '-ac', '2', '-b:a', bitrate], 'mp3', { minBytes: 1024 });
}

/** qualquer vídeo/áudio → nota de voz OPUS (monocanal, 48k) */
async function toOpus(buf, bitrate = '64k') {
  return ffmpegRun(buf, ['-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', bitrate, '-f', 'opus'], 'opus', { minBytes: 512 });
}

/** qualquer vídeo → MP4 mudo p/ "GIF" (gifPlayback do WhatsApp) */
async function toGifMp4(buf, maxSec = 10) {
  return ffmpegRun(buf, [
    '-t', String(maxSec),
    '-an',
    '-vf', 'fps=15,scale=480:-2:flags=lanczos',
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
  ], 'mp4', { minBytes: 2048, timeout: 300000 });
}

/** qualquer vídeo (ou webp) → 1ª frame PNG */
async function toPng(buf) {
  return ffmpegRun(buf, ['-frames:v', '1', '-c:v', 'png'], 'png', { minBytes: 100 });
}

// ── detecção da mídia citada/própria ──────────────────────────
const EXT_MAP = {
  'video/mp4': 'mp4', 'video/3gpp': '3gp', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/opus': 'opus', 'audio/m4a': 'm4a', 'audio/x-m4a': 'm4a', 'audio/wav': 'wav',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'application/pdf': 'pdf', 'application/zip': 'zip', 'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/**
 * Encontra a mídia citada (ou a da própria mensagem) e classifica-a.
 * @returns {{kind:'video'|'audio'|'image'|'sticker'|'doc', msg:object, mimetype:string, ext:string, isAnimated:boolean} | null}
 */
function mediaDe(msg, quoted) {
  const own = msg?.message || {};
  const qm = quoted?.message || {};
  const pick = (m, sourceMsg) => {
    if (m.videoMessage)       return { kind: 'video',   msg: sourceMsg, node: m.videoMessage };
    if (m.audioMessage)       return { kind: 'audio',   msg: sourceMsg, node: m.audioMessage };
    if (m.stickerMessage)     return { kind: 'sticker', msg: sourceMsg, node: m.stickerMessage, isAnimated: !!m.stickerMessage.isAnimated };
    if (m.imageMessage)       return { kind: 'image',   msg: sourceMsg, node: m.imageMessage };
    if (m.documentMessage)    return { kind: 'doc',     msg: sourceMsg, node: m.documentMessage };
    return null;
  };
  const found = pick(qm, quoted?.msg) || pick(own, msg);
  if (!found) return null;
  const mimetype = String(found.node.mimetype || '').toLowerCase();
  const ext = EXT_MAP[mimetype] || (found.node.fileName ? String(found.node.fileName).split('.').pop() : '') ||
    { video: 'mp4', audio: 'mp3', sticker: 'webp', image: 'jpg', doc: 'bin' }[found.kind];
  // classificação por mimetype nos docs: video/* conta como vídeo, etc.
  if (found.kind === 'doc') {
    if (mimetype.startsWith('video/')) found.kind = 'video';
    else if (mimetype.startsWith('audio/')) found.kind = 'audio';
    else if (mimetype.startsWith('image/')) found.kind = 'image';
  }
  return { kind: found.kind, msg: found.msg, mimetype, ext, isAnimated: !!found.isAnimated };
}

/** os kinds aceitáveis por conversão */
const ACEITA = {
  mp3:    ['video', 'audio', 'doc'],
  voice:  ['video', 'audio', 'doc'],
  gif:    ['video', 'sticker', 'doc'],
  img:    ['video', 'sticker'],
  doc:    ['video', 'audio', 'image', 'sticker', 'doc'],
};

module.exports = { ffmpegRun, toMp3, toOpus, toGifMp4, toPng, mediaDe, ACEITA, EXT_MAP };
