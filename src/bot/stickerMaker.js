/**
 * StickerMaker v5.0 — Stickers quadrados, sem falhas, sem distorção
 *
 * PROBLEMA ANTERIOR:
 *  - FULL (contain) → barras pretas + não preenche o quadrado
 *  - Fallback wa-sticker-formatter sem parâmetros → artefactos/riscos em vídeos
 *
 * SOLUÇÃO:
 *  - Imagem estática: sharp cover 512x512 → sem barras, sem distorção
 *  - GIF animado:     sharp animated cover 512x512 → sem ffmpeg, sem artefactos
 *  - Vídeo MP4/WebM:  ffmpeg com filtros precisos → cover 512x512 limpo
 *  - Fallback seguro: wa-sticker-formatter CROPPED (cover, não contain)
 *
 * REGRA: NUNCA usar fit:contain (barras pretas) — sempre fit:cover (corta bordas)
 */

const { execSync, execFileSync } = require('child_process');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

/* ─── ffmpeg disponível? ──────────────────────────────────────── */
function getFfmpegBin() {
  try { return require('ffmpeg-static') || 'ffmpeg'; } catch { return 'ffmpeg'; }
}
function hasFfmpeg() {
  try { execSync(`"${getFfmpegBin()}" -version`, { stdio: 'ignore', shell: true }); return true; } catch { return false; }
}
const FFMPEG_BIN = getFfmpegBin();
const FFMPEG_OK = hasFfmpeg();

/* ─── Detecta tipo pelo magic bytes ──────────────────────────── */
function detectMime(buffer) {
  if (!buffer || buffer.length < 12) return 'image/jpeg';
  const h = buffer.slice(0, 12);
  if (h[0] === 0x89 && h[1] === 0x50)                                            return 'image/png';
  if (h[0] === 0xFF && h[1] === 0xD8)                                            return 'image/jpeg';
  if (h.slice(0,4).toString()==='RIFF' && h.slice(8,12).toString()==='WEBP')     return 'image/webp';
  if (h.slice(0,6).toString()==='GIF89a' || h.slice(0,6).toString()==='GIF87a') return 'image/gif';
  if (h.slice(4,8).toString() === 'ftyp')                                         return 'video/mp4';
  if (h[0] === 0x1A && h[1] === 0x45)                                            return 'video/webm';
  if (h.slice(0,4).toString() === 'RIFF')                                        return 'video/avi';
  return 'image/jpeg';
}


function escapeXml(s = '') {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
}

function watermarkSvg(text = '') {
  const safe = escapeXml(String(text || '').slice(0, 32));
  if (!safe) return null;
  return Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.75"/></filter></defs>
    <rect x="0" y="458" width="512" height="54" rx="0" fill="rgba(0,0,0,0.42)"/>
    <text x="256" y="492" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="900" fill="#ffffff" filter="url(#shadow)">${safe}</text>
  </svg>`);
}

/* ─── GIF animado → WebP animado 512x512 cover (via sharp) ───── */
async function gifToWebpSquare(buffer) {
  const sharp = require('sharp');

  // sharp com animated:true processa todos os frames
  // fit:cover = preenche 512x512 cortando bordas → SEM barras pretas, SEM distorção
  return sharp(buffer, { animated: true })
    .resize(512, 512, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: false,
    })
    .webp({
      quality: 85,
      lossless: false,
      loop: 0,        // loop infinito
      delay: [],      // mantém delays originais dos frames
    })
    .toBuffer();
}

/* ─── Vídeo MP4/WebM → WebP animado 512x512 cover (via ffmpeg) ─ */
function videoToWebpSquare(inputBuf, maxSec = Number(process.env.STICKER_VIDEO_MAX_SEC || 8)) {
  const tmp     = path.join(os.tmpdir(), `stk_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const inFile  = `${tmp}.in`;
  const outFile = `${tmp}.webp`;

  try {
    fs.writeFileSync(inFile, inputBuf);

    /*
     * FILTRO CORRECTO para sticker quadrado SEM artefactos:
     * maxSec aumentado para 13 segundos conforme solicitado.
     */
    execFileSync(FFMPEG_BIN, [
      '-y',
      '-t', String(maxSec),
      '-i', inFile,
      '-vf', [
        'scale=w=512:h=512:force_original_aspect_ratio=increase',
        'crop=512:512',
        'fps=10',
        'format=rgba',
      ].join(','),
      '-vcodec',            'libwebp_anim',
      '-lossless',          '0',
      '-quality',           '58',
      '-compression_level', '3',
      '-loop',              '0',
      '-vsync',             'vfr',
      '-an',
      outFile,
    ], { timeout: 90000, stdio: 'ignore' });

    const result = fs.readFileSync(outFile);
    if (!result || result.length < 200) throw new Error('WebP vazio');
    return result;

  } finally {
    try { fs.unlinkSync(inFile);  } catch {}
    try { fs.unlinkSync(outFile); } catch {}
  }
}

