/**
 * StickerMaker v5.0 — Stickers 512x512 quadrados, sem falhas, sem barras
 *
 * PROBLEMA RAIZ:
 *  - wa-sticker-formatter usa videoToGif (fluent-ffmpeg) internamente
 *  - No Render/ambiente sem ffmpeg, essa conversão falha silenciosamente
 *  - O fallback do wa-sticker-formatter usa fit.contain (adiciona barras pretas/transparentes)
 *  - Barras pretas em WebP animado = artefactos / "riscos" durante reprodução
 *
 * SOLUÇÃO:
 *  - Para IMAGENS ESTÁTICAS: sharp resize 512x512 com fit.cover (corta o centro)
 *  - Para GIF/WebP ANIMADO: sharp com animated:true + fit.cover (estica/corta para quadrado)
 *  - Para MP4/Vídeo: ffmpeg se disponível, senão erro claro
 *  - Os metadados (pack/author) são injectados via wa-sticker-formatter no final
 *
 * REGRA fit.cover:
 *  - Redimensiona para que AMBOS os lados ≥ 512, mantendo proporção
 *  - Corta o centro para 512x512
 *  - Resultado: sempre quadrado perfeito, sem barras, sem distorção
 *  - Equivalente ao "object-fit: cover" do CSS
 */

const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const sharp = require('sharp');
const { execSync, execFileSync } = require('child_process');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

/* ─── Detecção do tipo pelo magic bytes ──────────────────────── */
function detectMime(buffer) {
  if (!buffer || buffer.length < 12) return 'image/jpeg';
  const h = buffer.slice(0, 12);
  if (h[0] === 0x89 && h[1] === 0x50)                                            return 'image/png';
  if (h[0] === 0xFF && h[1] === 0xD8)                                            return 'image/jpeg';
  if (h.slice(0,4).toString() === 'RIFF' && h.slice(8,12).toString() === 'WEBP') return 'image/webp';
  if (h.slice(0,6).toString() === 'GIF89a' || h.slice(0,6).toString() === 'GIF87a') return 'image/gif';
  if (h.slice(4,8).toString() === 'ftyp')                                         return 'video/mp4';
  if (h[0] === 0x1A && h[1] === 0x45)                                             return 'video/webm';
  if (h.slice(0,4).toString() === 'RIFF')                                         return 'video/avi';
  return 'image/jpeg';
}

/* ─── Verifica se ffmpeg está disponível ─────────────────────── */
function hasFfmpeg() {
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch { return false; }
}
const FFMPEG_OK = hasFfmpeg();

/* ─── Injeta metadados (pack/author) via wa-sticker-formatter ── */
async function addMetadata(webpBuffer, pack, author, animated = false) {
  try {
    const stk = new Sticker(webpBuffer, {
      pack,
      author,
      type: StickerTypes.FULL,  // não redimensiona — já está 512x512
      quality: 100,             // não recomprimir — já está optimizado
      id: `dark-bot-${Date.now()}`,
      categories: ['🤖'],
    });
    const out = await stk.toBuffer();
    if (out && out.length > 100) return out;
    return webpBuffer; // fallback: sem metadados mas funcional
  } catch {
    return webpBuffer; // fallback silencioso
  }
}

/* ─── Converte imagem estática → WebP 512x512 quadrado ──────── */
async function staticToWebp(buffer) {
  return sharp(buffer)
    .resize(512, 512, {
      fit: 'cover',        // corta o centro — sem barras, sem distorção
      position: 'centre',
      withoutEnlargement: false,
    })
    .webp({
      quality: 90,
      lossless: false,
      effort: 4,
    })
    .toBuffer();
}

