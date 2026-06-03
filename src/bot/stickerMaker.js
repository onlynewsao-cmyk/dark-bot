/**
 * StickerMaker v5.2 - Focado em funcionar no WhatsApp
 * Suporte: Imagem, GIF, WebP animado
 * Vídeo MP4: Extrai primeiro frame (melhor que nada)
 */

const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const sharp = require('sharp');

function detectMime(buffer) {
  if (!buffer || buffer.length < 12) return 'image/jpeg';
  const h = buffer.slice(0, 12);
  if (h[0] === 0x89 && h[1] === 0x50) return 'image/png';
  if (h[0] === 0xFF && h[1] === 0xD8) return 'image/jpeg';
  if (h.slice(0,4).toString() === 'RIFF' && h.slice(8,12).toString() === 'WEBP') return 'image/webp';
  if (h.slice(0,6).toString() === 'GIF89a' || h.slice(0,6).toString() === 'GIF87a') return 'image/gif';
  if (h.slice(4,8).toString() === 'ftyp') return 'video/mp4';
  return 'image/jpeg';
}

async function addMetadata(webpBuffer, pack, author) {
  try {
    const stk = new Sticker(webpBuffer, {
      pack, author,
      type: StickerTypes.FULL,
      quality: 100,
      id: `dark-bot-${Date.now()}`,
    });
    return await stk.toBuffer();
  } catch {
    return webpBuffer;
  }
}

async function staticToWebp(buffer) {
  return sharp(buffer)
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .webp({ quality: 88, effort: 4 })
    .toBuffer();
}

async function animatedToWebp(buffer) {
  return sharp(buffer, { animated: true, limitInputPixels: false })
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80, effort: 4, loop: 0 })
    .toBuffer();
}

async function create(buffer, { botName, ownerName, userName, groupName, isVideo }) {
  const pack = `${botName} • ${ownerName}`;
  const author = `${userName} | ${groupName || 'PV'}`;
  const mime = detectMime(buffer);

  const isAnim = isVideo || mime === 'image/gif' || mime === 'image/webp';

  /* === GIF / WebP Animado === */
  if (isAnim && (mime === 'image/gif' || mime === 'image/webp')) {
    try {
      const webpAnim = await animatedToWebp(buffer);
      return addMetadata(webpAnim, pack, author);
    } catch {
      const stk = new Sticker(buffer, { pack, author, type: StickerTypes.CROPPED, quality: 70 });
      return stk.toBuffer();
    }
  }

  /* === VÍDEO MP4 === */
  if (mime === 'video/mp4') {
    try {
      // Tenta extrair frames com sharp (funciona em alguns casos)
      const webpAnim = await animatedToWebp(buffer);
      return addMetadata(webpAnim, pack, author);
    } catch {
      // Fallback: primeiro frame como sticker estático
      try {
        const firstFrame = await staticToWebp(buffer);
        return addMetadata(firstFrame, pack, author);
      } catch {
        throw new Error('Vídeo muito grande ou formato não suportado para sticker.');
      }
    }
  }

  /* === IMAGEM ESTÁTICA === */
  try {
    const webp = await staticToWebp(buffer);
    return addMetadata(webp, pack, author);
  } catch {
    const stk = new Sticker(buffer, { pack, author, type: StickerTypes.CROPPED, quality: 70 });
    return stk.toBuffer();
  }
}

module.exports = { create, detectMime };