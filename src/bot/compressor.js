/**
 * DARK BOT v7 — Media Compressor
 * Reduz qualidade/tamanho de imagens e vídeos sem danificar
 *
 * !compress [qualidade] — comprime a imagem/vídeo marcado
 * !reduce [qualidade]   — alias
 * Qualidade: 1-100 (padrão 60 para imagens, 720p para vídeo)
 *
 * v7.52 TURBO: tudo ASSÍNCRONO — o spawnSync bloqueava o event loop
 * (todos os chats parados durante a conversão). Também corrige o
 * compressImage, que devolvia a Promise do sharp sem await (imagem
 * quebrada no !compress).
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ffmpeg assíncrono com timeout e stderr capturado
function _run(cmd, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    let proc;
    try { proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { return reject(e); }
    let stderr = '';
    let morto = false;
    const timer = setTimeout(() => {
      morto = true;
      try { proc.kill('SIGKILL'); } catch {}
      reject(new Error('ffmpeg timeout'));
    }, timeoutMs);
    proc.stderr.on('data', (d) => { if (stderr.length < 2000) stderr += d.toString(); });
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (morto) return;
      if (code === 0) return resolve({ stderr });
      reject(new Error('ffmpeg saiu com código ' + code + (stderr ? ': ' + stderr.slice(-120) : '')));
    });
  });
}

// Detecta ffmpeg (probe 1x por processo; ~ms, aceitável)
let _ffmpeg = null;
let _ffmpegProbe = null;
function ffmpegBin() {
  if (_ffmpeg) return _ffmpeg;
  try { _ffmpeg = require('ffmpeg-static'); if (_ffmpeg) return _ffmpeg; } catch {}
  _ffmpeg = 'ffmpeg';
  return _ffmpeg;
}
// Pré-aquece a detecção sem bloquear o arranque (fire-and-forget)
function warmup() {
  if (_ffmpegProbe) return _ffmpegProbe;
  _ffmpegProbe = (async () => {
    for (const p of ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', 'ffmpeg']) {
      try { await _run(p, ['-version'], 3000); _ffmpeg = p; return p; } catch {}
    }
    _ffmpeg = 'ffmpeg';
    return _ffmpeg;
  })();
  return _ffmpegProbe;
}

/**
 * Comprime imagem (JPEG/WebP/PNG)
 * @param {Buffer} inputBuf - buffer da imagem original
 * @param {number} quality - qualidade 1-100 (padrão 60)
 * @returns {Promise<Buffer>} buffer comprimido
 */
async function compressImage(inputBuf, quality = 60) {
  const sharp = require('sharp');
  const q = Math.max(10, Math.min(100, quality));

  // Detecta formato
  const isJpeg = inputBuf[0] === 0xFF && inputBuf[1] === 0xD8;
  const isPng = inputBuf[0] === 0x89 && inputBuf[1] === 0x50;

  let pipeline = sharp(inputBuf);

  // Reduz dimensões se muito grande
  pipeline = pipeline.resize(1920, 1920, { fit: 'inside', withoutEnlargement: true });

  if (isJpeg) {
    pipeline = pipeline.jpeg({ quality: q, mozjpeg: true });
  } else if (isPng) {
    pipeline = pipeline.png({ quality: q, compressionLevel: 9 });
  } else {
    pipeline = pipeline.webp({ quality: q });
  }

  return pipeline.toBuffer(); // v7.52: await real (era Promise sem await → imagem quebrada)
}

/**
 * Comprime vídeo
 * @param {Buffer} inputBuf - buffer do vídeo original
 * @param {string} resolution - resolução alvo (360, 480, 720)
 * @returns {Promise<Buffer>} buffer comprimido
 */
async function compressVideo(inputBuf, resolution = '480') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-compress-'));
  const inPath = path.join(tmp, 'input.mp4');
  const outPath = path.join(tmp, 'output.mp4');

  try {
    fs.writeFileSync(inPath, inputBuf);

    const res = parseInt(resolution) || 480;
    const crf = res <= 360 ? '28' : res <= 480 ? '26' : '24';
    const preset = res <= 480 ? 'veryfast' : 'fast'; // v7.53: ~2x mais rápido, mesmo CRF (mesma qualidade)

    const r = await _run(ffmpegBin(), [
      '-y', '-i', inPath,
      '-vf', `scale=-2:${res}`,
      '-c:v', 'libx264', '-crf', crf, '-preset', preset,
      '-c:a', 'aac', '-b:a', '96k',
      '-movflags', '+faststart',
      outPath,
    ], 120000).catch(e => ({ erro: e.message }));

    if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 1024) {
      throw new Error('ffmpeg falhou: ' + (r.erro || r.stderr?.slice(-100) || ''));
    }

    return fs.readFileSync(outPath);
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
}

/**
 * Comprime áudio
 * @param {Buffer} inputBuf - buffer do áudio original
 * @param {string} bitrate - bitrate alvo (64k, 96k, 128k)
 * @returns {Promise<Buffer>} buffer comprimido
 */
async function compressAudio(inputBuf, bitrate = '96k') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'darkbot-compress-'));
  const inPath = path.join(tmp, 'input');
  const outPath = path.join(tmp, 'output.mp3');

  try {
    fs.writeFileSync(inPath, inputBuf);

    await _run(ffmpegBin(), [
      '-y', '-i', inPath,
      '-c:a', 'libmp3lame', '-b:a', bitrate,
      '-ar', '22050',
      outPath,
    ], 60000);

    if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 512) {
      throw new Error('ffmpeg falhou');
    }

    return fs.readFileSync(outPath);
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
}

/**
 * Detecta tipo de mídia e comprime adequadamente
 */
async function autoCompress(inputBuf, quality) {
  const isJpeg = inputBuf[0] === 0xFF && inputBuf[1] === 0xD8;
  const isPng = inputBuf[0] === 0x89 && inputBuf[1] === 0x50;
  const isWebp = inputBuf[8] === 0x57 && inputBuf[9] === 0x45;
  const isMp4 = inputBuf.slice(4, 8).toString() === 'ftyp';
  const isGif = inputBuf[0] === 0x47 && inputBuf[1] === 0x49;
  const isAudio = inputBuf[0] === 0xFF && inputBuf[1] === 0xFB;

  if (isJpeg || isPng || isWebp) {
    return { buf: await compressImage(inputBuf, quality || 60), type: 'image' };
  }
  if (isMp4 || isGif) {
    return { buf: await compressVideo(inputBuf, quality || '480'), type: 'video' };
  }
  if (isAudio) {
    return { buf: await compressAudio(inputBuf, quality || '96k'), type: 'audio' };
  }

  // Tenta como imagem por defeito
  try {
    return { buf: await compressImage(inputBuf, quality || 60), type: 'image' };
  } catch {
    throw new Error('Formato não suportado para compressão');
  }
}

module.exports = { compressImage, compressVideo, compressAudio, autoCompress, warmup };