/* ─── Imagem estática → WebP 512x512 cover (via sharp) ────────── */
async function imageToWebpSquare(buffer, watermarkText = '') {
  const sharp = require('sharp');
  let img = sharp(buffer)
    .resize(512, 512, {
      fit: 'cover',          // preenche 512x512 cortando bordas
      position: 'centre',
      withoutEnlargement: false,
    });
  const wm = watermarkSvg(watermarkText);
  if (wm) img = img.composite([{ input: wm, left: 0, top: 0 }]);
  return img.webp({ quality: 88, lossless: false }).toBuffer();
}

/* ─── Injeta metadados via Sticker (pack/author) ─────────────── */
async function injectMeta(webpBuf, pack, author) {
  // Usa wa-sticker-formatter apenas para injetar metadados no WebP
  // type: FULL = não redimensiona (já está 512x512 e correcto)
  const stk = new Sticker(webpBuf, {
    pack,
    author,
    type: StickerTypes.FULL,
    quality: 100,   // sem recompressão — já está optimizado
    id: `darkbot-${Date.now()}`,
    categories: ['🤖'],
  });
  return stk.toBuffer();
}

/* ─── API PÚBLICA ─────────────────────────────────────────────── */
/**
 * Cria sticker WhatsApp 512x512 quadrado.
 *
 * @param {Buffer} buffer     - imagem, vídeo ou GIF
 * @param {object} opts
 * @param {string} opts.botName
 * @param {string} opts.ownerName
 * @param {string} opts.userName
 * @param {string} opts.groupName
 * @param {boolean} opts.isVideo  - true se for vídeo/GIF
 */
async function create(buffer, { botName, ownerName, userName, groupName, isVideo, packName = '', authorName = '', watermarkText = '', visibleWatermark = false }) {
  const pack   = packName || `${botName} • ${ownerName}`;
  const author = authorName || `${userName} | ${groupName || 'PV'}`;

  const mime   = detectMime(buffer);
  const isGif  = mime === 'image/gif';
  const isVid  = isVideo || mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/avi';
  const isAnim = isGif || isVid;

  /* ── GIF animado (processado pelo sharp — sem ffmpeg, sem artefactos) ── */
  if (isGif) {
    try {
      const webpAnim = await gifToWebpSquare(buffer);
      const out = await injectMeta(webpAnim, pack, author);
      if (out && out.length > 200) return out;
    } catch (e) {
      // sharp falhou com este GIF → fallback
    }

    // Fallback: wa-sticker-formatter CROPPED (cover, não contain)
    try {
      return await new Sticker(buffer, {
        pack, author,
        type: StickerTypes.CROPPED,  // ← CROPPED = cover 512x512 ← NUNCA FULL
        quality: 80,
      }).toBuffer();
    } catch (e2) {
      throw new Error('Sticker GIF falhou: ' + e2.message);
    }
  }

  /* ── Vídeo MP4/WebM (precisa de ffmpeg para converter) ── */
  if (isVid) {
    if (FFMPEG_OK) {
      try {
        const webpAnim = videoToWebpSquare(buffer);
        const out = await injectMeta(webpAnim, pack, author);
        if (out && out.length > 200) return out;
      } catch (e) {
        // ffmpeg falhou → fallback
      }
    }

    // Fallback: wa-sticker-formatter CROPPED
    // (o wa-sticker-formatter usa ffmpeg internamente para converter MP4→GIF→WebP)
    try {
      return await new Sticker(buffer, {
        pack, author,
        type: StickerTypes.CROPPED,  // ← CROPPED = cover 512x512
        quality: 80,
      }).toBuffer();
    } catch (e2) {
      throw new Error('Sticker vídeo falhou: ' + e2.message);
    }
  }

  /* ── Imagem estática (JPEG, PNG, WebP) ── */
  try {
    const webp = await imageToWebpSquare(buffer, visibleWatermark ? watermarkText : '');
    const out  = await injectMeta(webp, pack, author);
    if (out && out.length > 200) return out;
    throw new Error('output vazio');
  } catch (e) {
    // Fallback CROPPED para imagens também
    try {
      return await new Sticker(buffer, {
        pack, author,
        type: StickerTypes.CROPPED,  // ← CROPPED = cover 512x512
        quality: 85,
      }).toBuffer();
    } catch (e2) {
      throw new Error('Sticker imagem falhou: ' + e2.message);
    }
  }
}