/* ─── Converte GIF/WebP animado → WebP animado 512x512 ──────── */
async function animatedToWebp(buffer) {
  /*
   * Sharp com animated:true processa todos os frames do GIF/WebP.
   * fit:'cover' → estica/corta para que cada frame fique exactamente 512x512.
   * Sem barras pretas, sem artefactos.
   */
  return sharp(buffer, { animated: true, limitInputPixels: false })
    .resize(512, 512, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: false,
    })
    .webp({
      quality: 85,
      lossless: false,
      effort: 4,
      loop: 0,           // loop infinito
    })
    .toBuffer();
}

/* ─── Converte vídeo MP4/WebM → WebP animado via ffmpeg ──────── */
function videoToWebpFfmpeg(buffer, maxSec = 8) {
  const tmp     = path.join(os.tmpdir(), `stk_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const inFile  = `${tmp}.mp4`;
  const outFile = `${tmp}.webp`;

  try {
    fs.writeFileSync(inFile, buffer);

    execFileSync('ffmpeg', [
      '-y',
      '-t', String(maxSec),
      '-i', inFile,
      // scale=w:h com force_original_aspect_ratio=increase → ambos os lados ≥ 512
      // crop=512:512 → corta o centro → 512x512 limpo
      '-vf', [
        'scale=512:512:force_original_aspect_ratio=increase:flags=lanczos',
        'crop=512:512',
        'fps=15',
        'format=rgba',
      ].join(','),
      '-vcodec',            'libwebp_anim',
      '-lossless',          '0',
      '-quality',           '85',
      '-compression_level', '4',
      '-loop',              '0',
      '-vsync',             'vfr',
      '-an',
      outFile,
    ], { timeout: 90000, stdio: 'ignore' });

    const result = fs.readFileSync(outFile);
    if (!result || result.length < 100) throw new Error('Output vazio');
    return result;

  } finally {
    try { fs.unlinkSync(inFile);  } catch {}
    try { fs.unlinkSync(outFile); } catch {}
  }
}

/* ─── Função principal ───────────────────────────────────────── */
/**
 * Cria sticker WebP 512x512 quadrado.
 *
 * @param {Buffer} buffer   — conteúdo do ficheiro (imagem, GIF, vídeo)
 * @param {object} opts
 * @param {string} opts.botName
 * @param {string} opts.ownerName
 * @param {string} opts.userName
 * @param {string} opts.groupName
 * @param {boolean} opts.isVideo — true se for vídeo/GIF
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

  /* ── ANIMADO (GIF / WebP animado) ── */
  if (isAnim && (mime === 'image/gif' || mime === 'image/webp')) {
    try {
      // Sharp processa GIF e WebP animado directamente — sem ffmpeg
      const webpAnim = await animatedToWebp(buffer);
      return addMetadata(webpAnim, pack, author, true);
    } catch (e) {
      // fallback: wa-sticker-formatter com CROPPED
      const stk = new Sticker(buffer, {
        pack, author,
        type: StickerTypes.CROPPED,
        quality: 80,
      });
      return stk.toBuffer();
    }
  }

  /* ── VÍDEO MP4/WebM ── */
  if (isAnim && (mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/avi')) {
    if (FFMPEG_OK) {
      try {
        const webpAnim = videoToWebpFfmpeg(buffer);
        return addMetadata(webpAnim, pack, author, true);
      } catch (e) {
        // ffmpeg falhou — tenta extrair 1º frame com sharp
      }
    }
    // Sem ffmpeg: tenta extrair o primeiro frame como imagem estática
    try {
      const webp = await staticToWebp(buffer);
      return addMetadata(webp, pack, author, false);
    } catch {
      throw new Error('Não foi possível processar o vídeo. Tente enviar como GIF.');
    }
  }

  /* ── ESTÁTICO (JPEG / PNG / WebP estático) ── */
  try {
    const webp = await staticToWebp(buffer);
    return addMetadata(webp, pack, author, false);
  } catch (e) {
    // Último fallback
    const stk = new Sticker(buffer, {
      pack, author,
      type: StickerTypes.CROPPED,
      quality: 80,
    });
    return stk.toBuffer();
  }
}

module.exports = { create, detectMime, FFMPEG_OK };
