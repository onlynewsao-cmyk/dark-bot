/**
 * StickerMaker v4.0 — Stickers QUADRADOS, sem falhas, sem riscos
 *
 * REGRAS DO WHATSAPP:
 *  - Sticker deve ser WebP exatamente 512x512 px
 *  - Animado: WebP animado (não GIF)
 *  - Quadrado: crop no centro (cover), NÃO contain com padding
 *
 * PIPELINE:
 *  Imagem estática → sharp resize 512x512 cover → WebP → Sticker (metadados)
 *  Vídeo/GIF       → ffmpeg → WebP animado 512x512 cover → Sticker (metadados)
 *
 * ffmpeg filtro correto para sticker quadrado SEM riscos:
 *   scale=512:512:force_original_aspect_ratio=increase → crop=512:512:(iw-512)/2:(ih-512)/2
 *   (ou seja: aumenta até 512, depois corta o centro — resultado sempre 512x512 limpo)
 */

const { execSync, execFileSync } = require('child_process');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

/* ─── ffmpeg ─────────────────────────────────────────────────── */
function hasFfmpeg() {
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch { return false; }
}
const FFMPEG_OK = hasFfmpeg();

/* ─── Detecção de tipo real pelo magic bytes ──────────────────── */
function detectMime(buffer) {
  if (!buffer || buffer.length < 12) return 'image/jpeg';
  const h = buffer.slice(0, 12);
  if (h[0] === 0x89 && h[1] === 0x50)                                          return 'image/png';
  if (h[0] === 0xFF && h[1] === 0xD8)                                          return 'image/jpeg';
  if (h.slice(0,4).toString() === 'RIFF' && h.slice(8,12).toString() === 'WEBP') return 'image/webp';
  if (h.slice(0,6).toString() === 'GIF89a' || h.slice(0,6).toString() === 'GIF87a') return 'image/gif';
  if (h.slice(4,8).toString() === 'ftyp')                                       return 'video/mp4';
  if (h[0] === 0x1A && h[1] === 0x45)                                           return 'video/webm';
  if (h.slice(0,4).toString() === 'RIFF')                                       return 'video/avi';
  return 'image/jpeg';
}

/* ─── ffmpeg: vídeo/GIF → WebP animado quadrado 512x512 ─────── */
function videoToWebpSquare(inputBuf, maxSec = 8) {
  const tmp     = path.join(os.tmpdir(), `stk_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const inFile  = `${tmp}.in`;
  const outFile = `${tmp}.webp`;

  try {
    fs.writeFileSync(inFile, inputBuf);

    /*
     * Filtro: scale aumenta o menor lado para ≥512, depois crop centralizado.
     * Resultado: sempre 512x512, sem bordas pretas, sem distorção, sem riscos.
     *
     * scale=512:512:force_original_aspect_ratio=increase
     *   → aumenta mantendo proporção até que AMBOS os lados ≥ 512
     * crop=512:512
     *   → corta o centro (crop usa w:h:x:y — sem x:y padrão = centro)
     * fps=15
     *   → fluidez adequada sem arquivo pesado
     * format=rgba
     *   → espaço de cor correto para WebP com alpha
     */
    execFileSync('ffmpeg', [
      '-y',
      '-t', String(maxSec),
      '-i', inFile,
      '-vf', [
        'scale=512:512:force_original_aspect_ratio=increase',
        'crop=512:512',
        'fps=15',
        'format=rgba',
      ].join(','),
      '-vcodec',          'libwebp_anim',
      '-lossless',        '0',
      '-quality',         '85',
      '-compression_level', '4',
      '-loop',            '0',
      '-vsync',           'vfr',
      '-an',
      outFile,
    ], { timeout: 90000, stdio: 'ignore' });

    const result = fs.readFileSync(outFile);
    if (!result || result.length < 100) throw new Error('WebP animado vazio');
    return result;

  } finally {
    try { fs.unlinkSync(inFile);  } catch {}
    try { fs.unlinkSync(outFile); } catch {}
  }
}

/* ─── sharp: imagem estática → WebP quadrado 512x512 ─────────── */
async function imageToWebpSquare(buffer) {
  const sharp = require('sharp');
  return sharp(buffer)
    .resize(512, 512, {
      fit: 'cover',          // ← cover = quadrado perfeito, corta as bordas
      position: 'centre',
    })
    .webp({ quality: 88, lossless: false })
    .toBuffer();
}

/* ─── sharp: WebP animado → redimensiona quadrado (se necessário) */
async function webpAnimatedSquare(buffer) {
  const sharp = require('sharp');
  return sharp(buffer, { animated: true })
    .resize(512, 512, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 85, lossless: false })
    .toBuffer();
}

/* ─── API pública ────────────────────────────────────────────── */
/**
 * Cria sticker 512x512 quadrado.
 *
 * @param {Buffer} buffer   - imagem, vídeo ou GIF
 * @param {object} opts
 * @param {string} opts.botName
 * @param {string} opts.ownerName
 * @param {string} opts.userName
 * @param {string} opts.groupName
 * @param {boolean} opts.isVideo - true se for vídeo/GIF
 */
async function create(buffer, { botName, ownerName, userName, groupName, isVideo }) {
  const pack   = `${botName} • ${ownerName}`;
  const author = `${userName} | ${groupName || 'PV'}`;

  const mime   = detectMime(buffer);
  const isAnim = isVideo
    || mime === 'image/gif'
    || mime === 'video/mp4'
    || mime === 'video/webm'
    || mime === 'video/avi';

  /* ── ANIMADO ── */
  if (isAnim) {
    if (FFMPEG_OK) {
      try {
        const webpAnim = videoToWebpSquare(buffer);

        // Injeta pack/author via Sticker (só metadados — WebP já está pronto)
        const stk = new Sticker(webpAnim, {
          pack, author,
          type: StickerTypes.FULL,   // FULL = não redimensiona — já é 512x512
          quality: 85,
          id: `dark-bot-${Date.now()}`,
          categories: ['🤖'],
        });
        const out = await stk.toBuffer();
        if (out && out.length > 100) return out;
      } catch (e) {
        // ffmpeg falhou — cai no fallback
      }
    }

    // Fallback: wa-sticker-formatter com CROPPED (força 512x512 cover)
    try {
      const stk = new Sticker(buffer, {
        pack, author,
        type: StickerTypes.CROPPED,  // CROPPED = cover 512x512
        quality: 80,
      });
      return stk.toBuffer();
    } catch (e2) {
      throw new Error('Não foi possível criar sticker animado: ' + e2.message);
    }
  }

  /* ── ESTÁTICO ── */
  try {
    const webp = await imageToWebpSquare(buffer);
    const stk  = new Sticker(webp, {
      pack, author,
      type: StickerTypes.FULL,  // já é 512x512 perfeito — FULL não altera
      quality: 88,
      id: `dark-bot-${Date.now()}`,
      categories: ['🤖'],
    });
    const out = await stk.toBuffer();
    if (out && out.length > 100) return out;
    throw new Error('buffer vazio');
  } catch (e) {
    // Fallback CROPPED
    const stk = new Sticker(buffer, {
      pack, author,
      type: StickerTypes.CROPPED,
      quality: 80,
    });
    return stk.toBuffer();
  }
}

module.exports = { create, detectMime, FFMPEG_OK };