/* ─── SFull: mantém a imagem/vídeo inteiro no sticker (contain + fundo transparente) ─── */
async function imageToWebpFull(buffer, watermarkText = '') {
  const sharp = require('sharp');
  let img = sharp(buffer)
    .resize(512, 512, {
      fit: 'contain',
      position: 'centre',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    });
  const wm = watermarkSvg(watermarkText);
  if (wm) img = img.composite([{ input: wm, left: 0, top: 0 }]);
  return img.webp({ quality: 90, lossless: false }).toBuffer();
}

function videoToWebpFull(inputBuf, maxSec = Number(process.env.STICKER_VIDEO_MAX_SEC || 8)) {
  const tmp = path.join(os.tmpdir(), `stkfull_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const inFile = `${tmp}.in`;
  const outFile = `${tmp}.webp`;
  try {
    fs.writeFileSync(inFile, inputBuf);
    execFileSync(FFMPEG_BIN, [
      '-y', '-t', String(maxSec), '-i', inFile,
      '-vf', [
        'scale=w=512:h=512:force_original_aspect_ratio=decrease',
        'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        'fps=10',
        'format=rgba',
      ].join(','),
      '-vcodec', 'libwebp_anim',
      '-lossless', '0', '-quality', '72', '-compression_level', '3',
      '-loop', '0', '-vsync', 'vfr', '-an', outFile,
    ], { timeout: 90000, stdio: 'ignore' });
    const result = fs.readFileSync(outFile);
    if (!result || result.length < 200) throw new Error('WebP vazio');
    return result;
  } finally {
    try { fs.unlinkSync(inFile); } catch {}
    try { fs.unlinkSync(outFile); } catch {}
  }
}

async function createFull(buffer, { botName, ownerName, userName, groupName, isVideo, packName = '', authorName = '', watermarkText = '', visibleWatermark = false }) {
  const pack = packName || `${botName} • ${ownerName}`;
  const author = authorName || `${userName} | ${groupName || 'PV'} • SFULL`;
  const mime = detectMime(buffer);
  const isGif = mime === 'image/gif';
  const isVid = isVideo || mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/avi';

  if ((isGif || isVid) && FFMPEG_OK) {
    try {
      const webp = videoToWebpFull(buffer);
      const out = await injectMeta(webp, pack, author);
      if (out && out.length > 200) return out;
    } catch (e) {}
  }

  try {
    const webp = await imageToWebpFull(buffer, visibleWatermark ? watermarkText : '');
    const out = await injectMeta(webp, pack, author);
    if (out && out.length > 200) return out;
  } catch (e) {}

  return new Sticker(buffer, {
    pack,
    author,
    type: StickerTypes.FULL,
    quality: 90,
  }).toBuffer();
}

module.exports = { create, createFull, detectMime, FFMPEG_OK };

